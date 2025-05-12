import React, { useState, useEffect, useMemo } from 'react'; // Importar useMemo
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

  // --- Estados para el ordenamiento ---
  const [sortColumn, setSortColumn] = useState('nombre'); // Columna por defecto para ordenar (por nombre)
  const [sortDirection, setSortDirection] = useState('asc'); // Dirección por defecto (ascendente)

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    // Al cargar, no aplicamos ordenamiento aquí, lo haremos en el useMemo
    const { data, error } = await supabase.from('productos').select('*');
    if (error) {
      console.error('Error al cargar productos:', error.message);
      toast.error('Error al cargar productos.');
    } else {
      setProductos(data || []);
    }
  };

  // --- Función para manejar el cambio de ordenamiento ---
  const handleSort = (column) => {
      if (sortColumn === column) {
          // Si es la misma columna, cambiar la dirección
          setSortDirection(prevDirection => (prevDirection === 'asc' ? 'desc' : 'asc'));
      } else {
          // Si es una nueva columna, establecerla y ordenar ascendente por defecto
          setSortColumn(column);
          setSortDirection('asc');
      }
      // No hay paginación en este componente, así que no necesitamos resetear la página
  };


  // Lógica de filtrado y ordenamiento usando useMemo para optimizar
  const productosFiltradosYOrdenados = useMemo(() => {
      let productosTrabajo = [...productos]; // Copia para no mutar el estado original

      // 1. Filtrar por búsqueda
      if (busqueda) {
          productosTrabajo = productosTrabajo.filter(p =>
              (p.nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
              (p.codigo || '').toLowerCase().includes(busqueda.toLowerCase()) || // Asumiendo que tienes columna 'codigo'
              (p.categoria || '').toLowerCase().includes(busqueda.toLowerCase()) // Asumiendo que tienes columna 'categoria'
              // Agrega otros campos buscables aquí si es necesario
          );
      }

      // 2. Filtrar por stock (si mostrarSinStock es false)
      if (!mostrarSinStock) {
          productosTrabajo = productosTrabajo.filter(p => p.stock && parseFloat(p.stock) > 0);
      }

      // 3. Ordenar
      if (sortColumn) {
          productosTrabajo.sort((a, b) => {
              const aValue = a[sortColumn];
              const bValue = b[sortColumn];

              // Manejar valores nulos o indefinidos: los ponemos al final en orden ascendente
              if (aValue == null && bValue == null) return 0;
              if (aValue == null) return sortDirection === 'asc' ? 1 : -1;
              if (bValue == null) return sortDirection === 'asc' ? -1 : 1;

              // Manejar ordenamiento numérico (para 'stock', 'promocion', 'precio_normal', 'costo_final_usd', 'costo_final_mxn')
              // Convertir a número para comparación numérica, usando 0 como fallback si no es un número válido
              const aNum = parseFloat(aValue) || 0;
              const bNum = parseFloat(bValue) || 0;

              if (sortColumn === 'stock' || sortColumn === 'promocion' || sortColumn === 'precio_normal' || sortColumn === 'costo_final_usd' || sortColumn === 'costo_final_mxn') {
                   if (aNum < bNum) return sortDirection === 'asc' ? -1 : 1;
                   if (aNum > bNum) return sortDirection === 'asc' ? 1 : -1;
                   return 0;
              }

              // Ordenamiento por defecto para texto (para 'nombre', 'codigo', 'categoria', 'imagen_url')
              const aString = String(aValue).toLowerCase();
              const bString = String(bValue).toLowerCase();

              if (aString < bString) {
                  return sortDirection === 'asc' ? -1 : 1;
              }
              if (aString > bString) {
                  return sortDirection === 'asc' ? 1 : -1;
              }
              return 0; // Son iguales
          });
      }

      return productosTrabajo;
  }, [productos, busqueda, mostrarSinStock, sortColumn, sortDirection]); // Dependencias del useMemo


  const toggleSeleccionarTodos = () => {
    // Ahora usamos productosFiltradosYOrdenados para la selección
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
    if (!window.confirm(`¿Estás seguro de eliminar ${ids.length} producto(s) seleccionado(s)? Esto también eliminará sus movimientos de inventario y registros de compras/ventas asociados.`)) {
        return;
    }

    // >>> Importante: Eliminar en cascada en la BD es más eficiente y seguro si está configurado <<<
    // Si no tienes cascada configurada, el orden de eliminación es importante:
    // Primero tablas que referencian a 'productos' (registros_inventario, movimientos_inventario, detalle_venta, compra_items)
    // Luego la tabla 'productos'

    console.log(`Attempting to delete related records for product IDs: ${ids.join(', ')}`);

    // Eliminar registros_inventario
    const { error: errReg } = await supabase.from('registros_inventario').delete().in('producto_id', ids);
    if (errReg) console.error('Error al borrar registros_inventario:', errReg.message);

    // Eliminar movimientos_inventario
    const { error: errMov } = await supabase.from('movimientos_inventario').delete().in('producto_id', ids);
    if (errMov) console.error('Error al borrar movimientos_inventario:', errMov.message);

     // Eliminar detalle_venta
     const { error: errDetalleVenta } = await supabase.from('detalle_venta').delete().in('producto_id', ids);
     if (errDetalleVenta) console.error('Error al borrar detalle_venta:', errDetalleVenta.message);

     // Eliminar compra_items
     const { error: errCompraItems } = await supabase.from('compra_items').delete().in('producto_id', ids);
     if (errCompraItems) console.error('Error al borrar compra_items:', errCompraItems.message);


    // Finalmente, eliminar los productos
    console.log(`Attempting to delete products for IDs: ${ids.join(', ')}`);
    const { error: errProd } = await supabase
      .from('productos')
      .delete()
      .in('id', ids);

    if (errProd) {
      console.error('Error al borrar productos:', errProd.message);
      toast.error('Error al eliminar productos.');
    } else {
        console.log(`Deleted products for IDs: ${ids.join(', ')}`);
        toast.success(`${ids.length} producto(s) eliminado(s) exitosamente.`);
    }

    setSeleccionados(new Set());
    await cargarProductos(); // Recargar la lista después de eliminar
  };

  // Esta función handleEditar ahora solo actualiza el estado local de la lista
  // para reflejar los cambios hechos en los inputs de la lista.
  const handleEditarLocal = (id, campo, valor) => {
    setProductos(prev =>
      prev.map(p => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  };

  // La función para actualizar en la BD se llama handleActualizar
  const handleActualizarPrecios = async () => { // Renombrada para mayor claridad
    setActualizando(true);
    // Preparamos solo los campos que pueden ser editados directamente en la lista
    const updates = productosFiltradosYOrdenados.map(p => ({ // Usar la lista filtrada/ordenada
      id: p.id,
      // Asegurarse de que los valores son numéricos o null/undefined si están vacíos
      promocion: parseFloat(p.promocion) || null, // Usar null si el input está vacío o no es número
      precio_normal: parseFloat(p.precio_normal) || null // Usar null si el input está vacío o no es número
    }));

    // Filtramos solo los productos que realmente fueron seleccionados para actualizar
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

    // No necesitamos recargar todos los productos si la actualización fue exitosa,
    // ya que handleEditarLocal ya actualizó el estado local 'productos'.
    // Pero si hubo errores, una recarga completa podría ser útil para sincronizar.
    // await cargarProductos(); // Opcional: descomentar si quieres recargar siempre

    setActualizando(false);
    setSeleccionados(new Set()); // Limpiar selección después de actualizar
  };


  const abrirModal = producto => {
    setProductoEditando(producto);
    setModalActivo(true);
  };

  const cerrarModal = () => {
    setModalActivo(false);
    setProductoEditando(null);
    cargarProductos(); // Recargar productos después de cerrar el modal de edición
  };


  const formatCurrencyMXN = (number) => {
    // Asegurarse de que el número sea válido antes de formatear
    const num = parseFloat(number);
    if (isNaN(num)) {
        return '$0.00'; // O algún otro indicador para valores no numéricos
    }
    return num.toLocaleString('es-MX', {
      style: 'currency',
      currency: 'MXN',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

    // Calcular totales de stock y ganancias usando la lista COMPLETA de productos (no la filtrada/ordenada)
    // Esto asegura que los totales reflejen todo el inventario, no solo lo que se muestra en la vista actual.
  const costoTotalStock = productos.reduce(
    (sum, p) => sum + (parseFloat(p.costo_final_mxn || 0) * parseFloat(p.stock || 0)),
    0
  );

  const totalValorStock = productos.reduce(
    (sum, p) => sum + (parseFloat(p.promocion || p.precio_normal || 0) * parseFloat(p.stock || 0)), // Usar precio promocional si existe, sino el normal
    0
  );

  const gananciasProyectadas = totalValorStock - costoTotalStock;


  return (
    <div>
      {/* Indicadores y acciones */}
      {/* Usar los totales calculados sobre la lista completa */}
      <div className="mb-4 p-4 border rounded-lg shadow-sm bg-gray-50 flex flex-wrap gap-x-6 gap-y-2 justify-around items-center text-sm">
        <div>Costo de stock: <span className="font-semibold">{formatCurrencyMXN(costoTotalStock)}</span></div>
        <div>Total en stock (Venta): <span className="font-semibold">{formatCurrencyMXN(totalValorStock)}</span></div> {/* Etiqueta más clara */}
        <div>Ganancias proyectadas: <span className="font-semibold">{formatCurrencyMXN(gananciasProyectadas)}</span></div>
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
                onClick={handleActualizarPrecios} // Llamar a la función renombrada
                disabled={actualizando || seleccionados.size === 0} // Deshabilitar si no hay seleccionados
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-xs md:text-sm"
            >
                {actualizando ? 'Actualizando...' : 'Actualizar Seleccionados'} {/* Texto más claro */}
            </button>
        </div>
      </div>


      {/* Buscador, selección y botón para mostrar/ocultar sin stock */}
      <div className="flex flex-col md:flex-row items-center mb-4 gap-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            // Usar productosFiltradosYOrdenados para el total en la etiqueta
            checked={productosFiltradosYOrdenados.length > 0 && seleccionados.size === productosFiltradosYOrdenados.length}
            onChange={toggleSeleccionarTodos}
            disabled={productosFiltradosYOrdenados.length === 0} // Deshabilitar si no hay productos filtrados/ordenados
            className="form-checkbox"
          />
          {/* Usar productosFiltradosYOrdenados para el total en la etiqueta */}
          <span className="ml-2 text-sm text-gray-700">Seleccionar todos ({seleccionados.size}/{productosFiltradosYOrdenados.length})</span>
        </label>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3 text-sm"
        />
        <button
          onClick={() => setMostrarSinStock(!mostrarSinStock)}
          className="px-4 py-2 bg-sky-500 text-white rounded hover:bg-sky-600 transition-colors text-xs md:text-sm whitespace-nowrap"
        >
          {mostrarSinStock ? 'Ocultar sin stock' : 'Mostrar todos los productos'}
        </button>
      </div>

      {/* Encabezados de la tabla con ordenamiento */}
      {/* Usamos un div con grid para simular los encabezados de columna clicables */}
       <div className="grid grid-cols-[auto_60px_1fr_auto_auto_auto] gap-2 items-center border rounded-lg p-2 shadow-sm bg-gray-200 text-xs font-semibold text-gray-600 uppercase tracking-wider mb-2">
           <div className="p-1"></div> {/* Columna del checkbox */}
           <div className="p-1">Imagen</div> {/* Columna de la imagen */}
           {/* Encabezado Nombre con ordenamiento */}
           <div
               className="p-1 cursor-pointer hover:text-gray-800"
               onClick={() => handleSort('nombre')}
           >
               Nombre
               {sortColumn === 'nombre' && (
                 <span className="ml-1">
                   {sortDirection === 'asc' ? '▲' : '▼'}
                 </span>
               )}
           </div>
           {/* Encabezado Promoción con ordenamiento */}
           <div
               className="p-1 text-right cursor-pointer hover:text-gray-800"
               onClick={() => handleSort('promocion')}
           >
               Promoción
               {sortColumn === 'promocion' && (
                 <span className="ml-1">
                   {sortDirection === 'asc' ? '▲' : '▼'}
                 </span>
               )}
           </div>
            {/* Encabezado Precio Normal con ordenamiento */}
           <div
               className="p-1 text-right cursor-pointer hover:text-gray-800"
               onClick={() => handleSort('precio_normal')}
           >
               P. Normal
               {sortColumn === 'precio_normal' && (
                 <span className="ml-1">
                   {sortDirection === 'asc' ? '▲' : '▼'}
                 </span>
               )}
           </div>
            <div className="p-1 text-center">Acciones</div> {/* Columna de acciones */}
       </div>


      {/* Lista de productos (cuerpo de la tabla) */}
      <div className="space-y-2">
        {/* Usar productosFiltradosYOrdenados para renderizar la lista */}
        {productosFiltradosYOrdenados.map(producto => (
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
                // Usar .toString() para evitar advertencias de React con valores null/undefined en inputs controlados
                value={(producto.promocion ?? '').toString()}
                onChange={e => handleEditarLocal(producto.id, 'promocion', e.target.value)} // Llamar a handleEditarLocal
                className="w-20 border px-2 py-1 rounded text-right text-xs"
                placeholder="0.00"
              />
            </div>
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1 text-[10px]">P. Normal</label>
              <input
                type="number"
                 // Usar .toString() para evitar advertencias de React con valores null/undefined en inputs controlados
                value={(producto.precio_normal ?? '').toString()}
                onChange={e => handleEditarLocal(producto.id, 'precio_normal', e.target.value)} // Llamar a handleEditarLocal
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
        {/* Mensaje cuando no hay productos filtrados/ordenados */}
        {productosFiltradosYOrdenados.length === 0 && (
          <div className="text-center text-gray-500 py-4">
            {busqueda && productos.length > 0 ?
                 'No se encontraron productos que coincidan con tu búsqueda.'
                 : mostrarSinStock && productos.length > 0 ?
                 'No se encontraron productos (mostrando todos, incluyendo sin stock).'
                 : !mostrarSinStock && productos.length > 0 ?
                 'No se encontraron productos con stock (prueba "Mostrar todos los productos").'
                 : 'No hay productos disponibles.'
            }
          </div>
        )}
      </div>

      {modalActivo && productoEditando && (
        <ModalEditarProducto
          producto={productoEditando}
          onClose={cerrarModal}
          onGuardado={cerrarModal} // Al guardar en el modal, cerramos y recargamos la lista
        />
      )}
    </div>
  );
}
