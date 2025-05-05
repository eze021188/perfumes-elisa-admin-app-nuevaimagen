// src/pages/Clientes.jsx
import React, { useState, useEffect } from 'react'
import { useClientes } from '../contexts/ClientesContext'
import AutocompleteInput from '../components/AutocompleteInput'
import ModalCliente from '../components/ModalCliente'

export default function Clientes() {
  const {
    clientes,
    loading,
    obtenerClientes,
    agregarCliente,
    actualizarCliente,
    eliminarCliente,
  } = useClientes()

  const [searchText, setSearchText] = useState('')
  const [filteredClientes, setFilteredClientes] = useState([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editData, setEditData] = useState(null)

  // Carga inicial y recarga cuando se modifiquen clientes
  useEffect(() => {
    obtenerClientes()
  }, [])

  // Filtrado al cambiar búsqueda o lista
  useEffect(() => {
    if (searchText) {
      const lower = searchText.toLowerCase()
      setFilteredClientes(
        clientes.filter(c => c.nombre.toLowerCase().includes(lower))
      )
    } else {
      setFilteredClientes(clientes)
    }
  }, [searchText, clientes])

  const openNew = () => {
    setEditData(null)
    setModalOpen(true)
  }

  const openEdit = cliente => {
    setEditData(cliente)
    setModalOpen(true)
  }

  const handleSave = async data => {
    if (editData) {
      await actualizarCliente(editData.id, data)
    } else {
      await agregarCliente(data)
    }
    setModalOpen(false)
  }

  const handleDelete = async id => {
    if (confirm('¿Eliminar este cliente?')) {
      await eliminarCliente(id)
    }
  }

  return (
    <div className="p-6">
      {/* Barra de búsqueda + botón, flex-wrap para móviles */}
      <div className="flex flex-wrap items-center gap-4 mb-6">
        <div className="flex-1 min-w-0">
          <AutocompleteInput
            className="w-full"
            suggestions={clientes.map(c => ({ label: c.nombre, value: c.id }))}
            value={searchText}
            onChange={setSearchText}
            onSelect={item => setSearchText(item.label)}
            placeholder="Buscar cliente..."
          />
        </div>
        <button
          onClick={openNew}
          className="flex-none px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          Nuevo Cliente
        </button>
      </div>

      {loading ? (
        <p>Cargando clientes...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-2 text-left">Nombre</th>
                <th className="px-4 py-2 text-left">Teléfono</th>
                <th className="px-4 py-2 text-left">Correo</th>
                <th className="px-4 py-2 text-left">Dirección</th>
                <th className="px-4 py-2">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredClientes.map(cliente => (
                <tr key={cliente.id} className="border-b">
                  <td className="px-4 py-2">{cliente.nombre}</td>
                  <td className="px-4 py-2">{cliente.telefono}</td>
                  <td className="px-4 py-2">{cliente.correo}</td>
                  <td className="px-4 py-2">{cliente.direccion || '-'}</td>
                  <td className="px-4 py-2 text-center space-x-2">
                    <button
                      onClick={() => openEdit(cliente)}
                      className="px-2 py-1 bg-yellow-400 text-white rounded hover:bg-yellow-500"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(cliente.id)}
                      className="px-2 py-1 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ModalCliente
        isOpen={modalOpen}
        initialData={editData || undefined}
        onSave={handleSave}
        onClose={() => setModalOpen(false)}
      />
    </div>
  )
}
