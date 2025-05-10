// src/pages/UsersPermissions.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

// Modal de invitación
const InviteUserModal = ({ isOpen, onClose, onInvite }) => {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async e => {
    e.preventDefault()
    if (loading) return           // ❤️ evita envíos si ya está cargando
    setLoading(true)
    await onInvite(email, setLoading)  // pasamos setLoading para que lo resetees según respuesta
    setLoading(false)
  }

  useEffect(() => {
    if (!isOpen) {
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
          <label className="block text-sm mb-2">Correo Electrónico</label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full border p-2 rounded mb-4"
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
              disabled={loading || !email}
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

export default function UsersPermissions() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [error, setError] = useState(null)
  const [showInviteModal, setShowInviteModal] = useState(false)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    setLoadingList(true)
    setError(null)
    const { data, error } = await supabase.from('usuarios').select('id,nombre,created_at')
    if (error) {
      setError('No se pudo cargar usuarios.')
      console.error(error)
    } else {
      setUsers(data || [])
    }
    setLoadingList(false)
  }

  // <-- aquí manejamos 429
  const handleInviteUser = async (email, setLoading) => {
    try {
      const { data, error } = await fetch(
        'https://huwyzzrelxzunvetzawp.supabase.co/functions/v1/invite-user',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        }
      ).then(async res => {
        if (res.status === 429) {
          throw { status: 429, message: 'Demasiadas solicitudes, espera un momento.' }
        }
        if (!res.ok) {
          const bd = await res.json()
          throw { status: res.status, message: bd.error || res.statusText }
        }
        return res.json()
      })

      toast.success('Invitación enviada!')
      setShowInviteModal(false)
      // Opcional: refrescar lista si crea usuario automáticamente
      // fetchUsers()
    } catch (err) {
      console.error(err)
      if (err.status === 429) {
        toast.error(err.message)
      } else {
        toast.error('Error enviando invitación.')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      <button
        onClick={() => navigate('/')}
        className="mb-6 px-4 py-2 bg-gray-700 text-white rounded"
      >
        Volver al inicio
      </button>
      <h1 className="text-2xl mb-4">Usuarios y permisos</h1>
      <button
        onClick={() => setShowInviteModal(true)}
        className="mb-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Invitar Nuevo Usuario
      </button>

      {/* Lista */}
      {loadingList
        ? <p>Cargando…</p>
        : error
          ? <p className="text-red-500">{error}</p>
          : users.length === 0
            ? <p>No hay usuarios.</p>
            : (
              <table className="w-full bg-white shadow rounded">
                <thead>
                  <tr>
                    <th className="p-2">Nombre</th>
                    <th className="p-2">ID</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id}>
                      <td className="p-2">{u.nombre || '—'}</td>
                      <td className="p-2">{u.id}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
      }

      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteUser}
      />
    </div>
  )
}
