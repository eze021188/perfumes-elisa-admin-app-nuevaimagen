// src/contexts/ComprasContext.jsx
import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const ComprasContext = createContext()

export const ComprasProvider = ({ children }) => {
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)

  /**
   * Carga todas las compras y aplica prorrateo de gastos
   */
  const obtenerCompras = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('compras')
      .select('*')
      .order('id', { ascending: true })

    if (error) {
      console.error('Error al obtener compras:', error)
      setCompras([])
    } else {
      // Aplica prorrateo a los datos obtenidos
      const comprasConCostos = prorratearGastos(data)
      setCompras(comprasConCostos)
    }
    setLoading(false)
  }

  /**
   * Inserta una nueva compra y actualiza el estado local
   * @param {Object} compra - Objeto con detalle de compra
   */
  const agregarCompra = async (compra) => {
    // Prorratea los gastos antes de enviar
    const compraConCostos = prorratearGastos([compra])[0]
    const { data, error } = await supabase
      .from('compras')
      .insert(compraConCostos)
      .select()

    if (error) {
      console.error('Error al agregar compra:', error)
      return null
    } else {
      setCompras((prev) => [...prev, data[0]])
      return data[0]
    }
  }

  /**
   * Función que aplica el prorrateo de gastos de importación, envío y otros
   * según el valor de cada producto en la compra.
   * @param {Array} listaCompras
   * @returns {Array}
   */
  const prorratearGastos = (listaCompras) => {
    return listaCompras.map((compra) => {
      const { detalleProductos, gastosImportacion = 0, gastosEnvio = 0, otrosGastos = 0, tipoCambio = 1 } = compra
      // Calcular subtotal bruto por producto
      const subtotales = detalleProductos.map(p => p.costoUnitario * p.cantidad)
      const totalBruto = subtotales.reduce((sum, val) => sum + val, 0) || 1

      // Prorrateo de gastos
      const gastosTotales = gastosImportacion + gastosEnvio + otrosGastos
      const proporciones = subtotales.map(val => val / totalBruto)

      // Agregar campos calculados a cada producto
      const productosConCostos = detalleProductos.map((p, idx) => {
        const proporción = proporciones[idx]
        const costoImportPorProducto = proporción * gastosImportacion
        const costoTotalUSD = p.costoUnitario + costoImportPorProducto
        const costoFinalUSD = costoTotalUSD
        const costoFinalMXN = costoFinalUSD * tipoCambio
        return {
          ...p,
          proporción,
          costoImportPorProducto,
          costoTotalUSD,
          costoFinalUSD,
          costoFinalMXN
        }
      })

      return {
        ...compra,
        detalleProductos: productosConCostos
      }
    })
  }

  useEffect(() => {
    obtenerCompras()
  }, [])

  return (
    <ComprasContext.Provider
      value={{
        compras,
        loading,
        obtenerCompras,
        agregarCompra
      }}
    >
      {children}
    </ComprasContext.Provider>
  )
}

export const useCompras = () => {
  const context = useContext(ComprasContext)
  if (!context) throw new Error('useCompras debe usarse dentro de un ComprasProvider')
  return context
}
