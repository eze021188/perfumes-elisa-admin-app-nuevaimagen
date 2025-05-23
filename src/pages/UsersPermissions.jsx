// src/pages/UsersPermissions.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import InviteUserModal from '../components/InviteUserModal'
import PermissionsModal from '../components/PermissionsModal'
import { ArrowLeft, UserPlus, Shield, Mail, User } from 'lucide-react'

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
  async function handleInviteUser(userData, setInviteLoading) {
    try {
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/invite-user`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ email: userData.email, name: userData.name }),
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
    <div className="min-h-screen bg-dark-900 p-4 md:p-8 lg:p-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-dark-800 text-gray-200 font-semibold rounded-lg shadow-elegant-dark hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-100 text-center">Usuarios y permisos</h1>
        <div className="w-full md:w-[150px]" />
      </div>

      <div className="bg-dark-800 rounded-lg shadow-card-dark p-6 border border-dark-700/50">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold text-gray-100">Gestión de Usuarios</h2>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg shadow-elegant-dark hover:bg-primary-700 transition-colors flex items-center gap-2"
          >
            <UserPlus size={18} />
            Invitar Nuevo Usuario
          </button>
        </div>

        {loadingList ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
          </div>
        ) : listError ? (
          <div className="text-center py-12 bg-dark-900/50 rounded-lg border border-dark-700/50">
            <p className="text-error-400">{listError}</p>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-12 bg-dark-900/50 rounded-lg border border-dark-700/50">
            <User size={48} className="mx-auto text-gray-600 mb-3" />
            <p className="text-gray-400">No hay usuarios registrados.</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-dark-900/50 rounded-lg border border-dark-700/50">
            <table className="min-w-full divide-y divide-dark-700">
              <thead className="bg-dark-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Email</th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-400 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="bg-dark-800/30 divide-y divide-dark-700/50">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-dark-700/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary-900/50 flex items-center justify-center text-primary-400 font-medium">
                          {u.nombre ? u.nombre[0].toUpperCase() : u.email[0].toUpperCase()}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-200">{u.nombre || '—'}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-300">
                        <Mail size={14} className="mr-2 text-gray-400" />
                        {u.email}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <button
                        onClick={() => openPermissions(u)}
                        className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center gap-1 mx-auto"
                      >
                        <Shield size={14} />
                        Permisos
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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