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

  // Carga todas las ventas
  const cargarVentas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('fecha', { ascending: false });
    if (error) {
      console.error('❌ Error al cargar ventas:', error.message);
    } else {
      setVentas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarVentas();
  }, []);

  // Cancela una venta y restaura stock + registra movimiento
  const cancelarVenta = async (venta) => {
    if (!window.confirm('¿Seguro que quieres cancelar esta venta? Se restaurará el stock.')) {
      return;
    }

    try {
      const { data: detalles = [], error: errDet } = await supabase
        .from('detalle_venta')
        .select('producto_id, cantidad')
        .eq('venta_id', venta.id);
      if (errDet) throw errDet;

      for (const item of detalles) {
        const { data: prodActual = {}, error: errProd } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.producto_id)
          .single();
        if (errProd) {
          console.error('Error al obtener producto:', errProd.message);
          continue;
        }

        const nuevoStock = (prodActual.stock || 0) + item.cantidad;
        const { error: errUpd } = await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.producto_id);
        if (errUpd) console.error('Error actualizando stock:', errUpd.message);

        const referencia = venta.codigo_venta || '';
        const { error: errMov } = await supabase
          .from('movimientos_inventario')
          .insert({
            producto_id: item.producto_id,
            tipo: 'Entrada devolución',
            cantidad: item.cantidad,
            referencia,
            motivo: 'venta cancelada',
            fecha: new Date().toISOString()
          });
        if (errMov) console.error('Error insertando movimiento:', errMov.message);
      }

      const { error: errDel } = await supabase
        .from('detalle_venta')
        .delete()
        .eq('venta_id', venta.id);
      if (errDel) console.error('Error borrando detalle_venta:', errDel.message);

      const { error: errVenta } = await supabase
        .from('ventas')
        .delete()
        .eq('id', venta.id);
      if (errVenta) throw errVenta;

      alert('✅ Venta cancelada: stock restaurado y movimiento registrado.');
      setVentaSeleccionada(null);
      cargarVentas();
    } catch (err) {
      console.error('❌ Error al cancelar la venta:', err.message);
      alert('Ocurrió un error al cancelar la venta.');
    }
  };

  // Genera y muestra el PDF
  const abrirPDF = (venta) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Ticket de venta - ${venta.codigo_venta}`, 10, 10);
    doc.setFontSize(12);
    doc.text(`Cliente: ${venta.cliente_nombre}`, 10, 20);
    doc.text(`Fecha: ${new Date(venta.fecha).toLocaleString()}`, 10, 30);
    doc.text(`Forma de pago: ${venta.forma_pago}`, 10, 40);

    const rows = (venta.productos || []).map(p => [
      p.nombre || '–',
      p.cantidad || 0,
      `$${((p.precio ?? 0)).toFixed(2)}`,
      `$${((p.subtotal ?? 0)).toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 50,
      head: [['Producto', 'Cantidad', 'P. Unitario', 'Total']],
      body: rows
    });

    const finalY = doc.lastAutoTable?.finalY || 60;
    doc.setFont(undefined, 'bold');
    doc.text(`Subtotal: $${((venta.subtotal ?? 0)).toFixed(2)}`, 10, finalY + 10);
    doc.text(
      `Descuento: ${
        venta.tipo_descuento === 'porcentaje'
          ? `-${venta.valor_descuento}%`
          : `-$${venta.valor_descuento}`
      }`,
      10,
      finalY + 20
    );
    doc.text(`Total: $${((venta.total ?? 0)).toFixed(2)}`, 180, finalY + 30, { align: 'right' });
    window.open(doc.output('bloburl'), '_blank');
  };

  // Filtra según búsqueda
  const ventasFiltradas = ventas.filter(v =>
    (v.cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.codigo_venta || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-6">
      <button
        onClick={() => navigate('/')}
        className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Volver al inicio
      </button>

      <h1 className="text-2xl font-bold mb-4">Historial de Ventas</h1>

      <input
        type="text"
        placeholder="Buscar por cliente o código"
        value={busqueda}
        onChange={e => setBusqueda(e.target.value)}
        className="mb-4 p-2 border rounded w-full md:w-1/2"
      />

      {loading ? (
        <p>Cargando ventas...</p>
      ) : ventasFiltradas.length === 0 ? (
        <p>No hay ventas encontradas.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm border">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 border">Código</th>
                <th className="p-2 border">Cliente</th>
                <th className="p-2 border">Fecha</th>
                <th className="p-2 border">Pago</th>
                <th className="p-2 border">Total</th>
              </tr>
            </thead>
            <tbody>
              {ventasFiltradas.map(venta => (
                <tr
                  key={venta.id}
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={async () => {
                    const { data: dets = [], error } = await supabase
                      .from('detalle_venta')
                      .select(`
                        producto_id,
                        cantidad,
                        precio_unitario,
                        total_parcial,
                        producto:productos(nombre)
                      `)
                      .eq('venta_id', venta.id);
                    if (error) {
                      console.error('Error cargando detalle:', error.message);
                      return;
                    }
                    const productos = (dets || []).map(d => ({
                      nombre: d.producto?.nombre || '–',
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
                  <td className="p-2 border font-semibold">
                    ${((venta.total ?? 0)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ventaSeleccionada && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl max-w-xl w-full relative">
            <button
              onClick={() => setVentaSeleccionada(null)}
              className="absolute top-2 right-3 text-gray-600 text-xl hover:text-black"
            >
              ×
            </button>
            <h2 className="text-xl font-bold mb-4">Detalle de Venta</h2>
            <p><strong>Código:</strong> {ventaSeleccionada.codigo_venta}</p>
            <p><strong>Cliente:</strong> {ventaSeleccionada.cliente_nombre}</p>
            <p><strong>Fecha:</strong> {new Date(ventaSeleccionada.fecha).toLocaleString()}</p>
            <p><strong>Pago:</strong> {ventaSeleccionada.forma_pago}</p>
            <hr className="my-3" />

            <table className="w-full text-sm mb-4 border">
              <thead className="bg-gray-100">
                <tr>
                  <th className="p-1 border">Producto</th>
                  <th className="p-1 border">Cantidad</th>
                  <th className="p-1 border">Precio</th>
                  <th className="p-1 border">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {(ventaSeleccionada.productos || []).map((p, i) => (
                  <tr key={i}>
                    <td className="p-1 border text-center">{p.nombre}</td>
                    <td className="p-1 border text-center">{p.cantidad}</td>
                    <td className="p-1 border text-center">
                      ${((p.precio ?? 0)).toFixed(2)}
                    </td>
                    <td className="p-1 border text-center">
                      ${((p.subtotal ?? 0)).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <p className="font-semibold">
              Subtotal: ${((ventaSeleccionada.subtotal ?? 0)).toFixed(2)}
            </p>
            <p className="font-semibold">
              Descuento:{' '}
              {ventaSeleccionada.tipo_descuento === 'porcentaje'
                ? `-${ventaSeleccionada.valor_descuento}%`
                : `-${ventaSeleccionada.valor_descuento}`}
            </p>
            <p className="font-semibold mb-4">
              Total: ${((ventaSeleccionada.total ?? 0)).toFixed(2)}
            </p>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => abrirPDF(ventaSeleccionada)}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Ver PDF
              </button>
              <button
                onClick={() => cancelarVenta(ventaSeleccionada)}
                className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
              >
                Eliminar venta
              </button>
              <button
                onClick={() => navigate('/')}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
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
