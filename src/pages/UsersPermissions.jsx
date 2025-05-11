// src/pages/UsersPermissions.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import InviteUserModal from '../components/InviteUserModal'
import PermissionsModal from '../components/PermissionsModal'

export default function UsersPermissions() {
  const navigate = useNavigate()

  // Estado de lista de usuarios
  const [users, setUsers] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [listError, setListError] = useState(null)

  // Modal de invitación
  const [showInviteModal, setShowInviteModal] = useState(false)

  // Modal de permisos
  const [selectedUser, setSelectedUser] = useState(null)
  const [showPermModal, setShowPermModal] = useState(false)

  // Carga inicial de usuarios
  useEffect(() => {
    fetchUsers()
  }, [])

  async function fetchUsers() {
    setLoadingList(true)
    setListError(null)
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre, email')
    if (error) {
      console.error(error)
      setListError('No se pudo cargar usuarios.')
    } else {
      setUsers(data || [])
    }
    setLoadingList(false)
  }

  // Invita usuario llamando a tu Edge Function
  async function handleInviteUser(email, setInviteLoading) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email }),
        }
      )
      if (!res.ok) throw await res.json()
      toast.success('Invitación enviada!')
      setShowInviteModal(false)
      fetchUsers()
    } catch (err) {
      console.error(err)
      if (err.status === 429) {
        toast.error('Demasiadas solicitudes, espera un momento.')
      } else {
        toast.error(err.error || 'Error enviando invitación.')
      }
    } finally {
      setInviteLoading(false)
    }
  }

  function openPermissions(user) {
    setSelectedUser(user)
    setShowPermModal(true)
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
        className="mb-6 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Invitar Nuevo Usuario
      </button>

      {loadingList ? (
        <p>Cargando…</p>
      ) : listError ? (
        <p className="text-red-500">{listError}</p>
      ) : users.length === 0 ? (
        <p>No hay usuarios.</p>
      ) : (
        <table className="w-full bg-white shadow rounded">
          <thead>
            <tr>
              <th className="p-2">Nombre</th>
              <th className="p-2">Email</th>
              <th className="p-2">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="hover:bg-gray-50">
                <td className="p-2">{u.nombre || '—'}</td>
                <td className="p-2">{u.email}</td>
                <td className="p-2">
                  <button
                    onClick={() => openPermissions(u)}
                    className="px-3 py-1 bg-green-600 text-white rounded"
                  >
                    Permisos
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Modal de invitación */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteUser}
      />

      {/* Modal de permisos */}
      {selectedUser && (
        <PermissionsModal
          key={selectedUser.id}
          user={selectedUser}
          isOpen={showPermModal}
          onClose={() => setShowPermModal(false)}
          onSaved={() => {
            toast.success('Permisos actualizados')
            setShowPermModal(false)
          }}
        />
      )}
    </div>
  )
}
