// src/pages/UsersPermissions.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

// Mini componente Modal simple para invitación
const InviteUserModal = ({ isOpen, onClose, onInvite }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    await onInvite(email);
    setLoading(false);
    setEmail('');
    // si quieres cerrar el modal siempre, descomenta:
    // onClose();
  };

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-sm mx-auto">
        <h2 className="text-xl font-semibold mb-4">Invitar Nuevo Usuario</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Correo Electrónico
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 p-2 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 text-gray-800 rounded-md hover:bg-gray-400 transition duration-200"
              disabled={loading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading || !email}
            >
              {loading ? 'Enviando...' : 'Enviar Invitación'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default function UsersPermissions() {
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nombre, created_at');

      if (error) {
        if (error.code === '42501') {
          setError(
            'Error de permisos: no autorizado para ver esta lista. Revisa las políticas RLS.'
          );
        } else {
          setError('Error al cargar la lista de usuarios.');
        }
        setUsers([]);
      } else {
        setUsers(data || []);
      }
    } catch (err) {
      console.error('Error inesperado:', err);
      toast.error('Error inesperado al cargar usuarios.');
      setError('Error inesperado al obtener usuarios.');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInviteUser = async (email) => {
    // Usamos el cliente integrado de Edge Functions para evitar CORS
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email },
    });

    if (error) {
      console.error('Error invoking Edge Function:', error);
      toast.error(`Error: ${error.message}`);
      return;
    }

    console.log('Invitation result:', data);
    toast.success('Invitación enviada con éxito!');
    setShowInviteModal(false);
    // Si quisieras refrescar la lista: fetchUsers();
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200"
        >
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Usuarios y permisos
        </h1>
        <div className="w-full md:w-[150px]" />
      </div>

      {/* Lista */}
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Lista de Usuarios</h2>
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-200"
          >
            Invitar Nuevo Usuario
          </button>
        </div>

        {loading ? (
          <p className="text-center text-gray-600">Cargando usuarios...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500">
            No hay usuarios registrados.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    ID (UUID)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Registro
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                      {user.nombre || 'Sin nombre'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {user.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                      {user.created_at
                        ? new Date(user.created_at).toLocaleDateString()
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Invitación */}
      <InviteUserModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        onInvite={handleInviteUser}
      />
    </div>
  );
}
