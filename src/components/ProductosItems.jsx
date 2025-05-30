// src/components/ProductosItems.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import ModalEditarProducto from './ModalEditarProducto'; 
import toast from 'react-hot-toast';
import { 
  Plus, 
  Trash2, 
  Save, 
  Search, 
  Edit, 
  Package, 
  Filter, 
  CheckSquare, 
  Square 
} from 'lucide-react';

export default function ProductosItems() {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true); // Añadido para gestionar la carga de productos
  const [busqueda, setBusqueda] = useState('');
  const [modalActivo, setModalActivo] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  
  // CORRECCIÓN CRUCIAL AQUÍ: Inicializar useState con un nuevo Set
  const [seleccionados, setSeleccionados] = useState(new Set()); 
  
  // Estado para el filtro de stock
  const [stockFilter, setStockFilter] = useState('con-stock');

  const [sortColumn, setSortColumn] = useState('nombre');
  const [sortDirection, setSortDirection] = useState('asc');

  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProductForm, setNewProductForm] = useState({
      nombre: '', stock: '', precio_normal: '', promocion: '',
      costo_final_usd: '', costo_final_mxn: '', codigo: '',
      categoria: '', imagen_url: '',
  });
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    setLoading(true); // Iniciar carga
    const { data, error } = await supabase.from('productos').select('*');
    if (error) {
      console.error('Error al cargar productos:', error.message);
      toast.error('Error al cargar productos.');
    } else {
      setProductos(data || []);
    }
    setLoading(false); // Finalizar carga
  };

  const handleSort = (column) => {
      if (sortColumn === column) {
          setSortDirection(prevDirection => (prevDirection === 'asc' ? 'desc' : 'asc'));
      } else {
          setSortColumn(column);
          setSortDirection('asc');
      }
  };

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

      // 2. Filtrar por stock según stockFilter
      if (stockFilter === 'con-stock') {
          productosTrabajo = productosTrabajo.filter(p => p.stock && parseFloat(p.stock) > 0);
      } else if (stockFilter === 'sin-stock') {
          productosTrabajo = productosTrabajo.filter(p => !p.stock || parseFloat(p.stock) <= 0);
      }

      // 3. Ordenar
      if (sortColumn) {
          productosTrabajo.sort((a, b) => {
              const aValue = a[sortColumn];
              const bValue = b[sortColumn];

              if (aValue == null && bValue == null) return 0;
              if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
              if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

              const numColumns = ['stock', 'promocion', 'precio_normal', 'costo_final_usd', 'costo_final_mxn'];
              if (numColumns.includes(sortColumn)) {
                   const aNum = parseFloat(aValue) || 0;
                   const bNum = parseFloat(bValue) || 0;
                   if (aNum < bNum) return sortDirection === 'asc' ? -1 : 1;
                   if (aNum > bNum) return sortDirection === 'asc' ? 1 : -1;
                   return 0;
              }

              const aString = String(aValue).toLowerCase();
              const bString = String(bValue).toLowerCase();
              if (aString < bString) return sortDirection === 'asc' ? -1 : 1;
              if (aString > bString) return sortDirection === 'asc' ? 1 : -1;
              return 0;
          });
      }
      return productosTrabajo;
  }, [productos, busqueda, stockFilter, sortColumn, sortDirection]);


  const toggleSeleccionarTodos = () => {
    if (Array.from(seleccionados).length === productosFiltradosYOrdenados.length && productosFiltradosYOrdenados.length > 0) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(productosFiltradosYOrdenados.map(p => p.id)));
    }
  };

  const toggleSeleccionarProducto = (id) => {
    const newSel = new Set(seleccionados);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSeleccionados(newSel);
  };

  const eliminarSeleccionados = async () => {
    const ids = Array.from(seleccionados);
    if (ids.length === 0) {
      toast.info('No hay productos seleccionados para eliminar.');
      return;
    }
    if (!window.confirm(`¿Estás seguro de eliminar ${ids.length} producto(s) seleccionado(s)? Esta acción también eliminará sus movimientos de inventario y registros de compras/ventas asociados.`)) {
        return;
    }
    console.log(`Attempting to delete related records for product IDs: ${ids.join(', ')}`);
    const { error: errReg } = await supabase.from('registros_inventario').delete().in('producto_id', ids);
    if (errReg) console.error('Error al borrar registros_inventario:', errReg.message);
    const { error: errMov } = await supabase.from('movimientos_inventario').delete().in('producto_id', ids);
    if (errMov) console.error('Error al borrar movimientos_inventario:', errMov.message);
    const { error: errDetalleVenta } = await supabase.from('detalle_venta').delete().in('producto_id', ids);
    if (errDetalleVenta) console.error('Error al borrar detalle_venta:', errDetalleVenta.message);
    const { error: errCompraItems } = await supabase.from('compra_items').delete().in('producto_id', ids);
    if (errCompraItems) console.error('Error al borrar compra_items:', errCompraItems.message);

    console.log(`Attempting to delete products for IDs: ${ids.join(', ')}`);
    const { error: errProd } = await supabase.from('productos').delete().in('id', ids);
    if (errProd) {
      console.error('Error al borrar productos:', errProd.message);
      toast.error('Error al eliminar productos.');
    } else {
        console.log(`Deleted products for IDs: ${ids.join(', ')}`);
        toast.success(`${ids.length} producto(s) eliminado(s) exitosamente.`);
    }
    setSeleccionados(new Set());
    await cargarProductos();
  };

  const handleEditarLocal = (id, campo, valor) => {
    setProductos(prev =>
      prev.map(p => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  };

  const handleActualizarPrecios = async () => {
      setActualizando(true);
      const updates = productosFiltradosYOrdenados.map(p => ({
        id: p.id,
        promocion: parseFloat(p.promocion) || null,
        precio_normal: parseFloat(p.precio_normal) || null
      }));
       const updatesToApply = updates.filter(item => seleccionados.has(item.id));
       if (updatesToApply.length === 0) {
           toast.info('No hay productos seleccionados para actualizar precios.');
           setActualizando(false);
           return;
       }
      const updatePromises = updatesToApply.map(item =>
          supabase.from('productos')
              .update({ promocion: item.promocion, precio_normal: item.precio_normal })
              .eq('id', item.id)
      );
      const results = await Promise.all(updatePromises);
      let hasError = false;
      results.forEach((result, index) => {
          if (result.error) {
              console.error(`Error actualizando producto ${updatesToApply[index].id}:`, result.error.message);
              toast.error(`Error al actualizar producto ${updatesToApply[index].id}.`);
              hasError = true;
          }
      });
      if (!hasError) {
           toast.success(`${updatesToApply.length} precios actualizados exitosamente.`);
      }
      setSeleccionados(new Set());
      setActualizando(false);
  };

  const abrirModal = producto => {
    setProductoEditando(producto);
    setModalActivo(true);
  };

  const cerrarModal = () => {
    setModalActivo(false);
    setProductoEditando(null);
    cargarProductos();
  };

  const formatCurrencyMXN = (number) => {
    const num = parseFloat(number);
    if (isNaN(num)) { return '$0.00'; }
    return num.toLocaleString('es-MX', {
      style: 'currency', currency: 'MXN', minimumFractionDigits: 2, maximumFractionDigits: 2,
    });
  };

  const costoTotalStock = useMemo(() => productos.reduce((sum, p) => sum + (parseFloat(p.costo_final_mxn || 0) * parseFloat(p.stock || 0)), 0), [productos]);
  const totalValorStock = useMemo(() => productos.reduce((sum, p) => sum + (parseFloat(p.promocion || p.precio_normal || 0) * parseFloat(p.stock || 0)), 0), [productos]);
  const gananciasProyectadas = totalValorStock - costoTotalStock;
  const totalUnidadesStock = useMemo(() => productos.reduce((sum, p) => sum + (parseFloat(p.stock || 0)), 0), [productos]);

  const handleNewProductInputChange = (e) => {
      const { name, value } = e.target;
      setNewProductForm(prev => ({ ...prev, [name]: value }));
  };

  const handleAddProduct = async () => {
      setIsAddingProduct(true);
      if (!newProductForm.nombre || newProductForm.stock === '' || newProductForm.precio_normal === '') {
          toast.error('El nombre, stock y precio son obligatorios.');
          setIsAddingProduct(false);
          return;
      }
      const stockNum = parseFloat(newProductForm.stock) || 0;
      const precioNum = parseFloat(newProductForm.precio_normal) || 0;
      const precioPromocionNum = parseFloat(newProductForm.promocion) || null;
      const costoFinalUsdNum = parseFloat(newProductForm.costo_final_usd) || null;
      const costoFinalMxnNum = parseFloat(newProductForm.costo_final_mxn) || null;

      if (stockNum < 0 || precioNum < 0 || (precioPromocionNum !== null && precioPromocionNum < 0) || (costoFinalUsdNum !== null && costoFinalUsdNum < 0) || (costoFinalMxnNum !== null && costoFinalMxnNum < 0)) {
          toast.error('Los valores numéricos no pueden ser negativos.');
          setIsAddingProduct(false);
          return;
      }
      const productToInsert = {
          nombre: newProductForm.nombre.trim(), stock: stockNum, precio_normal: precioNum,
          promocion: precioPromocionNum, costo_final_usd: costoFinalUsdNum, costo_final_mxn: costoFinalMxnNum,
          codigo: newProductForm.codigo.trim() || null, categoria: newProductForm.categoria.trim() || null,
          imagen_url: newProductForm.imagen_url.trim() || null,
      };
      const { error } = await supabase.from('productos').insert([productToInsert]).select().single();
      if (error) {
          console.error('Error al agregar producto:', error.message);
          toast.error(`Error al agregar producto: ${error.message}`);
      } else {
          toast.success('Producto agregado exitosamente!');
          setNewProductForm({
              nombre: '', stock: '', precio_normal: '', promocion: '', costo_final_usd: '',
              costo_final_mxn: '', codigo: '', categoria: '', imagen_url: ''
          });
          setShowAddProductModal(false);
          cargarProductos();
      }
      setIsAddingProduct(false);
  };

  const closeAddProductModal = () => {
      setShowAddProductModal(false);
      setNewProductForm({
          nombre: '', stock: '', precio_normal: '', promocion: '', costo_final_usd: '',
          costo_final_mxn: '', codigo: '', categoria: '', imagen_url: ''
      });
  };

  // Contadores para los botones de filtro de stock
  const countConStock = useMemo(() => productos.filter(p => p.stock && parseFloat(p.stock) > 0).length, [productos]);
  const countSinStock = useMemo(() => productos.filter(p => !p.stock || parseFloat(p.stock) <= 0).length, [productos]);


  return (
    <div>
      <div className="mb-4 p-4 border border-dark-700/50 rounded-lg shadow-card-dark bg-dark-900/50 flex flex-wrap gap-x-6 gap-y-2 justify-around items-center text-sm">
        <div className="text-gray-300">Costo de stock: <span className="font-semibold text-gray-100">{formatCurrencyMXN(costoTotalStock)}</span></div>
        <div className="text-gray-300">Total en stock (Venta): <span className="font-semibold text-gray-100">{formatCurrencyMXN(totalValorStock)}</span></div>
        <div className="text-gray-300">Ganancias proyectadas: <span className="font-semibold text-success-400">{formatCurrencyMXN(gananciasProyectadas)}</span></div>
        <div className="text-gray-300">Total artículos en tienda: <span className="font-semibold text-gray-100">{totalUnidadesStock}</span></div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
            <button
                onClick={() => setShowAddProductModal(true)}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-xs md:text-sm whitespace-nowrap flex items-center gap-1"
            >
                <Plus size={16} />
                Agregar producto
            </button>
            <button
                onClick={eliminarSeleccionados}
                disabled={seleccionados.size === 0}
                className="px-4 py-2 bg-error-600 text-white rounded-lg hover:bg-error-700 disabled:opacity-50 text-xs md:text-sm flex items-center gap-1"
            >
                <Trash2 size={16} />
                Eliminar ({seleccionados.size})
            </button>
            <button
                onClick={handleActualizarPrecios}
                disabled={actualizando || seleccionados.size === 0}
                className="px-4 py-2 bg-success-600 text-white rounded-lg hover:bg-success-700 disabled:opacity-50 text-xs md:text-sm flex items-center gap-1"
            >
                <Save size={16} />
                {actualizando ? 'Actualizando...' : 'Actualizar Precios'}
            </button>
        </div>
      </div>

      {/* Buscador, selección y filtros de stock */}
      <div className="flex flex-col md:flex-row items-center mb-4 gap-4">
        <label className="inline-flex items-center">
          <div 
            onClick={toggleSeleccionarTodos} 
            className="cursor-pointer text-gray-300 hover:text-gray-100 transition-colors"
          >
            {productosFiltradosYOrdenados.length > 0 && Array.from(seleccionados).length === productosFiltradosYOrdenados.length ? ( 
              <CheckSquare size={18} className="text-primary-400" />
            ) : (
              <Square size={18} />
            )}
          </div>
          <span className="ml-2 text-sm text-gray-300">Seleccionar todos ({seleccionados.size}/{productosFiltradosYOrdenados.length})</span>
        </label>
        
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className="text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Buscar producto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            className="pl-10 w-full p-2 bg-dark-900 border border-dark-700 rounded-lg text-gray-200 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
        
        {/* Botones de filtro de stock */}
        <div className="flex space-x-2">
            <button
                onClick={() => setStockFilter('con-stock')}
                className={`px-3 py-2 text-xs md:text-sm font-medium rounded-lg border transition-colors flex items-center gap-1 ${stockFilter === 'con-stock' ? 'bg-success-900/50 text-success-300 border-success-800/50' : 'bg-dark-900 text-gray-400 border-dark-700 hover:bg-dark-800'}`}
            >
                <Filter size={16} />
                Con Stock ({countConStock})
            </button>
            <button
                onClick={() => setStockFilter('sin-stock')}
                className={`px-3 py-2 text-xs md:text-sm font-medium rounded-lg border transition-colors flex items-center gap-1 ${stockFilter === 'sin-stock' ? 'bg-error-900/50 text-error-300 border-error-800/50' : 'bg-dark-900 text-gray-400 border-dark-700 hover:bg-dark-800'}`}
            >
                <Filter size={16} />
                Sin Stock ({countSinStock})
            </button>
            <button
                onClick={() => setStockFilter('todos')}
                className={`px-3 py-2 text-xs md:text-sm font-medium rounded-lg border transition-colors flex items-center gap-1 ${stockFilter === 'todos' ? 'bg-dark-700 text-gray-200 border-dark-600' : 'bg-dark-900 text-gray-400 border-dark-700 hover:bg-dark-800'}`}
            >
                <Filter size={16} />
                Todos ({productos.length})
            </button>
        </div>
      </div>

      {/* Contenedor para la tabla de ProductosItems */}
      <div className="overflow-x-auto rounded-lg shadow-card-dark border border-dark-700/50 bg-dark-800/50">
        {/* Encabezados de tabla */}
        {/* MODIFICADO: Columna de Imagen oculta en móviles (hidden) y visible en md:block */}
        <div className="grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[auto_60px_1fr_auto_auto_auto] gap-2 items-center border-b border-dark-700 rounded-t-lg p-2 text-xs font-semibold text-gray-400 uppercase tracking-wider bg-dark-900/50 sticky top-0 z-10">
            <div className="p-1"></div> {/* Celda vacía para el checkbox de selección */}
            <div className="hidden md:block p-1">Imagen</div> {/* Oculto en móvil, visible en md */}
            <div className="p-1 cursor-pointer hover:text-gray-200 flex items-center gap-1 whitespace-nowrap" onClick={() => handleSort('nombre')}> 
                Nombre {sortColumn === 'nombre' && (<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>)}
            </div>
            <div className="p-1 text-right cursor-pointer hover:text-gray-200 flex items-center gap-1 justify-end whitespace-nowrap" onClick={() => handleSort('promocion')}> 
                Promoción {sortColumn === 'promocion' && (<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>)}
            </div>
            <div className="p-1 text-right cursor-pointer hover:text-gray-200 flex items-center gap-1 justify-end whitespace-nowrap" onClick={() => handleSort('precio_normal')}> 
                P. Normal {sortColumn === 'precio_normal' && (<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>)}
            </div>
            <div className="p-1 text-center whitespace-nowrap">Acciones</div> 
        </div>

        {/* Lista de productos */}
        {loading ? ( // Mostrar loader si productos están cargando
          <div className="flex justify-center items-center h-64 bg-dark-800/50 rounded-lg border border-dark-700/50">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
          </div>
        ) : (
          <div className="space-y-2 p-2"> 
            {productosFiltradosYOrdenados.map(producto => (
              <div
                key={producto.id}
                className={`grid grid-cols-[auto_1fr_auto_auto_auto] md:grid-cols-[auto_60px_1fr_auto_auto_auto] gap-2 items-center border border-dark-700/50 rounded-lg p-2 shadow-card-dark hover:shadow-dropdown-dark transition-shadow bg-dark-800/50 text-xs`}
              >
                <div 
                  onClick={() => toggleSeleccionarProducto(producto.id)} 
                  className="cursor-pointer text-gray-300 hover:text-gray-100 transition-colors"
                >
                  {seleccionados.has(producto.id) ? (
                    <CheckSquare size={18} className="text-primary-400" />
                  ) : (
                    <Square size={18} />
                  )}
                </div>
                {/* Columna de Imagen: Oculta en móvil, visible en md */}
                <div className="hidden md:flex w-14 h-14 bg-dark-900 rounded-lg overflow-hidden items-center justify-center">
                  {producto.imagen_url ? (
                    <img src={producto.imagen_url} alt={producto.nombre || 'Producto sin nombre'} className="object-cover w-full h-full" onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/56x56/1f2937/6b7280?text=Sin+Imagen" }} />
                  ) : (
                    <span className="text-gray-600 text-[10px] text-center">Sin imagen</span>
                  )}
                </div>
                <div className="whitespace-normal break-words max-w-full">
                  <div className="font-medium text-gray-200">{producto.nombre || 'Producto sin nombre'}</div>
                  <div className="text-gray-400 text-[11px]">{producto.categoria || 'Sin categoría'}</div>
                  <div className={`text-[11px] font-semibold ${parseFloat(producto.stock || 0) <= 0 ? 'text-error-400' : 'text-success-400'}`}>
                    Stock: {producto.stock ?? 0}
                  </div>
                </div>
                <div className="flex flex-col items-start">
                  <label className="text-gray-400 mb-1 text-[10px]">Promoción</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={(producto.promocion ?? '').toString()}
                    onChange={e => handleEditarLocal(producto.id, 'promocion', e.target.value)}
                    className="w-20 border border-dark-700 bg-dark-900 px-2 py-1 rounded text-right text-xs text-gray-200 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div className="flex flex-col items-start">
                  <label className="text-gray-400 mb-1 text-[10px]">P. Normal</label>
                  <input
                    type="number" min="0" step="0.01"
                    value={(producto.precio_normal ?? '').toString()}
                    onChange={e => handleEditarLocal(producto.id, 'precio_normal', e.target.value)}
                    className="w-20 border border-dark-700 bg-dark-900 px-2 py-1 rounded text-right text-xs text-gray-200 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <button 
                    onClick={() => abrirModal(producto)} 
                    className="text-primary-400 hover:text-primary-300 transition-colors flex items-center gap-1"
                  >
                    <Edit size={14} />
                    Editar
                  </button>
                </div>
              </div> 
            ))}
            {!loading && productosFiltradosYOrdenados.length === 0 && ( // Mostrar mensaje si no hay productos y no está cargando
              <div className="text-center py-8 bg-dark-800/50 rounded-lg border border-dark-700/50">
                <Package size={48} className="mx-auto text-gray-600 mb-3" />
                <p className="text-gray-400">
                  {busqueda ? 'No se encontraron productos que coincidan con tu búsqueda y filtros.'
                   : (stockFilter !== 'todos') ? 'No hay productos que coincidan con el filtro de stock actual.'
                   : 'No hay productos disponibles.'
                }
              </p>
            </div>
          )}
          </div> 
        )}
      </div> {/* <--- Este es el cierre del div "overflow-x-auto rounded-lg ..." */}

      {modalActivo && productoEditando && (
        <ModalEditarProducto
          producto={productoEditando}
          onClose={cerrarModal}
          onGuardado={cerrarModal}
        />
      )}

      {showAddProductModal && (
          <div
              className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
              onClick={closeAddProductModal}
          >
              <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700 w-full max-w-md p-6 max-h-[90vh] overflow-y-auto relative"
              >
                  <div className="flex justify-between items-center mb-4 border-b border-dark-700 pb-3">
                      <h3 className="text-xl font-bold text-gray-100">Agregar Nuevo Producto</h3>
                      <button onClick={closeAddProductModal} className="text-gray-400 hover:text-gray-200 transition-colors">&times;</button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mb-6">
                      <div>
                          <label htmlFor="nombre" className="block text-sm font-medium text-gray-300 mb-1">Nombre del Producto <span className="text-error-400">*</span></label>
                          <input type="text" id="nombre" name="nombre" value={newProductForm.nombre} onChange={handleNewProductInputChange} className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200" required />
                      </div>
                       <div>
                          <label htmlFor="stock" className="block text-sm font-medium text-gray-300 mb-1">Stock Inicial <span className="text-error-400">*</span></label>
                          <input type="number" id="stock" name="stock" min="0" step="any" value={newProductForm.stock} onChange={handleNewProductInputChange} className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200" required />
                      </div>
                       <div>
                          <label htmlFor="precio_normal" className="block text-sm font-medium text-gray-300 mb-1">Precio de Venta (Normal) <span className="text-error-400">*</span></label>
                          <input type="number" id="precio_normal" name="precio_normal" min="0" step="0.01" value={newProductForm.precio_normal} onChange={handleNewProductInputChange} className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200" required />
                      </div>
                       <div>
                          <label htmlFor="promocion" className="block text-sm font-medium text-gray-300 mb-1">Precio de Venta (Promoción)</label>
                          <input type="number" id="promocion" name="promocion" min="0" step="0.01" value={newProductForm.promocion} onChange={handleNewProductInputChange} className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200" />
                      </div>
                       <div>
                          <label htmlFor="costo_final_usd" className="block text-sm font-medium text-gray-300 mb-1">Costo Final (USD)</label>
                          <input type="number" id="costo_final_usd" name="costo_final_usd" min="0" step="0.01" value={newProductForm.costo_final_usd} onChange={handleNewProductInputChange} className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200" />
                      </div>
                       <div>
                          <label htmlFor="costo_final_mxn" className="block text-sm font-medium text-gray-300 mb-1">Costo Final (MXN)</label>
                          <input type="number" id="costo_final_mxn" name="costo_final_mxn" min="0" step="0.01" value={newProductForm.costo_final_mxn} onChange={handleNewProductInputChange} className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200" />
                      </div>
                       <div>
                          <label htmlFor="codigo" className="block text-sm font-medium text-gray-300 mb-1">Código</label>
                          <input type="text" id="codigo" name="codigo" value={newProductForm.codigo} onChange={handleNewProductInputChange} className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200" />
                      </div>
                       <div>
                          <label htmlFor="categoria" className="block text-sm font-medium text-gray-300 mb-1">Categoría</label>
                          <input type="text" id="categoria" name="categoria" value={newProductForm.categoria} onChange={handleNewProductInputChange} className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200" />
                      </div>
                       <div>
                          <label htmlFor="imagen_url" className="block text-sm font-medium text-gray-300 mb-1">URL Imagen</label>
                          <input type="text" id="imagen_url" name="imagen_url" value={newProductForm.imagen_url} onChange={handleNewProductInputChange} className="w-full border border-dark-700 bg-dark-900 px-3 py-2 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200" />
                      </div>
                  </div>
                  <div className="flex justify-end gap-4">
                      <button
                          onClick={handleAddProduct}
                          disabled={isAddingProduct || !newProductForm.nombre || newProductForm.stock === '' || newProductForm.precio_normal === ''}
                          className="px-6 py-2 bg-primary-600 text-white rounded-md font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                          {isAddingProduct ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                              <span>Agregando...</span>
                            </>
                          ) : (
                            <>
                              <Plus size={16} />
                              <span>Guardar Producto</span>
                            </>
                          )}
                      </button>
                      <button
                          onClick={closeAddProductModal}
                          disabled={isAddingProduct}
                          className="px-6 py-2 bg-dark-700 text-gray-200 rounded-md font-semibold hover:bg-dark-600 transition-colors disabled:opacity-50"
                      >
                          Cancelar
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}