// src/components/TicketPDF.jsx
import React, { useRef } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

/**
 * Componente que genera un PDF de ticket de venta
 * @param {{
 *   id: string,
 *   cliente: { nombre: string },
 *   fecha: string,
 *   productos: Array<{ nombre: string, cantidad: number, precioUnitario: number }>,
 *   total: number
 * }} props.venta - datos de la venta para el ticket
 */
export default function TicketPDF({ venta }) {
  const ticketRef = useRef(null)

  const generatePDF = async () => {
    if (!ticketRef.current) return
    // Captura el ticket como imagen
    const canvas = await html2canvas(ticketRef.current)
    const imgData = canvas.toDataURL('image/png')
    // Crea el PDF
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    pdf.save(`Ticket_Venta_${venta.id}.pdf`)
  }

  return (
    <div className="p-4 bg-white rounded shadow" ref={ticketRef}>
      <h2 className="text-xl font-semibold mb-2">Ticket de Venta</h2>
      <p className="text-sm text-gray-600 mb-4">Código: <strong>{venta.id}</strong></p>
      <p className="text-sm text-gray-600">Cliente: <strong>{venta.cliente.nombre}</strong></p>
      <p className="text-sm text-gray-600 mb-4">Fecha: <strong>{new Date(venta.fecha).toLocaleString()}</strong></p>
      <table className="w-full mb-4 text-sm">
        <thead>
          <tr>
            <th className="text-left">Producto</th>
            <th className="text-right">Cantidad</th>
            <th className="text-right">Precio</th>
          </tr>
        </thead>
        <tbody>
          {venta.productos.map((p, i) => (
            <tr key={i}>
              <td>{p.nombre}</td>
              <td className="text-right">{p.cantidad}</td>
              <td className="text-right">${p.precioUnitario.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flex justify-end mb-4">
        <span className="text-lg font-bold">Total: ${venta.total.toFixed(2)}</span>
      </div>
      <button
        onClick={generatePDF}
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700"
      >
        Descargar PDF
      </button>
    </div>
  )
}