// src/pages/Compras.jsx

import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase'

export default function Compras() {
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [formulario, setFormulario] = useState({
    numeroPedido: '',
    proveedor: '',
    fechaCompra: '',
    descuentoTotalUSD: '',
    gastosEnvioUSA: '',
    tipoCambioDia: '',
    nombreProducto: '',
    cantidad: '',
    precioUnitarioUSD: ''
  })
  const [productosAgregados, setProductosAgregados] = useState([])
  const [savedCompras, setSavedCompras] = useState([])
  const [expandedIdx, setExpandedIdx] = useState(null)
  const [editingIdx, setEditingIdx] = useState(null)
  const [editItems, setEditItems] = useState([])
  const [invConfig, setInvConfig] = useState({
    gastosImportacion: '',
    tipoCambioImportacion: '',
    otrosGastos: '',
    targetIdx: null
  })

  // 1) Carga inicial de compras + items
  useEffect(() => {
    fetchCompras()
  }, [])

  async function fetchCompras() {
    const { data: cabeceras = [] } = await supabase
      .from('compras')
      .select('*')
      .order('created_at', { ascending: false })
    const { data: items = [] } = await supabase
      .from('compra_items')
      .select('*')
    const combined = cabeceras.map(c => ({
      compra: c,
      items: items
        .filter(i => i.compra_id === c.id)
        .map(i => ({
          id: i.id,
          nombreProducto: i.nombre_producto,
          cantidad: i.cantidad,
          precioUnitarioUSD: parseFloat(i.precio_unitario_usd)
        }))
    }))
    setSavedCompras(combined)
  }

  // 2) Inputs
  const manejarCambio = e => {
    const { name, value } = e.target
    setFormulario(prev => ({ ...prev, [name]: value }))
  }

  // 3) Agregar/eliminar producto en el formulario
  const agregarProducto = () => {
    const { nombreProducto, cantidad, precioUnitarioUSD } = formulario
    if (!nombreProducto || !cantidad || !precioUnitarioUSD) return
    setProductosAgregados(prev => [
      ...prev,
      { nombreProducto, cantidad: +cantidad, precioUnitarioUSD: +precioUnitarioUSD }
    ])
    setFormulario(prev => ({ ...prev, nombreProducto: '', cantidad: '', precioUnitarioUSD: '' }))
  }
  const eliminarProductoForm = idx =>
    setProductosAgregados(prev => prev.filter((_, i) => i !== idx))

  // 4) Cálculos
  const calcularSubtotal = items =>
    items.reduce((sum, p) => sum + p.cantidad * p.precioUnitarioUSD, 0)
  const calcularTotal = (items, descuento) =>
    calcularSubtotal(items) - (descuento || 0)

  // 5) Guardar compra + items
  const guardarCompra = async () => {
    const cabecera = {
      numero_pedido: formulario.numeroPedido,
      proveedor: formulario.proveedor,
      fecha_compra: formulario.fechaCompra || new Date().toISOString(),
      descuento_total_usd: +formulario.descuentoTotalUSD || 0,
      gastos_envio_usa: +formulario.gastosEnvioUSA || 0,
      tipo_cambio_dia: +formulario.tipoCambioDia || 1,
      inventario_afectado: false
    }
    const { data: compra, error: errCab } = await supabase
      .from('compras')
      .insert(cabecera)
      .select('*')
      .single()
    if (errCab) return alert('Error al guardar compra: ' + errCab.message)

    const payload = productosAgregados.map(p => ({
      compra_id: compra.id,
      nombre_producto: p.nombreProducto,
      cantidad: p.cantidad,
      precio_unitario_usd: p.precioUnitarioUSD
    }))
    const { data: insItems, error: errItems } = await supabase
      .from('compra_items')
      .insert(payload)
      .select('*')
    if (errItems) return alert('Error al guardar ítems: ' + errItems.message)

    const normItems = insItems.map(i => ({
      id: i.id,
      nombreProducto: i.nombre_producto,
      cantidad: i.cantidad,
      precioUnitarioUSD: parseFloat(i.precio_unitario_usd)
    }))

    setSavedCompras(prev => [{ compra, items: normItems }, ...prev])
    setMostrarFormulario(false)
    setProductosAgregados([])
    setFormulario({
      numeroPedido: '',
      proveedor: '',
      fechaCompra: '',
      descuentoTotalUSD: '',
      gastosEnvioUSA: '',
      tipoCambioDia: '',
      nombreProducto: '',
      cantidad: '',
      precioUnitarioUSD: ''
    })
  }

  // 6) Edición de ítems
  const iniciarEdicion = idx => {
    setEditingIdx(idx)
    setEditItems(savedCompras[idx].items.map(i => ({ ...i })))
  }
  const cancelarEdicion = () => {
    setEditingIdx(null)
    setEditItems([])
  }
  const guardarEdicion = async () => {
    for (const it of editItems) {
      await supabase
        .from('compra_items')
        .update({ cantidad: it.cantidad, precio_unitario_usd: it.precioUnitarioUSD })
        .eq('id', it.id)
    }
    setSavedCompras(prev =>
      prev.map((ent, i) => (i === editingIdx ? { ...ent, items: editItems } : ent))
    )
    cancelarEdicion()
  }

  // 7) Eliminar compra + revertir inventario si afectada
  const eliminarCompra = async idx => {
    const { compra, items } = savedCompras[idx]
    try {
      if (compra.inventario_afectado) {
        const { data: catalogo = [] } = await supabase
          .from('productos')
          .select('id, nombre, stock')
        for (const p of items) {
          const prod = catalogo.find(x => x.nombre === p.nombreProducto)
          if (!prod) continue
          const nuevoStock = prod.stock - p.cantidad
          if (nuevoStock > 0) {
            await supabase.from('productos').update({ stock: nuevoStock }).eq('id', prod.id)
          } else {
            await supabase.from('productos').delete().eq('id', prod.id)
          }
        }
      }
      await supabase.from('compra_items').delete().eq('compra_id', compra.id)
      await supabase.from('compras').delete().eq('id', compra.id)
      setSavedCompras(prev => prev.filter((_, i) => i !== idx))
      if (expandedIdx === idx) setExpandedIdx(null)
    } catch (err) {
      console.error('Error al eliminar compra:', err)
      alert('No se pudo eliminar la compra.')
    }
  }

  // 8) Afectar inventario: actualizar stock, precio y registrar en movimientos
const confirmarAfectInventory = async () => {
  console.log('⚙️ confirmarAfectInventory invocado con invConfig:', invConfig);

  const { gastosImportacion, tipoCambioImportacion, otrosGastos, targetIdx } = invConfig;
  if (targetIdx === null) return alert('Selecciona la compra a afectar');
  if (!gastosImportacion || !tipoCambioImportacion || !otrosGastos)
    return alert('Completa los campos de gastos');

  // 1) Marcar la cabecera como afectada
  const { compra, items } = savedCompras[targetIdx];
  const { error: errCab } = await supabase
    .from('compras')
    .update({
      gastos_importacion: Number(gastosImportacion),
      tipo_cambio_importacion: Number(tipoCambioImportacion),
      otros_gastos: Number(otrosGastos),
      inventario_afectado: true
    })
    .eq('id', compra.id);
  if (errCab) {
    console.error('Error actualizando compra:', errCab);
    return alert('Error al actualizar cabecera: ' + errCab.message);
  }

  // 2) Obtener catálogo
  const { data: catalogo = [], error: errCat } = await supabase
    .from('productos')
    .select('id, nombre, stock, precio_unitario_usd');
  if (errCat) {
    console.error('Error al traer catálogo:', errCat);
    return alert('Error al cargar catálogo: ' + errCat.message);
  }

  // 3) Recorrer items y actualizar/insertar + registrar movimiento
  for (const p of items) {
    let prodId;
    const prod = catalogo.find(x => x.nombre === p.nombreProducto);

    if (prod) {
      prodId = prod.id;
      const { error: errUpd } = await supabase
        .from('productos')
        .update({
          stock: prod.stock + p.cantidad,
          precio_unitario_usd: p.precioUnitarioUSD
        })
        .eq('id', prodId);
      if (errUpd) {
        console.error('Error actualizando producto:', errUpd);
        return alert('Error al actualizar producto: ' + errUpd.message);
      }
    } else {
      const { data: newProd, error: errInsProd } = await supabase
        .from('productos')
        .insert({
          nombre: p.nombreProducto,
          stock: p.cantidad,
          precio_unitario_usd: p.precioUnitarioUSD
        })
        .select('id')
        .single();
      if (errInsProd) {
        console.error('Error insertando producto:', errInsProd);
        return alert('Error al crear producto: ' + errInsProd.message);
      }
      prodId = newProd.id;
    }

    // 4) Insertar movimiento
    const { data: movData, error: errMov } = await supabase
      .from('movimientos_inventario')
      .insert({
        tipo: 'ENTRADA',
        producto_id: prodId,
        cantidad: p.cantidad,
        referencia: compra.numero_pedido,
        fecha: new Date().toISOString()
      });
    if (errMov) {
      console.error('Error insertando movimiento:', errMov);
      return alert('Error al registrar movimiento de inventario: ' + errMov.message);
    }
  }

  // 5) Refrescar y limpiar
  fetchCompras();
  setInvConfig({ gastosImportacion: '', tipoCambioImportacion: '', otrosGastos: '', targetIdx: null });
  alert(`Inventario afectado para pedido ${compra.numero_pedido}`);
};

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      <button
        onClick={() => setMostrarFormulario(!mostrarFormulario)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        {mostrarFormulario ? 'Cancelar' : 'Registrar Compra'}
      </button>

      {mostrarFormulario && (
        <div className="mb-6">
          {/* Cabecera */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <input
              name="numeroPedido"
              placeholder="Número pedido"
              value={formulario.numeroPedido}
              onChange={manejarCambio}
              className="border p-2 rounded"
            />
            <input
              name="proveedor"
              placeholder="Proveedor"
              value={formulario.proveedor}
              onChange={manejarCambio}
              className="border p-2 rounded"
            />
            <input
              name="fechaCompra"
              type="datetime-local"
              value={formulario.fechaCompra}
              onChange={manejarCambio}
              className="border p-2 rounded"
            />
          </div>

          {/* Gastos/Descuento */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <input
              name="descuentoTotalUSD"
              type="number"
              placeholder="Descuento USD"
              value={formulario.descuentoTotalUSD}
              onChange={manejarCambio}
              className="border p-2 rounded"
            />
            <input
              name="gastosEnvioUSA"
              type="number"
              placeholder="Gastos envío USA"
              value={formulario.gastosEnvioUSA}
              onChange={manejarCambio}
              className="border p-2 rounded"
            />
            <input
              name="tipoCambioDia"
              type="number"
              placeholder="Tipo de cambio"
              value={formulario.tipoCambioDia}
              onChange={manejarCambio}
              className="border p-2 rounded"
            />
          </div>

          {/* Agregar producto */}
          <div className="flex gap-2 mb-4">
            <input
              name="nombreProducto"
              placeholder="Producto"
              value={formulario.nombreProducto}
              onChange={manejarCambio}
              className="border p-2 rounded flex-1"
            />
            <input
              name="cantidad"
              type="number"
              placeholder="Cant."
              value={formulario.cantidad}
              onChange={manejarCambio}
              className="border p-2 rounded w-24"
            />
            <input
              name="precioUnitarioUSD"
              type="number"
              placeholder="Precio USD"
              value={formulario.precioUnitarioUSD}
              onChange={manejarCambio}
              className="border p-2 rounded w-32"
            />
            <button onClick={agregarProducto} className="bg-green-500 text-white px-4 py-2 rounded">
              Agregar
            </button>
          </div>

          {/* Tabla productos agregados */}
          {productosAgregados.length > 0 && (
            <>
              <table className="w-full border-collapse mb-4 text-center">
                <thead className="bg-gray-100">
                  <tr>
                    <th>#</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th><th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {productosAgregados.map((p, i) => (
                    <tr key={i}>
                      <td className="border p-2">{i + 1}</td>
                      <td className="border p-2">{p.nombreProducto}</td>
                      <td className="border p-2">{p.cantidad}</td>
                      <td className="border p-2">${p.precioUnitarioUSD.toFixed(2)}</td>
                      <td className="border p-2">${(p.cantidad * p.precioUnitarioUSD).toFixed(2)}</td>
                      <td className="border p-2">
                        <button onClick={() => eliminarProductoForm(i)} className="bg-red-500 text-white px-2 py-1 rounded">X</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right font-semibold mb-4">
                <p>Subtotal: ${calcularSubtotal(productosAgregados).toFixed(2)}</p>
                <p>Total: ${calcularTotal(productosAgregados, +formulario.descuentoTotalUSD).toFixed(2)}</p>
              </div>
              <button onClick={guardarCompra} className="bg-blue-600 text-white px-4 py-2 rounded">
                Guardar Compra
              </button>
            </>
          )}
        </div>
      )}

      {/* Lista de compras registradas */}
      {savedCompras.map(({ compra, items }, idx) => (
        <div key={compra.id} className="mb-4 border rounded">
          <div
            className="flex justify-between items-center p-4 bg-gray-100 cursor-pointer"
            onClick={() => setExpandedIdx(expandedIdx === idx ? null : idx)}
          >
            <div>
              <strong>Pedido:</strong> {compra.numero_pedido} — <em>{compra.proveedor}</em>
              {compra.inventario_afectado && <span className="text-green-600 ml-2">(Afectado)</span>}
            </div>
            <div className="text-xl">{expandedIdx === idx ? '−' : '+'}</div>
          </div>
          {expandedIdx === idx && (
            <div className="p-4">
              <div className="mb-4">
                <p>Subtotal: ${calcularSubtotal(items).toFixed(2)}</p>
                <p>Descuento: ${compra.descuento_total_usd.toFixed(2)}</p>
                <p className="font-bold">Total: ${calcularTotal(items, compra.descuento_total_usd).toFixed(2)}</p>
              </div>
              <div className="mb-4 space-x-2">
                {editingIdx === idx ? (
                  <>
                    <button onClick={guardarEdicion} className="bg-green-500 text-white px-3 py-1 rounded">Guardar</button>
                    <button onClick={cancelarEdicion} className="bg-gray-500 text-white px-3 py-1 rounded">Cancelar</button>
                  </>
                ) : (
                  <>
                    <button onClick={() => iniciarEdicion(idx)} className="bg-yellow-500 text-white px-3 py-1 rounded">Editar</button>
                    <button onClick={() => eliminarCompra(idx)} className="bg-red-600 text-white px-3 py-1 rounded">Eliminar</button>
                    <button onClick={() => setInvConfig(prev => ({ ...prev, targetIdx: idx }))} className="bg-purple-600 text-white px-3 py-1 rounded">Afectar inventario</button>
                  </>
                )}
              </div>
              <table className="w-full border-collapse mb-4 text-center">
                <thead className="bg-gray-200">
                  <tr>
                    <th>#</th><th>Producto</th><th>Cant.</th><th>Precio</th><th>Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {(editingIdx === idx ? editItems : items).map((p, i) => (
                    <tr key={i}>
                      <td className="border p-2">{i + 1}</td>
                      <td className="border p-2">{p.nombreProducto}</td>
                      <td className="border p-2">
                        {editingIdx === idx ? (
                          <input
                            type="number"
                            value={editItems[i].cantidad}
                            onChange={e => {
                              const v = +e.target.value
                              setEditItems(prev => prev.map((it, j) => j === i ? { ...it, cantidad: v } : it))
                            }}
                            className="border p-1 w-16 mx-auto"
                          />
                        ) : p.cantidad}
                      </td>
                      <td className="border p-2">
                        {editingIdx === idx ? (
                          <input
                            type="number"
                            value={editItems[i].precioUnitarioUSD}
                            onChange={e => {
                              const v = +e.target.value
                              setEditItems(prev => prev.map((it, j) => j === i ? { ...it, precioUnitarioUSD: v } : it))
                            }}
                            className="border p-1 w-20 mx-auto"
                          />
                        ) : `$${p.precioUnitarioUSD.toFixed(2)}`}
                      </td>
                      <td className="border p-2">${(p.cantidad * p.precioUnitarioUSD).toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {invConfig.targetIdx === idx && (
                <div className="grid grid-cols-1 gap-2 mb-4">
                  <input
                    placeholder="Gasto importación"
                    value={invConfig.gastosImportacion}
                    onChange={e => setInvConfig(prev => ({ ...prev, gastosImportacion: e.target.value }))}
                    className="border p-2 rounded"
                  />
                  <input
                    placeholder="Otros gastos"
                    value={invConfig.otrosGastos}
                    onChange={e => setInvConfig(prev => ({ ...prev, otrosGastos: e.target.value }))}
                    className="border p-2 rounded"
                  />
                  <input
                    placeholder="Tipo cambio import."
                    value={invConfig.tipoCambioImportacion}
                    onChange={e => setInvConfig(prev => ({ ...prev, tipoCambioImportacion: e.target.value }))}
                    className="border p-2 rounded"
                  />
                  <button onClick={confirmarAfectInventory} className="bg-green-700 text-white px-4 py-2 rounded">
                    Confirmar inventario
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
