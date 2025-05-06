// src/contexts/ComprasContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../supabase.js'

const ComprasContext = createContext()

export const ComprasProvider = ({ children }) => {
  const [compras, setCompras] = useState([])
  const [loading, setLoading] = useState(true)

  /**
   * Carga todas las compras junto con sus items,
   * aplica prorrateo de gastos y actualiza el estado.
   */
  const obtenerCompras = async () => {
    setLoading(true)

    // 1) Traer cabeceras
    const { data: cabeceras = [], error: errCab } = await supabase
      .from('compras')
      .select(
        'id, numero_pedido, descuento_total_usd, gastos_importacion, gastos_envio_usa, otros_gastos, tipo_cambio_dia'
      )
      .order('created_at', { ascending: false })

    if (errCab) {
      console.error('Error al obtener compras:', errCab)
      setCompras([])
      setLoading(false)
      return
    }

    // 2) Traer items de todas las compras
    const { data: items = [], error: errItems } = await supabase
      .from('compra_items')
      .select('compra_id, nombre_producto, cantidad, precio_unitario_usd')

    if (errItems) {
      console.error('Error al obtener compra_items:', errItems)
      setCompras([])
      setLoading(false)
      return
    }

    // 3) Armar estructura final con detalleProductos y campos camelCase
    const comprasConDetalle = cabeceras.map(c => {
      const detalleProductos = items
        .filter(i => i.compra_id === c.id)
        .map(i => ({
          nombreProducto: i.nombre_producto,
          cantidad: i.cantidad,
          costoUnitario: Number(i.precio_unitario_usd)
        }))

      return {
        id: c.id,
        numeroPedido: c.numero_pedido,
        descuentoTotalUSD: parseFloat(c.descuento_total_usd),
        gastosImportacion: parseFloat(c.gastos_importacion),
        gastosEnvio: parseFloat(c.gastos_envio_usa),
        otrosGastos: parseFloat(c.otros_gastos),
        tipoCambio: parseFloat(c.tipo_cambio_dia),
        detalleProductos
      }
    })

    // 4) Aplicar prorrateo de gastos
    const comprasConCostos = prorratearGastos(comprasConDetalle)
    setCompras(comprasConCostos)
    setLoading(false)
  }

  /**
   * Inserta nueva compra y sus items, luego recarga el listado.
   * @param {Object} compraObj debe incluir detalleProductos y campos de cabecera.
   */
  const agregarCompra = async (compraObj) => {
    setLoading(true)

    // Separar cabecera de detalle
    const {
      numeroPedido,
      proveedor,
      fecha_compra,
      descuentoTotalUSD,
      gastosImportacion,
      gastosEnvio,
      otrosGastos,
      tipoCambio,
      detalleProductos
    } = compraObj

    // 1) Insertar cabecera
    const { data: nueva, error: errCab } = await supabase
      .from('compras')
      .insert({
        numero_pedido: numeroPedido,
        proveedor,
        fecha_compra: fecha_compra || new Date().toISOString(),
        descuento_total_usd: descuentoTotalUSD,
        gastos_importacion: gastosImportacion,
        gastos_envio_usa: gastosEnvio,
        otros_gastos: otrosGastos,
        tipo_cambio_dia: tipoCambio
      })
      .select('id')
      .single()

    if (errCab || !nueva?.id) {
      console.error('Error al agregar compra:', errCab)
      setLoading(false)
      return null
    }

    // 2) Insertar items
    const payloadItems = detalleProductos.map(p => ({
      compra_id: nueva.id,
      nombre_producto: p.nombreProducto,
      cantidad: p.cantidad,
      precio_unitario_usd: p.costoUnitario
    }))

    const { error: errItemsInsert } = await supabase
      .from('compra_items')
      .insert(payloadItems)

    if (errItemsInsert) {
      console.error('Error al agregar compra_items:', errItemsInsert)
      setLoading(false)
      return null
    }

    // 3) Volver a cargar
    await obtenerCompras()
    setLoading(false)
    return nueva
  }

  /**
   * Reparte los gastos sobre cada producto según su proporción de costo.
   * @param {Array} listaCompras
   * @returns {Array}
   */
  const prorratearGastos = (listaCompras) => {
    return listaCompras.map(compra => {
      const { detalleProductos = [], gastosImportacion = 0, gastosEnvio = 0, otrosGastos = 0, tipoCambio = 1 } = compra
      const subtotales = detalleProductos.map(p => p.costoUnitario * p.cantidad)
      const totalBruto = subtotales.reduce((s, v) => s + v, 0) || 1
      const gastosTotales = gastosImportacion + gastosEnvio + otrosGastos

      const productosConCostos = detalleProductos.map((p, i) => {
        const proporción = subtotales[i] / totalBruto
        const costoImportPorProd = proporción * gastosTotales
        const costoFinalUSD = p.costoUnitario + costoImportPorProd
        return {
          ...p,
          proporción,
          costoImportPorProducto: costoImportPorProd,
          costoFinalUSD,
          costoFinalMXN: costoFinalUSD * tipoCambio
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
      value={{ compras, loading, obtenerCompras, agregarCompra }}>
      {children}
    </ComprasContext.Provider>
  )
}

export const useCompras = () => {
  const context = useContext(ComprasContext)
  if (!context) throw new Error('useCompras debe usarse dentro de ComprasProvider')
  return context
}
