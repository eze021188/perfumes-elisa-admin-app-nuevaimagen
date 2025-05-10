// src/pages/InviteCallback.jsx
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import toast from 'react-hot-toast'

export default function InviteCallback() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)      // indica que el callback ya fue procesado
  const [errorMsg, setErrorMsg] = useState(null) // mensaje de error al validar la invitación

  useEffect(() => {
    async function init() {
      // Esto lee el fragment/hash de la URL y setea sesión si el token es válido
      const { error } = await supabase.auth.getSessionFromUrl({ storeSession: true })
      if (error) {
        console.error('Error validando invitación:', error)
        setErrorMsg('Enlace inválido o expirado.')
      }
      setReady(true)
    }
    init()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error(error.message)
    } else {
      toast.success('¡Contraseña establecida! Ya puedes entrar.')
      navigate('/usuarios')
    }
    setLoading(false)
  }

  // Mientras validamos la invitación…
  if (!ready) {
    return <p className="p-8 text-center">Procesando tu invitación…</p>
  }

  // Si hubo error al leer el token
  if (errorMsg) {
    return <p className="p-8 text-center text-red-600">{errorMsg}</p>
  }

  // Formulario para que el usuario defina su contraseña
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white p-8 rounded shadow-md w-full max-w-sm"
      >
        <h1 className="text-2xl font-bold mb-4">Elige tu contraseña</h1>
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
          className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>
      </form>
    </div>
  )
}
