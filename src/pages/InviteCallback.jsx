// src/pages/InviteCallback.jsx
import React, { useEffect, useState } from 'react'; // Importa React
import { useNavigate, useLocation } from 'react-router-dom'; // Importa useLocation
import { supabase } from '../supabase'; // Asegúrate de que la ruta a supabase.js sea correcta
import toast from 'react-hot-toast';

export default function InviteCallback() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook para acceder a la ubicación actual (incluyendo la URL)

  // Estado local para controlar si el componente está listo para renderizar el formulario o mensaje
  const [ready, setReady] = useState(false);
  // Estado local para almacenar mensajes de error específicos del callback
  const [errorMsg, setErrorMsg] = useState(null);

  // Estado local para la contraseña si decides que la establezcan en esta página
  const [password, setPassword] = useState('');
  // Estado local para el loading del formulario de contraseña
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    // Esta función se ejecutará cuando el componente se monte
    const handleCallback = async () => {
      // Supabase v2+ para flujos como invitación redirige con 'code' y 'type' en query params.
      // Necesitamos leer esos parámetros.
      const params = new URLSearchParams(location.search); // Obtiene query parameters
      const code = params.get('code'); // Intenta obtener el 'code'
      const type = params.get('type'); // Intenta obtener el 'type'

      console.log('InviteCallback - URL Params:', params.toString());
      console.log('InviteCallback - Code:', code, 'Type:', type);

      // Si hay un código y el tipo es 'invite', intenta intercambiarlo por una sesión
      if (code && type === 'invite') {
        console.log('InviteCallback - Verifying invite code...');
        // *** CORRECCIÓN: Usar exchangeCodeForSession con el código ***
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('InviteCallback - Error exchanging code:', error.message);
          toast.error('No se pudo aceptar la invitación. El enlace puede ser inválido o haber expirado.');
          setErrorMsg('Enlace de invitación inválido o expirado.'); // Establece mensaje de error local
          setReady(true); // Marca como listo para mostrar el mensaje de error
          // No navegamos aquí, dejamos que el componente renderice el errorMsg
          return;
        }

        // Si el intercambio de código fue exitoso, la sesión debería estar establecida.
        // El AuthContext detectará este cambio.
        // Ahora el componente está listo. Decide si mostrar un formulario de contraseña
        // o simplemente redirigir a la página principal.
        console.log('InviteCallback - Code exchanged successfully.');
        toast.success('Invitación aceptada. Sesión establecida.');

        // Opción 1: Redirigir directamente a la página principal (si el flujo es establecer contraseña después)
        // navigate('/', { replace: true }); // La redirección a / será manejada por RedirectIfAuthenticated en App.jsx

        // Opción 2: Mostrar un formulario para que el usuario establezca su contraseña inmediatamente
        // Si eliges esta opción, el estado 'ready' se usa para mostrar el formulario.
        setReady(true); // Marca como listo para mostrar el formulario de contraseña

      } else {
         // Si no hay código o no es un enlace de invitación válido.
         console.log('InviteCallback - No invite code found or type mismatch. Showing error.');
         toast.error('Enlace de invitación inválido o expirado.');
         setErrorMsg('Enlace de invitación inválido o expirado.'); // Establece mensaje de error local
         setReady(true); // Marca como listo para mostrar el mensaje de error
      }
    };

    handleCallback(); // Ejecuta la función de manejo del callback al montar

    // No necesitas limpiar nada aquí si no hay suscripciones o timers persistentes.
    // return () => { /* cleanup */ };

  }, [navigate, location]); // Dependencias del useEffect: se ejecuta si navigate o location cambian

  // --- Renderizado condicional ---

  // Muestra un mensaje de carga mientras se procesa el callback
  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="p-8 text-center">Aceptando invitación...</p>
      </div>
    );
  }

  // Muestra un mensaje de error si ocurrió un problema al procesar el callback
  if (errorMsg) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="p-8 text-center text-red-600">{errorMsg}</p>
      </div>
    );
  }

  // Si está listo y no hay error, muestra el formulario para establecer la contraseña
  // Esto asume que quieres que el usuario establezca la contraseña inmediatamente después de aceptar la invitación.
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    // El usuario ya está autenticado temporalmente por exchangeCodeForSession
    // Ahora actualizamos su perfil para establecer la contraseña
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);

    if (error) {
      console.error('InviteCallback - Error setting password:', error.message);
      toast.error(`Error al establecer la contraseña: ${error.message}`);
    } else {
      console.log('InviteCallback - Password set successfully.');
      toast.success('¡Contraseña establecida! Ahora puedes iniciar sesión con tu correo y nueva contraseña.');
      // Redirige a la página de login después de establecer la contraseña
      navigate('/login', { replace: true });
    }
  };


  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-4">Define tu contraseña</h1>
        <p className="text-gray-600 text-sm mb-6">Establece una contraseña segura para tu nueva cuenta.</p>
        <label className="block mb-4">
             <span className="text-gray-700">Nueva Contraseña</span>
             <input
               type="password"
               placeholder="Ingresa tu nueva contraseña"
               value={password}
               onChange={e => setPassword(e.target.value)}
               className="mt-1 block w-full p-2 border rounded"
               required
               minLength="6" // O la longitud mínima que requieras
             />
        </label>

        <button
          type="submit"
          disabled={loading || password.length < 6} // Deshabilita si está cargando o la contraseña es muy corta
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  );
}
