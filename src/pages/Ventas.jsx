// src/pages/Ventas.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Ventas() {
  const [ventas, setVentas] = useState([]);
  const [ventaSeleccionada, setVentaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(true);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const navigate = useNavigate();

  const cargarVentas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('ventas')
      .select('*')
      .order('fecha', { ascending: false });
    if (error) {
      console.error('❌ Error al cargar ventas:', error.message);
      toast.error('Error al cargar ventas.');
      setVentas([]);
    } else {
      setVentas(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    cargarVentas();
  }, []);

  const cancelarVenta = async (venta) => {
    if (cancelLoading) return;
    if (!window.confirm(`¿Seguro que quieres cancelar la venta ${venta.codigo_venta}? Se restaurará el stock.`)) {
      return;
    }
    setCancelLoading(true);
    try {
      const { data: detalles = [], error: errDet } = await supabase
        .from('detalle_venta')
        .select('producto_id, cantidad')
        .eq('venta_id', venta.id);
      if (errDet) throw new Error('No se pudieron obtener los detalles de la venta.');

      for (const item of detalles) {
        const { data: prodActual, error: errProd } = await supabase
          .from('productos')
          .select('stock')
          .eq('id', item.producto_id)
          .single();
        if (errProd) {
          console.error(`Error al obtener stock del producto ${item.producto_id}:`, errProd.message);
          toast.error(`Error al obtener stock del producto ${item.producto_id}.`);
          continue;
        }
        const nuevoStock = (prodActual?.stock || 0) + item.cantidad;
        const { error: errUpd } = await supabase
          .from('productos')
          .update({ stock: nuevoStock })
          .eq('id', item.producto_id);
        if (errUpd) {
          console.error(`Error actualizando stock del producto ${item.producto_id}:`, errUpd.message);
          toast.error(`Error actualizando stock del producto ${item.producto_id}.`);
        }
      }

      const { error: errDel } = await supabase
        .from('detalle_venta')
        .delete()
        .eq('venta_id', venta.id);
      if (errDel) throw new Error('Error al eliminar los detalles de la venta.');

      const { error: errVenta } = await supabase
        .from('ventas')
        .delete()
        .eq('id', venta.id);
      if (errVenta) throw new Error('No se pudo eliminar la venta principal.');

      toast.success(` Venta ${venta.codigo_venta} cancelada correctamente.`);
      setVentaSeleccionada(null);
      cargarVentas();
    } catch (err) {
      console.error('❌ Error general al cancelar la venta:', err.message);
      toast.error(`Ocurrió un error: ${err.message}`);
    } finally {
      setCancelLoading(false);
    }
  };

  const abrirPDF = (venta) => {
    const doc = new jsPDF();
    doc.setFont('helvetica');
    doc.setFontSize(16);
    doc.text(`Ticket de venta - ${venta.codigo_venta || 'N/A'}`, 10, 15);
    doc.setFontSize(12);
    doc.text(`Cliente: ${venta.cliente_nombre || 'Público General'}`, 10, 25);
    doc.text(`Fecha: ${venta.fecha ? new Date(venta.fecha).toLocaleString() : 'Fecha desconocida'}`, 10, 35);
    doc.text(`Forma de pago: ${venta.forma_pago || 'Desconocida'}`, 10, 45);

    const rows = (venta.productos || []).map(p => [
      p.nombre || '–',
      p.cantidad ?? 0,
      `$${(p.precio ?? 0).toFixed(2)}`,
      `$${(p.subtotal ?? 0).toFixed(2)}`
    ]);

    doc.autoTable({
      startY: 55,
      head: [['Producto', 'Cantidad', 'P. Unitario', 'Total']],
      body: rows,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 2 },
      headStyles: { fillColor: [200, 200, 200], textColor: [0, 0, 0], fontStyle: 'bold' },
      columnStyles: { 1: { halign: 'center' }, 2: { halign: 'right' }, 3: { halign: 'right' } }
    });

    const finalY = doc.lastAutoTable?.finalY || 65;
    const subtotal = venta.subtotal || 0;
    const total = venta.total || 0;
    const valorDescuento = venta.valor_descuento || 0;

    doc.setFont(undefined, 'bold');
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 10, finalY + 10);

    let descuentoTexto = 'Descuento: $0.00';
    if (venta.tipo_descuento === 'porcentaje' && valorDescuento > 0) {
      const montoDesc = subtotal * (valorDescuento / 100);
      descuentoTexto = `Descuento: -${valorDescuento}% (-$${montoDesc.toFixed(2)})`;
    } else if (venta.tipo_descuento === 'fijo' && valorDescuento > 0) {
      descuentoTexto = `Descuento: -$${valorDescuento.toFixed(2)}`;
    }
    doc.text(descuentoTexto, 10, finalY + 20);
    doc.text(`Total: $${total.toFixed(2)}`, 180, finalY + 30, { align: 'right' });

    window.open(doc.output('bloburl'), '_blank');
  };

  const ventasFiltradas = ventas.filter(v =>
    (v.cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.codigo_venta || '').toLowerCase().includes(busqueda.toLowerCase()) ||
    (v.forma_pago || '').toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
       {/* Encabezado responsive */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50"
        >
          Volver al inicio
        </button>

        <h1 className="text-3xl font-bold text-gray-800 text-center w-full md:w-auto">
          Historial de Ventas
        </h1>

        <div className="w-full md:w-[150px]" />
      </div>
      <div className="mb-6 flex justify-center">
        <input
          type="text"
          placeholder="Buscar por cliente, código o pago..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          className="p-3 border rounded-md shadow-sm w-full md:w-1/2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-gray-700"
        />
      </div>

      {loading ? (
        <p className="text-center text-lg font-semibold text-gray-700">Cargando ventas...</p>
      ) : ventasFiltradas.length === 0 ? (
        <p className="text-center text-gray-500 italic">No hay ventas encontradas.</p>
      ) : (
        <div className="bg-white shadow-lg rounded-lg overflow-hidden mb-6">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-200">
              <tr><th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Código</th><th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Cliente</th><th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden md:table-cell">Fecha</th><th className="p-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider hidden sm:table-cell">Pago</th><th className="p-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Total</th></tr>
            </thead>
            <tbody>
              {ventasFiltradas.map(venta => (
                <tr key={venta.id} className="border-b hover:bg-gray-50 transition duration-150 ease-in-out cursor-pointer" onClick={async () => {
                  setDetailLoading(true);
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
                  setDetailLoading(false);
                  if (error) {
                    console.error('Error cargando detalle:', error.message);
                    toast.error('Error al cargar los detalles de la venta.');
                    return;
                  }
                  const productos = dets.map(d => ({
                    nombre: d.producto?.nombre || '–',
                    cantidad: d.cantidad ?? 0,
                    precio: d.precio_unitario ?? 0,
                    subtotal: d.total_parcial ?? 0
                  }));
                  setVentaSeleccionada({
                    ...venta,
                    productos,
                    subtotal: venta.subtotal ?? 0,
                    total: venta.total ?? 0,
                    valor_descuento: venta.valor_descuento ?? 0,
                    tipo_descuento: venta.tipo_descuento || 'fijo'
                  });
                }}>
                  <td className="p-4 whitespace-nowrap text-sm font-medium text-gray-900">{venta.codigo_venta}</td><td className="p-4 whitespace-nowrap text-sm text-gray-700">{venta.cliente_nombre}</td><td className="p-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">{venta.fecha ? new Date(venta.fecha).toLocaleString() : 'Fecha desconocida'}</td><td className="p-4 whitespace-nowrap text-sm text-gray-500 hidden sm:table-cell">{venta.forma_pago}</td><td className="p-4 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">${(venta.total ?? 0).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {ventaSeleccionada && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4" onClick={() => setVentaSeleccionada(null)}>
          <div className="bg-white p-8 rounded-lg shadow-xl w-full max-w-lg relative max-h-[95vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <button onClick={() => setVentaSeleccionada(null)} className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-3xl font-bold leading-none">&times;</button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Detalle de Venta - {ventaSeleccionada.codigo_venta}</h2>
            {detailLoading ? (
              <p className="text-center text-blue-600 font-semibold">Cargando detalles...</p>
            ) : (
              <>
                <div className="mb-6 text-gray-700 space-y-2">
                  <p><strong>Cliente:</strong> {ventaSeleccionada.cliente_nombre}</p>
                  <p><strong>Fecha:</strong> {ventaSeleccionada.fecha ? new Date(ventaSeleccionada.fecha).toLocaleString() : 'Fecha desconocida'}</p>
                  <p><strong>Forma de Pago:</strong> {ventaSeleccionada.forma_pago}</p>
                </div>
                <hr className="my-6 border-gray-200" />
                <h3 className="text-xl font-semibold text-gray-800 mb-4">Productos:</h3>
                <div className="overflow-x-auto shadow-sm rounded-md mb-6">
                  <table className="w-full text-sm border-collapse">
                    <thead className="bg-gray-100">
                      <tr><th className="p-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th><th className="p-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Cantidad</th><th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio</th><th className="p-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Subtotal</th></tr>
                    </thead>
                    <tbody>
                      {ventaSeleccionada.productos.map((p, i) => (
                        <tr key={i} className="border-b hover:bg-gray-50"><td className="p-3">{p.nombre}</td><td className="p-3 text-center">{p.cantidad}</td><td className="p-3 text-right">${p.precio.toFixed(2)}</td><td className="p-3 text-right">${p.subtotal.toFixed(2)}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="text-right text-gray-800 space-y-1 mb-6">
                  <p className="font-semibold">Subtotal: ${ventaSeleccionada.subtotal.toFixed(2)}</p>
                  {((ventaSeleccionada.tipo_descuento === 'porcentaje' && ventaSeleccionada.valor_descuento > 0) || (ventaSeleccionada.tipo_descuento === 'fijo' && ventaSeleccionada.valor_descuento > 0)) && (
                    <p className="font-semibold text-red-600">
                      Descuento:{' '}
                      {ventaSeleccionada.tipo_descuento === 'porcentaje'
                        ? `-${ventaSeleccionada.valor_descuento}%`
                        : `-$${ventaSeleccionada.valor_descuento.toFixed(2)}`}
                    </p>
                  )}
                  <p className="font-bold text-xl text-green-700 mt-2 pt-2 border-t border-gray-300">Total: ${ventaSeleccionada.total.toFixed(2)}</p>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => abrirPDF(ventaSeleccionada)} className="px-6 py-2 bg-blue-600 text-white rounded-lg shadow-md hover:bg-blue-700 transition duration-200">
                    Ver PDF
                  </button>
                  <button
                    onClick={() => cancelarVenta(ventaSeleccionada)}
                    disabled={cancelLoading}
                    className={`px-6 py-2 rounded-lg shadow-md transition duration-200 ${cancelLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 text-white'}`}
                  >
                    {cancelLoading ? 'Cancelando...' : 'Eliminar venta'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
