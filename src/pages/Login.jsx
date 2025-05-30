import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Mail, Lock, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // --- Logic for inactivity session timeout ---
  // IMPORTANT NOTE: This logic is more suitable for a component that renders
  // AFTER the user has logged in (e.g., App.js, a DashboardLayout).
  // It is included here to demonstrate how it would be implemented.

  const inactivityTimeout = 5 * 60 * 1000; // 5 minutes of inactivity (in milliseconds)
  const timeoutRef = useRef(null); // To store the timer reference

  const resetInactivityTimer = () => {
    // Clear any existing timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    // Set a new timer
    timeoutRef.current = setTimeout(async () => {
      // Only log out if there is an authenticated user
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.auth.signOut();
        toast.error('Session closed due to inactivity.');
        console.log('Session closed due to inactivity.');
        // Optional: Redirect to the login page
        // window.location.href = '/login';
      }
    }, inactivityTimeout);
  };

  useEffect(() => {
    // Initialize the timer when the component mounts
    resetInactivityTimer();

    // Add event listeners to detect user activity
    window.addEventListener('mousemove', resetInactivityTimer);
    window.addEventListener('keypress', resetInactivityTimer);
    window.addEventListener('click', resetInactivityTimer);
    window.addEventListener('scroll', resetInactivityTimer); // Also scroll

    // Clean up the timer and listeners when the component unmounts
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      window.removeEventListener('mousemove', resetInactivityTimer);
      window.removeEventListener('keypress', resetInactivityTimer);
      window.removeEventListener('click', resetInactivityTimer);
      window.removeEventListener('scroll', resetInactivityTimer);
    };
  }, []); // The empty array ensures the effect runs only once on mount

  // --- End of inactivity session timeout logic ---


  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      toast.error('Session closed due to inactivity.'); // Changed to 'Session closed due to inactivity.'
    } else {
      toast.success('Welcome!');
      // If login is successful, reset the timer
      resetInactivityTimer();
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/Background.jpg')" }}
    >
      {/* ELIMINADA: La capa oscura sobre la imagen de fondo */}
      {/* <div className="absolute inset-0 bg-black bg-opacity-20 z-0"></div> */}

      <div className="w-full max-w-md z-10"> {/* Ensures content is above the overlay */}
        <div className="text-center mb-8 animate-fade-in">
          <img
            src="/images/PERFUMESELISA.png"
            alt="Perfumes Elisa"
            className="h-24 mx-auto mb-6 hover-lift"
          />
          {/* Container for the welcome text with glass-dark style */}
          <div className="glass-dark p-4 rounded-xl mx-auto mb-6"> {/* Added glass-dark and adjusted padding/margin */}
            <h2 className="text-3xl font-bold text-gray-100 mb-1"> {/* Changed to text-gray-100 for better contrast on glass-dark */}
              Bienvenido
            </h2>
            <p className="text-gray-100 text-sm"> {/* Changed to text-gray-100 */}
              Inicia sesión para continuar
            </p>
          </div>
        </div>

        {/* The form uses the 'glass-dark' class for shading and glass effect */}
        <form onSubmit={handleLogin} className="glass-dark p-8 rounded-xl animate-slide-up">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-10 w-full p-3 bg-dark-900 border border-dark-700 rounded-lg text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Contraseña
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  className="pl-10 w-full p-3 bg-dark-900 border border-dark-700 rounded-lg text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember_me"
                  name="remember_me"
                  type="checkbox"
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-dark-700 rounded bg-dark-900"
                />
                <label htmlFor="remember_me" className="ml-2 block text-sm text-gray-300">
                  Recordarme
                </label>
              </div>

              <Link
                to="/reset-password"
                className="text-sm font-medium text-primary-900 hover:text-primary-300 transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white font-medium py-3 px-4 rounded-lg shadow-elegant-dark transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Iniciando sesión...</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Iniciar sesión</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          {/* Container for the footer text with glass-dark style */}
          <div className="glass-dark p-4 rounded-xl mx-auto"> {/* Added glass-dark and adjusted padding/margin */}
            <p className="text-sm text-gray-100"> {/* Changed to text-gray-100 */}
              Sistema de Gestión Perfumes Elisa
            </p>
            <p className="text-xs text-gray-100 mt-1"> {/* Changed to text-gray-100 */}
              © {new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
