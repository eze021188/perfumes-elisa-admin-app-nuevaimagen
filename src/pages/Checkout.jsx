// src/pages/Checkout.jsx
import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { useClientes } from '../contexts/ClientesContext'
import { useProductos } from '../contexts/ProductosContext'
import { useInventarios } from '../contexts/InventariosContext'
import AutocompleteInput from '../components/AutocompleteInput'
import TicketPDF from '../components/TicketPDF'

export default function Checkout() {
  // Contextos
  const { clientes, loading: loadingClientes } = useClientes()
  const { productos, actualizarProducto } = useProductos()
  const { registrarMovimiento } = useInventarios()

  // Formulario de venta
  const [clienteInput, setClienteInput] = useState('')
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [productoInput, setProductoInput] = useState('')
  const [detalle, setDetalle] = useState([])
  const [formaPago, setFormaPago] = useState('')

  // Histórico de ventas
  const [ventas, setVentas] = useState([])
  const [loadingVentas, setLoadingVentas] = useState(true)

  // Datos para ticket
  const [ticketData, setTicketData] = useState(null)

  // Carga histórico de ventas
  useEffect(() => {
    cargarVentas()
  }, [])

  const cargarVentas = async () => {
    setLoadingVentas(true)
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('fecha', { ascending: false })
    if (error) console.error('Error cargando ventas:', error)
    else setVentas(data)
    setLoadingVentas(false)
  }

  // Agregar producto al detalle
  const handleAddProduct = item => {
    const exists = detalle.find(p => p.value === item.value)
    if (!exists) {
      setDetalle(prev => [...prev, { ...item, cantidad: 1 }])
    }
    setProductoInput('')
  }

  // Cambiar cantidad en detalle
  const handleCantidadChange = (index, cantidad) => {
    setDetalle(prev =>
      prev.map((p, i) => (i === index ? { ...p, cantidad: Number(cantidad) } : p))
    )
  }

  // Generar código tipo VT00001
  const generarCodigo = async () => {
    const { count, error } = await supabase
      .from('ventas')
      .select('id', { count: 'exact', head: true })
    if (error) return 'VT00001'
    const numero = (count || 0) + 1
    return `VT${numero.toString().padStart(5, '0')}`
  }

  // Finalizar venta
  const handleFinalizarVenta = async () => {
    if (!clienteSeleccionado || detalle.length === 0 || !formaPago) {
      alert('Completa cliente, productos y forma de pago.')
      return
    }
    const codigo = await generarCodigo()
    const fecha = new Date().toISOString()
    // Inserta nueva venta
    const { data: ventaInsertada, error } = await supabase
      .from('ventas')
      .insert({
        codigo,
        cliente: clienteSeleccionado.id,
        fecha,
        formaPago,
        detalle: detalle.map(p => ({ id: p.value, cantidad: p.cantidad }))
      })
      .select()
    if (error) {
      console.error('Error al insertar venta:', error)
      return
    }
    // Actualizar stock y registrar movimientos
    detalle.forEach(async p => {
      const nuevoStock = p.stock - p.cantidad
      await actualizarProducto(p.value, { stock: nuevoStock })
      await registrarMovimiento({
        tipo: 'venta',
        producto: p.value,
        cantidad: -p.cantidad,
        referencia: codigo
      })
    })
    // Preparar datos para ticket
    const total = detalle.reduce(
      (sum, p) => sum + p.precioUnitario * p.cantidad,
      0
    )
    setTicketData({ id: codigo, cliente: clienteSeleccionado, fecha, productos: detalle, total })
    // Refrescar histórico y limpiar form
    cargarVentas()
    setClienteSeleccionado(null)
    setClienteInput('')
    setDetalle([])
    setFormaPago('')
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Nueva Venta */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Nueva Venta</h2>
          <div className="space-y-4">
            <AutocompleteInput
              suggestions={clientes.map(c => ({ label: c.nombre, value: c }))}
              value={clienteInput}
              onChange={setClienteInput}
              onSelect={item => {
                setClienteSeleccionado(item.value)
                setClienteInput(item.label)
              }}
              placeholder="Selecciona cliente"
            />
            <AutocompleteInput
              suggestions={productos.map(p => ({
                label: p.nombre,
                value: p.id,
                precioUnitario: p.precioPromocion,
                stock: p.stock
              }))}
              value={productoInput}
              onChange={setProductoInput}
              onSelect={item => handleAddProduct({ ...item, stock: item.stock })}
              placeholder="Selecciona producto"
            />
            {detalle.map((p, i) => (
              <div key={i} className="flex items-center space-x-2">
                <span className="flex-1">{p.label}</span>
                <input
                  type="number"
                  min="1"
                  max={p.stock}
                  value={p.cantidad}
                  onChange={e => handleCantidadChange(i, e.target.value)}
                  className="w-16 border rounded p-1"
                />
                <span className="w-24 text-right">${p.precioUnitario.toFixed(2)}</span>
              </div>
            ))}
            <div className="flex items-center space-x-2">
              <label className="font-medium">Forma de pago:</label>
              <select
                value={formaPago}
                onChange={e => setFormaPago(e.target.value)}
                className="border rounded p-1"
              >
                <option value="">-- Selecciona --</option>
                <option value="efectivo">Efectivo</option>
                <option value="tarjeta">Tarjeta</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <div className="text-right font-bold text-lg">
              Total: ${detalle.reduce((sum, p) => sum + p.precioUnitario * p.cantidad, 0).toFixed(2)}
            </div>
            <button
              onClick={handleFinalizarVenta}
              className="w-full px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              Finalizar Venta
            </button>
          </div>
        </div>

        {/* Ticket */}
        <div>
          <h2 className="text-xl font-semibold mb-2">Ticket</h2>
          {ticketData ? (
            <TicketPDF venta={ticketData} />
          ) : (
            <p className="text-gray-600">Genera una venta para ver el ticket.</p>
          )}
        </div>
      </div>

      {/* Historial de Ventas */}
      <div>
        <h2 className="text-xl font-semibold mb-2">Historial de Ventas</h2>
        {loadingVentas ? (
          <p>Cargando ventas...</p>
        ) : (
          <div className="overflow-auto bg-white shadow rounded">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-3 py-2 text-left">Código</th>
                  <th className="px-3 py-2 text-left">Cliente</th>
                  <th className="px-3 py-2 text-left">Fecha</th>
                  <th className="px-3 py-2 text-right">Total USD</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {ventas.map(v => (
                  <tr key={v.id}>
                    <td className="px-3 py-2">{v.codigo}</td>
                    <td className="px-3 py-2">{clientes.find(c => c.id === v.cliente)?.nombre || '-'}</td>
                    <td className="px-3 py-2">{new Date(v.fecha).toLocaleDateString()}</td>
                    <td className="px-3 py-2 text-right">
                      ${detalleSumatoria(v.id).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper para sumar total por venta (debes reemplazar con lógica adecuada si guardas total en DB)
function detalleSumatoria(ventaId) {
  // Esta función es un placeholder. Idealmente el total viene de la DB.
  return 0
}
