// src/pages/Checkout.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import QuickEntryBar from '../components/QuickEntryBar';
import FilterTabs from '../components/FilterTabs';
import ProductGrid from '../components/ProductGrid';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

export default function Checkout() {
  const navigate = useNavigate();
  // Estados principales
  const [clientes, setClientes] = useState([]);
  const [productos, setProductos] = useState([]);
  const [filtro, setFiltro] = useState('All');
  const [busqueda, setBusqueda] = useState('');
  const [productosVenta, setProductosVenta] = useState([]);
  const [ventaExitosa, setVentaExitosa] = useState(false);
  const [codigoVenta, setCodigoVenta] = useState('');

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

  // Filtrado y búsqueda
  const productosFiltrados = productos.filter(p =>
    (filtro === 'All' || p.categoria === filtro) &&
    p.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  // Handlers rápidos
  function handleScanClick() {
    console.log('Escanear producto');
  }
  function handleQuickSaleClick() {
    console.log('Venta rápida');
  }
  function onChangeBusqueda(e) {
    setBusqueda(e.target.value);
  }

  // Agregar al carrito
  function onAddToCart(producto) {
    const existe = productosVenta.find(p => p.id === producto.id);
    if (existe) {
      setProductosVenta(productosVenta.map(p =>
        p.id === producto.id
          ? { ...p, cantidad: p.cantidad + 1, total: (p.cantidad + 1) * p.promocion }
          : p
      ));
    } else {
      setProductosVenta([...productosVenta, { ...producto, cantidad: 1, total: producto.promocion }]);
    }
  }

  // Finalizar venta sin footer fijo
  async function finalizarVenta() {
    if (productosVenta.length === 0) return;
    const { data } = await supabase.from('ventas').select('codigo_venta');
    const num = (data?.length || 0) + 1;
    const codigo = `VT${String(num).padStart(5, '0')}`;
    setCodigoVenta(codigo);

    // Guardar datos en bd...
    // Generar PDF si es necesario
  }

  return (
    <div className="pt-4 pb-20">
      <button onClick={() => navigate('/')} className="mb-4 ml-4 px-4 py-2 bg-gray-200 rounded">Volver</button>
      <QuickEntryBar busqueda={busqueda} onChangeBusqueda={onChangeBusqueda} onScanClick={handleScanClick} onQuickSaleClick={handleQuickSaleClick} />
      <FilterTabs filtro={filtro} setFiltro={setFiltro} />
      <ProductGrid productos={productosFiltrados} onAddToCart={onAddToCart} />
      {/* Se ha eliminado CartSummaryFooter para quitar la barra verde fija */}
    </div>
  );
}