import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    setLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('¡Bienvenido!');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <img
            src="/images/PERFUMESELISA.png"
            alt="Perfumes Elisa"
            className="h-20 mx-auto mb-6"
          />
          <h2 className="text-3xl font-bold text-gray-900">
            Bienvenido
          </h2>
          <p className="mt-2 text-gray-600">
            Inicia sesión para continuar
          </p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-xl shadow-elegant border border-gray-100 p-8">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="input-primary"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="input-primary"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full"
            >
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>

            <div className="text-center">
              <Link
                to="/reset-password"
                className="text-sm text-blue-600 hover:text-blue-500"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-gray-600">
          Sistema de Gestión Perfumes Elisa
        </p>
      </div>
    </div>
  );
}