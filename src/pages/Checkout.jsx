// src/pages/Checkout.jsx
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

export default function Checkout() {
  const navigate = useNavigate();

  // Estados principales
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [filtro, setFiltro] = useState('All');
  const [busqueda, setBusqueda] = useState('');
  const [productosVenta, setProductosVenta] = useState([]);

  // Estado de selección de cliente y procesamiento
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);
  const [processing, setProcessing] = useState(false);

  // Estados de modales
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);

  // Carga inicial de datos
  useEffect(() => {
    async function loadData() {
      const { data: cli } = await supabase.from('clientes').select('*');
      const { data: prod } = await supabase.from('productos').select('*');
      setClientes(cli || []);
      setProductos(prod || []);
    }
    loadData();
  }, []);

  // Filtrado de productos
  const productosFiltrados = productos.filter(p =>
    (filtro === 'All' || p.categoria === filtro) &&
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Cálculos de resumen
  const totalItems = productosVenta.reduce((sum, p) => sum + p.cantidad, 0);
  const subtotal   = productosVenta.reduce((sum, p) => sum + p.total, 0);

  // Handlers varios
  const onChangeBusqueda    = e => setBusqueda(e.target.value);
  const handleQuickSaleClick = () => setShowQuickSale(true);
  const handleAddQuickSale   = item => onAddToCart(item);
  const handleSelectClient   = c => setClienteSeleccionado(c);
  const handleCreateClient   = () => setShowNewClient(true);
  const handleClientAdded    = c => {
    setClientes(prev => [...prev, c]);
    setClienteSeleccionado(c);
  };

  // Añadir al carrito (incrementa cantidad si ya existe o muestra error si se supera stock)
  const onAddToCart = producto => {
    setProductosVenta(prev => {
      const existe = prev.find(p => p.id === producto.id);
      const cantidadActual = existe ? existe.cantidad : 0;
      if (cantidadActual + 1 > producto.stock) {
        toast.error('Stock insuficiente');
        return prev;
      }
      if (existe) {
        return prev.map(p =>
          p.id === producto.id
            ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * p.promocion }
            : p
        );
      }
      return [...prev, { ...producto, cantidad: 1, total: producto.promocion }];
    });
  };

  // Generar PDF del ticket
  function generarPDF(codigo) {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(`Ticket de venta - ${codigo}`, 10, 12);
    doc.setFontSize(12);
    if (clienteSeleccionado) doc.text(`Cliente: ${clienteSeleccionado.nombre}`, 10, 22);
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 10, 30);

    const rows = productosVenta.map(p => [
      p.nombre,
      p.cantidad.toString(),
      `$${p.promocion.toFixed(2)}`,
      `$${p.total.toFixed(2)}`
    ]);
    doc.autoTable({ startY: 40, head: [['Producto', 'Cant.', 'P.U.', 'Total']], body: rows });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Subtotal: $${subtotal.toFixed(2)}`, 10, finalY);
    doc.text(`Total:    $${subtotal.toFixed(2)}`, 10, finalY + 8);

    doc.output('dataurlnewwindow');
  }

  // Finalizar venta y actualizar base de datos
  const finalizarVenta = async () => {
    if (!clienteSeleccionado || productosVenta.length === 0) return;
    setProcessing(true);
    try {
      const { data } = await supabase.from('ventas').select('codigo_venta');
      const num    = (data?.length || 0) + 1;
      const codigo = `VT${String(num).padStart(5, '0')}`;

      const { data: venta, error: errCab } = await supabase
        .from('ventas')
        .insert([{ codigo_venta: codigo, cliente_id: clienteSeleccionado.id, subtotal }])
        .select()
        .single();
      if (errCab) throw errCab;

      for (const p of productosVenta) {
        await supabase.from('detalle_venta').insert([{ venta_id: venta.id, producto_id: p.id, cantidad: p.cantidad, precio_unitario: p.promocion, total_parcial: p.total }]);
        await supabase.from('productos').update({ stock: p.stock - p.cantidad }).eq('id', p.id);
        await supabase.from('movimientos_inventario').insert([{ producto_id: p.id, tipo: 'SALIDA', cantidad: p.cantidad, referencia: codigo }]);
      }

      setProductosVenta([]);
      generarPDF(codigo);
    } catch (err) {
      console.error(err);
      toast.error('Error al procesar la venta. Intenta de nuevo.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="pt-4 pb-4 px-4 md:px-12">
      <button onClick={() => navigate('/')} className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
        Volver al inicio
      </button>

      {/* Selector de cliente */}
      <ClientSelector
        clientes={clientes}
        clienteSeleccionado={clienteSeleccionado}
        onSelect={handleSelectClient}
        onCreateNew={handleCreateClient}
      />
      <NewClientModal isOpen={showNewClient} onClose={() => setShowNewClient(false)} onClientAdded={handleClientAdded} />

      {/* Quick Entry */}
      <QuickEntryBar busqueda={busqueda} onChangeBusqueda={onChangeBusqueda} onQuickSaleClick={handleQuickSaleClick} />
      <QuickSaleModal isOpen={showQuickSale} onClose={() => setShowQuickSale(false)} onAdd={handleAddQuickSale} />

      {/* Filtrado y grid */}
      <FilterTabs filtro={filtro} setFiltro={setFiltro} />
      <ProductGrid productos={productosFiltrados} onAddToCart={onAddToCart} showStock />

      {/* Banner fijo al pie con resumen y acción */}
      <div
        className={`fixed bottom-0 left-0 right-0 p-3 text-center rounded-t-lg transition-colors duration-200 ${
          totalItems === 0
            ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
            : 'bg-green-600 text-white cursor-pointer'
        }`}
        onClick={() => {
          if (totalItems > 0 && !processing) finalizarVenta();
        }}
      >
        {processing
          ? 'Procesando...'
          : `${totalItems} item${totalItems !== 1 ? 's' : ''} = $${subtotal.toFixed(2)}`
        }
      </div>
    </div>
  );
}