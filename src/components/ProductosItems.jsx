import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import ModalEditarProducto from './ModalEditarProducto';
import toast from 'react-hot-toast';

export default function ProductosItems() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalActivo, setModalActivo] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [mostrarSinStock, setMostrarSinStock] = useState(false); // Nuevo estado para controlar la visibilidad de productos sin stock

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
    if (error) {
      console.error('Error al cargar productos:', error.message);
      toast.error('Error al cargar productos.');
    } else {
      setProductos(data || []);
    }
  };

  const toggleSeleccionarTodos = () => {
    if (seleccionados.size === productosFiltrados.length && productosFiltrados.length > 0) { // Ajustado para usar productosFiltrados
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(productosFiltrados.map(p => p.id))); // Ajustado para usar productosFiltrados
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
    if (!window.confirm(`¿Estás seguro de eliminar ${ids.length} producto(s) seleccionado(s)? Esto también eliminará sus movimientos de inventario y registros de compras/ventas asociados.`)) {
        return;
    }

    console.log(`Attempting to delete from registros_inventario for IDs: ${ids.join(', ')}`);
    const { error: errReg } = await supabase
      .from('registros_inventario')
      .delete()
      .in('producto_id', ids);
    if (errReg) {
      console.error('Error al borrar registros_inventario:', errReg.message);
    } else {
        console.log(`Deleted from registros_inventario for IDs: ${ids.join(', ')}`);
    }

    console.log(`Attempting to delete from movimientos_inventario for IDs: ${ids.join(', ')}`);
    const { error: errMov } = await supabase
      .from('movimientos_inventario')
      .delete()
      .in('producto_id', ids);
    if (errMov) {
      console.error('Error al borrar movimientos_inventario:', errMov.message);
      toast.error('Error al eliminar movimientos de inventario.');
      return;
    } else {
        console.log(`Deleted from movimientos_inventario for IDs: ${ids.join(', ')}`);
    }

     console.log(`Attempting to delete from detalle_venta for IDs: ${ids.join(', ')}`);
     const { error: errDetalleVenta } = await supabase
       .from('detalle_venta')
       .delete()
       .in('producto_id', ids);
     if (errDetalleVenta) {
       console.error('Error al borrar detalle_venta:', errDetalleVenta.message);
     } else {
        console.log(`Deleted from detalle_venta for IDs: ${ids.join(', ')}`);
     }

     console.log(`Attempting to delete from compra_items for IDs: ${ids.join(', ')}`);
     const { error: errCompraItems } = await supabase
       .from('compra_items')
       .delete()
       .in('producto_id', ids);
     if (errCompraItems) {
       console.error('Error al borrar compra_items:', errCompraItems.message);
     } else {
        console.log(`Deleted from compra_items for IDs: ${ids.join(', ')}`);
     }

    console.log(`Attempting to delete from productos for IDs: ${ids.join(', ')}`);
    const { error: errProd } = await supabase
      .from('productos')
      .delete()
      .in('id', ids);
    if (errProd) {
      console.error('Error al borrar productos:', errProd.message);
      toast.error('Error al eliminar productos.');
    } else {
        console.log(`Deleted from productos for IDs: ${ids.join(', ')}`);
        toast.success(`${ids.length} producto(s) eliminado(s) exitosamente.`);
    }

    setSeleccionados(new Set());
    await cargarProductos();
  };

  const handleEditar = (id, campo, valor) => {
    setProductos(prev =>
      prev.map(p => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  };

  // eslint-disable-next-line no-unused-vars
  const actualizarCampo = async (id, cambios) => { // Declarada pero no usada, considera removerla si no es necesaria
    const { error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', id);
    if (error) {
      console.error(`Error actualizando producto ${id}:`, error.message);
      toast.error(`Error al actualizar producto ${id}.`);
    }
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

  // Lógica de filtrado actualizada
  const productosFiltrados = productos
    .filter(p =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    )
    .filter(p => {
      if (mostrarSinStock) {
        return true; // Mostrar todos si mostrarSinStock es true
      }
      return p.stock && parseFloat(p.stock) > 0; // Por defecto, solo mostrar con stock > 0
    });

  const costoStock = productos.reduce(
    (sum, p) => sum + (parseFloat(p.costo_final_mxn || 0) * parseFloat(p.stock || 0)),
    0
  );

  const totalStock = productos.reduce(
    (sum, p) => sum + (parseFloat(p.promocion || 0) * parseFloat(p.stock || 0)),
    0
  );

  const ganancias = totalStock - costoStock;

  const handleActualizar = async () => {
    setActualizando(true);
    const updates = productos.map(p => ({
      id: p.id,
      promocion: Number(p.promocion) || 0,
      precio_normal: Number(p.precio_normal) || 0
    }));

    const updatePromises = updates.map(item =>
        supabase.from('productos')
            .update({ promocion: item.promocion, precio_normal: item.precio_normal })
            .eq('id', item.id)
    );

    const results = await Promise.all(updatePromises);
    let hasError = false;
    results.forEach((result, index) => {
        if (result.error) {
            console.error(`Error actualizando producto ${updates[index].id}:`, result.error.message);
            toast.error(`Error al actualizar producto ${updates[index].id}.`);
            hasError = true;
        }
    });

    if (!hasError) {
         toast.success('Precios actualizados exitosamente.');
    }

    await cargarProductos();
    setActualizando(false);
  };

  const formatCurrencyMXN = (number) => {
    return Number(number).toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div>
      {/* Indicadores y acciones */}
      <div className="mb-4 p-4 border rounded-lg shadow-sm bg-gray-50 flex flex-wrap gap-x-6 gap-y-2 justify-around items-center text-sm">
        <div>Costo de stock: <span className="font-semibold">{formatCurrencyMXN(costoStock)}</span></div>
        <div>Total en stock: <span className="font-semibold">{formatCurrencyMXN(totalStock)}</span></div>
        <div>Ganancias proyectadas: <span className="font-semibold">{formatCurrencyMXN(ganancias)}</span></div>
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
        <div className="flex items-center gap-4">
            <button
                onClick={eliminarSeleccionados}
                disabled={seleccionados.size === 0}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 text-xs md:text-sm"
            >
                Eliminar ({seleccionados.size})
            </button>
            <button
                onClick={handleActualizar}
                disabled={actualizando}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs md:text-sm"
            >
                {actualizando ? 'Actualizando...' : 'Actualizar Precios'}
            </button>
        </div>
      </div>


      {/* Buscador, selección y botón para mostrar/ocultar sin stock */}
      <div className="flex flex-col md:flex-row items-center mb-4 gap-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={productosFiltrados.length > 0 && seleccionados.size === productosFiltrados.length}
            onChange={toggleSeleccionarTodos}
            disabled={productosFiltrados.length === 0} // Deshabilitar si no hay productos filtrados
            className="form-checkbox"
          />
          <span className="ml-2">Seleccionar todos ({seleccionados.size}/{productosFiltrados.length})</span>
        </label>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3"
        />
        <button
          onClick={() => setMostrarSinStock(!mostrarSinStock)}
          className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors text-xs md:text-sm whitespace-nowrap"
        >
          {mostrarSinStock ? 'Ocultar sin stock' : 'Mostrar todos los productos'}
        </button>
      </div>

      {/* Lista de productos */}
      <div className="space-y-2">
        {productosFiltrados.map(producto => (
          <div
            key={producto.id}
            className={`grid grid-cols-[auto_60px_1fr_auto_auto_auto] gap-2 items-center border rounded-lg p-2 shadow-sm hover:shadow transition text-xs ${parseFloat(producto.stock || 0) <= 0 && !mostrarSinStock ? 'opacity-50' : ''}`} // Atenuar si no hay stock y no se están mostrando todos
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
                type="number"
                value={producto.promocion ?? ''}
                onChange={e => handleEditar(producto.id, 'promocion', e.target.value)}
                className="w-20 border px-2 py-1 rounded text-right text-xs"
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1 text-[10px]">P. Normal</label>
              <input
                type="number"
                value={producto.precio_normal ?? ''}
                onChange={e => handleEditar(producto.id, 'precio_normal', e.target.value)}
                className="w-20 border px-2 py-1 rounded text-right text-xs"
                placeholder="0.00"
              />
            </div>
            <div>
              <button
                onClick={() => abrirModal(producto)}
                className="text-blue-600 hover:underline text-xs"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
        {productosFiltrados.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            {busqueda && productos.filter(p => p.stock && parseFloat(p.stock) > 0).length > 0 && !mostrarSinStock ? 'No se encontraron productos con stock para tu búsqueda. Prueba "Mostrar todos los productos".' : 'No se encontraron productos.'}
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
    </div>
  );
}