// src/pages/Login.jsx
import React, { useState, useEffect } from 'react'; // Importa useEffect
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../supabase'; // Asegúrate de que la ruta a supabase.js sea correcta
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext'; // <<< Importa useAuth desde el contexto

export default function Login() {
  const navigate = useNavigate(); // useNavigate aún es útil para otras redirecciones si las hay
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  // El estado 'loading' local se usa para deshabilitar el formulario durante el submit
  const [loading, setLoading] = useState(false);

  // Obtenemos el estado del usuario y de carga del contexto de autenticación global
  // Esto no se usa directamente para REDIRIGIR FUERA de esta página (eso lo hace RedirectIfAuthenticated en App.jsx),
  // pero puedes usar 'loading' global si necesitas mostrar un spinner al cargar la sesión.
  const { user: authUser, loading: authLoading } = useAuth(); // Renombramos para evitar conflicto con el loading local

   // Puedes añadir un useEffect si necesitas hacer algo específico cuando el usuario
   // cambia *dentro* de este componente después de un login/logout,
   // pero la redirección principal fuera de /login es manejada por App.jsx
   // useEffect(() => {
   //     if (authUser && !authLoading) {
   //         // Este bloque se ejecutaría si el usuario se vuelve no-null/no-loading,
   //         // lo cual debería activar la redirección por RedirectIfAuthenticated en App.jsx.
   //         // No necesitas llamar a navigate aquí.
   //         console.log('Usuario logueado detectado en Login.jsx. RedirectIfAuthenticated debería actuar.');
   //     }
   // }, [authUser, authLoading]);


  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true); // Inicia loading del formulario

    // Llama al método de login de Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false); // Finaliza loading del formulario

    if (error) {
      toast.error(error.message);
      return; // Detiene la ejecución si hay error
    }

    // Si el login fue exitoso (Supabase devolvió data.session),
    // el AuthContext detectará este cambio a través de su listener onAuthStateChange.
    // Una vez que el estado en AuthContext se actualice (user dejará de ser null y loading false),
    // el componente RedirectIfAuthenticated en App.jsx, que envuelve esta página,
    // detectará ese cambio y te redirigirá automáticamente a la página principal ('/').
    // >>> POR LO TANTO, YA NO NECESITAS LLAMAR A navigate('/') AQUÍ DIRECTAMENTE. <<<

    if (data?.session) {
      toast.success('¡Bienvenido!');
      // La redirección sucederá automáticamente a través de RedirectIfAuthenticated
      // en App.jsx una vez que el AuthContext actualice su estado.
       console.log('Login exitoso. AuthContext debería detectar el cambio de sesión.');
       // Puedes cerrar el modal o limpiar el formulario si es relevante.
       // setEmail('');
       // setPassword('');

    } else {
      // Este caso es poco probable si no hay error, pero lo mantenemos.
      toast.error('No se pudo iniciar sesión. Intenta de nuevo.');
    }
  };

  // Si quieres mostrar un estado de carga global mientras se verifica la sesión INICIAL
  // cuando alguien llega a la página de login, puedes usar authLoading del contexto.
  // if (authLoading) {
  //     return <div className="flex items-center justify-center min-h-screen bg-gray-100"><p>Cargando sesión de autenticación...</p></div>;
  // }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      {/* El formulario solo se muestra una vez que la carga inicial del contexto termina */}
      {/* O si prefieres, puedes mostrar el formulario siempre y usar el estado 'loading' local */}
      <form
        onSubmit={handleLogin}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-6">Iniciar sesión</h1>

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

        <label className="block mb-2">
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
          disabled={loading} // Usa el estado local 'loading' para deshabilitar el botón mientras se envía
          className="w-full mt-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Ingresando…' : 'Ingresar'}
        </button>

        <div className="mt-4 flex justify-between text-sm">
          <Link to="/reset-password" className="text-blue-600 hover:underline">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link to="/signup" className="text-gray-600 hover:underline">
            Registrarse
          </Link>
        </div>
      </form>
    </div>
  );
}