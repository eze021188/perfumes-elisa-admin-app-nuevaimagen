// src/components/ModalCliente.jsx
import React, { useState, useEffect } from 'react'

// Datos vacíos por defecto para el formulario
const defaultData = {
  nombre: '',
  telefono: '',
  correo: '',
  direccion: ''
}

/**
 * Modal para agregar/editar un cliente
 * @param {boolean} isOpen - controla la visibilidad del modal
 * @param {Object} initialData - datos iniciales del cliente
 * @param {(data: Object) => void} onSave - callback al guardar
 * @param {() => void} onClose - callback al cerrar
 */
export default function ModalCliente({
  isOpen,
  initialData,
  onSave,
  onClose
}) {
  // Estado del formulario, inicializado con initialData o valores por defecto
  const [formData, setFormData] = useState(initialData || defaultData)

  // Sincroniza formData cuando cambie initialData
  useEffect(() => {
    if (initialData) {
      setFormData(initialData)
    }
  }, [initialData])

  // No renderiza nada si el modal está cerrado
  if (!isOpen) return null

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6">
        <h2 className="text-xl font-semibold mb-4">
          {initialData && initialData.id ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded p-2"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Teléfono</label>
            <input
              type="tel"
              className="w-full border border-gray-300 rounded p-2"
              value={formData.telefono}
              onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Correo electrónico</label>
            <input
              type="email"
              className="w-full border border-gray-300 rounded p-2"
              value={formData.correo}
              onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Dirección (opcional)</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded p-2"
              value={formData.direccion}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })}
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className="mr-2 px-4 py-2 rounded bg-gray-200"
              onClick={onClose}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded bg-indigo-600 text-white"
            >
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
