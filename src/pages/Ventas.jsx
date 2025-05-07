// src/pages/Ventas.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

export default function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const cargarVentas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('fecha', { ascending: false });
    if (error) {
      console.error('❌ Error al cargar ventas:', error.message);
    } else {
      setVentas(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarVentas();
  }, []);

  const eliminarVenta = async (venta) => {
    const confirmacion = confirm(`¿Estás seguro de eliminar la venta ${venta.codigo_venta}? Se restaurará el stock y se registrará la devolución.`);
    if (!confirmacion) return;

    try {
      const { data: detalles, error: errorDetalles } = await supabase
        .from('detalle_venta')
        .select('*')
        .eq('venta_id', venta.id);

      if (errorDetalles || !detalles) {
        console.error('❌ Error obteniendo detalles:', errorDetalles);
        return;
      }

      // Agrupar productos por producto_id y sumar cantidades
      const resumen = detalles.reduce((acc, item) => {
        if (!acc[item.producto_id]) {
          acc[item.producto_id] = 0;
        }
        acc[item.producto_id] += item.cantidad;
        return acc;
      }, {});

      const operaciones = Object.entries(resumen).map(async ([productoId, cantidadTotal]) => {
        const { data: producto, error: errorProducto } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', productoId)
          .single();

        if (!producto || errorProducto) {
          console.error(`❌ Error consultando producto ${productoId}:`, errorProducto);
          return;
        }

        const nuevoStock = producto.stock + cantidadTotal;

        const { error: errorUpdate } = await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', productoId);
        if (errorUpdate) console.error(`❌ Error actualizando stock:`, errorUpdate);

        const { error: errorMovimiento } = await supabase
          .from('movimientos_inventario')
          .insert([
            {
              producto_id: productoId,
              tipo: 'ENTRADA',
              cantidad: cantidadTotal,
              referencia: venta.codigo_venta,
              motivo: 'devolucion_ventas'
            }
          ]);
        if (errorMovimiento) console.error(`❌ Error registrando devolución:`, errorMovimiento);
      });

      await Promise.all(operaciones);

      const { error: errorDelDetalle } = await supabase
        .from('detalle_venta')
        .delete()
        .eq('venta_id', venta.id);
      if (errorDelDetalle) console.error('❌ Error borrando detalle_venta:', errorDelDetalle);

      const { error: errorDelVenta } = await supabase
        .from('ventas')
        .delete()
        .eq('id', venta.id);
      if (errorDelVenta) {
        alert('❌ Error al eliminar la venta');
      } else {
        alert('✅ Venta eliminada correctamente');
        setVentaSeleccionada(null);
        cargarVentas();
      }
    } catch (err) {
      console.error('❌ Error inesperado al eliminar venta:', err);
    }
  };

  return (
    <div className="p-6">
      <button
        onClick={() => navigate('/')}
        className="mb-4 px-4 py-2 bg-gray-200 text-black rounded hover:bg-gray-300"
      >
        Volver al inicio
      </button>

      <h1 className="text-2xl font-bold mb-4">Historial de Ventas</h1>

      <input
        type="text"
        placeholder="Buscar por cliente o código"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        className="mb-4 p-2 border rounded w-full md:w-1/2"
      />

      {loading ? (
        <p>Cargando ventas...</p>
      ) : ventas.length === 0 ? (
        <p>No hay ventas registradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-300 text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Código</th>
                <th className="p-2 border">Cliente</th>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Forma de pago</th>
                <th className="p-2 border">Total</th>
              </tr>
            </thead>
            <tbody>
              {ventas
                .filter((v) =>
                  v.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
                  v.codigo_venta?.toLowerCase().includes(busqueda.toLowerCase())
                )
                .map((venta) => (
                  <tr
                    key={venta.id}
                    className="text-center hover:bg-gray-50 cursor-pointer"
                    onClick={async () => {
                      const { data: detalles, error } = await supabase
                        .from('detalle_venta')
                        .select('producto_id, cantidad, precio_unitario, total_parcial, productos(nombre)')
                        .eq('venta_id', venta.id);
                      if (error) {
                        console.error('Error al obtener detalle de venta', error.message);
                        return;
                      }
                      const productos = detalles.map((d) => ({
                        nombre: d.productos?.nombre || 'Desconocido',
                        cantidad: d.cantidad,
                        precio: d.precio_unitario,
                        subtotal: d.total_parcial
                      }));
                      setVentaSeleccionada({ ...venta, productos });
                    }}
                  >
                    <td className="p-2 border">{venta.codigo_venta}</td>
                    <td className="p-2 border">{venta.cliente_nombre}</td>
                    <td className="p-2 border">{new Date(venta.fecha).toLocaleString()}</td>
                    <td className="p-2 border">{venta.forma_pago}</td>
                    <td className="p-2 border font-semibold">${venta.total.toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}

      {ventaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-xl p-6 relative">
            <button
              onClick={() => setVentaSeleccionada(null)}
              className="absolute top-2 right-3 text-gray-600 hover:text-black text-xl"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Detalle de Venta</h2>
            <p><strong>Código:</strong> {ventaSeleccionada.codigo_venta}</p>
            <p><strong>Cliente:</strong> {ventaSeleccionada.cliente_nombre}</p>
            <p><strong>Fecha:</strong> {new Date(ventaSeleccionada.fecha).toLocaleString()}</p>
            <p><strong>Forma de pago:</strong> {ventaSeleccionada.forma_pago}</p>
            <hr className="my-3" />

            <table className="w-full text-sm border mb-3">
              <thead>
                <tr className="bg-gray-100">
                  <th className="p-1 border">Producto</th>
                  <th className="p-1 border">Cantidad</th>
                  <th className="p-1 border">Precio</th>
                  <th className="p-1 border">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {ventaSeleccionada.productos.map((p, idx) => (
                  <tr key={idx} className="text-center">
                    <td className="p-1 border">{p.nombre}</td>
                    <td className="p-1 border">{p.cantidad}</td>
                    <td className="p-1 border">${p.precio.toFixed(2)}</td>
                    <td className="p-1 border">${p.subtotal.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p><strong>Subtotal:</strong> ${ventaSeleccionada.subtotal.toFixed(2)}</p>
            <p><strong>Descuento:</strong> {
              ventaSeleccionada.tipo_descuento === 'porcentaje'
                ? `-${ventaSeleccionada.valor_descuento}%`
                : `-$${ventaSeleccionada.valor_descuento}`
            }</p>
            <p><strong>Total:</strong> ${ventaSeleccionada.total.toFixed(2)}</p>

            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                onClick={() => eliminarVenta(ventaSeleccionada)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Eliminar venta
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Volver al inicio
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}