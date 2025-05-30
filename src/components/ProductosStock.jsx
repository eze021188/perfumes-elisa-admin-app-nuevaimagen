// src/components/ProductosStock.jsx
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Search, Package, Activity, Clock, ArrowRight, ArrowLeft, X as IconX, ArrowUp, ArrowDown } from 'lucide-react'; 

export default function ProductosStock() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [movimientos, setMovimientos] = useState([]);
  const [modalActivo, setModalActivo] = useState(false);
  const [productoActual, setProductoActual] = useState(null);
  const [loading, setLoading] = useState(true);

  // Estados para el ordenamiento
  const [sortColumn, setSortColumn] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('productos').select('*');
    if (error) {
      console.error('Error al cargar productos:', error.message);
      toast.error('Error al cargar productos.');
      setProductos([]);
    } else {
      setProductos(data || []);
    }
    setLoading(false);
  };

  // Función para manejar el cambio de ordenamiento
  const handleSort = (column) => {
      if (sortColumn === column) {
          setSortDirection(prevDirection => (prevDirection === 'asc' ? 'desc' : 'asc'));
      } else {
          setSortColumn(column);
          setSortDirection('asc');
      }
  };

  // Lógica de filtrado y ordenamiento usando useMemo para optimizar
  const productosFiltradosYOrdenados = useMemo(() => {
      let productosTrabajo = [...productos];

      // 1. Filtrar por búsqueda
      if (busqueda) {
          productosTrabajo = productosTrabajo.filter(p =>
              (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
              (p.codigo || '').toLowerCase().includes(busqueda.toLowerCase()) ||
              (p.categoria || '').toLowerCase().includes(busqueda.toLowerCase())
          );
      }

      // 2. Ordenar
      if (sortColumn) {
          productosTrabajo.sort((a, b) => {
              const aValue = a[sortColumn];
              const bValue = b[sortColumn];

              // Manejar valores nulos o indefinidos
              if (aValue == null && bValue == null) return 0;
              if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
              if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

              // Manejar ordenamiento numérico
              const aNum = parseFloat(aValue) || 0;
              const bNum = parseFloat(bValue) || 0;

              // Ajuste: usar sortDirection para todas las comparaciones numéricas
              if (sortColumn === 'stock' || sortColumn === 'promocion' || sortColumn === 'precio_normal' || sortColumn === 'costo_final_usd' || sortColumn === 'costo_final_mxn') {
                   if (aNum < bNum) return sortDirection === 'asc' ? -1 : 1;
                   if (aNum > bNum) return sortDirection === 'asc' ? 1 : -1;
                   return 0;
              }

              // Ordenamiento por defecto para texto
              const aString = String(aValue).toLowerCase();
              const bString = String(bValue).toLowerCase();

              if (aString < bString) {
                  return sortDirection === 'asc' ? -1 : 1;
              }
              if (aString > bString) {
                  return sortDirection === 'asc' ? 1 : -1;
              }
              return 0;
          });
      }

      return productosTrabajo;
  }, [productos, busqueda, sortColumn, sortDirection]);


  const verMovimientos = async (producto) => {
    // Asegurarse de que el producto es válido antes de intentar mostrar movimientos
    if (!producto || !producto.id) {
        toast.error("Producto inválido para ver movimientos.");
        return;
    }

    setProductoActual(producto);
    setMovimientos([]); // Limpiar movimientos anteriores para mostrar un estado de carga o vacío

    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('producto_id', producto.id)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error al cargar movimientos:', error.message);
      toast.error('Error al cargar movimientos.');
      setMovimientos([]);
      setModalActivo(true); // Aunque haya error, intentar abrir el modal para mostrar el error
      return;
    }

    const formateados = (data || []).map((m) => {
      const cantidadMostrada = Math.abs(m.cantidad || 0);
      let tipoMovimiento = 'Desconocido'; 
      let cantidadSigno = ''; 
      let colorTexto = 'text-gray-300';
      let IconoFlecha = null; 

      if (m.tipo === 'SALIDA') {
        tipoMovimiento = 'VENTA';
        cantidadSigno = `-${cantidadMostrada}`;
        colorTexto = 'text-red-400'; // Rojo para salida
        IconoFlecha = ArrowDown; // Flecha hacia abajo para salida
      } else if (m.tipo === 'ENTRADA') {
        // Lógica mejorada para distinguir Devolución y Compra en ENTRADA
        if (m.referencia?.toLowerCase().includes('cancelación') || m.referencia?.toLowerCase().includes('cancellation') || m.motivo === 'devolucion_ventas') {
          tipoMovimiento = 'DEVOLUCIÓN'; // Cambiado a solo "DEVOLUCIÓN"
          cantidadSigno = `+${cantidadMostrada}`;
          colorTexto = 'text-amber-400'; // Color ámbar para devoluciones
          IconoFlecha = ArrowUp; // Flecha hacia arriba para devoluciones
        } else {
          tipoMovimiento = 'COMPRA';
          cantidadSigno = `+${cantidadMostrada}`;
          colorTexto = 'text-green-400'; // Verde para entrada por compra
          IconoFlecha = ArrowUp; // Flecha hacia arriba para entrada por compra
        }
      } else { // Para cualquier otro tipo no clasificado explícitamente
          tipoMovimiento = m.tipo || 'Otro';
          cantidadSigno = m.cantidad > 0 ? `+${m.cantidad}` : `${m.cantidad}`;
          // Determinar flecha para "Otro" si la cantidad tiene signo
          if (m.cantidad > 0) IconoFlecha = ArrowUp;
          else if (m.cantidad < 0) IconoFlecha = ArrowDown;
      }

      // Asegurar que la fecha sea un objeto Date válido
      let movimientoFecha;
      try {
        movimientoFecha = m.fecha ? new Date(m.fecha) : null;
        if (movimientoFecha && isNaN(movimientoFecha.getTime())) {
          movimientoFecha = 'Fecha inválida'; 
        }
      } catch (e) {
        movimientoFecha = 'Fecha inválida'; 
      }

      return {
        ...m,
        fecha: movimientoFecha, 
        tipoMovimiento, 
        cantidadMostrada: cantidadSigno, 
        colorTexto, 
        IconoFlecha, 
        referencia: m.referencia || '-',
      };
    });

    setMovimientos(formateados);
    setModalActivo(true); 
  };


  return (
    // Se elimina "container mx-auto" para que ocupe todo el ancho.
    // Se añade "w-full" para asegurar que ocupe el 100% del ancho disponible.
    <div className="w-full p-4 md:p-6 lg:p-8"> {/* Añadido padding interno para el contenido */}
      <h2 className="text-2xl font-bold mb-6 text-gray-100">Gestión de Stock</h2>
      
      {/* Buscador */}
      <div className="mb-6">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="pl-10 w-full md:w-1/2 p-3 bg-dark-900 border border-dark-700 rounded-lg text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* Contenedor para la tabla de ProductosStock */}
      <div className="overflow-x-auto rounded-lg shadow-card-dark border border-dark-700/50 bg-dark-800/50">
        {/* Encabezados de la lista con ordenamiento */}
        {/* MODIFICADO: Columna de Imagen oculta en móviles (hidden) y visible en md:table-cell */}
        <div className="grid grid-cols-[1fr_minmax(80px,100px)_minmax(80px,100px)] md:grid-cols-[60px_1fr_minmax(80px,100px)_minmax(80px,100px)] gap-4 items-center border-b border-dark-700 rounded-t-lg p-3 text-sm font-semibold text-gray-400 uppercase tracking-wider sticky top-0 z-10 bg-dark-900/50">
            <div className="hidden md:block p-1">Imagen</div> {/* Oculto en móvil, visible en md */}
            <div
                className="p-1 cursor-pointer hover:text-gray-200 flex items-center gap-1 whitespace-nowrap"
                onClick={() => handleSort('nombre')}
            >
                Nombre
                {sortColumn === 'nombre' && (
                  <span className="ml-1">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
            </div>
            <div
                className="p-1 text-right cursor-pointer hover:text-gray-200 flex items-center gap-1 justify-end whitespace-nowrap"
                onClick={() => handleSort('stock')}
            >
                Stock
                {sortColumn === 'stock' && (
                  <span className="ml-1">
                    {sortDirection === 'asc' ? '▲' : '▼'}
                  </span>
                )}
            </div>
            <div className="p-1 text-center whitespace-nowrap">Movimientos</div>
        </div>

        {/* Lista de productos con stock */}
        {loading ? (
          <div className="flex justify-center items-center h-64 bg-dark-800/50 rounded-lg border border-dark-700/50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
          </div>
        ) : (
          <div className="space-y-2 p-3"> {/* Añadido padding aquí */}
            {productosFiltradosYOrdenados.map((producto) => (
              <div
                key={producto.id}
                className="grid grid-cols-[1fr_minmax(80px,100px)_minmax(80px,100px)] md:grid-cols-[60px_1fr_minmax(80px,100px)_minmax(80px,100px)] gap-4 items-center border border-dark-700/50 rounded-lg p-3 shadow-card-dark hover:shadow-dropdown-dark transition-all bg-dark-800/50 text-sm"
              >
                {/* Columna de Imagen: Oculta en móvil, visible en md */}
                <div className="hidden md:flex w-14 h-14 bg-dark-900 rounded-lg overflow-hidden items-center justify-center flex-shrink-0">
                  {producto.imagen_url ? (
                    <img
                      src={producto.imagen_url}
                      alt={`Imagen de ${producto.nombre || 'producto'}`}
                      className="object-cover w-full h-full"
                      onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/56x56/1f2937/6b7280?text=Sin+Imagen" }}
                    />
                  ) : (
                    <span className="text-gray-600 text-[10px] text-center px-1">Sin imagen</span>
                  )}
                </div>

                {/* Nombre y Stock */}
                <div className="whitespace-normal break-words overflow-hidden">
                  <div className="font-medium text-gray-200">{producto.nombre || 'Producto sin nombre'}</div>
                  <div className="text-gray-400 text-xs">
                    Stock: {producto.stock ?? 0}
                  </div>
                </div>

                {/* Stock (columna separada) */}
                <div className="text-right">
                  <span className={`font-semibold ${parseFloat(producto.stock || 0) <= 0 ? 'text-red-400' : 'text-green-400'}`}>
                    {producto.stock ?? 0}
                  </span>
                </div>

                {/* Botón de movimientos */}
                <div className="flex justify-center">
                  <button 
                    onClick={() => verMovimientos(producto)} 
                    className="text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1 cursor-pointer p-2 rounded-md hover:bg-dark-700/50" 
                  >
                    <Activity size={16} /> 
                    <span>Ver Movimientos</span>
                  </button>
                </div>
              </div>
            ))}
            {!loading && productosFiltradosYOrdenados.length === 0 && (
                <div className="text-center py-8 bg-dark-800/50 rounded-lg border border-dark-700/50">
                  <Package size={48} className="mx-auto text-gray-600 mb-3" />
                  <p className="text-gray-400">
                    No se encontraron productos.
                  </p>
                </div>
            )}
          </div>
        )}
      </div>

      {/* Modal de movimientos */}
      {modalActivo && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-[90] p-4" 
          onClick={() => setModalActivo(false)} 
        >
          <div
            onClick={(e) => e.stopPropagation()} 
            className="bg-dark-800 w-full max-w-md md:max-w-lg lg:max-w-xl rounded-lg p-6 shadow-dropdown-dark border border-dark-700 max-h-[90vh] overflow-y-auto relative z-[95]" 
          >
            {/* Encabezado del modal */}
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-dark-800 pb-2 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-gray-100">
                Movimientos de: {productoActual?.nombre || 'Producto desconocido'}
              </h3>
              <button
                onClick={() => setModalActivo(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <IconX size={20} /> 
              </button>
            </div>

            {/* Contenido del modal - la tabla de movimientos */}
            {movimientos.length === 0 ? (
                <div className="text-center py-8">
                    <Clock size={48} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">
                        No hay movimientos registrados para este producto.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto text-sm"> {/* <-- CORRECCIÓN AQUÍ: overflow-x-auto para la tabla */}
                  <table className="min-w-full border-collapse">
                    <thead className="bg-dark-900">
                      <tr>
                        <th className="p-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Fecha</th> {/* added whitespace-nowrap */}
                        <th className="p-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Movimiento</th> {/* added whitespace-nowrap */}
                        <th className="p-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Referencia</th> {/* added whitespace-nowrap */}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700/50">
                      {movimientos.map((m, index) => {
                        const Icon = m.IconoFlecha; 

                        return (
                          <tr key={m.id || `mov-${index}`} className="hover:bg-dark-700/50">
                            <td className="p-2 whitespace-nowrap text-gray-300">
                              {m.fecha instanceof Date && !isNaN(m.fecha.getTime()) ? m.fecha.toLocaleString() : 'Fecha inválida'}
                            </td>
                            <td className={`p-2 font-semibold ${m.colorTexto} flex items-center gap-1 whitespace-nowrap`}> {/* added whitespace-nowrap */}
                              {Icon && <Icon size={14} className="flex-shrink-0" />} 
                              {m.tipoMovimiento} <span className="font-bold">{m.cantidadMostrada}</span>
                            </td>
                            <td className="p-2 text-gray-300 whitespace-nowrap">{m.referencia || '-'}</td> {/* added whitespace-nowrap */}
                          </tr>
                        );
                      })}
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