import React, { useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { Mail, Lock, LogIn } from 'lucide-react'; // Importa iconos para consistencia

export default function ResetPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleReset = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password/callback`
      }
    );

    setLoading(false);

    if (error) {
      console.error('Error al enviar correo de restablecimiento:', error.message);
      toast.error(error.message);
    } else {
      toast.success('Si el correo electrónico está registrado, recibirás un enlace para restablecer tu contraseña.');
    }
  };

  return (
    // Contenedor principal con fondo de imagen
    <div
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center"
      style={{ backgroundImage: "url('/images/Background.jpg')" }}
    >
      {/* ELIMINADA: La capa oscura sobre la imagen de fondo */}
      {/* <div className="absolute inset-0 bg-black bg-opacity-20 z-0"></div> */}

      <div className="w-full max-w-md z-10"> {/* Asegura que el contenido esté sobre cualquier fondo */}
        <div className="text-center mb-8 animate-fade-in">
          {/* Logo de la empresa */}
          <img
            src="/images/PERFUMESELISA.png"
            alt="Perfumes Elisa"
            // CORREGIDO: Usar h-[6.25rem] o h-[100px] para un tamaño de 25 unidades en la escala de Tailwind
            className="h-[6.25rem] mx-auto mb-6 hover-lift" // h-24 es 6rem (96px), h-25 no existe. 6.25rem es 100px.
          />
          {/* Contenedor para el texto de bienvenida con estilo glass-dark */}
          <div className="glass-dark p-4 rounded-xl mx-auto mb-6">
            <h2 className="text-3xl font-bold text-gray-100 light:text-light-900 mb-1">
              Restablecer contraseña
            </h2>
            <p className="text-gray-100 light:text-light-800 text-sm">
              Ingresa el correo electrónico asociado a tu cuenta y te enviaremos un enlace para restablecer tu contraseña.
            </p>
          </div>
        </div>

        {/* El formulario usa el estilo glass-dark */}
        <form onSubmit={handleReset} className="glass-dark p-8 rounded-xl animate-slide-up">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-300 light:text-light-700 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500 light:text-light-600">
                  <Mail size={18} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="pl-10 w-full p-3 bg-dark-900 border border-dark-700 rounded-lg text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 light:bg-light-100 light:border-light-300 light:text-light-900 light:placeholder-light-500"
                  placeholder="tu@email.com"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-primary-600 to-accent-600 hover:from-primary-700 hover:to-accent-700 text-white font-medium py-3 px-4 rounded-lg shadow-elegant-dark transition-all duration-200 ease-in-out disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Enviando…</span>
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Enviar enlace de restablecimiento</span>
                </>
              )}
            </button>
          </div>
        </form>

        <div className="mt-6 text-center">
          {/* Contenedor para el texto del pie de página con estilo glass-dark */}
          <div className="glass-dark p-4 rounded-xl mx-auto">
            <p className="text-sm text-gray-100 light:text-light-800">
              Sistema de Gestión Perfumes Elisa
            </p>
            <p className="text-xs text-gray-100 light:text-light-800 mt-1">
              © {new Date().getFullYear()} Todos los derechos reservados
            </p>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm font-medium text-primary-400 hover:text-primary-300 transition-colors"
          >
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}
