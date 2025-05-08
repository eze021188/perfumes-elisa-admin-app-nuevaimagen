import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import ModalEditarProducto from './ModalEditarProducto';

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
    } else {
      setProductos(data);
    }
  };

  const toggleSeleccionarTodos = () => {
    if (seleccionados.size === productos.length) {
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
    if (ids.length === 0) return;

    // 1) Borrar de registros_inventario
    const { error: errReg } = await supabase
      .from('registros_inventario')
      .delete()
      .in('producto_id', ids);
    if (errReg) {
      console.error('Error al borrar registros_inventario:', errReg.message);
      return;
    }

    // 2) Borrar de movimientos_inventario
    const { error: errMov } = await supabase
      .from('movimientos_inventario')
      .delete()
      .in('producto_id', ids);
    if (errMov) {
      console.error('Error al borrar movimientos_inventario:', errMov.message);
      return;
    }

    // 3) Borrar de productos
    const { error: errProd } = await supabase
      .from('productos')
      .delete()
      .in('id', ids);
    if (errProd) {
      console.error('Error al borrar productos:', errProd.message);
      return;
    }

    // Actualizar UI
    setSeleccionados(new Set());
    await cargarProductos();
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

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Indicadores
  const costoStock = productos.reduce(
    (sum, p) => sum + parseFloat(p.costo_final_mxn || 0),
    0
  );
  const totalStock = productos.reduce(
    (sum, p) => sum + parseFloat(p.promocion || 0),
    0
  );
  const ganancias = totalStock - costoStock;

  const handleActualizar = async () => {
    setActualizando(true);
    for (const p of productos) {
      await actualizarCampo(p.id, {
        promocion: Number(p.promocion) || 0,
        precio_normal: Number(p.precio_normal) || 0
      });
    }
    await cargarProductos();
    setActualizando(false);
  };

  return (
    <div>
      {/* Indicadores y acciones */}
      <div className="flex justify-between items-center mb-4 text-sm text-gray-700">
        <div className="space-y-1">
          <div>
            <span className="font-semibold">Costo de stock:</span> ${costoStock.toFixed(2)}
          </div>
          <div>
            <span className="font-semibold">Total en stock:</span> ${totalStock.toFixed(2)}
          </div>
          <div>
            <span className="font-semibold">Ganancias proyectadas:</span> ${ganancias.toFixed(2)}
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
      <div className="flex items-center mb-4 gap-4">
        <label className="inline-flex items-center">
          <input
            type="checkbox"
            checked={seleccionados.size === productos.length}
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
                <img src={producto.imagen_url} alt={producto.nombre} className="object-cover w-full h-full" />
              ) : (
                <span className="text-gray-400 text-[10px]">Sin imagen</span>
              )}
            </div>
            <div className="whitespace-normal break-words max-w-full">
              <div className="font-medium">{producto.nombre}</div>
              <div className="text-gray-500 text-[11px]">{producto.categoria || 'Sin categoría'}</div>
            </div>
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1">Promoción</label>
              <input
                type="number"
                value={producto.promocion || ''}
                onChange={e => handleEditar(producto.id, 'promocion', e.target.value)}
                className="w-20 border px-2 py-1 rounded text-right"
              />
            </div>
            <div className="flex flex-col items-start">
              <label className="text-gray-600 mb-1">Precio normal</label>
              <input
                type="number"
                value={producto.precio_normal || ''}
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