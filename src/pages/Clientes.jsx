// src/pages/Clientes.jsx

import React, { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import { useClientes } from '../contexts/ClientesContext'
import ModalCliente from '../components/ModalCliente'

export default function Clientes() {
  const navigate = useNavigate()
  const { clientes, loading } = useClientes()

  const [busqueda, setBusqueda] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  const [clienteActual, setClienteActual] = useState(null)
  const [ventasCliente, setVentasCliente] = useState([])

  const [ventaSeleccionada, setVentaSeleccionada] = useState(null)

  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)

  // Filtrado + paginación
  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )
  const inicio = (pagina - 1) * porPagina
  const clientesPag = filtrados.slice(inicio, inicio + porPagina)

  // Carga historial de ventas de un cliente
  const handleVerCompras = async cliente => {
    setClienteActual(cliente)
    setVentaSeleccionada(null)

    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('created_at', { ascending: false })

    if (error) console.error('Error fetching ventas:', error.message)
    else setVentasCliente(data)

    setPagina(1)
  }

  // Eliminación masiva de clientes (placeholder)
  const handleEliminarSeleccionados = () => {
    // TODO: implementar
  }

  if (loading) return <p>Cargando clientes…</p>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabecera y controles */}
      <div className="flex items-center mb-4">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-700 text-white px-3 py-1 rounded mr-2"
        >
          Volver al inicio
        </button>
        <button
          onClick={() => navigate('/clientes/nuevo')}
          className="bg-blue-600 text-white px-3 py-1 rounded mr-4"
        >
          Agregar cliente
        </button>
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border p-2 rounded flex-1 mr-4"
        />
        <button
          disabled={!selectedIds.length}
          onClick={handleEliminarSeleccionados}
          className="bg-red-500 text-white px-3 py-1 rounded disabled:opacity-50"
        >
          Eliminar {selectedIds.length}
        </button>
      </div>

      {/* Selector de páginas */}
      <div className="mb-2">
        <select
          value={porPagina}
          onChange={e => setPorPagina(Number(e.target.value))}
          className="border p-1 rounded"
        >
          {[10, 25, 50, 100].map(n => (
            <option key={n} value={n}>
              {n} por página
            </option>
          ))}
        </select>
      </div>

      {/* Tabla de clientes */}
      <table className="min-w-full bg-white shadow rounded mb-6">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2"><input type="checkbox" /></th>
            <th className="p-2">Nombre</th>
            <th className="p-2">Teléfono</th>
            <th className="p-2">Correo</th>
            <th className="p-2">Dirección</th>
            <th className="p-2">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {clientesPag.map(c => (
            <tr key={c.id} className="border-t">
              <td className="p-2 text-center">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(c.id)}
                  onChange={() => {
                    const next = selectedIds.includes(c.id)
                      ? selectedIds.filter(id => id !== c.id)
                      : [...selectedIds, c.id]
                    setSelectedIds(next)
                  }}
                />
              </td>
              <td className="p-2">{c.nombre}</td>
              <td className="p-2">{c.telefono}</td>
              <td className="p-2">{c.correo}</td>
              <td className="p-2">{c.direccion}</td>
              <td className="p-2 space-x-2">
                <button
                  onClick={() => navigate(`/clientes/${c.id}/editar`)}
                  className="bg-yellow-400 text-white px-2 py-1 rounded"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleVerCompras(c)}
                  className="bg-blue-600 text-white px-2 py-1 rounded"
                >
                  Ver compras
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Historial de ventas */}
      {clienteActual && (
        <div className="mb-6">
          <h2 className="font-semibold mb-2">
            Ventas de {clienteActual.nombre}
          </h2>
          {ventasCliente.length === 0 ? (
            <p>Este cliente no tiene ventas.</p>
          ) : (
            <table className="min-w-full bg-white shadow rounded mb-4">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-2">Código</th>
                  <th className="p-2">Fecha</th>
                  <th className="p-2">Forma de pago</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasCliente.map(v => (
                  <tr
                    key={v.id}
                    className="border-t cursor-pointer hover:bg-gray-50"
                    onClick={() => setVentaSeleccionada(v)}
                  >
                    <td className="p-2">{v.codigo}</td>
                    <td className="p-2">
                      {new Date(v.created_at).toLocaleString()}
                    </td>
                    <td className="p-2">{v.forma_pago}</td>
                    <td className="p-2 text-right">${v.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Modal de detalle de venta */}
      {ventaSeleccionada && (
        <ModalCliente
          venta={ventaSeleccionada}
          clientName={clienteActual.nombre}
          isOpen={!!ventaSeleccionada}
          onClose={() => setVentaSeleccionada(null)}
          onDelete={async v => {
            await supabase.from('ventas').delete().eq('id', v.id)
            setVentaSeleccionada(null)
            handleVerCompras(clienteActual)
          }}
        />
      )}
    </div>
  )
}
