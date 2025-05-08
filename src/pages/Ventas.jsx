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

  // 1) Carga todas las ventas
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

  // 2) Función de cancelación de venta
  const cancelarVenta = async (venta) => {
    if (!confirm(
      '¿Estás seguro de cancelar esta venta? Se restaurará el stock y quedará registro de devolución.'
    )) return;

    try {
      // 2.1) Obtener detalle completo
      const { data: detalles, error: errDet } = await supabase
        .from('detalle_venta')
        .select('producto_id, cantidad')
        .eq('venta_id', venta.id);
      if (errDet) throw errDet;

      // 2.2) Restaurar stock e insertar movimiento
      for (const item of detalles) {
        // a) Leer stock actual
        const { data: productoActual, error: errProd } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.producto_id)
          .single();
        if (errProd) {
          console.error('Error al obtener producto:', errProd.message);
          continue;
        }

        const nuevoStock = (productoActual.stock || 0) + item.cantidad;

        // b) Actualizar la tabla productos
        const { error: errUpd } = await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.producto_id);
        if (errUpd) {
          console.error('Error actualizando stock:', errUpd.message);
        }

        // c) Registrar el movimiento de devolución
        const { error: errMov } = await supabase
          .from('movimientos_inventario')
          .insert({
            producto_id: item.producto_id,
            tipo: 'DEVOLUCION_VENTA',
            cantidad: item.cantidad,
            referencia: venta.codigo_venta,
            motivo: 'venta cancelada',
            fecha: new Date().toISOString()
          });
        if (errMov) {
          console.error('Error insertando movimiento:', errMov.message);
        }
      }

      // 2.3) Borrar detalle_venta
      const { error: errDelDet } = await supabase
        .from('detalle_venta')
        .delete()
        .eq('venta_id', venta.id);
      if (errDelDet) console.error('Error al borrar detalle_venta:', errDelDet.message);

      // 2.4) Borrar cabecera de la venta
      const { error: errVenta } = await supabase
        .from('ventas')
        .delete()
        .eq('id', venta.id);
      if (errVenta) throw errVenta;

      alert('✅ Venta cancelada, stock restaurado y movimiento registrado');
      setVentaSeleccionada(null);
      cargarVentas();

    } catch (err) {
      console.error('❌ Error al cancelar la venta:', err.message);
      alert('Ocurrió un error al cancelar la venta.');
    }
  };

  // Handler que dispara la cancelación
  const eliminarVenta = (venta) => cancelarVenta(venta);

  // 3) Generar PDF de la venta
  const abrirPDF = (venta) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Ticket de venta - ${venta.codigo_venta}`, 10, 10);
    doc.setFontSize(12);
    doc.text(`Cliente: ${venta.cliente_nombre}`, 10, 20);
    doc.text(`Fecha: ${new Date(venta.fecha).toLocaleString()}`, 10, 30);
    doc.text(`Forma de pago: ${venta.forma_pago}`, 10, 40);

    // Carga los detalles
    doc.autoTable({
      startY: 50,
      head: [['Producto', 'Cantidad', 'P. Unitario', 'Total']],
      body: venta.productos.map((p) => [
        p.nombre,
        p.cantidad,
        `$${p.precio.toFixed(2)}`,
        `$${p.subtotal.toFixed(2)}`
      ])
    });

    const finalY = doc.lastAutoTable?.finalY || 60;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(`Subtotal: $${venta.subtotal.toFixed(2)}`, 10, finalY + 10);
    doc.text(
      `Descuento: ${
        venta.tipo_descuento === 'porcentaje'
          ? `-${venta.valor_descuento}%`
          : `-$${venta.valor_descuento}`
      }`,
      10,
      finalY + 20
    );
    doc.text(`Total: $${venta.total.toFixed(2)}`, 180, finalY + 30, { align: 'right' });
    window.open(doc.output('bloburl'), '_blank');
  };

  // 4) Filtrado por búsqueda
  const ventasFiltradas = ventas.filter((v) =>
    v.cliente_nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    v.codigo_venta?.toLowerCase().includes(busqueda.toLowerCase())
  );

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
      ) : ventasFiltradas.length === 0 ? (
        <p>No hay ventas encontradas.</p>
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
              {ventasFiltradas.map((venta) => (
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
                onClick={() => abrirPDF(ventaSeleccionada)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Ver PDF
              </button>
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
