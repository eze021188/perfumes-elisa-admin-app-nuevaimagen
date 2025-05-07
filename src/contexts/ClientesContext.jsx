// src/contexts/ClientesContext.jsx

import React, {
  createContext,
  useContext,
  useState,
  useEffect
} from 'react'
import { supabase } from '../supabase'

const ClientesContext = createContext()

/**
 * ClientesProvider: envuelve tu aplicación y provee
 * el estado y funciones CRUD de clientes.
 */
export function ClientesProvider({ children }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)

  // 1) Carga todos los clientes desde Supabase
  async function obtenerClientes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error obteniendo clientes:', error.message)
      setClientes([])
    } else {
      setClientes(data)
    }
    setLoading(false)
  }

  // 2) Inserta un nuevo cliente y recarga la lista
  async function agregarCliente(cliente) {
    const { error } = await supabase
      .from('clientes')
      .insert(cliente)

    if (error) {
      console.error('Error agregando cliente:', error.message)
    } else {
      await obtenerClientes()
    }
  }

  // 3) Actualiza un cliente existente y recarga la lista
  async function actualizarCliente(id, cliente) {
    const { error } = await supabase
      .from('clientes')
      .update(cliente)
      .eq('id', id)

    if (error) {
      console.error('Error actualizando cliente:', error.message)
    } else {
      await obtenerClientes()
    }
  }

  // 4) Elimina un cliente y recarga la lista
  async function eliminarCliente(id) {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error eliminando cliente:', error.message)
    } else {
      await obtenerClientes()
    }
  }

  // 5) Carga inicial de clientes al montar el provider
  useEffect(() => {
    obtenerClientes()
  }, [])

  return (
    <ClientesContext.Provider
      value={{
        clientes,
        loading,
        obtenerClientes,
        agregarCliente,
        actualizarCliente,
        eliminarCliente
      }}
    >
      {children}
    </ClientesContext.Provider>
  )
}

/**
 * useClientes: hook para consumir el ClientesContext.
 * Debe usarse dentro de un <ClientesProvider>.
 */
export function useClientes() {
  const context = useContext(ClientesContext)
  if (!context) {
    throw new Error('useClientes debe usarse dentro de ClientesProvider')
  }
  return context
}