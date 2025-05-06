import React, { createContext, useContext, useState } from 'react'
import { supabase } from '../supabase'

const ClientesContext = createContext()

export const useClientes = () => useContext(ClientesContext)

export const ClientesProvider = ({ children }) => {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(false)

  const obtenerClientes = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('clientes').select('*').order('id', { ascending: true })
    if (!error && data) {
      setClientes(data)
    } else {
      setClientes([])
      console.error('Error obteniendo clientes:', error)
    }
    setLoading(false)
  }

  const agregarCliente = async cliente => {
    const { error } = await supabase.from('clientes').insert(cliente)
    if (error) {
      console.error('Error agregando cliente:', error)
    } else {
      await obtenerClientes()
    }
  }

  const actualizarCliente = async (id, cliente) => {
    const { error } = await supabase.from('clientes').update(cliente).eq('id', id)
    if (error) {
      console.error('Error actualizando cliente:', error)
    } else {
      await obtenerClientes()
    }
  }

  const eliminarCliente = async id => {
    const { error } = await supabase.from('clientes').delete().eq('id', id)
    if (error) {
      console.error('Error eliminando cliente:', error)
    } else {
      await obtenerClientes()
    }
  }

  return (
    <ClientesContext.Provider
      value={{ clientes, loading, obtenerClientes, agregarCliente, actualizarCliente, eliminarCliente }}
    >
      {children}
    </ClientesContext.Provider>
  )
}
