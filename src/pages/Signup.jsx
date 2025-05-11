// src/pages/Signup.jsx
import React, { useState } from 'react'; // Importa React
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase'; // Asegúrate de que la ruta a supabase.js sea correcta
import toast from 'react-hot-toast';

export default function Signup() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    // Llama al método de Supabase para registrar un nuevo usuario
    // En v2, signUp retorna data.user y data.session (si autoconfirma) o null/undefined si requiere confirmación por email.
    // El segundo argumento es un objeto de opciones.
    const { error } = await supabase.auth.signUp(
      {
        email,
        password
      },
      {
        // >>> CORRECCIÓN: Añadir la opción redirectTo para la confirmación de email <<<
        // Esta URL debe ser la de la página en tu aplicación que procesará el enlace de confirmación.
        // Asegúrate de que tienes una ruta configurada en App.jsx para esta URL
        // y un componente (ej: ConfirmCallback.jsx) que lea el token de la URL
        // y lo use para finalizar la confirmación.
        redirectTo: `${window.location.origin}/usuarios/confirm` // Usa la ruta que hayas definido para el callback de confirmación
      }
    );

    setLoading(false); // Finaliza el estado de carga

    if (error) {
      console.error('Error al registrar usuario:', error.message);
      toast.error(error.message); // Muestra el mensaje de error de Supabase
    } else {
      // Si no hay error, Supabase ha enviado el correo de confirmación.
      // El usuario necesita hacer clic en el enlace del correo.
      toast.success('¡Registro exitoso! Revisa tu correo para confirmar tu cuenta.');
      // Opcional: Puedes redirigir al usuario a una página de "verifica tu email"
      // navigate('/check-email', { replace: true });
      // O simplemente dejarlo en la página de signup con el mensaje.
      // Redirigir a login aquí puede ser confuso si aún no ha confirmado.
       // navigate('/login', { replace: true }); // Considera eliminar esta redirección si requiere confirmación
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form onSubmit={handleSignup} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-6 text-center">Regístrate</h1> {/* Centrado */}

        <p className="text-gray-600 text-sm mb-6 text-center"> {/* Añadido párrafo explicativo */}
            Crea una nueva cuenta para acceder al panel de administración.
        </p>

        <label className="block mb-4">
          <span className="text-gray-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="mt-1 block w-full p-2 border rounded"
          />
        </label>
        <label className="block mb-4">
          <span className="text-gray-700">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            className="mt-1 block w-full p-2 border rounded"
          />
        </label>
        <button
          type="submit"
          disabled={loading || !email || !password} // Deshabilita si está cargando o campos vacíos
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed" // Color azul para consistencia
        >
          {loading ? 'Registrando…' : 'Crear cuenta'}
        </button>
        <div className="mt-6 text-center"> {/* Más margen superior */}
          <Link to="/login" className="text-sm text-blue-600 hover:underline"> {/* Color azul para consistencia */}
            ¿Ya tienes cuenta? Inicia sesión
          </Link>
        </div>
      </form>
    </div>
  );
}
