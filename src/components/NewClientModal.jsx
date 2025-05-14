// src/components/NewClientModal.jsx
import React, { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { supabase } from '../supabase'

export default function NewClientModal({
  isOpen,
  onClose,
  onClientAdded,
  cliente // si es edición, viene el objeto; si no, es null
}) {
  const inputRef = useRef(null)

  const [form, setForm] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    direccion: ''
  })
  const [errors, setErrors] = useState({
    nombre: '',
    telefono: '',
    correo: ''
  })
  const [loading, setLoading] = useState(false)

  // Cuando abra el modal, si viene un cliente, precargo el form
  useEffect(() => {
    if (isOpen) {
      if (cliente) {
        setForm({
          nombre: cliente.nombre || '',
          telefono: cliente.telefono || '',
          correo: cliente.correo || '',
          direccion: cliente.direccion || ''
        })
      } else {
        setForm({ nombre: '', telefono: '', correo: '', direccion: '' })
      }
      setErrors({ nombre: '', telefono: '', correo: '' })
      // foco al nombre
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen, cliente])

  if (!isOpen) return null

  function validate() {
    const errs = { nombre: '', telefono: '', correo: '' }
    if (!form.nombre.trim()) errs.nombre = 'Requerido'
    if (!form.telefono.trim()) errs.telefono = 'Requerido'
    if (!form.correo.trim() || !form.correo.includes('@')) errs.correo = 'Email inválido'
    setErrors(errs)
    return !errs.nombre && !errs.telefono && !errs.correo
  }

  async function handleSave() {
    if (!validate()) return
    setLoading(true)

    try {
      if (cliente) {
        // edición
        await supabase
          .from('clientes')
          .update({
            nombre: form.nombre,
            telefono: form.telefono,
            correo: form.correo,
            direccion: form.direccion
          })
          .eq('id', cliente.id)
        // notifico al padre con los datos actualizados
        onClientAdded({ id: cliente.id, ...form })
      } else {
        // creación
        const { data, error } = await supabase
          .from('clientes')
          .insert([form])
          .single()
        if (error) throw error
        onClientAdded(data)
      }
      onClose()
    } catch (err) {
      console.error(err)
      setErrors(prev => ({ ...prev, nombre: 'Error al guardar' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-80 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
          aria-label="Cerrar modal"
        >
          <X />
        </button>

        <h2 className="text-lg font-semibold mb-4">
          {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>

        {/* Nombre */}
        <label htmlFor="nc-nombre" className="block text-sm mb-1">Nombre</label>
        <input
          id="nc-nombre"
          ref={inputRef}
          className={`w-full p-2 border rounded mb-1 ${errors.nombre ? 'border-red-500' : ''}`}
          value={form.nombre}
          onChange={e => setForm({ ...form, nombre: e.target.value })}
          aria-invalid={!!errors.nombre}
          disabled={loading}
        />
        {errors.nombre && <p className="text-red-500 text-xs mb-2">{errors.nombre}</p>}

        {/* Teléfono */}
        <label htmlFor="nc-telefono" className="block text-sm mb-1">Teléfono*</label>
        <input
          id="nc-telefono"
          type="tel"
          className={`w-full p-2 border rounded mb-1 ${errors.telefono ? 'border-red-500' : ''}`}
          value={form.telefono}
          onChange={e => setForm({ ...form, telefono: e.target.value })}
          aria-invalid={!!errors.telefono}
          disabled={loading}
        />
        {errors.telefono && <p className="text-red-500 text-xs mb-2">{errors.telefono}</p>}

        {/* Correo */}
        <label htmlFor="nc-correo" className="block text-sm mb-1">Correo</label>
        <input
          id="nc-correo"
          type="email"
          className={`w-full p-2 border rounded mb-1 ${errors.correo ? 'border-red-500' : ''}`}
          value={form.correo}
          onChange={e => setForm({ ...form, correo: e.target.value })}
          aria-invalid={!!errors.correo}
          disabled={loading}
        />
        {errors.correo && <p className="text-red-500 text-xs mb-2">{errors.correo}</p>}

        {/* Dirección */}
        <label htmlFor="nc-direccion" className="block text-sm mb-1">Dirección</label>
        <input
          id="nc-direccion"
          className="w-full p-2 border rounded mb-4"
          value={form.direccion}
          onChange={e => setForm({ ...form, direccion: e.target.value })}
          disabled={loading}
        />

        <button
          onClick={handleSave}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Guardando…' : (cliente ? 'Guardar Cambios' : 'Guardar Cliente')}
        </button>
      </div>
    </div>
  )
}
