import { useEffect, useState } from 'react';
import { supabase } from '../supabase';

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
    } else {
      setProductos(data);
    }
  };

  const verMovimientos = async (producto) => {
    setProductoActual(producto);
    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('producto_id', producto.id)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error al cargar movimientos:', error.message);
      return;
    }

    const formateados = data.map((m) => {
      const cantidadMostrada = Math.abs(m.cantidad);
      let descripcion = `${m.tipo}: ${cantidadMostrada}`;

      if (m.tipo === 'SALIDA') {
        descripcion = `Salida venta: -${cantidadMostrada}`;
      } else if (m.tipo === 'ENTRADA') {
        descripcion = `Entrada compra: ${cantidadMostrada}`;
      } else if (m.tipo === 'DEVOLUCIÓN VENTA') {
        descripcion = `Entrada devolución: ${cantidadMostrada}`;
      }

      return {
        ...m,
        descripcion,
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
            key={producto.id}
            className="grid grid-cols-[60px_1fr_100px_100px] gap-4 items-center border rounded-lg p-2 shadow-sm hover:shadow transition text-xs"
          >
            {/* Imagen */}
            <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
              {producto.imagen_url ? (
                <img
                  src={producto.imagen_url}
                  alt={producto.nombre}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-gray-400 text-[10px]">Sin imagen</span>
              )}
            </div>

            {/* Nombre */}
            <div className="whitespace-normal break-words">
              <div className="font-medium">{producto.nombre}</div>
              <div className="text-gray-500 text-[11px]">
                Stock: {producto.stock ?? 0}
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
      </div>

      {/* Modal de movimientos */}
      {modalActivo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={() => setModalActivo(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-11/12 md:w-1/2 rounded-lg p-4 shadow-lg"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                Movimientos de: {productoActual?.nombre}
              </h3>
              <button
                onClick={() => setModalActivo(false)}
                className="text-gray-600 hover:text-gray-800 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="max-h-64 overflow-y-auto text-sm">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2 text-left">Fecha</th>
                    <th className="p-2 text-left">Movimiento</th>
                    <th className="p-2 text-left">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map((m) => (
                    <tr key={m.id} className="border-t">
                      <td className="p-2">
                        {new Date(m.fecha).toLocaleString()}
                      </td>
                      <td className="p-2">{m.descripcion}</td>
                      <td className="p-2">{m.referencia || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
