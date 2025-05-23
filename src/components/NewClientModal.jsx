// src/components/NewClientModal.jsx
import React, { useState, useEffect, useRef } from 'react'
import { X, User, Phone, Mail, MapPin, Save } from 'lucide-react'
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
    const errs = { nombre: '', telefono: '', correo: '', direccion: '' };
  
    if (!form.nombre.trim()) {
      errs.nombre = 'Requerido';
    }
  
    if (form.correo.trim() && !form.correo.includes('@')) {
      errs.correo = 'Email inválido';
    }
  
    setErrors(errs);
    return Object.values(errs).every(errorMsg => errorMsg === '');
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg p-6 w-full max-w-md relative border border-dark-700 shadow-dropdown-dark">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-400 hover:text-gray-200 transition-colors"
          aria-label="Cerrar modal"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-semibold mb-6 text-gray-100">
          {cliente ? 'Editar Cliente' : 'Nuevo Cliente'}
        </h2>

        <div className="space-y-4">
          {/* Nombre */}
          <div>
            <label htmlFor="nc-nombre" className="block text-sm font-medium text-gray-300 mb-1">Nombre*</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User size={16} className="text-gray-500" />
              </div>
              <input
                id="nc-nombre"
                ref={inputRef}
                className={`w-full pl-10 p-2 bg-dark-900 border ${errors.nombre ? 'border-error-500' : 'border-dark-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200`}
                value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                aria-invalid={!!errors.nombre}
                disabled={loading}
              />
            </div>
            {errors.nombre && <p className="text-error-400 text-xs mt-1">{errors.nombre}</p>}
          </div>

          {/* Teléfono */}
          <div>
            <label htmlFor="nc-telefono" className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone size={16} className="text-gray-500" />
              </div>
              <input
                id="nc-telefono"
                type="tel"
                className={`w-full pl-10 p-2 bg-dark-900 border ${errors.telefono ? 'border-error-500' : 'border-dark-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200`}
                value={form.telefono}
                onChange={e => setForm({ ...form, telefono: e.target.value })}
                aria-invalid={!!errors.telefono}
                disabled={loading}
              />
            </div>
            {errors.telefono && <p className="text-error-400 text-xs mt-1">{errors.telefono}</p>}
          </div>

          {/* Correo */}
          <div>
            <label htmlFor="nc-correo" className="block text-sm font-medium text-gray-300 mb-1">Correo</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail size={16} className="text-gray-500" />
              </div>
              <input
                id="nc-correo"
                type="email"
                className={`w-full pl-10 p-2 bg-dark-900 border ${errors.correo ? 'border-error-500' : 'border-dark-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200`}
                value={form.correo}
                onChange={e => setForm({ ...form, correo: e.target.value })}
                aria-invalid={!!errors.correo}
                disabled={loading}
              />
            </div>
            {errors.correo && <p className="text-error-400 text-xs mt-1">{errors.correo}</p>}
          </div>

          {/* Dirección */}
          <div>
            <label htmlFor="nc-direccion" className="block text-sm font-medium text-gray-300 mb-1">Dirección</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin size={16} className="text-gray-500" />
              </div>
              <input
                id="nc-direccion"
                className={`w-full pl-10 p-2 bg-dark-900 border border-dark-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200`}
                value={form.direccion}
                onChange={e => setForm({ ...form, direccion: e.target.value })}
                disabled={loading}
              />
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                <span>Guardando…</span>
              </>
            ) : (
              <>
                <Save size={16} className="mr-1.5" />
                <span>{cliente ? 'Guardar Cambios' : 'Guardar Cliente'}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}