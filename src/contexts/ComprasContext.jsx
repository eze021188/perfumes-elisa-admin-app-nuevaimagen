// src/contexts/ComprasContext.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const ComprasContext = createContext();

export const ComprasProvider = ({ children }) => {
  const [compras, setCompras] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1) Obtener compras con detalle
  const obtenerCompras = async () => {
    setLoading(true);

    const { data: cabeceras = [], error: errCab } = await supabase
      .from('compras')
      .select(
        'id, numero_pedido, proveedor, fecha_compra, descuento_total_usd, gastos_importacion, gastos_envio_usa, otros_gastos, tipo_cambio_dia, inventario_afectado' // Asegurarse de traer inventario_afectado
      )
      .order('created_at', { ascending: false });

    if (errCab) {
      console.error('Error al obtener compras:', errCab);
      setCompras([]);
      setLoading(false);
      return;
    }

    const { data: items = [], error: errItems } = await supabase
      .from('compra_items')
      .select('compra_id, nombre_producto, cantidad, precio_unitario_usd');

    if (errItems) {
      console.error('Error al obtener compra_items:', errItems);
      setCompras([]);
      setLoading(false);
      return;
    }

    const comprasConDetalle = cabeceras.map(c => {
      const detalleProductos = items
        .filter(i => i.compra_id === c.id)
        .map(i => ({
          nombreProducto: i.nombre_producto,
          cantidad: parseFloat(i.cantidad) || 0,
          costoUnitario: parseFloat(i.precio_unitario_usd) || 0, // precio_unitario_usd es el costo unitario de compra
        }));

      return {
        id: c.id,
        numeroPedido: c.numero_pedido,
        proveedor: c.proveedor,
        fechaCompra: c.fecha_compra,
        descuentoTotalUSD: parseFloat(c.descuento_total_usd || 0),
        gastosImportacion: parseFloat(c.gastos_importacion || 0),
        gastosEnvio: parseFloat(c.gastos_envio_usa || 0),
        otrosGastos: parseFloat(c.otros_gastos || 0),
        tipoCambio: parseFloat(c.tipo_cambio_dia || 0), // Tipo de cambio general de la compra
        inventario_afectado: c.inventario_afectado, // Incluir estado de inventario
        detalleProductos,
      };
    });

    const comprasConCostos = prorratearGastos(comprasConDetalle);
    setCompras(comprasConCostos);
    setLoading(false);
  };

  // 2) Agregar nueva compra (esta función no se modifica, ya que los cálculos detallados se hacen al afectar inventario en Compras.jsx)
  const agregarCompra = async compraObj => {
    setLoading(true);

    const {
      numeroPedido,
      proveedor,
      fecha_compra,
      descuentoTotalUSD,
      gastosImportacion,
      gastosEnvio, // Esto es gastos_envio_usa
      otrosGastos,
      tipoCambio, // Esto es tipo_cambio_dia
      detalleProductos,
    } = compraObj;

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
        tipo_cambio_dia: tipoCambio,
      })
      .select('id')
      .single();

    if (errCab || !nueva?.id) {
      console.error('Error al agregar compra:', errCab);
      setLoading(false);
      return null;
    }

    const payloadItems = detalleProductos.map(p => ({
      compra_id: nueva.id,
      nombre_producto: p.nombreProducto,
      cantidad: p.cantidad,
      precio_unitario_usd: p.costoUnitario,
    }));

    const { error: errItemsInsert } = await supabase
      .from('compra_items')
      .insert(payloadItems);

    if (errItemsInsert) {
      console.error('Error al agregar compra_items:', errItemsInsert);
      setLoading(false);
      return null;
    }

    await obtenerCompras();
    setLoading(false);
    return nueva;
  };

  // 3) Cálculo de prorrateo de gastos por producto (AHORA ACTUALIZADO Y CORREGIDO)
  const prorratearGastos = listaCompras => {
    return listaCompras.map(compra => {
      const {
        detalleProductos = [],
        descuentoTotalUSD = 0, // Descuento total de la compra
        gastosEnvio = 0, // gastos_envio_usa
        gastosImportacion = 0,
        otrosGastos = 0,
        tipoCambio = 1, // tipo_cambio_dia (para gastos de envío y costo original)
      } = compra;

      const tipoCambioImportacionDelCompra = compra.tipo_cambio_importacion || 1; // Usar tipo_cambio_importacion si está disponible en la compra, sino 1

      // Subtotal bruto de productos en USD (para calcular proporciones)
      const subtotalBrutoUSDAllProducts = detalleProductos.reduce((sum, p) => sum + (p.costoUnitario * p.cantidad), 0);
      
      // Manejar caso de subtotal cero para evitar división por cero
      const divisorProporcion = subtotalBrutoUSDAllProducts > 0 ? subtotalBrutoUSDAllProducts : 1;

      // 1. Convertir gastos a MXN usando sus respectivos tipos de cambio
      const gastosEnvioUSAMXN = gastosEnvio * tipoCambio; // gastosEnvio es gastos_envio_usa
      const gastosImportacionMXN = gastosImportacion * tipoCambioImportacionDelCompra;
      const otrosGastosMXN = otrosGastos * tipoCambio;
      const descuentoTotalCompraMXN = (descuentoTotalUSD * -1) * tipoCambio; // Descuento total se considera un "gasto negativo"


      // Sumar todos los gastos a prorratear en MXN
      const totalGastosProrratearMXN = gastosEnvioUSAMXN + gastosImportacionMXN + otrosGastosMXN + descuentoTotalCompraMXN;
      
      const productosConCostos = detalleProductos.map(p => {
        // Subtotal del ítem en USD (original)
        const itemSubtotalUsdOriginal = p.costoUnitario * p.cantidad;

        // Proporción del ítem sobre el subtotal bruto total (para distribuir gastos)
        const itemProportion = itemSubtotalUsdOriginal / divisorProporcion; // CORRECCIÓN: Definir proporcion aquí

        // Ajuste de gasto prorrateado para el ítem en MXN
        const ajusteProrrateadoItemMXN = itemProportion * totalGastosProrratearMXN;

        // Costo original del ítem en MXN (precio de compra USD * tipo de cambio general de la compra)
        const costoOriginalItemMXN = p.costoUnitario * tipoCambio;

        // Costo Total del Ítem en MXN (suma del costo original convertido y el ajuste prorrateado)
        const costoTotalItemMXN = (costoOriginalItemMXN * p.cantidad) + ajusteProrrateadoItemMXN;
        
        // Costo Unitario Final en MXN
        const costoUnitarioFinalMXN = costoTotalItemMXN / (p.cantidad || 1); // Dividir por cantidad para obtener el unitario

        // Convertir de vuelta a USD para consistencia con costo_final_usd (usando el mismo tipo de cambio del día de la compra)
        const costoUnitarioFinalUSD = costoUnitarioFinalMXN / (tipoCambio || 1);


        return {
          ...p,
          proporcion: itemProportion, // Guardar la proporción para referencia si es necesario
          ajusteProrrateadoItemMXN,
          costoOriginalItemMXN,
          costoTotalItemMXN, // Nuevo campo para el total del ítem con prorrateo
          costoFinalUSD: parseFloat(costoUnitarioFinalUSD.toFixed(4)), // Formatear para consistencia
          costoFinalMXN: parseFloat(costoUnitarioFinalMXN.toFixed(2)), // Formatear para consistencia
        };
      });

      return {
        ...compra,
        detalleProductos: productosConCostos,
        totalGastosProrratearMXN, // Añadir al objeto de compra para depuración si es necesario
      };
    });
  };

  useEffect(() => {
    obtenerCompras();
  }, []);

  return (
    <ComprasContext.Provider
      value={{ compras, loading, obtenerCompras, agregarCompra }}
    >
      {children}
    </ComprasContext.Provider>
  );
};

export const useCompras = () => {
  const context = useContext(ComprasContext);
  if (!context) throw new Error('useCompras debe usarse dentro de ComprasProvider');
  return context;
};