// src/pages/Checkout.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import { useNavigate } from 'react-router-dom';
import QuickEntryBar from '../components/QuickEntryBar';
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

  // Carga inicial de clientes y productos
  useEffect(() => {
    async function loadData() {
      const { data: cli } = await supabase.from('clientes').select('*');
      const { data: prod } = await supabase.from('productos').select('*');
      setClientes(cli || []);
      setProductos(prod || []);
    }
    loadData();
  }, []);

  // Productos filtrados por pestaña y búsqueda
  const productosFiltrados = productos.filter(p =>
    (filtro === 'All' || p.categoria === filtro) &&
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Handlers de entrada rápida
  function handleScanClick() {
    // TODO: implementar escáner de código de barras
    console.log('Escanear código de barras');
  }
  function handleQuickSaleClick() {
    // TODO: implementar modal de venta rápida
    console.log('Venta rápida');
  }
  function onChangeBusqueda(e) {
    setBusqueda(e.target.value);
  }

  // Añadir producto al carrito
  function onAddToCart(producto) {
    const existe = productosVenta.find(p => p.id === producto.id);
    if (existe) {
      setProductosVenta(productosVenta.map(p =>
        p.id === producto.id
          ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * p.promocion }
          : p
      ));
    } else {
      setProductosVenta([
        ...productosVenta,
        { ...producto, cantidad: 1, total: producto.promocion }
      ]);
    }
  }

  // Finalizar venta (guardado en BD)
  async function finalizarVenta() {
    if (productosVenta.length === 0) return;

    // Generar código de venta
    const { data } = await supabase.from('ventas').select('codigo_venta');
    const num = (data?.length || 0) + 1;
    const codigo = `VT${String(num).padStart(5, '0')}`;

    // Subtotal y guardado de cabecera
    const subtotal = productosVenta.reduce((s, p) => s + p.total, 0);
    const { data: v, error: e1 } = await supabase
      .from('ventas')
      .insert([{ codigo_venta: codigo, subtotal }])
      .select()
      .single();
    if (e1) {
      console.error(e1);
      return;
    }
    const venta_id = v.id;

    // Detalle de venta y mov. inventario
    for (const p of productosVenta) {
      await supabase.from('detalle_venta').insert([{
        venta_id,
        producto_id: p.id,
        cantidad: p.cantidad,
        precio_unitario: p.promocion,
        total_parcial: p.total
      }]);
      await supabase.from('productos')
        .update({ stock: p.stock - p.cantidad })
        .eq('id', p.id);
      await supabase.from('movimientos_inventario').insert([{
        producto_id: p.id,
        tipo: 'SALIDA',
        cantidad: p.cantidad,
        referencia: codigo
      }]);
    }

    // Reiniciar carrito y navegar si lo deseas
    setProductosVenta([]);
    alert(`Venta ${codigo} registrada correctamente.`);
  }

  return (
    <div className="pt-4 pb-4 px-2 md:px-6 lg:px-12">
      <button
        onClick={() => navigate('/')}
        className="mb-4 px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
      >
        Volver al inicio
      </button>

      {/* Entrada rápida */}
      <QuickEntryBar
        busqueda={busqueda}
        onChangeBusqueda={onChangeBusqueda}
        onScanClick={handleScanClick}
        onQuickSaleClick={handleQuickSaleClick}
      />

      {/* Pestañas de categoría */}
      <FilterTabs filtro={filtro} setFiltro={setFiltro} />

      {/* Grid de productos */}
      <ProductGrid
        productos={productosFiltrados}
        onAddToCart={onAddToCart}
      />

      {/* Botón fija de finalizar venta */}
      <div className="fixed bottom-4 right-4">
        <button
          onClick={finalizarVenta}
          className="bg-blue-600 text-white px-5 py-3 rounded-full shadow-lg hover:bg-blue-700"
        >
          Finalizar venta ({productosVenta.length})
        </button>
      </div>
    </div>
  );
}
