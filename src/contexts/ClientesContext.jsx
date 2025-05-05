// src/contexts/ClientesContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const ClientesContext = createContext()

export const ClientesProvider = ({ children }) => {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  // Carga inicial de clientes
  const obtenerClientes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('clientes')
      .select('*')
      .order('id', { ascending: true })
    if (error) console.error('Error al obtener clientes', error)
    else setClientes(data)
    setLoading(false)
  }

  const agregarCliente = async (cliente) => {
    const { data, error } = await supabase
      .from('clientes')
      .insert(cliente)
      .select()
    if (error) console.error('Error al agregar cliente', error)
    else setClientes((prev) => [...prev, data[0]])
  }

  const actualizarCliente = async (id, cambios) => {
    const { data, error } = await supabase
      .from('clientes')
      .update(cambios)
      .eq('id', id)
      .select()
    if (error) console.error('Error al actualizar cliente', error)
    else setClientes((prev) =>
      prev.map((c) => (c.id === id ? data[0] : c))
    )
  }

  const eliminarCliente = async (id) => {
    const { error } = await supabase
      .from('clientes')
      .delete()
      .eq('id', id)
    if (error) console.error('Error al eliminar cliente', error)
    else setClientes((prev) => prev.filter((c) => c.id !== id))
  }

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
        eliminarCliente,
      }}
    >
      {children}
    </ClientesContext.Provider>
  )
}

// Hook para usar el contexto más cómodamente
export const useClientes = () => {
  return useContext(ClientesContext)
}
