// src/components/InviteUserModal.jsx
import React, { useEffect, useState } from 'react'
import { X, Mail, User, Send } from 'lucide-react'

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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50">
      <div className="bg-dark-800 p-6 rounded-lg shadow-dropdown-dark border border-dark-700 w-full max-w-sm">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-gray-100">Invitar Nuevo Usuario</h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <User size={16} />
              Nombre
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200"
              placeholder="Nombre completo"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1 flex items-center gap-1">
              <Mail size={16} />
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-dark-700 bg-dark-900 p-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200"
              placeholder="usuario@ejemplo.com"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-dark-700 text-gray-200 rounded-md hover:bg-dark-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !email || !name}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  <span>Enviando…</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Enviar Invitación</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}