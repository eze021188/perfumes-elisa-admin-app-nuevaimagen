// src/pages/Home.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
// Si usas una librería de gráficos (ej: react-chartjs-2)
// import { Line } from 'react-chartjs-2';
// import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
// ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);


// Helper simple para formatear moneda (si no usas una global)
const formatCurrency = (amount) => {
    return parseFloat(amount).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD', // Ajusta según tu moneda
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

export default function Home() {
  // --- Estados para las métricas ---
  const [kpis, setKpis] = useState({
      total_orders: 0,
      total_sales: 0,
      new_clients_count: 0,
      new_clients_sales: 0,
      accounts_receivable: 0,
      overdue_balances: 0, // Placeholder
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);

  // --- Estados para los gráficos ---
  const [monthlySalesData, setMonthlySalesData] = useState([]);
  const [salesByPaymentMethodData, setSalesByPaymentMethodData] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);


  // --- Estados para las listas Top ---
  const [topProducts, setTopProducts] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [topVendors, setTopVendors] = useState([]); // O Top Sellers
  const [lowStockProducts, setLowStockProducts] = useState([]); // Productos con bajo stock
  const [loadingLists, setLoadingLists] = useState(true);

  // --- Estado para errores ---
  const [error, setError] = useState(null);

  // --- Estado para el rango de fechas ---
  // Puedes implementar selectores de fecha más complejos
  const [startDate, setStartDate] = useState('2024-01-01'); // Ejemplo: Inicio del año actual
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]); // Hoy

  // Efecto para cargar todos los datos del dashboard al montar o cambiar fechas
  useEffect(() => {
    // Llama a las funciones para obtener cada conjunto de datos
    fetchKpiMetrics(startDate, endDate);
    fetchSalesChartsData(startDate, endDate);
    fetchTopLists(startDate, endDate);
    fetchInventoryData(); // Inventario no suele depender del rango de ventas

  }, [startDate, endDate]); // Dependencias: recargar si cambian las fechas

  // --- Función para obtener Métricas Principales (KPIs) ---
  const fetchKpiMetrics = async (start, end) => {
      setLoadingMetrics(true);
      try {
          // Llama a la RPC get_kpi_metrics
          const { data, error } = await supabase.rpc('get_kpi_metrics', { start_date: start, end_date: end }).single(); // single() si la RPC retorna 1 fila

          if (error) throw error;
          setKpis(data); // Asume que la RPC retorna un objeto con las columnas esperadas

      } catch (err) {
          console.error('Error fetching KPI metrics:', err.message);
          setError('Error al cargar métricas clave.');
          toast.error('Error al cargar métricas.');
      } finally {
          setLoadingMetrics(false);
      }
  };

   // --- Función para obtener datos de Gráficos de Ventas ---
  const fetchSalesChartsData = async (start, end) => {
      setLoadingCharts(true);
      try {
          // Llama a la RPC get_monthly_sales_trend
          const { data: monthlyData, error: monthlyError } = await supabase.rpc('get_monthly_sales_trend', { start_date: start, end_date: end });
          if (monthlyError) throw monthlyError;
          setMonthlySalesData(monthlyData); // [{ sale_month: 'YYYY-MM-DD', monthly_sales: N }]

          // Llama a la RPC get_sales_by_payment_method
          const { data: paymentMethodData, error: paymentMethodError } = await supabase.rpc('get_sales_by_payment_method', { start_date: start, end_date: end });
           if (paymentMethodError) throw paymentMethodError;
           setSalesByPaymentMethodData(paymentMethodData); // [{ payment_method: '...', method_sales: N }]

      } catch (err) {
          console.error('Error fetching sales chart data:', err.message);
          setError('Error al cargar datos de gráficos.');
          toast.error('Error al cargar gráficos.');
      } finally {
          setLoadingCharts(false);
      }
  };


  // --- Función para obtener Listas Top ---
   const fetchTopLists = async (start, end) => {
       setLoadingLists(true);
       try {
           // Llama a la RPC get_top_products_by_sales (ejemplo: top 10)
           const { data: topProductsData, error: topProductsError } = await supabase.rpc('get_top_products_by_sales', { limit_count: 10, start_date: start, end_date: end });
           if (topProductsError) throw topProductsError;
           setTopProducts(topProductsData); // [{ product_id: '...', product_name: '...', total_sales: N }]

           // Llama a la RPC get_top_clients_by_sales (ejemplo: top 10)
           const { data: topClientsData, error: topClientsError } = await supabase.rpc('get_top_clients_by_sales', { limit_count: 10, start_date: start, end_date: end });
           if (topClientsError) throw topClientsError;
           setTopClients(topClientsData); // [{ client_id: '...', client_name: '...', total_purchases: N }]

           // Llama a la RPC get_top_sellers_by_sales (ejemplo: top 5) - Requiere vendedor_id en ventas
            // Si no tienes vendedores, puedes omitir esta sección o adaptarla
           const { data: topSellersData, error: topSellersError } = await supabase.rpc('get_top_sellers_by_sales', { limit_count: 5, start_date: start, end_date: end });
           if (topSellersError) console.warn('Error fetching top sellers (check vendedor_id and RPC):', topSellersError.message); // Warning si no existe la tabla/col
            setTopVendors(topSellersData || []); // Usar [] si falla o no aplica

       } catch (err) {
           console.error('Error fetching top lists:', err.message);
           setError('Error al cargar listas top.');
           toast.error('Error al cargar listas top.');
       } finally {
           setLoadingLists(false);
       }
   };

    // --- Función para obtener datos de Inventario (no depende del rango de ventas) ---
    const fetchInventoryData = async () => {
        // Podrías tener un estado de carga/error separado para inventario si se carga en otro momento
        try {
            // Llama a la RPC get_low_stock_products (ejemplo: umbral 10)
            const { data: lowStockData, error: lowStockError } = await supabase.rpc('get_low_stock_products', { stock_threshold: 10 });
            if (lowStockError) throw lowStockError;
            setLowStockProducts(lowStockData); // [{ product_id: '...', product_name: '...', current_stock: N }]

            // Podrías añadir aquí la consulta para el Valor del Inventario Total si creas la RPC/View correspondiente

        } catch (err) {
            console.error('Error fetching inventory data:', err.message);
             // Decide si esto es un error crítico o solo un warning para el usuario
             toast.error('Error al cargar datos de inventario.');
        }
    };


  // --- Renderizado (JSX) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado del Dashboard */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        {/* Selector de Rango de Fechas (Implementar aquí) */}
         <div className="flex items-center gap-2">
             {/* Puedes usar componentes de date picker más amigables */}
             <label className="text-gray-600">Rango:</label>
             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded text-sm" />
             <span>-</span>
             <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded text-sm" />
         </div>
      </div>

      {/* Indicadores del Período (Métricas Principales) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loadingMetrics ? (
              <p className="col-span-full text-center text-gray-600">Cargando métricas...</p>
          ) : error ? (
              <p className="col-span-full text-center text-red-500">{error}</p>
          ) : (
              <>
                {/* Tarjeta Total Pedidos */}
                <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pedidos en total</p>
                        <p className="text-2xl font-bold text-blue-600">{kpis.total_orders}</p>
                    </div>
                    <div className="text-blue-400 text-4xl opacity-70">🛒</div>
                </div>

                 {/* Tarjeta Total Ventas */}
                 <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total ventas</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(kpis.total_sales)}</p>
                    </div>
                    <div className="text-green-400 text-4xl opacity-70">💰</div>
                </div>

                 {/* Tarjeta Clientes Nuevos */}
                 <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Clientes nuevos</p>
                        <p className="text-2xl font-bold text-cyan-600">{kpis.new_clients_count}</p>
                    </div>
                     <div className="text-cyan-400 text-4xl opacity-70">👤+</div>
                </div>

                 {/* Tarjeta Ventas Clientes Nuevos */}
                  <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                     <div>
                         <p className="text-sm font-medium text-gray-500">Ventas clientes nuevos</p>
                         <p className="text-2xl font-bold text-cyan-600">{formatCurrency(kpis.new_clients_sales)}</p>
                     </div>
                      <div className="text-cyan-400 text-4xl opacity-70">💸</div>
                 </div>


                 {/* Tarjeta Cuentas por cobrar */}
                 <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Cuentas por cobrar</p>
                        {/* Usamos color rojo para deuda */}
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(kpis.accounts_receivable)}</p>
                    </div>
                     <div className="text-red-400 text-4xl opacity-70">🏦</div>
                </div>

                 {/* Tarjeta Saldos Vencidos (Placeholder - Requiere BD) */}
                 <div className="bg-white rounded-lg shadow p-4 flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Saldos vencidos</p>
                        {/* Mostrar en rojo o naranja si hay saldo vencido */}
                        <p className="text-2xl font-bold text-orange-600">{formatCurrency(kpis.overdue_balances)}</p>
                    </div>
                    <div className="text-orange-400 text-4xl opacity-70">🚨</div>
                </div>

                {/* Faltarían tarjetas para: Pedidos promedio x día, Venta promedio x día */}

              </>
          )}
      </div>

      {/* Gráficos de Ventas */}
       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
           {loadingCharts ? (
               <p className="col-span-full text-center text-gray-600">Cargando gráficos...</p>
           ) : error ? (
               <p className="col-span-full text-center text-red-500">{error}</p>
           ) : (
               <>
                   {/* Gráfico Tendencia de Ventas Mensuales */}
                   <div className="bg-white rounded-lg shadow p-4">
                       <h3 className="text-lg font-semibold mb-3 text-gray-700">Tendencia de Ventas Mensuales</h3>
                        {/* Placeholder para el gráfico */}
                       {monthlySalesData.length > 0 ? (
                           <div className="h-64 w-full">
                               {/*
                                  <Line
                                      data={{
                                          labels: monthlySalesData.map(item => new Date(item.sale_month).toLocaleDateString('es', { month: 'short', year: 'numeric' })),
                                          datasets: [{
                                              label: 'Ventas Mensuales',
                                              data: monthlySalesData.map(item => item.monthly_sales),
                                              borderColor: 'rgb(75, 192, 192)',
                                              tension: 0.1,
                                          }],
                                      }}
                                      options={{ responsive: true, maintainAspectRatio: false }}
                                  />
                               */}
                               <div className="flex items-center justify-center h-full border rounded text-gray-500">
                                   Placeholder Gráfico de Líneas
                               </div>
                           </div>
                       ) : (
                            <p className="text-center text-gray-500">No hay datos de ventas mensuales para el período.</p>
                       )}
                   </div>

                    {/* Gráfico Ventas por Forma de Pago */}
                    <div className="bg-white rounded-lg shadow p-4">
                       <h3 className="text-lg font-semibold mb-3 text-gray-700">Ventas por Forma de Pago</h3>
                        {/* Placeholder para el gráfico */}
                        {salesByPaymentMethodData.length > 0 ? (
                           <div className="h-64 w-full">
                              {/* Necesitarías una librería como Chart.js y adaptar los datos para un gráfico de pastel */}
                                <div className="flex items-center justify-center h-full border rounded text-gray-500">
                                    Placeholder Gráfico de Pastel
                                </div>
                           </div>
                        ) : (
                            <p className="text-center text-gray-500">No hay datos de ventas por forma de pago para el período.</p>
                        )}
                   </div>
               </>
           )}
       </div>


      {/* Secciones de Listas Top */}
       <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
           {loadingLists ? (
               <p className="col-span-full text-center text-gray-600">Cargando listas top...</p>
           ) : error ? (
               <p className="col-span-full text-center text-red-500">{error}</p>
           ) : (
               <>
                   {/* Top Productos por Ventas */}
                   <div className="bg-white rounded-lg shadow p-4">
                       <h3 className="text-lg font-semibold mb-3 text-gray-700">Top productos por Ventas</h3>
                       <ul>
                           {topProducts.map((p, index) => (
                               <li key={p.product_id || index} className="flex justify-between items-center py-2 border-b last:border-b-0 text-sm">
                                   <span className="text-gray-800">{p.product_name}</span>
                                   <span className="font-medium text-gray-600">{formatCurrency(p.total_sales)}</span>
                               </li>
                           ))}
                           {topProducts.length === 0 && <li className="text-sm text-gray-500">No hay datos de productos top para el período.</li>}
                       </ul>
                   </div>

                   {/* Top Clientes por Compras */}
                    <div className="bg-white rounded-lg shadow p-4">
                       <h3 className="text-lg font-semibold mb-3 text-gray-700">Top Clientes por Compras</h3>
                       <ul>
                           {topClients.map((c, index) => (
                               <li key={c.client_id || index} className="flex justify-between items-center py-2 border-b last:border-b-0 text-sm">
                                   <span className="text-gray-800">{c.client_name}</span>
                                   <span className="font-medium text-gray-600">{formatCurrency(c.total_purchases)}</span>
                               </li>
                           ))}
                            {topClients.length === 0 && <li className="text-sm text-gray-500">No hay datos de clientes top para el período.</li>}
                       </ul>
                   </div>

                   {/* Top Vendedores por Ventas (Requiere vendedor_id en ventas) */}
                    <div className="bg-white rounded-lg shadow p-4">
                       <h3 className="text-lg font-semibold mb-3 text-gray-700">Top Vendedores por Ventas</h3>
                       {topVendors.length === 0 && !error && <p className="text-sm text-gray-500">No hay datos de vendedores top o la función no aplica.</p>}
                       {topVendors.length > 0 && (
                           <ul>
                               {topVendors.map((s, index) => (
                                   <li key={s.seller_id || index} className="flex justify-between items-center py-2 border-b last:border-b-0 text-sm">
                                       <span className="text-gray-800">{s.seller_name}</span>
                                       <span className="font-medium text-gray-600">{formatCurrency(s.total_sales)}</span>
                                   </li>
                               ))}
                           </ul>
                       )}
                   </div>

               </>
           )}
       </div>

       {/* Sección de Inventario / Alertas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-lg font-semibold mb-3 text-gray-700">Productos con Bajo Stock (Umbral 10)</h3>
                {lowStockProducts.length === 0 ? (
                    <p className="text-sm text-gray-500">No hay productos por debajo del umbral de stock.</p>
                ) : (
                    <ul>
                        {lowStockProducts.map((p, index) => (
                            <li key={p.product_id || index} className="flex justify-between items-center py-2 border-b last:border-b-0 text-sm text-orange-600 font-medium">
                               <span>{p.product_name}</span>
                               <span>Stock: {p.current_stock}</span>
                            </li>
                        ))}
                    </ul>
                )}
           </div>
            {/* Podrías añadir aquí la sección para Valor del Inventario Total si creas la RPC/View correspondiente */}
            {/* <div className="bg-white rounded-lg shadow p-4"> ... </div> */}
       </div>


       {/* Modales (Si los necesitas en Home) */}
       {/* <Modal... /> */}

    </div>
  );
}