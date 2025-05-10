// src/pages/Login.jsx
import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)

    // En v2, signInWithPassword devuelve { data: { session, user }, error }
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    setLoading(false)

    if (error) {
      toast.error(error.message)
      return
    }

    if (data?.session) {
      toast.success('¡Bienvenido!')
      // Espera un momento para que el auth state se propague
      navigate('/', { replace: true })
    } else {
      // Por si no se crea session (flujo raro)
      toast.error('No se pudo iniciar sesión. Intenta de nuevo.')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
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
          disabled={loading}
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
  )
}
