// src/components/ProductosItems.jsx 
// o src/pages/ProductosItems.jsx (asegúrate que el nombre y ruta de importación sean correctos)
import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabase';
import ModalEditarProducto from './ModalEditarProducto';
import toast from 'react-hot-toast';

export default function ProductosItems() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalActivo, setModalActivo] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [actualizando, setActualizando] = useState(false); // Para la actualización de precios
  const [seleccionados, setSeleccionados] = useState(new Set());
  
  // Estado para el filtro de stock
  const [stockFilter, setStockFilter] = useState('con-stock'); // Opciones: 'con-stock', 'sin-stock', 'todos'

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
    const { data, error } = await supabase.from('productos').select('*');
    if (error) {
      console.error('Error al cargar productos:', error.message);
      toast.error('Error al cargar productos.');
    } else {
      setProductos(data || []);
    }
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
      // Si stockFilter es 'todos', no se aplica filtro de stock.

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
    if (seleccionados.size === productosFiltradosYOrdenados.length && productosFiltradosYOrdenados.length > 0) {
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
    setActualizando(false); // Asegúrate de resetear el estado 'actualizando'
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
      <div className="mb-4 p-4 border rounded-lg shadow-sm bg-gray-50 flex flex-wrap gap-x-6 gap-y-2 justify-around items-center text-sm">
        <div>Costo de stock: <span className="font-semibold">{formatCurrencyMXN(costoTotalStock)}</span></div>
        <div>Total en stock (Venta): <span className="font-semibold">{formatCurrencyMXN(totalValorStock)}</span></div>
        <div>Ganancias proyectadas: <span className="font-semibold">{formatCurrencyMXN(gananciasProyectadas)}</span></div>
        <div>Total artículos en tienda: <span className="font-semibold">{totalUnidadesStock}</span></div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
            <button
                onClick={() => setShowAddProductModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs md:text-sm whitespace-nowrap"
            >
                Agregar producto
            </button>
            <button
                onClick={eliminarSeleccionados}
                disabled={seleccionados.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs md:text-sm"
            >
                Eliminar ({seleccionados.size})
            </button>
            <button
                onClick={handleActualizarPrecios}
                disabled={actualizando || seleccionados.size === 0}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs md:text-sm"
            >
                {actualizando ? 'Actualizando...' : 'Actualizar Precios Seleccionados'}
            </button>
        </div>
      </div>

      {/* Buscador, selección y NUEVOS filtros de stock */}
      <div className="flex flex-col md:flex-row items-center mb-4 gap-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={productosFiltradosYOrdenados.length > 0 && seleccionados.size === productosFiltradosYOrdenados.length}
            onChange={toggleSeleccionarTodos}
            disabled={productosFiltradosYOrdenados.length === 0}
            className="form-checkbox"
          />
          <span className="ml-2 text-sm text-gray-700">Seleccionar todos ({seleccionados.size}/{productosFiltradosYOrdenados.length})</span>
        </label>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3 text-sm"
        />
        {/* NUEVOS BOTONES DE FILTRO DE STOCK */}
        <div className="flex space-x-2">
            <button
                onClick={() => setStockFilter('con-stock')}
                className={`px-3 py-2 text-xs md:text-sm font-medium rounded-md border transition-colors ${stockFilter === 'con-stock' ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
                Con Stock ({countConStock})
            </button>
            <button
                onClick={() => setStockFilter('sin-stock')}
                className={`px-3 py-2 text-xs md:text-sm font-medium rounded-md border transition-colors ${stockFilter === 'sin-stock' ? 'bg-red-600 text-white border-red-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
                Sin Stock ({countSinStock})
            </button>
            <button
                onClick={() => setStockFilter('todos')}
                className={`px-3 py-2 text-xs md:text-sm font-medium rounded-md border transition-colors ${stockFilter === 'todos' ? 'bg-gray-600 text-white border-gray-700' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
                Todos ({productos.length})
            </button>
        </div>
      </div>

       <div className="grid grid-cols-[auto_60px_1fr_auto_auto_auto] gap-2 items-center border rounded-lg p-2 shadow-sm bg-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
           <div className="p-1"></div> 
           <div className="p-1">Imagen</div>
           <div className="p-1 cursor-pointer hover:text-gray-800" onClick={() => handleSort('nombre')}>
               Nombre {sortColumn === 'nombre' && (<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>)}
           </div>
           <div className="p-1 text-right cursor-pointer hover:text-gray-800" onClick={() => handleSort('promocion')}>
               Promoción {sortColumn === 'promocion' && (<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>)}
           </div>
           <div className="p-1 text-right cursor-pointer hover:text-gray-800" onClick={() => handleSort('precio_normal')}>
               P. Normal {sortColumn === 'precio_normal' && (<span>{sortDirection === 'asc' ? '▲' : '▼'}</span>)}
           </div>
            <div className="p-1 text-center">Acciones</div>
       </div>

      <div className="space-y-2">
        {productosFiltradosYOrdenados.map(producto => (
          <div
            key={producto.id}
            className={`grid grid-cols-[auto_60px_1fr_auto_auto_auto] gap-2 items-center border rounded-lg p-2 shadow-sm hover:shadow transition text-xs 
                        ${(stockFilter !== 'sin-stock' && (!producto.stock || parseFloat(producto.stock) <= 0)) ? 
                            (stockFilter === 'todos' ? 'opacity-50' : '') : ''}
                       `}
          >
            <input
              type="checkbox"
              checked={seleccionados.has(producto.id)}
              onChange={() => toggleSeleccionarProducto(producto.id)}
              className="form-checkbox"
            />
            <div className="w-14 h-14 bg-gray-100 rounded overflow-hidden flex items-center justify-center">
              {producto.imagen_url ? (
                <img src={producto.imagen_url} alt={producto.nombre || 'Producto sin nombre'} className="object-cover w-full h-full" onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/56x56/e5e7eb/4b5563?text=Sin+Imagen" }} />
              ) : (
                <span className="text-gray-400 text-[10px] text-center">Sin imagen</span>
              )}
            </div>
            <div className="whitespace-normal break-words max-w-full">
              <div className="font-medium">{producto.nombre || 'Producto sin nombre'}</div>
              <div className="text-gray-500 text-[11px]">{producto.categoria || 'Sin categoría'}</div>
              <div className={`text-[11px] font-semibold ${parseFloat(producto.stock || 0) <= 0 ? 'text-red-500' : 'text-green-600'}`}>
                Stock: {producto.stock ?? 0}
              </div>
            </div>
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1 text-[10px]">Promoción</label>
              <input
                type="number" min="0" step="0.01"
                value={(producto.promocion ?? '').toString()}
                onChange={e => handleEditarLocal(producto.id, 'promocion', e.target.value)}
                className="w-20 border px-2 py-1 rounded text-right text-xs"
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1 text-[10px]">P. Normal</label>
              <input
                type="number" min="0" step="0.01"
                value={(producto.precio_normal ?? '').toString()}
                onChange={e => handleEditarLocal(producto.id, 'precio_normal', e.target.value)}
                className="w-20 border px-2 py-1 rounded text-right text-xs"
                placeholder="0.00"
              />
            </div>
            <div>
              <button onClick={() => abrirModal(producto)} className="text-blue-600 hover:underline text-xs">
                Editar
              </button>
            </div>
          </div>
        ))}
        {productosFiltradosYOrdenados.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            {busqueda ? 'No se encontraron productos que coincidan con tu búsqueda y filtros.'
             : (stockFilter !== 'todos') ? 'No hay productos que coincidan con el filtro de stock actual.'
             : 'No hay productos disponibles.'
            }
          </div>
        )}
      </div>

      {modalActivo && productoEditando && (
        <ModalEditarProducto
          producto={productoEditando}
          onClose={cerrarModal}
          onGuardado={cerrarModal}
        />
      )}

      {showAddProductModal && (
          <div
              className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
              onClick={closeAddProductModal}
          >
              <div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 max-h-[90vh] overflow-y-auto relative"
              >
                  <div className="flex justify-between items-center mb-4 border-b pb-3">
                      <h3 className="text-xl font-bold text-gray-800">Agregar Nuevo Producto</h3>
                      <button onClick={closeAddProductModal} className="text-gray-600 hover:text-gray-800 text-2xl font-bold leading-none ml-4">&times;</button>
                  </div>
                  <div className="grid grid-cols-1 gap-4 mb-6">
                      <div>
                          <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Producto <span className="text-red-500">*</span></label>
                          <input type="text" id="nombre" name="nombre" value={newProductForm.nombre} onChange={handleNewProductInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500" required />
                      </div>
                       <div>
                          <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">Stock Inicial <span className="text-red-500">*</span></label>
                          <input type="number" id="stock" name="stock" min="0" step="any" value={newProductForm.stock} onChange={handleNewProductInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500" required />
                      </div>
                       <div>
                          <label htmlFor="precio_normal" className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta (Normal) <span className="text-red-500">*</span></label>
                          <input type="number" id="precio_normal" name="precio_normal" min="0" step="0.01" value={newProductForm.precio_normal} onChange={handleNewProductInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500" required />
                      </div>
                       <div>
                          <label htmlFor="promocion" className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta (Promoción)</label>
                          <input type="number" id="promocion" name="promocion" min="0" step="0.01" value={newProductForm.promocion} onChange={handleNewProductInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                       <div>
                          <label htmlFor="costo_final_usd" className="block text-sm font-medium text-gray-700 mb-1">Costo Final (USD)</label>
                          <input type="number" id="costo_final_usd" name="costo_final_usd" min="0" step="0.01" value={newProductForm.costo_final_usd} onChange={handleNewProductInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                       <div>
                          <label htmlFor="costo_final_mxn" className="block text-sm font-medium text-gray-700 mb-1">Costo Final (MXN)</label>
                          <input type="number" id="costo_final_mxn" name="costo_final_mxn" min="0" step="0.01" value={newProductForm.costo_final_mxn} onChange={handleNewProductInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                       <div>
                          <label htmlFor="codigo" className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                          <input type="text" id="codigo" name="codigo" value={newProductForm.codigo} onChange={handleNewProductInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                       <div>
                          <label htmlFor="categoria" className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                          <input type="text" id="categoria" name="categoria" value={newProductForm.categoria} onChange={handleNewProductInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                       <div>
                          <label htmlFor="imagen_url" className="block text-sm font-medium text-gray-700 mb-1">URL Imagen</label>
                          <input type="text" id="imagen_url" name="imagen_url" value={newProductForm.imagen_url} onChange={handleNewProductInputChange} className="w-full border border-gray-300 px-3 py-2 rounded-md focus:ring-blue-500 focus:border-blue-500" />
                      </div>
                  </div>
                  <div className="flex justify-end gap-4">
                      <button
                          onClick={handleAddProduct}
                          disabled={isAddingProduct || !newProductForm.nombre || newProductForm.stock === '' || newProductForm.precio_normal === ''}
                          className="px-6 py-2 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                          {isAddingProduct ? 'Agregando...' : 'Guardar Producto'}
                      </button>
                      <button
                          onClick={closeAddProductModal}
                          disabled={isAddingProduct}
                          className="px-6 py-2 bg-gray-300 text-gray-800 rounded-md font-semibold hover:bg-gray-400 transition-colors disabled:opacity-50"
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
