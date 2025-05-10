// src/pages/ResetPassword.jsx
import { useState } from 'react'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

export default function ResetPassword() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  const handleReset = async (e) => {
    e.preventDefault()
    setLoading(true)

    // Primer parámetro debe ser el email (string), no un objeto
    const { error } = await supabase.auth.resetPasswordForEmail(
      email,
      {
        redirectTo: `${window.location.origin}/reset-password/callback`
      }
    )

    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Revisa tu correo para restablecer la contraseña.')
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form
        onSubmit={handleReset}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-6">Restablecer contraseña</h1>

        <label className="block mb-4">
          <span className="text-gray-700">Email registrado</span>
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
          disabled={loading}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Enviando…' : 'Enviar enlace de restablecimiento'}
        </button>

        <div className="mt-4 text-center">
          <Link to="/login" className="text-sm text-gray-600 hover:underline">
            Volver al login
          </Link>
        </div>
      </form>
    </div>
  )
}
