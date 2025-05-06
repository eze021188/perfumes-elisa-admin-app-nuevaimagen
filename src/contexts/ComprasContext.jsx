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
        'id, numero_pedido, proveedor, fecha_compra, descuento_total_usd, gastos_importacion, gastos_envio_usa, otros_gastos, tipo_cambio_dia'
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
          cantidad: i.cantidad,
          costoUnitario: Number(i.precio_unitario_usd),
        }));

      return {
        id: c.id,
        numeroPedido: c.numero_pedido,
        proveedor: c.proveedor,
        fechaCompra: c.fecha_compra,
        descuentoTotalUSD: parseFloat(c.descuento_total_usd),
        gastosImportacion: parseFloat(c.gastos_importacion),
        gastosEnvio: parseFloat(c.gastos_envio_usa),
        otrosGastos: parseFloat(c.otros_gastos),
        tipoCambio: parseFloat(c.tipo_cambio_dia),
        detalleProductos,
      };
    });

    const comprasConCostos = prorratearGastos(comprasConDetalle);
    setCompras(comprasConCostos);
    setLoading(false);
  };

  // 2) Agregar nueva compra
  const agregarCompra = async compraObj => {
    setLoading(true);

    const {
      numeroPedido,
      proveedor,
      fecha_compra,
      descuentoTotalUSD,
      gastosImportacion,
      gastosEnvio,
      otrosGastos,
      tipoCambio,
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

  // 3) Cálculo de prorrateo de gastos por producto
  const prorratearGastos = listaCompras => {
    return listaCompras.map(compra => {
      const {
        detalleProductos = [],
        gastosImportacion = 0,
        gastosEnvio = 0,
        otrosGastos = 0,
        tipoCambio = 1,
      } = compra;

      const subtotales = detalleProductos.map(p => p.costoUnitario * p.cantidad);
      const totalBruto = subtotales.reduce((s, v) => s + v, 0) || 1;
      const gastosTotales = gastosImportacion + gastosEnvio + otrosGastos;

      const productosConCostos = detalleProductos.map((p, i) => {
        const proporción = subtotales[i] / totalBruto;
        const costoImportPorProd = proporción * gastosTotales;
        const costoFinalUSD = p.costoUnitario + costoImportPorProd;
        return {
          ...p,
          proporción,
          costoImportPorProducto: costoImportPorProd,
          costoFinalUSD,
          costoFinalMXN: costoFinalUSD * tipoCambio,
        };
      });

      return {
        ...compra,
        detalleProductos: productosConCostos,
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
