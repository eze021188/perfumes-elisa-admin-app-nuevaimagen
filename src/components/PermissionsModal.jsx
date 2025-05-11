// src/components/PermissionsModal.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'

const RESOURCES = [
  { key: 'home', label: 'Inicio' },
  { key: 'checkout', label: 'Checkout' },
  { key: 'productos', label: 'Productos' },
  { key: 'clientes', label: 'Clientes' },
  { key: 'compras', label: 'Compras' },
  { key: 'ventas', label: 'Ventas y saldos' },
  { key: 'reportes', label: 'Reportes' },
  { key: 'users_permissions', label: 'Usuarios y permisos' },
]

export default function PermissionsModal({ user, isOpen, onClose, onSaved }) {
  // Inicializamos el estado con todos los recursos deshabilitados en modo "read"
  const initialPerms = RESOURCES.reduce((acc, r) => {
    acc[r.key] = { enabled: false, mode: 'read' }
    return acc
  }, {})

  const [perms, setPerms] = useState(initialPerms)

  useEffect(() => {
    if (isOpen) {
      // reset a los defaults antes de cargar
      setPerms(initialPerms)
      loadPermissions()
    }
  }, [isOpen])

  async function loadPermissions() {
    const { data } = await supabase
      .from('user_permissions')
      .select('resource, can_read, can_write')
      .eq('user_id', user.id)

    // Merge de lo existente en BD sobre nuestro initialPerms
    const updated = { ...initialPerms }
    data.forEach(p => {
      updated[p.resource] = {
        enabled: p.can_read,
        mode: p.can_write ? 'write' : 'read',
      }
    })
    setPerms(updated)
  }

  // Toggle on/off
  async function handleToggle(resource) {
    const curr = perms[resource]
    const next = {
      enabled: !curr.enabled,
      mode: curr.enabled ? 'read' : 'read' // al desactivar o activar, modo por defecto "read"
    }
    setPerms(prev => ({ ...prev, [resource]: next }))

    await supabase
      .from('user_permissions')
      .upsert({
        user_id: user.id,
        resource,
        can_read: next.enabled,
        can_write: false,
      })
  }

  // Cambiar modo read/write
  async function handleModeChange(resource, mode) {
    const curr = perms[resource]
    const next = { ...curr, mode }
    setPerms(prev => ({ ...prev, [resource]: next }))

    await supabase
      .from('user_permissions')
      .upsert({
        user_id: user.id,
        resource,
        can_read: true,
        can_write: mode === 'write',
      })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-xl p-6">
        <h2 className="text-xl font-semibold mb-4">
          Permisos para {user.nombre || user.email}
        </h2>
        <div className="space-y-4 max-h-[60vh] overflow-auto">
          {RESOURCES.map(r => {
            const { enabled, mode } = perms[r.key]
            return (
              <div key={r.key} className="flex items-center justify-between">
                <span>{r.label}</span>
                <div className="flex items-center space-x-4">
                  {/* Toggle habilitar/deshabilitar */}
                  <input
                    type="checkbox"
                    checked={!!enabled}
                    onChange={() => handleToggle(r.key)}
                  />
                  {/* Si está habilitado, muestro opciones de modo */}
                  {enabled && (
                    <div className="flex items-center space-x-2">
                      <label className="flex items-center space-x-1">
                        <input
                          type="radio"
                          name={`${r.key}-mode`}
                          value="read"
                          checked={mode === 'read'}
                          onChange={() => handleModeChange(r.key, 'read')}
                        />
                        <span>Solo lectura</span>
                      </label>
                      <label className="flex items-center space-x-1">
                        <input
                          type="radio"
                          name={`${r.key}-mode`}
                          value="write"
                          checked={mode === 'write'}
                          onChange={() => handleModeChange(r.key, 'write')}
                        />
                        <span>Permitir edición</span>
                      </label>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-6 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded mr-2"
          >
            Cerrar
          </button>
          <button
            onClick={onSaved}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}
