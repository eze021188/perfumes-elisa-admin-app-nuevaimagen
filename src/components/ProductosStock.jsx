// src/pages/ProductosStock.jsx
import { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Search, Package, Activity, Clock, ArrowRight, ArrowLeft } from 'lucide-react';

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
    setProductoActual(producto);
    setMovimientos([]);

    const { data, error } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('producto_id', producto.id)
      .order('fecha', { ascending: false });

    if (error) {
      console.error('Error al cargar movimientos:', error.message);
      toast.error('Error al cargar movimientos.');
      setMovimientos([]);
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


  return (
    <div className="container mx-auto">
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

      {/* Encabezados de la lista con ordenamiento */}
      <div className="grid grid-cols-[60px_1fr_minmax(80px,100px)_minmax(80px,100px)] gap-4 items-center border border-dark-700 rounded-lg p-3 shadow-card-dark bg-dark-900 text-sm font-semibold text-gray-400 uppercase tracking-wider mb-2">
          <div className="p-1">Imagen</div>
          <div
              className="p-1 cursor-pointer hover:text-gray-200 flex items-center gap-1"
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
              className="p-1 text-right cursor-pointer hover:text-gray-200 flex items-center gap-1 justify-end"
              onClick={() => handleSort('stock')}
          >
              Stock
              {sortColumn === 'stock' && (
                <span className="ml-1">
                  {sortDirection === 'asc' ? '▲' : '▼'}
                </span>
              )}
          </div>
          <div className="p-1 text-center">Movimientos</div>
      </div>

      {/* Lista de productos con stock */}
      {loading ? (
        <div className="flex justify-center items-center h-64 bg-dark-800/50 rounded-lg border border-dark-700/50">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
        </div>
      ) : (
        <div className="space-y-2">
          {productosFiltradosYOrdenados.map((producto) => (
            <div
              key={producto.id}
              className="grid grid-cols-[60px_1fr_minmax(80px,100px)_minmax(80px,100px)] gap-4 items-center border border-dark-700/50 rounded-lg p-3 shadow-card-dark hover:shadow-dropdown-dark transition-all cursor-pointer bg-dark-800/50 text-sm"
              onClick={() => verMovimientos(producto)}
            >
              {/* Imagen */}
              <div className="w-14 h-14 bg-dark-900 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0">
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
                <span className={`font-semibold ${parseFloat(producto.stock || 0) <= 0 ? 'text-error-400' : 'text-success-400'}`}>
                  {producto.stock ?? 0}
                </span>
              </div>

              {/* Botón de movimientos */}
              <div className="flex justify-center">
                <button className="text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1">
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

      {/* Modal de movimientos */}
      {modalActivo && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => setModalActivo(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-dark-800 w-full max-w-md md:max-w-lg lg:max-w-xl rounded-lg p-6 shadow-dropdown-dark border border-dark-700 max-h-[90vh] overflow-y-auto relative"
          >
            {/* Encabezado */}
            <div className="flex justify-between items-center mb-4 sticky top-0 bg-dark-800 pb-2 border-b border-dark-700">
              <h3 className="text-lg font-semibold text-gray-100">
                Movimientos de: {productoActual?.nombre || 'Producto desconocido'}
              </h3>
              <button
                onClick={() => setModalActivo(false)}
                className="text-gray-400 hover:text-gray-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {movimientos.length === 0 ? (
                <div className="text-center py-8">
                    <Clock size={48} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-gray-400">
                        No hay movimientos registrados para este producto.
                    </p>
                </div>
            ) : (
                <div className="overflow-x-auto text-sm">
                  <table className="min-w-full border-collapse">
                    <thead className="bg-dark-900">
                      <tr>
                        <th className="p-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Fecha</th>
                        <th className="p-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Movimiento</th>
                        <th className="p-2 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Referencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-700/50">
                      {movimientos.map((m, index) => {
                        const esDevolucion = m.motivo === 'devolucion_ventas';
                        const tipoTexto = esDevolucion ? 'Entrada devolución' : m.tipo === 'SALIDA' ? 'VENTA' : 'ENTRADA';
                        const cantidadTexto = m.tipo === 'SALIDA' ? `-${m.cantidad}` : `+${m.cantidad}`;
                        const colorTexto = m.tipo === 'SALIDA' ? 'text-error-400' : 'text-success-400';
                        
                        return (
                          <tr key={m.id || `mov-${index}`} className="hover:bg-dark-700/50">
                            <td className="p-2 whitespace-nowrap text-gray-300">
                              {m.fecha instanceof Date && !isNaN(m.fecha.getTime()) ? m.fecha.toLocaleString() : 'Fecha inválida'}
                            </td>
                            <td className={`p-2 font-semibold ${colorTexto} flex items-center gap-1`}>
                              {m.tipo === 'SALIDA' ? <ArrowRight size={14} /> : <ArrowLeft size={14} />}
                              {tipoTexto} <span className="font-bold">{cantidadTexto}</span>
                            </td>
                            <td className="p-2 text-gray-300">{m.referencia || '-'}</td>
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