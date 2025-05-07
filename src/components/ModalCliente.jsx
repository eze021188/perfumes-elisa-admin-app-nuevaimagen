// src/components/ModalCliente.jsx

import React, { useState, useEffect } from 'react'
import jsPDF from 'jspdf'
import 'jspdf-autotable'
import { supabase } from '../supabase'

export default function ModalCliente({
  venta,
  clientName,
  isOpen,
  onClose,
  onDelete
}) {
  const [detalle, setDetalle] = useState({ info: null, items: [] })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!venta || !isOpen) return
    fetchDetalle()
  }, [venta, isOpen])

  const fetchDetalle = async () => {
    setLoading(true)
    // Cabecera de venta
    const { data: infoRaw, error: errInfo } = await supabase
      .from('ventas')
      .select('*')
      .eq('id', venta.id)
      .single()
    if (errInfo) {
      console.error(errInfo)
      setLoading(false)
      return
    }

    // Items desde detalle_venta
    const { data: itemsRaw, error: errItems } = await supabase
      .from('detalle_venta')
      .select('producto_id, cantidad, precio_unitario, total_parcial')
      .eq('venta_id', venta.id)
    if (errItems) {
      console.error(errItems)
      setLoading(false)
      return
    }

    // Nombres de productos
    const productIds = itemsRaw.map(i => i.producto_id)
    const { data: productos, error: errProds } = await supabase
      .from('productos')
      .select('id, nombre')
      .in('id', productIds)
    if (errProds) console.error(errProds)

    const items = itemsRaw.map(item => {
      const prod = productos.find(p => p.id === item.producto_id)
      return {
        nombre: prod?.nombre || '—',
        cantidad: item.cantidad,
        precio: item.precio_unitario,
        subtotal: item.total_parcial
      }
    })

    setDetalle({ info: infoRaw, items })
    setLoading(false)
  }

  const abrirPDF = () => {
    const { info, items } = detalle
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Ticket de venta - ${info.codigo_venta}`, 10, 10)
    doc.setFontSize(12)
    doc.text(`Cliente: ${clientName}`, 10, 20)
    doc.text(`Fecha: ${new Date(info.fecha).toLocaleString()}`, 10, 30)
    doc.text(`Forma de pago: ${info.forma_pago}`, 10, 40)

    doc.autoTable({
      startY: 50,
      head: [['Producto', 'Cantidad', 'P. Unitario', 'Subtotal']],
      body: items.map(i => [
        i.nombre,
        i.cantidad,
        `$${i.precio.toFixed(2)}`,
        `$${i.subtotal.toFixed(2)}`
      ])
    })

    const finalY = doc.lastAutoTable?.finalY || 60
    doc.setFont(undefined, 'bold')
    const subtotal = items.reduce((sum, i) => sum + i.subtotal, 0)
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 10, finalY + 10)
    const descText = info.tipo_descuento === 'porcentaje'
      ? `-${info.valor_descuento}%`
      : `-$${info.valor_descuento}`
    doc.text(`Descuento: ${descText}`, 10, finalY + 20)
    doc.text(`Total: $${info.total.toFixed(2)}`, 180, finalY + 30, { align: 'right' })

    window.open(doc.output('bloburl'), '_blank')
  }

  // No renderizar si el modal está cerrado o cargando
  if (!isOpen || loading) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="relative bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        {/* X para cerrar modal */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-600 hover:text-black text-2xl"
          aria-label="Cerrar"
        >
          ×
        </button>

        <h2 className="text-xl font-semibold mb-4">Detalle de Venta</h2>
        <p><strong>Código:</strong> {detalle.info.codigo_venta}</p>
        <p><strong>Cliente:</strong> {clientName}</p>
        <p><strong>Fecha:</strong> {new Date(detalle.info.fecha).toLocaleString()}</p>
        <p><strong>Forma de pago:</strong> {detalle.info.forma_pago}</p>
        <hr className="my-3" />

        <table className="w-full text-sm border mb-3">
          <thead>
            <tr className="bg-gray-100">
              <th className="p-1 border">Producto</th>
              <th className="p-1 border">Cantidad</th>
              <th className="p-1 border">Precio</th>
              <th className="p-1 border">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {detalle.items.map((i, idx) => (
              <tr key={idx} className="text-center">
                <td className="p-1 border">{i.nombre}</td>
                <td className="p-1 border">{i.cantidad}</td>
                <td className="p-1 border">${i.precio.toFixed(2)}</td>
                <td className="p-1 border">${i.subtotal.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <p className="font-semibold">Subtotal: ${detalle.items.reduce((sum,i)=>sum+i.subtotal,0).toFixed(2)}</p>
        <p className="font-semibold">
          Descuento: {detalle.info.tipo_descuento==='porcentaje'
            ? `-${detalle.info.valor_descuento}%`
            : `-$${detalle.info.valor_descuento}`}
        </p>
        <p className="font-semibold">Total: ${detalle.info.total.toFixed(2)}</p>

        <div className="mt-4 flex justify-end space-x-2">
          <button
            onClick={abrirPDF}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >Ver PDF</button>
          <button
            onClick={() => onDelete(venta)}
            className="bg-red-600 text-white px-4 py-2 rounded"
          >Eliminar</button>
        </div>
      </div>
    </div>
  )
}