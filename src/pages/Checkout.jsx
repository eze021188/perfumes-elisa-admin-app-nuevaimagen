// src/pages/Checkout.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
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

  // Estados de modales
  const [showQuickSale, setShowQuickSale] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null);

  // Carga inicial
  useEffect(() => {
    async function loadData() {
      const { data: cli } = await supabase.from('clientes').select('*');
      const { data: prod } = await supabase.from('productos').select('*');
      setClientes(cli || []);
      setProductos(prod || []);
    }
    loadData();
  }, []);

  // Filtrado
  const productosFiltrados = productos.filter(p =>
    (filtro === 'All' || p.categoria === filtro) &&
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Handlers
  const handleQuickSaleClick = () => setShowQuickSale(true);
  const handleAddQuickSale = item => onAddToCart(item);
  const onChangeBusqueda = e => setBusqueda(e.target.value);
  const handleSelectClient = c => setClienteSeleccionado(c);
  const handleCreateClient = () => setShowNewClient(true);
  const handleClientAdded = c => {
    setClientes([...clientes, c]);
    setClienteSeleccionado(c);
  };

  // Carrito
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

  // Finalizar
  const finalizarVenta = async () => {
    if (!clienteSeleccionado || productosVenta.length === 0) return;
    const { data } = await supabase.from('ventas').select('codigo_venta');
    const num = (data?.length || 0) + 1;
    const codigo = `VT${String(num).padStart(5, '0')}`;
    const subtotal = productosVenta.reduce((s, p) => s + p.total, 0);
    const { data: v, error: e1 } = await supabase
      .from('ventas')
      .insert([{ codigo_venta: codigo, cliente_id: clienteSeleccionado.id, subtotal }])
      .select()
      .single();
    if (e1) return console.error(e1);
    const venta_id = v.id;
    for (const p of productosVenta) {
      await supabase.from('detalle_venta').insert([{
        venta_id,
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.promocion,
        total_parcial: p.total
      }]);
      await supabase.from('productos').update({ stock: p.stock - p.cantidad }).eq('id', p.id);
      await supabase.from('movimientos_inventario').insert([{
        producto_id: p.id,
        tipo: 'SALIDA',
        cantidad: p.cantidad,
        referencia: codigo
      }]);
    }
    setProductosVenta([]);
    alert(`Venta ${codigo} registrada.`);
  };

  return (
    <div className="pt-4 pb-4 px-4 md:px-12">
      <button
        onClick={() => navigate('/')}
        className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Volver al inicio
      </button>

      {/* Selector de cliente */}
      <ClientSelector
        clientes={clientes}
        clienteSeleccionado={clienteSeleccionado}
        onSelect={handleSelectClient}
        onCreateNew={handleCreateClient}
      />
      <NewClientModal
        isOpen={showNewClient}
        onClose={() => setShowNewClient(false)}
        onClientAdded={handleClientAdded}
      />

      {/* Quick Entry */}
      <QuickEntryBar
        busqueda={busqueda}
        onChangeBusqueda={onChangeBusqueda}
        onQuickSaleClick={handleQuickSaleClick}
      />
      <QuickSaleModal
        isOpen={showQuickSale}
        onClose={() => setShowQuickSale(false)}
        onAdd={handleAddQuickSale}
      />

      {/* Filtrado y grid */}
      <FilterTabs filtro={filtro} setFiltro={setFiltro} />
      <ProductGrid productos={productosFiltrados} onAddToCart={onAddToCart} />

      {/* Banner fijo al pie con resumen */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-300 text-gray-800 p-3 text-center">
        {productosVenta.length} item{productosVenta.length !== 1 ? 's' : ''} = ${productosVenta.reduce((s, p) => s + p.total, 0).toFixed(2)}
      </div>
    </div>
  );
}
