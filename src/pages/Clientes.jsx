// src/pages/Clientes.jsx

import React, { useState } from 'react'
import { supabase } from '../supabase'
import { useNavigate } from 'react-router-dom'
import { useClientes } from '../contexts/ClientesContext'
import NewClientModal from '../components/NewClientModal'

export default function Clientes() {
  const navigate = useNavigate()
  const { clientes, loading, actualizarCliente, eliminarCliente } = useClientes()

  const [busqueda, setBusqueda] = useState('')
  const [selectedIds, setSelectedIds] = useState([])

  const [clienteActual, setClienteActual] = useState(null)       // para historial de ventas
  const [ventasCliente, setVentasCliente] = useState([])

  const [modalOpen, setModalOpen] = useState(false)              // para crear/editar
  const [editingClient, setEditingClient] = useState(null)       // null = nuevo, else cliente a editar

  const [pagina, setPagina] = useState(1)
  const [porPagina, setPorPagina] = useState(25)

  // Filtrado + paginación
  const filtrados = clientes.filter(c =>
    c.nombre.toLowerCase().includes(busqueda.toLowerCase())
  )
  const inicio = (pagina - 1) * porPagina
  const clientesPag = filtrados.slice(inicio, inicio + porPagina)

  // Historial de ventas
  const handleVerCompras = async c => {
    setClienteActual(c)
    setVentasCliente([])
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .eq('cliente_id', c.id)
      .order('created_at', { ascending: false })
    if (error) console.error(error.message)
    else setVentasCliente(data)
    setPagina(1)
  }

  // Abrir modal en “nuevo”
  const abrirNuevo = () => {
    setEditingClient(null)
    setModalOpen(true)
  }

  // Abrir modal en “editar”
  const abrirEditar = c => {
    setEditingClient(c)
    setModalOpen(true)
  }

  // Handler cuando se guarda (nuevo o editado)
  const onClientSaved = async clienteData => {
    if (editingClient) {
      // era edición
      await actualizarCliente(editingClient.id, clienteData)
    }
    // para creación, NewClientModal llamará internamente a agregarCliente()
    setModalOpen(false)
  }

  if (loading) return <p>Cargando clientes…</p>

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Cabecera y controles */}
      <div className="flex flex-wrap items-center mb-4 gap-2">
        <button
          onClick={() => navigate('/')}
          className="bg-gray-700 text-white px-3 py-1 rounded"
        >
          Volver al inicio
        </button>
        <button
          onClick={abrirNuevo}
          className="bg-blue-600 text-white px-3 py-1 rounded"
        >
          Agregar cliente
        </button>
        <input
          type="text"
          placeholder="Buscar cliente..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="border p-2 rounded flex-1 min-w-[200px]"
        />
        <button
          disabled={!selectedIds.length}
          onClick={() => {
            selectedIds.forEach(id => eliminarCliente(id))
            setSelectedIds([])
          }}
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
            <th className="p-2">
              <input
                type="checkbox"
                checked={
                  clientesPag.length > 0 &&
                  selectedIds.length === clientesPag.length
                }
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedIds(clientesPag.map(c => c.id))
                  } else {
                    setSelectedIds([])
                  }
                }}
              />
            </th>
            <th className="p-2">Nombre</th>
            <th className="p-2">Teléfono</th>
            <th className="p-2 hidden md:table-cell">Correo</th>
            <th className="p-2 hidden md:table-cell">Dirección</th>
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
                    setSelectedIds(prev =>
                      prev.includes(c.id)
                        ? prev.filter(x => x !== c.id)
                        : [...prev, c.id]
                    )
                  }}
                />
              </td>
              <td className="p-2">{c.nombre}</td>
              <td className="p-2">{c.telefono}</td>
              <td className="p-2 hidden md:table-cell">{c.correo}</td>
              <td className="p-2 hidden md:table-cell">{c.direccion}</td>
              <td className="p-2 space-x-2">
                <button
                  onClick={() => abrirEditar(c)}
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
                  <th className="p-2">Pago</th>
                  <th className="p-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {ventasCliente.map(v => (
                  <tr
                    key={v.id}
                    className="border-t cursor-pointer hover:bg-gray-50"
                  >
                    <td className="p-2">{v.codigo_venta || v.codigo}</td>
                    <td className="p-2">
                      {new Date(v.created_at || v.fecha).toLocaleString()}
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

      {/* Modal para crear/editar cliente */}
      <NewClientModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onClientAdded={onClientSaved}
        cliente={editingClient}
      />
    </div>
)
}
