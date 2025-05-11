// src/pages/ResetPassword.jsx
import React, { useState } from 'react'; // Importa React
import { supabase } from '../supabase'; // Asegúrate de que la ruta a supabase.js sea correcta
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom'; // Importa Link

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Llama al método de Supabase para enviar el correo de restablecimiento
    // El primer argumento es el email, el segundo son las opciones (como redirectTo)
    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        // Asegúrate de que esta URL coincide con la configurada en tu dashboard de Supabase
        // para "Password Reset URL" (Authentication -> URL Configuration)
        redirectTo: `${window.location.origin}/reset-password/callback`
      }
    );

    setLoading(false); // Finaliza el estado de carga

    if (error) {
      console.error('Error al enviar correo de restablecimiento:', error.message);
      toast.error(error.message); // Muestra el mensaje de error de Supabase
    } else {
      // Mensaje de éxito indicando que se envió el correo
      toast.success('Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.');
      // No redirigimos aquí, el usuario debe ir a su correo
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form
        onSubmit={handleReset}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-6 text-center">Restablecer contraseña</h1>

        <p className="text-gray-600 text-sm mb-6 text-center">
            Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
        </p>

        <label className="block mb-4">
          <span className="text-gray-700">Correo Electrónico</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="mt-1 block w-full p-2 border rounded"
          />
        </label>

        <button
          type="submit"
          disabled={loading || !email} // Deshabilita si está cargando o el email está vacío
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Enviando…' : 'Enviar enlace de restablecimiento'}
        </button>

        <div className="mt-6 text-center"> {/* Más margen superior */}
          <Link to="/login" className="text-sm text-blue-600 hover:underline"> {/* Color azul para consistencia */}
            Volver al login
          </Link>
        </div>
      </form>
    </div>
  );
}
