// src/pages/ProductosStock.jsx
import { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast'; // Asegúrate de tener react-hot-toast instalado

export default function ProductosStock() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [modalActivo, setModalActivo] = useState(false);
  const [productoActual, setProductoActual] = useState(null);
  const [loading, setLoading] = useState(true); // Estado de carga añadido

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setLoading(true); // Establecer loading a true antes de cargar
    // Se añadió ordenamiento por nombre
    const { data, error } = await supabase.from('productos').select('*').order('nombre', { ascending: true });
    if (error) {
      console.error('Error al cargar productos:', error.message);
      toast.error('Error al cargar productos.'); // Mostrar un mensaje toast
      setProductos([]); // Asegurarse de que productos sea un array vacío en caso de error
    } else {
      setProductos(data || []); // Asegurarse de que data sea un array, incluso si es null
    }
    setLoading(false); // Establecer loading a false después de cargar
  };

  const verMovimientos = async (producto) => {
    setProductoActual(producto);
    // Limpiar movimientos previos al abrir el modal para un nuevo producto
    setMovimientos([]);

    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('producto_id', producto.id)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error al cargar movimientos:', error.message);
      toast.error('Error al cargar movimientos.'); // Mostrar un mensaje toast
      setMovimientos([]); // Asegurarse de que movimientos sea un array vacío en caso de error
      return;
    }

    const formateados = (data || []).map((m) => {
      const cantidadMostrada = Math.abs(m.cantidad || 0);
      let descripcion = 'Unknown movement';
    
      if (m.tipo === 'SALIDA') {
        descripcion = `Sales Out: -${cantidadMostrada}`;
      } else if (m.tipo === 'ENTRADA') {
        if (m.referencia?.toLowerCase().includes('cancelación') || m.referencia?.toLowerCase().includes('cancellation')) {
          descripcion = `Sales Return: ${cantidadMostrada}`;
        } else {
          descripcion = `Purchases In: ${cantidadMostrada}`;
        }
      } else if (m.tipo === 'DEVOLUCIÓN VENTA') {
        descripcion = `Return In: ${cantidadMostrada}`;
      }
    
      const movimientoFecha = m.fecha ? new Date(m.fecha) : null;
    
      return {
        ...m,
        fecha: movimientoFecha instanceof Date && !isNaN(movimientoFecha.getTime()) ? movimientoFecha : 'Invalid Date',
        descripcion,
        referencia: m.referencia || '-',
      };
    });
    

    setMovimientos(formateados);
    setModalActivo(true);
  };

  const productosFiltrados = productos.filter((p) =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="container mx-auto p-4"> {/* Contenedor añadido y padding */}
      <h2 className="text-2xl font-bold mb-4">Gestión de Stock</h2> {/* Título añadido */}
      {/* Buscador */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3 focus:outline-none focus:ring-blue-500 focus:border-blue-500" // Estilos de enfoque añadidos
        />
      </div>

      {/* Lista de productos con stock */}
      {loading ? (
        <div className="text-center text-gray-500">Cargando productos...</div>
      ) : (
        <div className="space-y-2">
          {productosFiltrados.map((producto) => (
            <div
              key={producto.id} // Asegurarse de que cada elemento tenga una clave única
              // Columnas de la cuadrícula ajustadas, padding, sombra, cursor, tamaño de texto
              className="grid grid-cols-[60px_1fr_minmax(80px,100px)_minmax(80px,100px)] gap-4 items-center border rounded-lg p-3 shadow-sm hover:shadow-md transition cursor-pointer text-sm"
              onClick={() => verMovimientos(producto)} // Hacer clicable todo el elemento
            >
              {/* Imagen */}
              {/* Se añadió flex-shrink-0 */}
              <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center flex-shrink-0">
                {producto.imagen_url ? (
                  <img
                    src={producto.imagen_url}
                    alt={`Imagen de ${producto.nombre || 'producto'}`} // Texto alt descriptivo mejorado
                    className="object-cover w-full h-full"
                    // Marcador de posición en caso de error de carga
                    onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/56x56/e5e7eb/4b5563?text=Sin+Imagen" }}
                  />
                ) : (
                  // Padding añadido - Comentario movido a línea separada
                  <span className="text-gray-400 text-[10px] text-center px-1">Sin imagen</span>
                )}
              </div>

              {/* Nombre y Stock */}
              <div className="whitespace-normal break-words overflow-hidden"> {/* Overflow-hidden añadido */}
                <div className="font-medium text-gray-800">{producto.nombre || 'Producto sin nombre'}</div> {/* Manejar nombre null */}
                <div className="text-gray-500 text-xs">
                  Stock: {producto.stock ?? 0} {/* Mostrar 0 si stock es null */}
                </div>
              </div>

              {/* Botón de movimientos (Oculto, ya que todo el div es clicable) */}
              {/* Mantener para el diseño, oculto en pantallas pequeñas */}
               <div className="hidden md:flex col-span-2 justify-end items-center">
                   {/* El manejador de clics está en el div padre */}
               </div>
            </div>
          ))}
          {/* Mensaje si no hay productos filtrados */}
          {!loading && productosFiltrados.length === 0 && (
              <div className="text-center text-gray-500 mt-4">
                  No se encontraron productos.
              </div>
          )}
        </div>
      )}


      {/* Modal de movimientos */}
      {modalActivo && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" // Padding añadido para móvil
          onClick={() => setModalActivo(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            // Ancho responsivo ajustado y desplazamiento añadido
            className="bg-white w-full max-w-md md:max-w-lg lg:max-w-xl rounded-lg p-6 shadow-lg max-h-[90vh] overflow-y-auto relative" // Posicionamiento relativo añadido
          >
            {/* Encabezado hecho sticky */}
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-white pb-2">
              <h3 className="text-lg font-semibold text-gray-800">
                Movimientos de: {productoActual?.nombre || 'Producto desconocido'} {/* Manejar nombre null */}
              </h3>
              {/* Estilo del botón de cerrar, margen izquierdo añadido */}
              <button
                onClick={() => setModalActivo(false)}
                className="text-gray-600 hover:text-gray-800 text-2xl font-bold leading-none ml-4"
              >
                &times;
              </button>
            </div>

            {movimientos.length === 0 ? (
                <div className="text-center text-gray-500">
                    No hay movimientos registrados para este producto.
                </div>
            ) : (
                <div className="overflow-x-auto text-sm"> {/* Contenedor para desplazamiento horizontal */}
                  <table className="min-w-full border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Fecha</th>
                        <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Movimiento</th>
                        <th className="p-2 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Referencia</th>
                      </tr>
                    </thead>
                    <tbody>
                      {movimientos.map((m, index) => (
                        // Usar una combinación de id e índice como clave si el id no fuera único (aunque debería serlo en una BD)
                        <tr key={m.id || `mov-${index}`} className="border-t">
                           {/* Formatear la fecha de forma segura */}
                           <td className="p-2 whitespace-nowrap">
                             {m.fecha instanceof Date && !isNaN(m.fecha.getTime()) ? m.fecha.toLocaleString() : 'Fecha inválida'}
                           </td>
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