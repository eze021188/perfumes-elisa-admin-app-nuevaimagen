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
    await onInvite(email); // Llama a la función de invitar del padre
    setLoading(false);
    setEmail(''); // Limpia el email
    onClose(); // Cierra el modal
  };

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

  // Estados para almacenar la lista de usuarios, el estado de carga y los errores
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estado para controlar la visibilidad del modal de invitación
  const [showInviteModal, setShowInviteModal] = useState(false);


  // Efecto para cargar los usuarios cuando el componente se monta
  useEffect(() => {
    fetchUsers();
  }, []); // Array vacío para que se ejecute solo una vez al montar

  // Función asíncrona para obtener usuarios de la base de datos
  const fetchUsers = async () => {
    setLoading(true); // Inicia estado de carga
    setError(null);   // Limpia errores previos
    try {
      // Obtiene todos los usuarios de la tabla 'usuarios'
      // Asegúrate de que la tabla 'usuarios' en Supabase tiene RLS configurado
      // para permitir leer datos si no eres admin, o si necesitas leer todos.
      const { data, error } = await supabase
        .from('usuarios') // <<< Tu tabla pública de usuarios
        .select('id, nombre, created_at'); // <<< Selecciona las columnas que quieres mostrar

      if (error) {
        // Si hay un error de RLS, el error.code puede ser '42501' (permission denied)
         if (error.code === '42501') {
            setError('Error de permisos: No tienes autorización para ver esta lista de usuarios. Revisa las políticas RLS.');
            console.error('Error RLS:', error.message);
            //toast.error('Error de permisos al cargar usuarios.'); // Evitar doble toast si ya hay error en la consola
         } else {
            setError('Error al cargar la lista de usuarios.');
            console.error('Error cargando usuarios:', error.message);
            //toast.error('Error al cargar usuarios.');
         }
         setUsers([]); // Limpia la lista en caso de error
      } else {
        setUsers(data || []); // Guarda los datos obtenidos (o un array vacío si es null)
      }
    } catch (err) {
       setError('Ocurrió un error inesperado al obtener usuarios.');
       console.error('Error inesperado:', err.message);
       toast.error('Error inesperado al cargar usuarios.');
       setUsers([]);
    } finally {
      setLoading(false); // Finaliza estado de carga
    }
  };

   // Función para invitar un nuevo usuario usando Service Role Key
  const handleInviteUser = async (email) => {
    try {
        // ⚠️ SEGURIDAD: Usar Service Role Key en el frontend es INSEGURO en producción.
        // Deberías llamar a una Edge Function o backend que use la clave de servicio.
        // Aquí se muestra por DEMOSTRACIÓN.

        // Asegúrate de tener tu Service Role Key disponible.
        // En un entorno real, esto se pasaría a una función segura del lado del servidor.
        // Para test local, puedes inicializar Supabase con la Service Role Key AQUÍ (solo para pruebas, ¡NO PARA PROD!)
        // const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey); // Necesitarías importar createClient y tener la clave


        // Usaremos la instancia global 'supabase' asumiendo que está configurada con la clave ANÓNIMA.
        // Necesitarás usar la clave de Servicio para auth.admin
        // Si la clave de servicio NO está configurada en tu instancia 'supabase', esta llamada fallará.
        // La forma correcta es pasar la Service Role Key al inicializar una *segunda* instancia de supabase
        // O llamar a un endpoint seguro.

        // ** ALTERNATIVA SEGURA (Recomendada para Prod) **
        // Llamar a una Edge Function o API de backend
        /*
        const { data, error } = await fetch('/api/invite-user', { // Ejemplo de endpoint
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
        if (error) throw new Error(error.message || 'Error inviting user via backend');
        */

        // ** ALTERNATIVA INSEGURA (Solo para DEMO / Test Local con Precaución Extrema) **
        // Llama directamente al método admin (requiere que 'supabase' esté configurado con Service Role Key o usar una nueva instancia)
        // Si tu instancia 'supabase' usa la clave ANÓNIMA/PUBLIC, NECESITAS una nueva instancia o backend.

        // Usando una instancia con Service Role Key (NO SEGURO EN FRONTEND DE PROD)
        // const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

        // Asumiendo que tienes una forma de usar la clave de servicio (ej: env variable y nueva instancia createClient)
        // O si tu instancia 'supabase' fue configurada con la clave de servicio (NO RECOMENDADO EN FRONTEND)
        // Aquí llamamos directamente para mostrar el código, pero SÉ EL RIESGO.
        const { data, error } = await supabase.auth.admin.inviteUserByEmail(email); // ⚠️ Inseguro en frontend de producción ⚠️


      if (error) {
        console.error('Error invitando usuario:', error.message);
        toast.error(`Error invitando usuario: ${error.message}`);
      } else {
        console.log('Invitación enviada:', data);
        toast.success('Invitación enviada con éxito!');
        // Opcional: Refrescar la lista de usuarios después de invitar
        // fetchUsers(); // El usuario no aparecerá en public.usuarios hasta que acepte la invitación y el trigger se dispare al confirmar en auth.users
      }
    } catch (err) {
      console.error('Error inesperado al invitar usuario:', err.message);
      toast.error('Ocurrió un error inesperado al enviar la invitación.');
    }
  };


  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado: botón, título y espacio */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        {/* Botón Volver al inicio */}
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>

        {/* Título principal */}
        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Usuarios y permisos
        </h1>

        {/* Div vacío para equilibrar el espacio en md+ */}
        <div className="w-full md:w-[150px]" />
      </div>

      {/* Contenido principal */}
      <div className="bg-white shadow-lg rounded-lg p-6 md:p-8">
        <h2 className="text-xl font-semibold mb-4">Lista de Usuarios</h2>

         {/* Botón para abrir el modal de invitación */}
         <div className="mb-4">
            <button
               onClick={() => setShowInviteModal(true)} // Abre el modal al hacer clic
               className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700 transition duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
            >
                Invitar Nuevo Usuario
            </button>
         </div>


        {/* Muestra estado de carga, error o la lista de usuarios */}
        {loading ? (
          <p className="text-center text-gray-600">Cargando usuarios...</p>
        ) : error ? (
          <p className="text-center text-red-500">{error}</p>
        ) : users.length === 0 ? (
          <p className="text-center text-gray-500">No hay usuarios registrados en la base de datos pública.</p>
        ) : (
          // Tabla para mostrar la lista de usuarios
          <div className="overflow-x-auto"> {/* Permite scroll horizontal en pantallas pequeñas */}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                {/* === Formato super compacto para evitar Whitespace Text Nodes en thead === */}
                <tr><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID (UUID)</th><th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Registro</th></tr>
                {/* === Fin Formato super compacto en thead === */}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 text-sm">
                {users.map(user => (
                  // === Formato super compacto para evitar Whitespace Text Nodes en tbody tr ===
                  <tr key={user.id}><td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{user.nombre || 'Sin nombre'}</td><td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.id}</td><td className="px-6 py-4 whitespace-nowrap text-gray-600">{user.created_at ? new Date(user.created_at).toLocaleDateString() : '-'}</td></tr>
                  // === Fin Formato super compacto en tbody tr ===
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* El comentario del botón de ejemplo ya no es necesario */}

      </div>

      {/* Modal de Invitación */}
      <InviteUserModal
         isOpen={showInviteModal}
         onClose={() => setShowInviteModal(false)}
         onInvite={handleInviteUser} // Pasa la función que maneja la invitación
      />

    </div>
  );
}