// src/pages/Productos.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';

export default function Productos() {
  const [productos, setProductos] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [modalMovimientos, setModalMovimientos] = useState(false);
  const [movimientos, setMovimientos] = useState([]);
  const [productoActual, setProductoActual] = useState(null);
  const [mostrarCantidad, setMostrarCantidad] = useState(25);
  const [paginaActual, setPaginaActual] = useState(1);
  const navigate = useNavigate();

  useEffect(() => {
    cargarProductos();
  }, []);

  const cargarProductos = async () => {
    const { data, error } = await supabase.from('productos').select('*');
    if (error) console.error('Error al cargar productos:', error.message);
    else setProductos(data);
  };

  const handleEditar = (id, campo, valor) => {
    setProductos(prev =>
      prev.map(p => (p.id === id ? { ...p, [campo]: valor } : p))
    );
  };

  const actualizarPromocion = async (id, nuevoValor) => {
    const { error } = await supabase
      .from('productos')
      .update({ promocion: Number(nuevoValor) })
      .eq('id', id);
    if (error) console.error('Error actualizando promoción:', error.message);
  };

  const actualizarPrecioNormal = async (id, nuevoValor) => {
    const { error } = await supabase
      .from('productos')
      .update({ precio_normal: Number(nuevoValor) })
      .eq('id', id);
    if (error) console.error('Error actualizando precio normal:', error.message);
  };

  const handleSeleccionar = id => {
    setProductosSeleccionados(prev =>
      prev.includes(id) ? prev.filter(pid => pid !== id) : [...prev, id]
    );
  };

  const seleccionarTodosVisibles = () => {
    const visibles = productosFiltradosPaginados.map(p => p.id);
    const todos = visibles.every(id => productosSeleccionados.includes(id));
    setProductosSeleccionados(prev =>
      todos
        ? prev.filter(id => !visibles.includes(id))
        : Array.from(new Set([...prev, ...visibles]))
    );
  };

  const handleActualizarTodo = async () => {
    for (const p of productos) {
      await supabase
        .from('productos')
        .update({ stock: Number(p.stock), promocion: Number(p.promocion) })
        .eq('id', p.id);
    }
    alert('Productos actualizados');
    cargarProductos();
  };

  const handleEliminarSeleccionados = async () => {
    if (!productosSeleccionados.length) return;
    if (!confirm(`¿Eliminar ${productosSeleccionados.length} productos?`)) return;
    await supabase.from('productos').delete().in('id', productosSeleccionados);
    setProductosSeleccionados([]);
    cargarProductos();
  };

  const handleBuscar = texto => {
    setBusqueda(texto);
    setPaginaActual(1);
  };

  const productosFiltrados = productos.filter(p =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );
  const totalPaginas = Math.ceil(productosFiltrados.length / mostrarCantidad);
  const productosFiltradosPaginados = productosFiltrados.slice(
    (paginaActual - 1) * mostrarCantidad,
    paginaActual * mostrarCantidad
  );

  /* ---------------------- Movimientos ---------------------- */
  const verMovimientos = async (producto) => {
  setProductoActual(producto);

  // 1) Entradas de stock (solo ENTRADA) desde registros_inventario
  console.log('Buscando entradas para producto ID:', producto.id);
  const { data: entradas = [], error: errReg } = await supabase
    .from('registros_inventario')
    .select('id, fecha, cantidad, referencia')
    .eq('producto_id', producto.id)
    .order('fecha', { ascending: false });
  if (errReg) {
    console.error('Error al cargar registros de entrada:', errReg.message);
  }
  console.log('Entradas obtenidas:', entradas);

  // 2) Salidas de ventas (detalle_venta + ventas)
  const { data: detalles = [], error: errDet } = await supabase
    .from('detalle_venta')
    .select('cantidad, venta:ventas(codigo_venta, created_at)')
    .eq('producto_id', producto.id);
  if (errDet) console.error('Error al cargar salidas:', errDet.message);

  // 3) Unificar y normalizar
  const movs = [
    // Entradas positivas
    ...entradas.map((m) => ({
      id: m.id,
      fecha: m.fecha,
      tipo: 'ENTRADA',
      displayCantidad: m.cantidad,
      referencia: m.referencia,
    })),
    // Ventas → SALIDA (negativas)
    ...detalles.map((d) => ({
      id: `v-${producto.id}-${d.venta.codigo_venta}`,
      fecha: d.venta.created_at,
      tipo: 'SALIDA',
      displayCantidad: -d.cantidad,
      referencia: d.venta.codigo_venta,
    }))
  ];

  // 4) Ordenar por fecha descendente
  movs.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

  console.log('Movimientos combinados:', movs);
  setMovimientos(movs);
  setModalMovimientos(true);
};

  return (
    <div className="p-4 md:p-6">
      {/* Top controls */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 mb-4">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
        >
          Volver al inicio
        </button>

        <input
          type="text"
          placeholder="Buscar producto..."
          value={busqueda}
          onChange={e => handleBuscar(e.target.value)}
          className="border border-gray-300 px-3 py-2 rounded w-full md:w-1/3"
        />

        <div className="flex gap-2">
          <button
            onClick={handleActualizarTodo}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Actualizar todo
          </button>
          <button
            onClick={handleEliminarSeleccionados}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
          >
            Eliminar {productosSeleccionados.length} seleccionados
          </button>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center mb-2">
        <label className="text-sm">
          Mostrar{' '}
          <select
            value={mostrarCantidad}
            onChange={e => {
              setMostrarCantidad(Number(e.target.value));
              setPaginaActual(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          >
            {[25, 50, 100, 200].map(n => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>{' '}
          por página
        </label>
        <div className="text-sm text-gray-600">
          Página {paginaActual} de {totalPaginas}
        </div>
      </div>

      {/* Products table */}
      <div className="overflow-x-auto bg-white rounded-lg shadow-md">
        <table className="min-w-full text-sm text-left border-collapse">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="p-3">
                <input
                  type="checkbox"
                  onChange={seleccionarTodosVisibles}
                  checked={productosFiltradosPaginados.every(p => productosSeleccionados.includes(p.id))}
                />
              </th>
              <th className="p-3">Producto</th>
              <th className="p-3 text-right">Costo final x unidad (USD)</th>
              <th className="p-3 text-right">Costo final x unidad (MXN)</th>
              <th className="p-3 text-right">Precio por unidad (USD)</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3 text-right">Precio Promoción</th>
              <th className="p-3 text-right">Precio normal</th>
            </tr>
          </thead>
          <tbody>
            {productosFiltradosPaginados.map(producto => (
              <tr
                key={producto.id}
                className="hover:bg-gray-50 border-b cursor-pointer"
                onClick={() => verMovimientos(producto)}
              >
                <td onClick={e => e.stopPropagation()} className="p-2">
                  <input
                    type="checkbox"
                    checked={productosSeleccionados.includes(producto.id)}
                    onChange={() => handleSeleccionar(producto.id)}
                  />
                </td>
                <td className="p-2">{producto.nombre}</td>
                <td className="p-2 text-right">${producto.costo_final_usd?.toFixed(2) ?? '0.00'}</td>
                <td className="p-2 text-right">${producto.costo_final_mxn?.toFixed(2) ?? '0.00'}</td>
                <td className="p-2 text-right">${producto.precio_unitario_usd?.toFixed(2) ?? '0.00'}</td>
                <td onClick={e => e.stopPropagation()} className="p-2 text-right">
                  <input
                    type="number"
                    value={producto.stock ?? ''}
                    onChange={e => handleEditar(producto.id, 'stock', e.target.value)}
                    className="w-20 border rounded px-2 py-1 text-right"
                  />
                </td>
                <td onClick={e => e.stopPropagation()} className="p-2 text-right">
                  <input
                    type="number"
                    value={producto.promocion ?? ''}
                    onChange={e => handleEditar(producto.id, 'promocion', e.target.value)}
                    onBlur={() => actualizarPromocion(producto.id, producto.promocion)}
                    className="w-24 border rounded px-2 py-1 text-right"
                  />
                </td>
                <td onClick={e => e.stopPropagation()} className="p-2 text-right">
                  <input
                    type="number"
                    value={producto.precio_normal ?? ''}
                    onChange={e => handleEditar(producto.id, 'precio_normal', e.target.value)}
                    onBlur={() => actualizarPrecioNormal(producto.id, producto.precio_normal)}
                    className="w-24 border rounded px-2 py-1 text-right"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal de Movimientos */}
      {modalMovimientos && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setModalMovimientos(false)}>
          <div onClick={e => e.stopPropagation()} className="bg-white rounded-lg shadow-lg w-11/12 md:w-1/2 p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Movimientos de {productoActual?.nombre}</h3>
              <button onClick={() => setModalMovimientos(false)} className="text-gray-600 hover:text-gray-800 text-2xl leading-none">×</button>
            </div>
            <div className="overflow-y-auto max-h-64">
              <table className="min-w-full text-sm text-left border-collapse">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="p-2">Fecha</th>
                    <th className="p-2">Tipo</th>
                    <th className="p-2">Cantidad</th>
                    <th className="p-2">Referencia</th>
                  </tr>
                </thead>
                <tbody>
                  {movimientos.map(mov => (
                    <tr key={mov.id} className="border-t">
                      <td className="p-2">{new Date(mov.fecha).toLocaleString()}</td>
                      <td className="p-2">{mov.tipo}</td>
                      <td className="p-2">{mov.displayCantidad}</td>
                      <td className="p-2">{mov.referencia}</td>
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
