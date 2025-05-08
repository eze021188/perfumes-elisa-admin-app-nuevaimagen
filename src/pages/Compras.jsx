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
  const [nombresSugeridos, setNombresSugeridos] = useState([])

  // 1) Carga inicial de compras e ítems
  useEffect(() => { fetchCompras() }, [])
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('productos').select('nombre')
      if (!error && data) {
        setNombresSugeridos(Array.from(new Set(data.map(p => p.nombre))))
      }
    })()
  }, [])

  async function fetchCompras() {
    const { data: cabeceras = [], error: errCab } = await supabase
      .from('compras').select('*').order('created_at', { ascending: false })
    if (errCab) return console.error('Error al obtener compras:', errCab)
    const { data: items = [], error: errItems } = await supabase
      .from('compra_items').select('*')
    if (errItems) return console.error('Error al obtener ítems de compra:', errItems)
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

  // 2) Manejo de inputs
  const manejarCambio = e => {
    const { name, value } = e.target
    setFormulario(prev => ({ ...prev, [name]: value }))
  }

  // 3) Agregar/eliminar ítem en el formulario
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
  const contarArticulos = items =>
    items.reduce((sum, p) => sum + p.cantidad, 0)

  // 5) Guardar compra + sus ítems
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
      .from('compras').insert(cabecera).select('*').single()
    if (errCab) return alert('Error al guardar compra: ' + errCab.message)

    const payload = productosAgregados.map(p => ({
      compra_id: compra.id,
      nombre_producto: p.nombreProducto,
      cantidad: p.cantidad,
      precio_unitario_usd: p.precioUnitarioUSD
    }))
    const { data: insItems, error: errItems } = await supabase
      .from('compra_items').insert(payload).select('*')
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

  // 7) Eliminar compra + revertir inventario si ya afectado
  const eliminarCompra = async idx => {
    const { compra, items } = savedCompras[idx]
    try {
      if (compra.inventario_afectado) {
        const { data: catalogo = [] } = await supabase
          .from('productos').select('id, nombre, stock')
        for (const p of items) {
          const prod = catalogo.find(x => x.nombre === p.nombreProducto)
          if (!prod) continue
          const nuevoStock = prod.stock - p.cantidad
          if (nuevoStock >= 0) {
            await supabase.from('productos').update({ stock: nuevoStock }).eq('id', prod.id)
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

  // 8) Afectar inventario
  const confirmarAfectInventory = async () => {
    const { gastosImportacion, tipoCambioImportacion, otrosGastos, targetIdx } = invConfig
    if (targetIdx === null) return alert('Selecciona la compra a afectar')
    if (!gastosImportacion || !tipoCambioImportacion || !otrosGastos)
      return alert('Completa los campos de gastos')

    const { compra, items } = savedCompras[targetIdx]
    // 8.1) Actualizar cabecera
    const { error: errCab } = await supabase
      .from('compras')
      .update({
        gastos_importacion: Number(gastosImportacion),
        tipo_cambio_importacion: Number(tipoCambioImportacion),
        otros_gastos: Number(otrosGastos),
        inventario_afectado: true
      })
      .eq('id', compra.id)
    if (errCab) return alert('Error al actualizar compra: ' + errCab.message)

    // 8.2) Traer catálogo
    const { data: catalogo = [], error: errCat } = await supabase
      .from('productos').select('id, nombre, stock')
    if (errCat) return alert('Error al cargar catálogo: ' + errCat.message)

    // 8.3) Calcular costos y actualizar/insertar
    for (const p of items) {
      let prod = catalogo.find(x => x.nombre === p.nombreProducto)

      if (prod) {
        // actualizar stock
        await supabase
          .from('productos')
          .update({ stock: prod.stock + p.cantidad })
          .eq('id', prod.id)
      } else {
        // crear nuevo producto
        const { data: newProd, error: errInsProd } = await supabase
          .from('productos')
          .insert({
            nombre: p.nombreProducto,
            stock: p.cantidad
          })
          .select('id')
          .single()
        if (errInsProd) {
          console.error('Error insertando producto:', errInsProd)
          return alert('Error al crear producto: ' + errInsProd.message)
        }
        prod = newProd
      }

      // registrar movimiento de entrada
      await supabase.from('movimientos_inventario').insert({
        tipo: 'ENTRADA',
        producto_id: prod.id,
        cantidad: p.cantidad,
        referencia: compra.numero_pedido,
        fecha: new Date().toISOString()
      })
    }

    // 8.4) Refrescar
    fetchCompras()
    setInvConfig({ gastosImportacion: '', tipoCambioImportacion: '', otrosGastos: '', targetIdx: null })
    alert(`Inventario afectado para pedido ${compra.numero_pedido}`)
  }

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded shadow">
      {/* botones de control */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => (window.location.href = '/')}
          className="bg-gray-700 hover:bg-gray-800 text-white px-4 py-2 rounded"
        >
          Volver al inicio
        </button>
        <button
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
        >
          {mostrarFormulario ? 'Cancelar' : 'Registrar Compra'}
        </button>
      </div>

      {/* formulario de nueva compra */}
      {mostrarFormulario && (
        <div className="mb-6 space-y-4">
          {/* cabecera */}
          <div className="grid grid-cols-3 gap-4">
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
          {/* gastos y descuento */}
          <div className="grid grid-cols-3 gap-4">
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
          {/* agregar producto */}
          <div className="flex gap-2 items-end">
            <div className="relative flex-1">
              <input
                name="nombreProducto"
                placeholder="Producto"
                value={formulario.nombreProducto}
                onChange={manejarCambio}
                className="border p-2 rounded w-full"
                autoComplete="off"
              />
              {formulario.nombreProducto && (
                <ul className="absolute z-10 bg-white border border-gray-300 w-full rounded mt-1 max-h-40 overflow-y-auto">
                  {nombresSugeridos
                    .filter(n => n.toLowerCase().includes(formulario.nombreProducto.toLowerCase()))
                    .slice(0, 8)
                    .map((n, i) => (
                      <li
                        key={i}
                        className="p-2 hover:bg-blue-100 cursor-pointer"
                        onClick={() => setFormulario(prev => ({ ...prev, nombreProducto: n }))}
                      >
                        {n}
                      </li>
                    ))}
                </ul>
              )}
            </div>
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
          {/* tabla de productos agregados */}
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

      {/* listado de compras */}
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
              {/* tabla de ítems */}
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

              {/* resumen y total artículos */}
              <div className="flex justify-between items-center mb-4">
                <div>
                  <strong>Total artículos:</strong> {contarArticulos(items)}
                </div>
                <div className="text-right">
                  <p>Subtotal: ${calcularSubtotal(items).toFixed(2)}</p>
                  <p>Descuento: ${compra.descuento_total_usd.toFixed(2)}</p>
                  <p className="font-bold">Total: ${calcularTotal(items, compra.descuento_total_usd).toFixed(2)}</p>
                </div>
              </div>

              {/* acciones de edición, eliminación, afectar inventario */}
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

              {/* formulario de afectación de inventario */}
              {invConfig.targetIdx === idx && (
                <div className="grid grid-cols-1 gap-2 mb-4">
                  <input
                    placeholder="Gastos importación"
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
