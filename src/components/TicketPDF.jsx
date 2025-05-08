// src/components/TicketPDF.jsx
import React, { useRef, useEffect, useState } from 'react'
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'

export default function TicketPDF({ venta }) {
  const ticketRef = useRef(null)
  const [logoLoaded, setLogoLoaded] = useState(false)

  // Verifica que el logo local se haya cargado
  useEffect(() => {
    const img = new Image()
    img.src = '/Logo.png'  // Ruta absoluta a public/Logo.png
    img.onload = () => setLogoLoaded(true)
  }, [])

  const generatePDF = async () => {
    if (!ticketRef.current || !logoLoaded) {
      alert('Espera a que el logo cargue antes de generar el PDF.')
      return
    }
    // Captura el ticket como imagen
    const canvas = await html2canvas(ticketRef.current, { useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    // Crea el PDF
    const pdf = new jsPDF({ unit: 'px', format: [canvas.width, canvas.height] })
    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height)
    pdf.save(`Ticket_Venta_${venta.id}.pdf`)
  }

  return (
    <div>
      <div className="p-4 bg-white rounded shadow" ref={ticketRef}>
        {/* Logo local desde public/Logo.png */}
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
      </div>
      <button
        onClick={generatePDF}
        className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 w-full"
      >
        Descargar PDF
      </button>
    </div>
  )
}
