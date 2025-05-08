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
    // Espera un tick para asegurar que las imágenes hayan cargado en el canvas
    await new Promise(resolve => setTimeout(resolve, 100))
    // Captura el ticket como imagen permitiendo CORS
    const canvas = await html2canvas(ticketRef.current, { useCORS: true, allowTaint: false })
    const imgData = canvas.toDataURL('image/png')
    // Crea el PDF con las mismas dimensiones
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    pdf.save(`Ticket_Venta_${venta.id}.pdf`)
  }

  return (
    <div className="p-4 bg-white rounded shadow" ref={ticketRef}>
      {/* Logo de la empresa desde public/ */}
      <div className="flex justify-center mb-4">
        <img
          src="/Logo.png"        
          alt="Logo de la empresa"
          className="w-24 h-auto"
          crossOrigin="anonymous"
        />
      </div>
      <h2 className="text-xl font-semibold mb-2 text-center">Ticket de Venta</h2>
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
        className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 w-full"
      >
        Descargar PDF
      </button>
    </div>
  )
}
