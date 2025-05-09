import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast'; // Assuming you have react-hot-toast installed

export default function ProductosStock() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [modalActivo, setModalActivo] = useState(false);
  const [productoActual, setProductoActual] = useState(null);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) {
      console.error('Error al cargar productos:', error.message);
      toast.error('Error al cargar productos.'); // Show a toast message
    } else {
      setProductos(data || []); // Ensure data is an array, even if null
    }
  };

  const verMovimientos = async (producto) => {
    setProductoActual(producto);
    // Clear previous movements when opening the modal for a new product
    setMovimientos([]);

    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('producto_id', producto.id)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error al cargar movimientos:', error.message);
      toast.error('Error al cargar movimientos.'); // Show a toast message
      return;
    }

    const formateados = (data || []).map((m) => { // Ensure data is an array
      const cantidadMostrada = Math.abs(m.cantidad || 0); // Ensure quantity is a number
      let descripcion = `${m.tipo || 'Desconocido'}: ${cantidadMostrada}`; // Handle null type

      if (m.tipo === 'SALIDA') {
        descripcion = `Salida venta: -${cantidadMostrada}`;
      } else if (m.tipo === 'ENTRADA') {
        // This is the generic entry, could be from adjustments or other unspecified sources
        descripcion = `Entrada compra: ${cantidadMostrada}`; // Changed to be more generic
      } else if (m.tipo === 'DEVOLUCIÓN VENTA') {
        descripcion = `Entrada devolución: ${cantidadMostrada}`;
      } else if (m.tipo === 'ENTRADA_COMPRA') { // Condition for purchases
        descripcion = `Entrada Compra: ${cantidadMostrada}`; // Specific message for purchases
      } else if (m.tipo === 'REVERSION_COMPRA') { // Condition for purchase reversal (if implemented)
         descripcion = `Salida reversión compra: -${cantidadMostrada}`;
      }


      return {
        ...m,
        // Ensure the date is a valid Date object for toLocaleString
        fecha: m.fecha ? new Date(m.fecha) : new Date(), // Use current date if date is null/invalid
        descripcion: descripcion, // Use the generated description
        referencia: m.referencia || '-', // Show '-' if reference is null
      };
    });

    setMovimientos(formateados);
    setModalActivo(true);
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div>
      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3"
        />
      </div>

      {/* Lista de productos con stock */}
      <div className="space-y-2">
        {productosFiltrados.map((producto) => (
          <div
            key={producto.id} // Ensure each element has a unique key
            className="grid grid-cols-[60px_1fr_100px_100px] gap-4 items-center border rounded-lg p-2 shadow-sm hover:shadow transition text-xs"
          >
            {/* Imagen */}
            <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre || 'Producto sin nombre'} // Alt text descriptivo
                  className="object-cover w-full h-full"
                  onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/56x56/e5e7eb/4b5563?text=Sin+Imagen" }} // Placeholder in case of loading error
                />
              ) : (
                <span className="text-gray-400 text-[10px] text-center">Sin imagen</span>
              )}
            </div>

            {/* Nombre */}
            <div className="whitespace-normal break-words">
              <div className="font-medium">{producto.nombre || 'Producto sin nombre'}</div> {/* Handle null name */}
              <div className="text-gray-500 text-[11px]">
                Stock: {producto.stock ?? 0} {/* Show 0 if stock is null */}
              </div>
            </div>

            {/* Botón de movimientos */}
            <div className="col-span-2 text-right">
              <button
                onClick={() => verMovimientos(producto)}
                className="text-blue-600 hover:underline text-sm"
              >
                Ver movimientos
              </button>
            </div>
          </div>
        ))}
        {/* Message if no filtered products */}
        {productosFiltrados.length === 0 && (
            <div className="text-center text-gray-500 mt-4">
                No se encontraron productos.
            </div>
        )}
      </div>

      {/* Modal de movimientos */}
      {modalActivo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" // Added padding for mobile
          onClick={() => setModalActivo(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md md:max-w-lg lg:max-w-xl rounded-lg p-6 shadow-lg max-h-[90vh] overflow-y-auto" // Adjusted responsive width and added scroll
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Movimientos de: {productoActual?.nombre || 'Producto desconocido'} {/* Handle null name */}
              </h3>
              <button
                onClick={() => setModalActivo(false)}
                className="text-gray-600 hover:text-gray-800 text-2xl font-bold" // Close button style
              >
                ×
              </button>
            </div>

            {movimientos.length === 0 ? (
                <div className="text-center text-gray-500">
                    No hay movimientos registrados para este producto.
                </div>
            ) : (
                <div className="overflow-x-auto text-sm"> {/* Container for horizontal scroll */}
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                        <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Movimiento</th>
                        <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Referencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m) => (
                        <tr key={m.id} className="border-t">
                          <td className="p-2 whitespace-nowrap">{m.fecha instanceof Date && !isNaN(m.fecha) ? m.fecha.toLocaleString() : 'Fecha inválida'}</td>
                          <td className="p-2">{m.descripcion}</td>
                          <td className="p-2">{m.referencia || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
