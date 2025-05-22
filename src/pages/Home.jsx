// src/pages/Home.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Importar componentes divididos
import HomeDateRangePicker from '../components/home/HomeDateRangePicker';
import HomeKpiCard from '../components/home/HomeKpiCard';
import HomeChartContainer from '../components/home/HomeChartContainer';
import HomeTopListCard from '../components/home/HomeTopListCard';

// Registrar componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

// Helpers (podrían moverse a utils.js)
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return '$0.00';
    return numericAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const formatDateLabel = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    } catch (e) {
        return dateString;
    }
};

export default function Home() {
  const [kpis, setKpis] = useState({
      total_orders: 0, total_sales: 0, new_clients_count: 0, new_clients_sales: 0,
      accounts_receivable: 0, overdue_balances: 0, average_sale_value: 0, sales_per_day: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  const [monthlySalesData, setMonthlySalesData] = useState([]);
  const [salesByPaymentMethodData, setSalesByPaymentMethodData] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [chartsError, setChartsError] = useState(null);

  const [topProducts, setTopProducts] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [topVendors, setTopVendors] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [listsError, setListsError] = useState(null);
  const [inventoryError, setInventoryError] = useState(null); // Específico para bajo stock

  const [startDate, setStartDate] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchAllDashboardData = async () => {
        setLoadingMetrics(true); setLoadingCharts(true); setLoadingLists(true);
        setMetricsError(null); setChartsError(null); setListsError(null); setInventoryError(null);

        try {
            // KPIs
            const { data: kpiData, error: kpiErr } = await supabase.rpc('get_kpi_metrics', { start_date: startDate, end_date: endDate }).single();
            if (kpiErr) throw kpiErr;
            setKpis({
                total_orders: kpiData?.total_orders ?? 0,
                total_sales: kpiData?.total_sales ?? 0,
                new_clients_count: kpiData?.new_clients_count ?? 0,
                new_clients_sales: kpiData?.new_clients_sales ?? 0,
                accounts_receivable: kpiData?.accounts_receivable ?? 0,
                overdue_balances: kpiData?.overdue_balances ?? 0,
                average_sale_value: kpiData?.average_sale_value ?? 0,
                sales_per_day: kpiData?.sales_per_day ?? 0,
            });
        } catch (err) {
            console.error('Error fetching KPI metrics:', err.message);
            setMetricsError('Error al cargar métricas.');
        } finally {
            setLoadingMetrics(false);
        }

        try {
            // Charts Data
            const { data: monthlyData, error: monthlyErr } = await supabase.rpc('get_monthly_sales_trend', { start_date: startDate, end_date: endDate });
            if (monthlyErr) throw monthlyErr;
            setMonthlySalesData(monthlyData || []);

            const { data: paymentData, error: paymentErr } = await supabase.rpc('get_sales_by_payment_method', { start_date: startDate, end_date: endDate });
            if (paymentErr) throw paymentErr;
            setSalesByPaymentMethodData(paymentData || []);
        } catch (err) {
            console.error('Error fetching sales chart data:', err.message);
            setChartsError('Error al cargar datos de gráficos.');
        } finally {
            setLoadingCharts(false);
        }

        try {
            // Top Lists
            const { data: topProdData, error: topProdErr } = await supabase.rpc('get_top_products_by_sales', { limit_count: 5, start_date: startDate, end_date: endDate });
            if (topProdErr) throw topProdErr;
            setTopProducts((topProdData || []).map(p => ({ id: p.product_id, name: p.product_name, value: p.total_sales })));
            
            const { data: topCliData, error: topCliErr } = await supabase.rpc('get_top_clients_by_sales', { limit_count: 5, start_date: startDate, end_date: endDate });
            if (topCliErr) throw topCliErr;
            setTopClients((topCliData || []).map(c => ({ id: c.client_id, name: c.client_name, value: c.total_purchases })));

            const { data: topSellData, error: topSellErr } = await supabase.rpc('get_top_sellers_by_sales', { limit_count: 5, start_date: startDate, end_date: endDate });
            if (topSellErr) console.warn('Error fetching top sellers:', topSellErr.message);
            setTopVendors((topSellData || []).map(s => ({ id: s.seller_id, name: s.seller_name, value: s.total_sales })));
        } catch (err) {
            console.error('Error fetching top lists:', err.message);
            setListsError('Error al cargar listas top.');
        } finally {
            setLoadingLists(false);
        }
        
        try {
            // Low Stock (no depende de fechas)
            const { data: lowStockData, error: lowStockErr } = await supabase.rpc('get_low_stock_products', { stock_threshold: 10 });
            if (lowStockErr) throw lowStockErr;
            setLowStockProducts((lowStockData || []).map(p => ({ id: p.product_id, name: p.product_name, value: p.current_stock, valueLabel: "en stock" })));
        } catch (err) {
            console.error('Error fetching low stock products:', err.message);
            setInventoryError('Error al cargar productos con bajo stock.');
        }
    };
    fetchAllDashboardData();
  }, [startDate, endDate]);

  const monthlySalesChartData = useMemo(() => ({
      labels: monthlySalesData.map(item => formatDateLabel(item.sale_month)),
      datasets: [{
          label: 'Ventas Mensuales',
          data: monthlySalesData.map(item => item.monthly_sales),
          borderColor: 'rgb(75, 192, 192)', backgroundColor: 'rgba(75, 192, 192, 0.5)',
          tension: 0.3, fill: true, pointBackgroundColor: 'rgb(75, 192, 192)',
          pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: 'rgb(75, 192, 192)',
      }],
  }), [monthlySalesData]);

  const monthlySalesChartOptions = useMemo(() => ({
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top', labels: { font: { size: 12 }, color: '#333' }}, title: { display: false },
          tooltip: { callbacks: { label: ctx => `${ctx.dataset.label || ''}: ${formatCurrency(ctx.raw)}`}, backgroundColor: 'rgba(0,0,0,0.7)', bodyColor: '#fff', padding: 10, cornerRadius: 4 }
      },
      scales: { x: { ticks: { color: '#666', font: { size: 10 }}, grid: { display: false }},
                y: { beginAtZero: true, ticks: { callback: val => formatCurrency(val), color: '#666', font: {size: 10}}, grid: {color: '#eee', borderDash:[2,2]}}}
  }), []);

  const paymentMethodChartData = useMemo(() => {
      const bgColors = ['rgba(255, 99, 132, 0.7)', 'rgba(54, 162, 235, 0.7)', 'rgba(255, 206, 86, 0.7)', 'rgba(75, 192, 192, 0.7)', 'rgba(153, 102, 255, 0.7)'];
      return {
          labels: salesByPaymentMethodData.map(item => item.payment_method),
          datasets: [{
              data: salesByPaymentMethodData.map(item => item.method_sales),
              backgroundColor: salesByPaymentMethodData.map((_, i) => bgColors[i % bgColors.length]),
              borderColor: salesByPaymentMethodData.map((_, i) => bgColors[i % bgColors.length].replace('0.7', '1')), // Darker border
              borderWidth: 1, hoverOffset: 8,
          }],
      };
  }, [salesByPaymentMethodData]);

  const paymentMethodChartOptions = useMemo(() => ({
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'right', labels: { font: { size: 12 }, color: '#333', usePointStyle: true }},
          tooltip: { callbacks: { label: ctx => {
              const total = ctx.dataset.data.reduce((s, v) => s + v, 0);
              const percentage = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) + '%' : '0%';
              return `${ctx.label || ''}: ${formatCurrency(ctx.raw)} (${percentage})`;
          }}, backgroundColor: 'rgba(0,0,0,0.7)', bodyColor: '#fff', padding: 10, cornerRadius: 4 }
      }
  }), []);

  const kpiCards = [
    { title: "Pedidos en total", value: kpis.total_orders, icon: "🛒", valueColorClass: "text-blue-600", iconColorClass: "text-blue-500" },
    { title: "Total ventas", value: kpis.total_sales, icon: "💰", isCurrency: true, valueColorClass: "text-green-600", iconColorClass: "text-green-500" },
    { title: "Clientes nuevos", value: kpis.new_clients_count, icon: "👤+", valueColorClass: "text-cyan-600", iconColorClass: "text-cyan-500" },
    { title: "Ventas clientes nuevos", value: kpis.new_clients_sales, icon: "💸", isCurrency: true, valueColorClass: "text-cyan-600", iconColorClass: "text-cyan-500" },
    { title: "Venta promedio / pedido", value: kpis.average_sale_value, icon: "📈", isCurrency: true, valueColorClass: "text-purple-600", iconColorClass: "text-purple-500" },
    { title: "Ventas por día (promedio)", value: kpis.sales_per_day, icon: "📅", isCurrency: true, valueColorClass: "text-teal-600", iconColorClass: "text-teal-500" },
    { title: "Cuentas por cobrar", value: kpis.accounts_receivable, icon: "🏦", isCurrency: true, valueColorClass: "text-red-600", iconColorClass: "text-red-500" },
    { title: "Saldos vencidos", value: kpis.overdue_balances, icon: "🚨", isCurrency: true, valueColorClass: "text-orange-600", iconColorClass: "text-orange-500" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:gap-6 mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Dashboard</h1>
        <HomeDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={setStartDate}
            onEndDateChange={setEndDate}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {kpiCards.map(kpi => (
          <HomeKpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            icon={kpi.icon}
            isLoading={loadingMetrics}
            isCurrency={kpi.isCurrency}
            valueColorClass={kpi.valueColorClass}
            iconColorClass={kpi.iconColorClass}
          />
        ))}
        {metricsError && <p className="col-span-full text-center text-red-600 font-semibold">{metricsError}</p>}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <HomeChartContainer
          title="Tendencia de Ventas Mensuales"
          chartData={monthlySalesChartData}
          chartOptions={monthlySalesChartOptions}
          isLoading={loadingCharts}
          chartType="line"
          loadingError={chartsError}
          noDataMessage="No hay datos de ventas mensuales para el período."
        />
        <HomeChartContainer
          title="Ventas por Forma de Pago"
          chartData={paymentMethodChartData}
          chartOptions={paymentMethodChartOptions}
          isLoading={loadingCharts}
          chartType="pie"
          loadingError={chartsError}
          noDataMessage="No hay datos de ventas por forma de pago para el período."
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <HomeTopListCard
          title="Top Productos por Ventas"
          items={topProducts}
          isLoading={loadingLists}
          loadingError={listsError}
          noDataMessage="No hay datos de productos top."
        />
        <HomeTopListCard
          title="Top Clientes por Compras"
          items={topClients}
          isLoading={loadingLists}
          loadingError={listsError}
          noDataMessage="No hay datos de clientes top."
        />
        <HomeTopListCard
          title="Top Vendedores por Ventas"
          items={topVendors}
          isLoading={loadingLists}
          loadingError={listsError}
          noDataMessage="No hay datos de vendedores top."
        />
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HomeTopListCard
            title="Productos con Bajo Stock (Umbral <= 10)"
            items={lowStockProducts}
            isLoading={loadingLists} // Podría tener su propio loading si se carga independientemente
            loadingError={inventoryError}
            noDataMessage="No hay productos con bajo stock."
            valueFormatter={(value) => value} // No es moneda, solo el número
        />
        {/* Aquí podrías añadir otra tarjeta, como "Valor del Inventario Total" si implementas esa RPC */}
      </div>
    </div>
  );
}
