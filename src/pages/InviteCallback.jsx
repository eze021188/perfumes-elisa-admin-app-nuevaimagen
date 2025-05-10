// src/pages/InviteCallback.jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function InviteCallback() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)

  useEffect(() => {
    // Procesa el token desde la URL e inicia sesión
    const { data, error } = supabase.auth.getSessionFromUrl({ storeSession: true })
    data?.session && navigate('/')      // ya autenticado, redirige al home
    if (error) {
      setError('Link inválido o expirado.')
      console.error(error)
    }
    setLoading(false)
  }, [navigate])

  const handleSubmit = async e => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
    } else {
      toast.success('¡Contraseña actualizada!')
      navigate('/')    // listo, lo mandamos al dashboard
    }
  }

  if (loading) return <p className="p-8 text-center">Procesando enlace…</p>
  if (error)   return <p className="p-8 text-center text-red-500">{error}</p>

  return (
    <div className="max-w-md mx-auto p-8">
      <h1 className="text-2xl font-bold mb-4">Elige tu contraseña</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full p-2 border rounded"
          required
        />
        <button
          type="submit"
          disabled={!password || loading}
          className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
