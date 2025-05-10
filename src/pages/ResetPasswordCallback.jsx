// src/pages/ResetPasswordCallback.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function ResetPasswordCallback() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    async function init() {
      const url = new URL(window.location.href)
      const access_token =
        url.searchParams.get('access_token') ||
        url.hash.match(/access_token=([^&]+)/)?.[1]
      const refresh_token =
        url.searchParams.get('refresh_token') ||
        url.hash.match(/refresh_token=([^&]+)/)?.[1]

      if (access_token && refresh_token) {
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) setErrorMsg('Enlace inválido o expirado.')
      } else {
        setErrorMsg('No se encontraron tokens de autenticación.')
      }

      setReady(true)
    }
    init()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    setLoading(false)
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('Contraseña restablecida. Ahora ingresa con tu nueva contraseña.')
      navigate('/login', { replace: true })
    }
  }

  if (!ready) return <p className="p-8 text-center">Procesando…</p>
  if (errorMsg) return <p className="p-8 text-center text-red-600">{errorMsg}</p>

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow-md w-full max-w-sm">
        <h1 className="text-2xl font-bold mb-4">Define tu nueva contraseña</h1>
        <input
          type="password"
          placeholder="Nueva contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full mb-4 p-2 border rounded"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? 'Guardando…' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
