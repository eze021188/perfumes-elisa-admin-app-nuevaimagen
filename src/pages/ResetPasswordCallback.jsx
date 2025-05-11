// src/pages/ResetPasswordCallback.jsx
import React, { useEffect, useState } from 'react'; // Importa React y useState
import { useNavigate, useLocation } from 'react-router-dom'; // Importa useLocation
import { supabase } from '../supabase'; // Asegúrate de que la ruta a supabase.js sea correcta
import toast from 'react-hot-toast';

export default function ResetPasswordCallback() {
  const navigate = useNavigate();
  const location = useLocation(); // Hook para acceder a la ubicación actual (incluyendo la URL)

  // Estado local para controlar si el componente terminó de procesar el callback
  const [isProcessing, setIsProcessing] = useState(true);
  // Estado local para almacenar mensajes de error específicos del callback
  const [errorMessage, setErrorMessage] = useState(null);


  useEffect(() => {
    // Esta función se ejecutará cuando el componente se monte
    const handleCallback = async () => {
      // Supabase v2+ para flujos como restablecimiento de contraseña redirige con 'code' y 'type' en query params.
      // Necesitamos leer esos parámetros.
      const params = new URLSearchParams(location.search); // Obtiene query parameters
      const code = params.get('code'); // Intenta obtener el 'code'
      const type = params.get('type'); // Intenta obtener el 'type'

      console.log('ResetPasswordCallback - URL Params:', params.toString());
      console.log('ResetPasswordCallback - Code:', code, 'Type:', type);

      // Si hay un código y el tipo es 'recovery', intenta intercambiarlo por una sesión
      if (code && type === 'recovery') {
        console.log('ResetPasswordCallback - Verifying recovery code...');
        // *** Usar exchangeCodeForSession con el código ***
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error) {
          console.error('ResetPasswordCallback - Error exchanging code:', error.message);
          toast.error('No se pudo restablecer la contraseña. El enlace puede ser inválido o haber expirado.');
          setErrorMessage('Enlace de restablecimiento inválido o expirado.'); // Establece mensaje de error local
        } else {
           // Si el intercambio de código fue exitoso, la sesión debería estar establecida.
           // El AuthContext detectará este cambio.
           console.log('ResetPasswordCallback - Code exchanged successfully. Session should be set.');
           toast.success('Código verificado. Ahora puedes establecer tu nueva contraseña.');
           // Redirige al usuario a la página donde puede establecer la nueva contraseña.
           // Generalmente es la misma página /reset-password, que ahora detectará la sesión activa.
           navigate('/reset-password', { replace: true });
           return; // Salir después de la navegación exitosa
        }

      } else {
         // Si no hay código o no es un enlace de recuperación válido.
         console.log('ResetPasswordCallback - No recovery code found or type mismatch.');
         toast.error('Enlace de restablecimiento inválido o expirado.');
         setErrorMessage('Enlace de restablecimiento inválido o expirado.'); // Establece mensaje de error local
      }

      // Marcar como terminado de procesar después de intentar manejar el callback
      setIsProcessing(false);
    };

    handleCallback(); // Ejecuta la función de manejo del callback al montar

    // No necesitas limpiar nada aquí si no hay suscripciones o timers persistentes.
    // return () => { /* cleanup */ };

  }, [navigate, location]); // Dependencias del useEffect: se ejecuta si navigate o location cambian

  // --- Renderizado condicional ---

  // Muestra un mensaje de carga mientras se procesa el callback
  if (isProcessing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="p-8 text-center">Procesando restablecimiento de contraseña...</p>
      </div>
    );
  }

  // Muestra un mensaje de error si ocurrió un problema al procesar el callback
  if (errorMessage) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="p-8 text-center text-red-600">{errorMessage}</p>
        {/* Opcional: Añadir un enlace para volver al login o solicitar otro reset */}
        <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-blue-600 hover:underline">
                Volver al login
            </Link>
        </div>
      </div>
    );
  }

  // Si no está procesando y no hay error, pero tampoco se navegó, algo salió mal.
  // Esto no debería ocurrir si la lógica anterior es correcta, pero es un fallback.
   return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <p className="p-8 text-center text-yellow-600">Estado desconocido después de procesar. Intenta ir al <Link to="/login" className="text-blue-600 hover:underline">login</Link>.</p>
      </div>
   );
}
