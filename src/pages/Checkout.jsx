import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import 'jspdf-autotable';
import QuickEntryBar from '../components/QuickEntryBar';
import QuickSaleModal from '../components/QuickSaleModal';
import ClientSelector from '../components/ClientSelector';
import NewClientModal from '../components/NewClientModal';
import FilterTabs from '../components/FilterTabs';
import ProductGrid from '../components/ProductGrid';
import ModalCheckout from '../components/ModalCheckout';

export default function Checkout() {
  const navigate = useNavigate();

  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [productosVenta, setProductosVenta] = useState([]);
  const [filtro, setFiltro] = useState('All');
  const [busqueda, setBusqueda] = useState('');
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [paymentType, setPaymentType] = useState('');
  const [discountType, setDiscountType] = useState('Sin descuento');
  const [discountValue, setDiscountValue] = useState(0);

  // Carga inicial de clientes y productos, con imágenes públicas
  useEffect(() => {
    async function loadData() {
      const { data: cli } = await supabase.from('clientes').select('*');
      const { data: prod } = await supabase.from('productos').select('*');
      const prodMapped = (prod || []).map(p => {
        let imagenUrl = p.imagenUrl || p.imagen_url || p.imagen || '';
        if (imagenUrl && !imagenUrl.startsWith('http')) {
          const { data } = supabase.storage.from('productos').getPublicUrl(p.imagen);
          imagenUrl = data.publicUrl;
        }
        return { ...p, imagenUrl };
      });
      setClientes(cli || []);
      setProductos(prodMapped);
    }
    loadData();
  }, []);

  // Filtrado y totales
  const productosFiltrados = productos.filter(p =>
    (filtro === 'All' || p.categoria === filtro) &&
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );
  const totalItems = productosVenta.reduce((sum, p) => sum + p.cantidad, 0);
  const originalSubtotal = productosVenta.reduce((sum, p) => sum + p.total, 0);
  let subtotal = originalSubtotal;
  if (discountType === 'Por importe') subtotal = Math.max(0, subtotal - discountValue);
  else if (discountType === 'Por porcentaje') subtotal *= (1 - discountValue / 100);
  const discountAmount = originalSubtotal - subtotal;

  const onAddToCart = producto => {
    setProductosVenta(prev => {
      const existe = prev.find(p => p.id === producto.id);
      if (existe) {
        if (existe.cantidad + 1 > producto.stock) {
          toast.error('Stock insuficiente');
          return prev;
        }
        return prev.map(p =>
          p.id === producto.id ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * p.promocion } : p
        );
      }
      return [...prev, { ...producto, cantidad: 1, total: producto.promocion }];
    });
  };

  const openSaleModal = () => {
    if (!clienteSeleccionado || totalItems === 0) return;
    setShowSaleModal(true);
  };

  const handleFinalize = async () => {
    setProcessing(true);
    try {
      const { data: ventasPrevias } = await supabase.from('ventas').select('codigo_venta');
      const codigo = 'VT' + String((ventasPrevias?.length || 0) + 1).padStart(5, '0');
      const { data: ventaInsertada, error: errorVenta } = await supabase
        .from('ventas')
        .insert([{ codigo_venta: codigo, cliente_id: clienteSeleccionado.id, subtotal, forma_pago: paymentType, tipo_descuento: discountType, valor_descuento: discountAmount, total: subtotal }])
        .select('id')
        .single();
      if (errorVenta) throw errorVenta;
      const ventaId = ventaInsertada.id;

      for (const p of productosVenta) {
        await supabase.from('detalle_venta').insert([{ venta_id: ventaId, producto_id: p.id, cantidad: p.cantidad, precio_unitario: p.promocion, total_parcial: p.total }]);
        const { data: prodActual } = await supabase.from('productos').select('stock').eq('id', p.id).single();
        const nuevoStock = (prodActual.stock || 0) - p.cantidad;
        await supabase.from('productos').update({ stock: nuevoStock }).eq('id', p.id);
        const { error: errMov } = await supabase
  .from('movimientos_inventario')
  .insert([{ producto_id: p.id, tipo: 'SALIDA', cantidad: p.cantidad, referencia: codigo, motivo: 'venta' }]);
if (errMov) console.error('Error mov_inventario (' + p.nombre + '):', errMov);
      }
      setShowSaleModal(false);
      setProductosVenta([]);
      generarPDF(codigo);
    } catch (err) {
      console.error('Error al finalizar venta:', err);
      toast.error('Error al procesar la venta.');
    } finally {
      setProcessing(false);
    }
  };

  const generarPDF = codigo => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Ticket - ${codigo}`, 10, 12);
    if (clienteSeleccionado) doc.text(`Cliente: ${clienteSeleccionado.nombre}`, 10, 22);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, 30);
    const rows = productosVenta.map(p => [p.nombre, p.cantidad.toString(), `$${p.promocion.toFixed(2)}`, `$${p.total.toFixed(2)}`]);
    doc.autoTable({ head: [['Producto', 'Cant.', 'P.U.', 'Total']], body: rows, startY: 40 });
    const y = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 10, y);
    doc.text(`Descuento: -$${discountAmount.toFixed(2)}`, 10, y + 6);
    doc.text(`Total: $${subtotal.toFixed(2)}`, 10, y + 12);
    doc.output('dataurlnewwindow');
  };

  return (
    <div className="pt-4 pb-4 px-4 md:px-12">
      <button onClick={() => navigate('/')} className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Volver al inicio</button>
      <ClientSelector clientes={clientes} clienteSeleccionado={clienteSeleccionado} onSelect={setClienteSeleccionado} onCreateNew={() => setShowNewClient(true)} />
      <NewClientModal isOpen={showNewClient} onClose={() => setShowNewClient(false)} onClientAdded={c => setClienteSeleccionado(c)} />
      <QuickEntryBar busqueda={busqueda} onChangeBusqueda={e => setBusqueda(e.target.value)} onQuickSaleClick={() => setShowQuickSale(true)} />
      <QuickSaleModal isOpen={showQuickSale} onClose={() => setShowQuickSale(false)} onAdd={onAddToCart} />
      <FilterTabs filtro={filtro} setFiltro={setFiltro} />
      <ProductGrid productos={productosFiltrados} onAddToCart={onAddToCart} showStock />
      <div className={`fixed bottom-0 left-0 right-0 p-3 text-center rounded-t-lg transition-colors duration-200 ${totalItems===0?'bg-gray-200 text-gray-500 cursor-not-allowed':processing?'bg-yellow-500 text-white cursor-default':'bg-green-600 text-white cursor-pointer'}`} onClick={openSaleModal}>
        {processing ? 'Procesando…' : `${totalItems} item${totalItems !== 1 ? 's' : ''} = $${subtotal.toFixed(2)}`}
      </div>
      <ModalCheckout
        isOpen={showSaleModal}
        onClose={() => setShowSaleModal(false)}
        title="Detalle de venta"
        footer={<><button onClick={() => setShowSaleModal(false)} className="px-4 py-2 bg-gray-200 rounded">Cancelar</button><button onClick={handleFinalize} disabled={!paymentType || processing} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Confirmar</button></>}
      >
        <ul className="mb-4 text-sm space-y-2">
          {productosVenta.map((p, i) => (
            <li key={i} className="flex justify-between">
              <span className="truncate w-2/3">{p.nombre}</span>
              <span>x{p.cantidad}</span>
              <span>${p.total.toFixed(2)}</span>
            </li>
          ))}
        </ul>
        <div className="mb-4 space-y-1 text-sm">
          <div className="flex justify-between"><span>Subtotal:</span><span>${originalSubtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span>Descuento:</span><span>-${discountAmount.toFixed(2)}</span></div>
          <div className="flex justify-between font-semibold"><span>Total:</span><span>${subtotal.toFixed(2)}</span></div>
        </div>
        <div className="mb-4"><label className="block mb-1 text-sm">Forma de pago</label><select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="w-full border p-2 rounded"><option value="">Seleccione…</option><option value="Efectivo">Efectivo</option><option value="Transferencia">Transferencia</option><option value="Tarjeta">Tarjeta</option><option value="Crédito">Crédito cliente</option></select></div>
        <div className="mb-4"><label className="block mb-1 text-sm">Tipo de descuento</label><div className="flex space-x-2"><select value={discountType} onChange={e => setDiscountType(e.target.value)} className="flex-1 border p-2 rounded"><option>Sin descuento</option><option>Por importe</option><option>Por porcentaje</option></select>{(discountType==='Por importe'||discountType==='Por porcentaje')&&(<input type="number" value={discountValue} onChange={e=>setDiscountValue(Number(e.target.value))} className="w-24 border p-2 rounded" placeholder="Valor"/>)}</div></div>
      </ModalCheckout>
    </div>
  );
}
