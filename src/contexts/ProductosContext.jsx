// src/contexts/ProductosContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const ProductosContext = createContext()

export const ProductosProvider = ({ children }) => {
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)

  const obtenerProductos = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('productos')
      .select('*')
      .order('id', { ascending: true })
    if (error) {
      console.error('Error al obtener productos:', error)
    } else {
      setProductos(data)
    }
    setLoading(false)
  }

  const actualizarProducto = async (id, cambios) => {
    const { data, error } = await supabase
      .from('productos')
      .update(cambios)
      .eq('id', id)
      .select()
    if (error) {
      console.error(`Error al actualizar producto ${id}:`, error)
      return null
    } else {
      setProductos((prev) =>
        prev.map((p) => (p.id === id ? data[0] : p))
      )
      return data[0]
    }
  }

  const actualizarPromocion = async (id, nuevaPromocion) => {
    return actualizarProducto(id, { promocion: nuevaPromocion })
  }

  useEffect(() => {
    obtenerProductos()
  }, [])

  return (
    <ProductosContext.Provider
      value={{
        productos,
        loading,
        obtenerProductos,
        actualizarProducto,
        actualizarPromocion,
      }}
    >
      {children}
    </ProductosContext.Provider>
  )
}

export const useProductos = () => {
  const context = useContext(ProductosContext)
  if (!context) {
    throw new Error('useProductos debe usarse dentro de un ProductosProvider')
  }
  return context
}
