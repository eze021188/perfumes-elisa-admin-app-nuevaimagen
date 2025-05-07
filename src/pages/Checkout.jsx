// src/pages/Checkout.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import QuickEntryBar from '../components/QuickEntryBar';
import QuickSaleModal from '../components/QuickSaleModal';
import ClientSelector from '../components/ClientSelector';
import NewClientModal from '../components/NewClientModal';
import { UserPlus } from 'lucide-react';
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
  const [formaPago, setFormaPago] = useState('Efectivo');

  // Estados de modales
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Carga inicial clientes y productos
  useEffect(() => {
    async function loadData() {
      const { data: cli } = await supabase.from('clientes').select('*');
      const { data: prod } = await supabase.from('productos').select('*');
      setClientes(cli || []);
      setProductos(prod || []);
    }
    loadData();
  }, []);

  // Filtrado por categoría y búsqueda
  const productosFiltrados = productos.filter(p =>
    (filtro === 'All' || p.categoria === filtro) &&
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Handlers de QuickEntry
  const handleQuickSaleClick = () => setShowQuickSale(true);
  const handleAddQuickSale = item => onAddToCart(item);
  const onChangeBusqueda = e => setBusqueda(e.target.value);

  // Handlers de cliente
  const handleSelectClient = c => setClienteSeleccionado(c);
  const handleCreateClient = () => setShowNewClient(true);
  const handleClientAdded = c => {
    setClientes([...clientes, c]);
    setClienteSeleccionado(c);
  };

  // Añadir producto al carrito
  const onAddToCart = producto => {
    const existe = productosVenta.find(p => p.id === producto.id);
    if (existe) {
      setProductosVenta(
        productosVenta.map(p =>
          p.id === producto.id
            ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * p.promocion }
            : p
        )
      );
    } else {
      setProductosVenta([...productosVenta, { ...producto, cantidad: 1, total: producto.promocion }]);
    }
  };

  // Finalizar venta (BD + alert)
  const finalizarVenta = async () => {
    if (!clienteSeleccionado || productosVenta.length === 0) return;

    // Generar código
    const { data } = await supabase.from('ventas').select('codigo_venta');
    const num = (data?.length || 0) + 1;
    const codigo = `VT${String(num).padStart(5, '0')}`;

    const subtotal = productosVenta.reduce((s, p) => s + p.total, 0);
    const { data: v, error: e1 } = await supabase
      .from('ventas')
      .insert([{ codigo_venta: codigo, cliente_id: clienteSeleccionado.id, subtotal }])
      .select()
      .single();
    if (e1) { console.error(e1); return; }
    const venta_id = v.id;

    for (const p of productosVenta) {
      await supabase.from('detalle_venta').insert([{ venta_id, producto_id: p.id, cantidad: p.cantidad, precio_unitario: p.promocion, total_parcial: p.total }]);
      await supabase.from('productos').update({ stock: p.stock - p.cantidad }).eq('id', p.id);
      await supabase.from('movimientos_inventario').insert([{ producto_id: p.id, tipo: 'SALIDA', cantidad: p.cantidad, referencia: codigo }]);
    }

    setProductosVenta([]);
    alert(`Venta ${codigo} registrada con éxito.`);
  };

  return (
    <div className="pt-4 pb-4 px-4 md:px-12">
      <button onClick={() => navigate('/')} className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
        Volver al inicio
      </button>

      {/* Selector de cliente */}
      <div id="client-selector">
        <ClientSelector
          clientes={clientes}
          clienteSeleccionado={clienteSeleccionado}
          onSelect={handleSelectClient}
          onCreateNew={handleCreateClient}
        />
      </div>

      {/* Modal de nuevo cliente */}
      <NewClientModal
        isOpen={showNewClient}
        onClose={() => setShowNewClient(false)}
        onClientAdded={handleClientAdded}
      />

      {/* Quick Entry & Modal */}
      <QuickEntryBar busqueda={busqueda} onChangeBusqueda={onChangeBusqueda} onQuickSaleClick={handleQuickSaleClick} />
      <QuickSaleModal isOpen={showQuickSale} onClose={() => setShowQuickSale(false)} onAdd={handleAddQuickSale} />

      {/* Filtrado y grid */}
      <FilterTabs filtro={filtro} setFiltro={setFiltro} />
      <ProductGrid
        productos={productosFiltrados}
        onAddToCart={onAddToCart}
      />

      {/* Resumen y selección de cliente */}
      <div className="mt-4">
        <button
          onClick={() => {
            const el = document.getElementById('client-selector');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
          }}
          disabled={productosVenta.length === 0}
          className="w-full py-3 bg-blue-600 text-white rounded flex justify-center items-center space-x-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <span className="font-semibold">
            {productosVenta.length} item{productosVenta.length !== 1 ? 's' : ''} = ${productosVenta.reduce((s, p) => s + p.total, 0).toFixed(2)}
          </span>
          <UserPlus className="w-5 h-5" />
        </button>
      </div>

      {/* Resumen de venta y selector de forma de pago */}
      <div className="mt-4 p-4 bg-gray-100 rounded">
        <p className="font-semibold">
          {productosVenta.length} items = ${productosVenta
            .reduce((s, p) => s + p.total, 0)
            .toFixed(2)}
        </p>
        <button
          disabled={productosVenta.length === 0}
          className="mt-2 px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          No item
        </button>
        <div className="mt-2">
          <label className="font-medium block mb-1">Forma de pago</label>
          <select
            className="border p-2 rounded w-full"
            value={formaPago}
            onChange={e => setFormaPago(e.target.value)}
          >
            <option>Efectivo</option>
            <option>Tarjeta</option>
            <option>Transferencia</option>
            <option>Crédito</option>
          </select>
        </div>
      </div>

      {/* Botón finalizar */}
      <div className="fixed bottom-4 right-4">
        <button onClick={finalizarVenta} className="bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-blue-700">
          Finalizar venta ({productosVenta.length})
        </button>
      </div>
    </div>
  );
}
