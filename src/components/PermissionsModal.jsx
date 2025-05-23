// src/components/PermissionsModal.jsx
import React, { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import { X, Save, Lock, Eye, Edit } from 'lucide-react'

const RESOURCES = [
  { key: 'home', label: 'Inicio', icon: <Home size={16} /> },
  { key: 'checkout', label: 'Checkout', icon: <ShoppingCart size={16} /> },
  { key: 'productos', label: 'Productos', icon: <Package size={16} /> },
  { key: 'clientes', label: 'Clientes', icon: <Users size={16} /> },
  { key: 'compras', label: 'Compras', icon: <ShoppingBag size={16} /> },
  { key: 'ventas', label: 'Ventas y saldos', icon: <Receipt size={16} /> },
  { key: 'reportes', label: 'Reportes', icon: <BarChart2 size={16} /> },
  { key: 'users_permissions', label: 'Usuarios y permisos', icon: <Shield size={16} /> },
]

// Importar los iconos necesarios
import { 
  Home, 
  ShoppingCart, 
  Package, 
  Users, 
  ShoppingBag, 
  Receipt, 
  BarChart2, 
  Shield, 
  ToggleLeft, 
  ToggleRight 
} from 'lucide-react'

export default function PermissionsModal({ user, isOpen, onClose, onSaved }) {
  // Inicializamos el estado con todos los recursos deshabilitados en modo "read"
  const initialPerms = RESOURCES.reduce((acc, r) => {
    acc[r.key] = { enabled: false, mode: 'read' }
    return acc
  }, {})

  const [perms, setPerms] = useState(initialPerms)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      // reset a los defaults antes de cargar
      setPerms(initialPerms)
      loadPermissions()
    }
  }, [isOpen])

  async function loadPermissions() {
    setLoading(true)
    const { data, error } = await supabase
      .from('user_permissions')
      .select('resource, can_read, can_write')
      .eq('user_id', user.id)

    if (error) {
      console.error('Error loading permissions:', error)
    } else {
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
    setLoading(false)
  }

  // Toggle on/off
  async function handleToggle(resource) {
    if (loading) return
    
    setLoading(true)
    const curr = perms[resource]
    const next = {
      enabled: !curr.enabled,
      mode: curr.enabled ? 'read' : 'read' // al desactivar o activar, modo por defecto "read"
    }
    setPerms(prev => ({ ...prev, [resource]: next }))

    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: user.id,
        resource,
        can_read: next.enabled,
        can_write: false,
      })

    if (error) {
      console.error('Error updating permission:', error)
    }
    setLoading(false)
  }

  // Cambiar modo read/write
  async function handleModeChange(resource, mode) {
    if (loading) return
    
    setLoading(true)
    const curr = perms[resource]
    const next = { ...curr, mode }
    setPerms(prev => ({ ...prev, [resource]: next }))

    const { error } = await supabase
      .from('user_permissions')
      .upsert({
        user_id: user.id,
        resource,
        can_read: true,
        can_write: mode === 'write',
      })

    if (error) {
      console.error('Error updating permission mode:', error)
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700 w-full max-w-xl p-6">
        <div className="flex justify-between items-center mb-4 pb-3 border-b border-dark-700">
          <h2 className="text-xl font-semibold text-gray-100">
            Permisos para {user.nombre || user.email}
          </h2>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {loading && (
          <div className="absolute inset-0 bg-dark-900/50 flex items-center justify-center rounded-lg z-10">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
          </div>
        )}
        
        <div className="space-y-4 max-h-[60vh] overflow-auto pr-2">
          {RESOURCES.map(r => {
            const { enabled, mode } = perms[r.key]
            return (
              <div key={r.key} className="flex items-center justify-between p-3 rounded-lg bg-dark-900/50 border border-dark-700/50 hover:bg-dark-900 transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-lg bg-dark-800 flex items-center justify-center text-gray-400">
                    {r.icon}
                  </div>
                  <span className="text-gray-200">{r.label}</span>
                </div>
                <div className="flex items-center space-x-4">
                  {/* Toggle habilitar/deshabilitar */}
                  <button 
                    onClick={() => handleToggle(r.key)}
                    className="text-gray-400 hover:text-primary-400 transition-colors"
                    disabled={loading}
                  >
                    {enabled ? (
                      <ToggleRight size={20} className="text-primary-400" />
                    ) : (
                      <ToggleLeft size={20} />
                    )}
                  </button>
                  
                  {/* Si está habilitado, muestro opciones de modo */}
                  {enabled && (
                    <div className="flex items-center space-x-3 bg-dark-800 p-1 rounded-lg">
                      <button
                        onClick={() => handleModeChange(r.key, 'read')}
                        className={`flex items-center space-x-1 px-2 py-1 rounded ${
                          mode === 'read' 
                            ? 'bg-primary-900/50 text-primary-400' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                        disabled={loading}
                      >
                        <Eye size={14} />
                        <span className="text-xs">Solo lectura</span>
                      </button>
                      <button
                        onClick={() => handleModeChange(r.key, 'write')}
                        className={`flex items-center space-x-1 px-2 py-1 rounded ${
                          mode === 'write' 
                            ? 'bg-primary-900/50 text-primary-400' 
                            : 'text-gray-400 hover:text-gray-200'
                        }`}
                        disabled={loading}
                      >
                        <Edit size={14} />
                        <span className="text-xs">Edición</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-6 flex justify-end space-x-3 pt-3 border-t border-dark-700">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-dark-700 text-gray-200 rounded-md hover:bg-dark-600 transition-colors"
            disabled={loading}
          >
            Cerrar
          </button>
          <button
            onClick={onSaved}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors flex items-center gap-1"
            disabled={loading}
          >
            <Save size={16} />
            Guardar
          </button>
        </div>
      </div>
    </div>
  )
}