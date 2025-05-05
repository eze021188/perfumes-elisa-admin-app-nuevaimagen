// src/contexts/InventariosContext.jsx
import { createContext, useContext, useState } from 'react'
import { supabase } from '../supabase.js'

const InventariosContext = createContext()

export const InventariosProvider = ({ children }) => {
  const [movimientos, setMovimientos] = useState([])
  const [loading, setLoading] = useState(false)

  /**
   * Obtiene el historial de movimientos de inventario
   * para un producto determinado.
   * @param {number|string} productoId
   * @returns {Promise<Array>}
   */
  const obtenerMovimientos = async (productoId) => {
    setLoading(true)
    const { data, error } = await supabase
      .from('inventario')
      .select('*')
      .eq('producto', productoId)
      .order('fecha', { ascending: false })

    if (error) {
      console.error('Error al obtener movimientos de inventario:', error)
      setMovimientos([])
    } else {
      setMovimientos(data)
    }

    setLoading(false)
    return data
  }

  /**
   * Registra un nuevo movimiento de inventario.
   * @param {{tipo: string, producto: number|string, cantidad: number, referencia: string}} movimientoInfo
   * @returns {Promise<Object|null>}
   */
  const registrarMovimiento = async ({ tipo, producto, cantidad, referencia }) => {
    const registro = {
      tipo,
      producto,
      cantidad,
      referencia,
      fecha: new Date().toISOString(),
    }

    const { data, error } = await supabase
      .from('inventario')
      .insert(registro)
      .select()

    if (error) {
      console.error('Error al registrar movimiento de inventario:', error)
      return null
    } else {
      // Prepend al arreglo local para mostrar inmediatamente
      setMovimientos((prev) => [data[0], ...prev])
      return data[0]
    }
  }

  return (
    <InventariosContext.Provider
      value={{
        movimientos,
        loading,
        obtenerMovimientos,
        registrarMovimiento,
      }}
    >
      {children}
    </InventariosContext.Provider>
  )
}

/**
 * Hook para consumir el contexto de inventarios.
 */
export const useInventarios = () => {
  const context = useContext(InventariosContext)
  if (!context) {
    throw new Error('useInventarios debe usarse dentro de un InventariosProvider')
  }
  return context
}
