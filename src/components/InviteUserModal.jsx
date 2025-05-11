// src/components/InviteUserModal.jsx
import React, { useEffect, useState } from 'react'

export default function InviteUserModal({ isOpen, onClose, onInvite }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (loading) return
    setLoading(true)
    await onInvite({ name, email }, setLoading)
    setLoading(false)
  }

  useEffect(() => {
    if (!isOpen) {
      setName('')
      setEmail('')
      setLoading(false)
    }
  }, [isOpen])

  if (!isOpen) return null
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm">
        <h2 className="text-xl font-semibold mb-4">Invitar Nuevo Usuario</h2>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm mb-2">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full border p-2 rounded mb-4"
            placeholder="Nombre completo"
            required
          />

          <label className="block text-sm mb-2">Correo Electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border p-2 rounded mb-4"
            placeholder="usuario@ejemplo.com"
            required
          />

          <div className="flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !email || !name}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
            >
              {loading ? 'Enviando…' : 'Enviar Invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
