import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import ModalEditarProducto from './ModalEditarProducto';
import toast from 'react-hot-toast'; // Assuming you have react-hot-toast installed

export default function ProductosItems() {
  const [productos, setProductos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalActivo, setModalActivo] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [actualizando, setActualizando] = useState(false);
  const [seleccionados, setSeleccionados] = useState(new Set());

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*').order('id', { ascending: true });
    if (error) {
      console.error('Error al cargar productos:', error.message);
      toast.error('Error al cargar productos.'); // Show a toast message
    } else {
      setProductos(data || []); // Ensure data is an array
    }
  };

  const toggleSeleccionarTodos = () => {
    if (seleccionados.size === productos.length && productos.length > 0) { // Check if there are products before selecting all
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(productos.map(p => p.id)));
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
        return; // Cancelar si el usuario no confirma
    }


    // 1) Borrar de registros_inventario (si existe esta tabla y relación)
    // Considerar si esta tabla es necesaria o si los movimientos_inventario son suficientes
    // Si registros_inventario almacena detalles de compras, podría ser relevante.
    // Si no, esta sección puede ser eliminada.
    // Assuming 'registros_inventario' exists and has 'producto_id'
    console.log(`Attempting to delete from registros_inventario for IDs: ${ids.join(', ')}`);
    const { error: errReg } = await supabase
      .from('registros_inventario')
      .delete()
      .in('producto_id', ids);
    if (errReg) {
      console.error('Error al borrar registros_inventario:', errReg.message);
      // Decide if you want to stop here or continue deleting from other tables
      // toast.error('Error al eliminar registros de inventario.'); // Optional: show error toast
      // return; // Optional: stop the process
    } else {
        console.log(`Deleted from registros_inventario for IDs: ${ids.join(', ')}`);
    }


    // 2) Borrar de movimientos_inventario
    console.log(`Attempting to delete from movimientos_inventario for IDs: ${ids.join(', ')}`);
    const { error: errMov } = await supabase
      .from('movimientos_inventario')
      .delete()
      .in('producto_id', ids);
    if (errMov) {
      console.error('Error al borrar movimientos_inventario:', errMov.message);
      toast.error('Error al eliminar movimientos de inventario.');
      return; // Stop if deleting movements fails, as this is critical
    } else {
        console.log(`Deleted from movimientos_inventario for IDs: ${ids.join(', ')}`);
    }


    // 3) Borrar de la tabla 'detalle_venta' (si existe y tiene relación)
    // Es importante eliminar los detalles de venta asociados antes de eliminar el producto
    // Assuming 'detalle_venta' exists and has 'producto_id'
     console.log(`Attempting to delete from detalle_venta for IDs: ${ids.join(', ')}`);
     const { error: errDetalleVenta } = await supabase
       .from('detalle_venta')
       .delete()
       .in('producto_id', ids);
     if (errDetalleVenta) {
       console.error('Error al borrar detalle_venta:', errDetalleVenta.message);
       // Decide if you want to stop here or continue
       // toast.error('Error al eliminar detalles de venta.'); // Optional: show error toast
       // return; // Optional: stop the process
     } else {
        console.log(`Deleted from detalle_venta for IDs: ${ids.join(', ')}`);
     }


    // 4) Borrar de la tabla 'compra_items' (si existe y tiene relación)
    // Es importante eliminar los ítems de compra asociados antes de eliminar el producto
    // Assuming 'compra_items' exists and has 'nombre_producto' or 'producto_id'
    // If 'compra_items' links by nombre_producto, this delete needs adjustment
    // If it links by producto_id, the following is correct:
     console.log(`Attempting to delete from compra_items for IDs: ${ids.join(', ')}`);
     const { error: errCompraItems } = await supabase
       .from('compra_items')
       .delete()
       .in('producto_id', ids); // Assuming compra_items has producto_id
     if (errCompraItems) {
       console.error('Error al borrar compra_items:', errCompraItems.message);
       // Decide if you want to stop here or continue
       // toast.error('Error al eliminar ítems de compra.'); // Optional: show error toast
       // return; // Optional: stop the process
     } else {
        console.log(`Deleted from compra_items for IDs: ${ids.join(', ')}`);
     }


    // 5) Finalmente, borrar de productos
    console.log(`Attempting to delete from productos for IDs: ${ids.join(', ')}`);
    const { error: errProd } = await supabase
      .from('productos')
      .delete()
      .in('id', ids);
    if (errProd) {
      console.error('Error al borrar productos:', errProd.message);
      toast.error('Error al eliminar productos.');
      // Do NOT return here, as some products might have been deleted successfully
    } else {
        console.log(`Deleted from productos for IDs: ${ids.join(', ')}`);
        toast.success(`${ids.length} producto(s) eliminado(s) exitosamente.`);
    }


    // Actualizar UI
    setSeleccionados(new Set());
    await cargarProductos(); // Reload products after deletion
  };


  const handleEditar = (id, campo, valor) => {
    setProductos(prev =>
      prev.map(p => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  };

  const actualizarCampo = async (id, cambios) => {
    const { error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', id);
    if (error) {
      console.error(`Error actualizando producto ${id}:`, error.message);
      toast.error(`Error al actualizar producto ${id}.`);
    } else {
       // toast.success(`Producto ${id} actualizado.`); // Optional: show success toast per product
    }
  };

  const abrirModal = producto => {
    setProductoEditando(producto);
    setModalActivo(true);
  };
  const cerrarModal = () => {
    setModalActivo(false);
    setProductoEditando(null);
    cargarProductos(); // Reload products after modal is closed and saved
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Indicadores - CALCULOS CORREGIDOS
  const costoStock = productos.reduce(
    (sum, p) => sum + (parseFloat(p.costo_final_mxn || 0) * parseFloat(p.stock || 0)), // Multiplica costo MXN por stock
    0
  );
  const totalStock = productos.reduce(
    (sum, p) => sum + (parseFloat(p.promocion || 0) * parseFloat(p.stock || 0)), // Multiplica promoción por stock
    0
  );
  const ganancias = totalStock - costoStock; // La resta es correcta

  const handleActualizar = async () => {
    setActualizando(true);
    // Solo actualizamos los campos de precio que pueden ser editados directamente en la lista
    const updates = productos.map(p => ({
        id: p.id,
        promocion: Number(p.promocion) || 0,
        precio_normal: Number(p.precio_normal) || 0
        // No actualizamos costo_final_usd, costo_final_mxn, stock, imagen_url desde aquí,
        // ya que se manejan en el modal de edición o afectación de inventario.
    }));

    // Ejecutar actualizaciones en paralelo (opcional pero más eficiente)
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


    await cargarProductos(); // Reload products after updates
    setActualizando(false);
  };

  // Función para formatear números como moneda MXN
  const formatCurrencyMXN = (number) => {
    // Usamos 'es-MX' para el locale de español de México
    // style: 'currency' para formato de moneda
    // currency: 'MXN' para especificar pesos mexicanos
    // minimumFractionDigits y maximumFractionDigits para asegurar 2 decimales
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
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 text-sm text-gray-700 gap-4"> {/* Added gap and responsive flex */}
        <div className="space-y-1">
          <div>
            <span className="font-semibold">Costo de stock:</span> {formatCurrencyMXN(costoStock)} {/* Usar función de formato */}
          </div>
          <div>
            <span className="font-semibold">Total en stock:</span> {formatCurrencyMXN(totalStock)} {/* Usar función de formato */}
          </div>
          <div>
            <span className="font-semibold">Ganancias proyectadas:</span> {formatCurrencyMXN(ganancias)} {/* Usar función de formato */}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={eliminarSeleccionados}
            disabled={seleccionados.size === 0}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            Eliminar {seleccionados.size}
          </button>
          <button
            onClick={handleActualizar}
            disabled={actualizando}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
          >
            {actualizando ? 'Actualizando...' : 'Actualizar'}
          </button>
        </div>
      </div>

      {/* Buscador y selección */}
      <div className="flex flex-col md:flex-row items-center mb-4 gap-4"> {/* Added gap and responsive flex */}
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={productos.length > 0 && seleccionados.size === productos.length} // Check if there are products
            onChange={toggleSeleccionarTodos}
            className="form-checkbox"
          />
          <span className="ml-2">Seleccionar todos</span>
        </label>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3"
        />
      </div>

      {/* Lista de productos */}
      <div className="space-y-2">
        {productosFiltrados.map(producto => (
          <div
            key={producto.id}
            className="grid grid-cols-[auto_60px_1fr_auto_auto_auto] gap-2 items-center border rounded-lg p-2 shadow-sm hover:shadow transition text-xs"
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
               {/* Mostrar Stock y Costos */}
              <div className="text-gray-500 text-[11px]">Stock: {producto.stock ?? 0}</div>
              </div>
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1">Promoción</label>
              <input
                type="number"
                value={producto.promocion ?? ''} // Use ?? '' for controlled component
                onChange={e => handleEditar(producto.id, 'promocion', e.target.value)}
                className="w-20 border px-2 py-1 rounded text-right"
              />
            </div>
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1">Precio normal</label>
              <input
                type="number"
                value={producto.precio_normal ?? ''} // Use ?? '' for controlled component
                onChange={e => handleEditar(producto.id, 'precio_normal', e.target.value)}
                className="w-20 border px-2 py-1 rounded text-right"
              />
            </div>
            <div>
              <button
                onClick={() => abrirModal(producto)}
                className="text-blue-600 hover:underline"
              >
                Editar
              </button>
            </div>
          </div>
        ))}
        {productosFiltrados.length === 0 && (
          <div className="text-center text-gray-500 py-4">No se encontraron productos.</div>
        )}
      </div>

      {/* Modal de edición completa */}
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
