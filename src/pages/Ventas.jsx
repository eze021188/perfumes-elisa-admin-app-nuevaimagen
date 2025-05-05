import React, { useState, useEffect } from 'react'
import { supabase } from '../supabase.js'
import { useClientes } from '../contexts/ClientesContext'

export default function Ventas() {
  const [ventas, setVentas] = useState([])
  const [loading, setLoading] = useState(true)
  const { clientes } = useClientes()

  useEffect(() => {
    (async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('ventas')
        .select('*')
        .order('fecha', { ascending: false })
      if (error) console.error('Error al obtener ventas:', error)
      else setVentas(data)
      setLoading(false)
    })()
  }, [])

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Ventas</h1>
      {loading ? (
        <p>Cargando ventas...</p>
      ) : (
        <div className="overflow-auto bg-white shadow rounded">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-3 py-2">Código</th>
                <th className="px-3 py-2">Cliente</th>
                <th className="px-3 py-2">Fecha</th>
                <th className="px-3 py-2">Forma Pago</th>
                <th className="px-3 py-2">Detalle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {ventas.map(v => (
                <tr key={v.id}>
                  <td className="px-3 py-2">{v.codigo}</td>
                  <td className="px-3 py-2">
                    {clientes.find(c => c.id === v.cliente)?.nombre || '-'}
                  </td>
                  <td className="px-3 py-2">
                    {new Date(v.fecha).toLocaleString()}
                  </td>
                  <td className="px-3 py-2">{v.forma_pago}</td>
                  <td className="px-3 py-2">
                    {v.detalle.map(d => `${d.id} x${d.cantidad}`).join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
