// src/pages/Home.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { Line, Pie, Bar } from 'react-chartjs-2'; // Importar Bar
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement, // Registrar BarElement
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler 
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
  BarElement, // Añadido BarElement
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler 
);

// Helpers
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) return '$0.00';
    return numericAmount.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 });
};

const formatDateLabel = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
        const date = new Date(dateString);
        let d = date;
        if (typeof dateString === 'string' && dateString.indexOf('T') === -1) {
            d = new Date(dateString + 'T00:00:00');
        }
        return d.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' });
    } catch (e) {
        console.error("Error en formatDateLabel:", e, "con dateString:", dateString);
        return dateString;
    }
};

// Colores base para el dashboard rediseñado
const CHART_COLORS = {
  primary: 'rgb(59, 130, 246)', 
  primaryLight: 'rgba(59, 130, 246, 0.1)',
  secondary: 'rgb(16, 185, 129)', 
  tertiary: 'rgb(245, 158, 11)', 
  quaternary: 'rgb(99, 102, 241)', 
  neutralLight: 'rgb(229, 231, 235)', 
  textPrimary: 'rgb(17, 24, 39)', 
  textSecondary: 'rgb(75, 85, 99)', 
  textMuted: 'rgb(156, 163, 175)', 
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
  const [inventoryError, setInventoryError] = useState(null);

  const [startDate, setStartDate] = useState(() => {
      const now = new Date();
      return `${now.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const fetchAllDashboardData = async () => {
        console.log("Dashboard: Iniciando fetchAllDashboardData con rango:", startDate, "a", endDate); 
        setLoadingMetrics(true); setLoadingCharts(true); setLoadingLists(true);
        setMetricsError(null); setChartsError(null); setListsError(null); setInventoryError(null);
        const toastId = toast.loading('Cargando datos del dashboard...');

        try {
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
            toast.error('Error al cargar métricas.', { id: toastId });
        } finally {
            setLoadingMetrics(false);
        }

        try {
            console.log("Dashboard: Fetching get_monthly_sales_trend..."); 
            const { data: monthlyData, error: monthlyErr } = await supabase.rpc('get_monthly_sales_trend', { start_date: startDate, end_date: endDate });
            if (monthlyErr) throw monthlyErr;
            console.log("Dashboard: Datos RECIBIDOS de get_monthly_sales_trend:", JSON.parse(JSON.stringify(monthlyData))); 
            setMonthlySalesData(monthlyData || []);

            console.log("Dashboard: Fetching get_sales_by_payment_method..."); 
            const { data: paymentData, error: paymentErr } = await supabase.rpc('get_sales_by_payment_method', { start_date: startDate, end_date: endDate });
            if (paymentErr) throw paymentErr;
            console.log("Dashboard: Datos RECIBIDOS de get_sales_by_payment_method:", paymentData); 
            setSalesByPaymentMethodData(paymentData || []);
        } catch (err) {
            console.error('Error fetching sales chart data:', err.message);
            setChartsError('Error al cargar datos de gráficos.');
            toast.error('Error al cargar datos de gráficos.', { id: toastId });
        } finally {
            setLoadingCharts(false);
        }

        try {
            const { data: topCliData, error: topCliErr } = await supabase.rpc('get_top_clients_by_sales_subtotal', { limit_count: 5, start_date: startDate, end_date: endDate });
            if (topCliErr) {
                console.error('Error fetching top clients (get_top_clients_by_sales_subtotal):', topCliErr.message);
                setListsError(prev => prev ? `${prev}, Error clientes top.` : 'Error clientes top.');
            } else {
                setTopClients((topCliData || []).map(c => ({ id: c.client_id, name: c.client_name, value: c.total_value_of_goods_purchased })));
            }

            const { data: topProdData, error: topProdErr } = await supabase.rpc('get_top_products_by_sales', { limit_count: 5, start_date: startDate, end_date: endDate });
            if (topProdErr) {
                console.error('Error fetching top products:', topProdErr.message);
                setListsError(prev => prev ? `${prev}, Error productos top.` : 'Error productos top.');
            } else {
                setTopProducts((topProdData || []).map(p => ({ id: p.product_id, name: p.product_name, value: p.total_sales })));
            }
            
            const { data: topSellData, error: topSellErr } = await supabase.rpc('get_top_sellers_by_sales', { limit_count: 5, start_date: startDate, end_date: endDate });
            if (topSellErr) {
                console.warn('Error fetching top sellers:', topSellErr.message);
            } else {
                setTopVendors((topSellData || []).map(s => ({ id: s.seller_id, name: s.seller_name, value: s.total_sales })));
            }
        } catch (err) { 
            console.error('Error general fetching top lists:', err.message);
            if (!listsError) setListsError('Error al cargar algunas listas top.'); 
            toast.error('Error al cargar listas top.', { id: toastId });
        } finally {
            setLoadingLists(false);
        }
        
        try {
            const { data: lowStockData, error: lowStockErr } = await supabase.rpc('get_low_stock_products', { stock_threshold: 10 });
            if (lowStockErr) throw lowStockErr;
            setLowStockProducts((lowStockData || []).map(p => ({ id: p.product_id, name: p.product_name, value: p.current_stock, valueLabel: "en stock" })));
        } catch (err) {
            console.error('Error fetching low stock products:', err.message);
            setInventoryError('Error al cargar productos con bajo stock.');
        }
        
        if (!metricsError && !chartsError && !listsError) {
            toast.success('Datos del dashboard cargados.', { id: toastId });
        } else {
            toast.dismiss(toastId); 
        }
    };
    fetchAllDashboardData();
  }, [startDate, endDate]); 

  console.log("Dashboard: Estado monthlySalesData ANTES de useMemo:", JSON.parse(JSON.stringify(monthlySalesData))); 

  const commonChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 12, family: 'Inter, sans-serif' },
          color: CHART_COLORS.textSecondary,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.85)', 
        titleColor: '#fff',
        bodyColor: '#fff',
        titleFont: { family: 'Inter, sans-serif', weight: 'bold' },
        bodyFont: { family: 'Inter, sans-serif' },
        padding: 12,
        cornerRadius: 6,
        boxPadding: 3,
      },
    },
    scales: {
      x: {
        ticks: { color: CHART_COLORS.textMuted, font: { size: 10, family: 'Inter, sans-serif' } },
        grid: { display: false },
        border: { color: CHART_COLORS.neutralLight }
      },
      y: {
        beginAtZero: true,
        ticks: { color: CHART_COLORS.textMuted, font: { size: 10, family: 'Inter, sans-serif' }, callback: val => formatCurrency(val) },
        grid: { color: CHART_COLORS.neutralLight, borderDash: [3, 3], drawBorder: false },
      },
    },
  };

  // Determinar el tipo de gráfico para la tendencia de ventas
  const salesTrendChartType = useMemo(() => {
    return monthlySalesData && monthlySalesData.length === 1 ? 'bar' : 'line';
  }, [monthlySalesData]);

  const monthlySalesChartData = useMemo(() => {
      const labels = monthlySalesData.map(item => formatDateLabel(item.sale_month));
      const data = monthlySalesData.map(item => item.monthly_sales);
      console.log("Dashboard: Calculando monthlySalesChartData. Labels:", labels, "Data:", data, "ChartType:", salesTrendChartType); 
      
      const datasetBase = {
        label: 'Ventas',
        data: data,
        borderColor: CHART_COLORS.primary,
        pointBorderColor: '#fff',
        pointHoverBorderColor: CHART_COLORS.primary,
      };

      if (salesTrendChartType === 'bar') {
        return {
          labels: labels,
          datasets: [{
            ...datasetBase,
            backgroundColor: CHART_COLORS.primary,
            barThickness: 50, // Ajusta el grosor de la barra
            maxBarThickness: 70,
          }]
        };
      }
      // Para 'line' chart
      return {
          labels: labels,
          datasets: [{
              ...datasetBase,
              backgroundColor: CHART_COLORS.primaryLight,
              tension: 0.4, 
              fill: true,
              pointRadius: monthlySalesData.length === 1 ? 8 : 6, // Punto más grande si es único
              pointBackgroundColor: CHART_COLORS.primary,
              pointBorderWidth: 2, 
              pointHoverRadius: monthlySalesData.length === 1 ? 10 : 8, 
              pointHoverBackgroundColor: '#fff',
              pointHoverBorderWidth: 2,
          }],
      }
  }, [monthlySalesData, salesTrendChartType]);

  const monthlySalesChartOptions = useMemo(() => {
    const options = {
        ...commonChartOptions,
        plugins: {
          ...commonChartOptions.plugins,
          tooltip: {
            ...commonChartOptions.plugins.tooltip,
            callbacks: { label: ctx => `${ctx.dataset.label || ''}: ${formatCurrency(ctx.raw)}` },
          },
        },
        elements: {
            line: {
                skipNull: true 
            }
        },
    };
    if (salesTrendChartType === 'bar') {
        options.scales.x.grid.display = false; // No grid para x en bar
        options.plugins.legend.display = false; // No leyenda para bar con un solo dataset
    }
    return options;
  }, [salesTrendChartType]);


  const paymentMethodChartData = useMemo(() => { /* ... (sin cambios) ... */ 
      const PIE_CHART_COLORS = [CHART_COLORS.primary, CHART_COLORS.secondary, CHART_COLORS.tertiary, CHART_COLORS.quaternary, 'rgb(236, 72, 153)' ];
      return {
          labels: salesByPaymentMethodData.map(item => item.payment_method),
          datasets: [{
              data: salesByPaymentMethodData.map(item => item.method_sales),
              backgroundColor: salesByPaymentMethodData.map((_, i) => PIE_CHART_COLORS[i % PIE_CHART_COLORS.length]),
              borderColor: '#fff', borderWidth: 2, hoverOffset: 8, hoverBorderColor: '#fff',
          }],
      };
  }, [salesByPaymentMethodData]);
  const paymentMethodChartOptions = useMemo(() => ({ /* ... (sin cambios) ... */ 
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom', labels: { font: { size: 11, family: 'Inter, sans-serif' }, color: CHART_COLORS.textSecondary, usePointStyle: true, boxWidth: 10, padding: 15,}},
      tooltip: { ...commonChartOptions.plugins.tooltip, callbacks: { label: ctx => { const total = ctx.dataset.data.reduce((s, v) => s + v, 0); const percentage = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) + '%' : '0%'; return `${ctx.label || ''}: ${formatCurrency(ctx.raw)} (${percentage})`;}}}},
    cutout: '60%', 
  }), []);

  const kpiCards = [ /* ... (sin cambios) ... */ 
    { title: "Pedidos en total", value: kpis.total_orders, icon: "🛒" }, { title: "Total ventas", value: kpis.total_sales, icon: "💰", isCurrency: true }, { title: "Clientes nuevos", value: kpis.new_clients_count, icon: "👤+" }, { title: "Ventas clientes nuevos", value: kpis.new_clients_sales, icon: "💸", isCurrency: true }, { title: "Venta promedio / pedido", value: kpis.average_sale_value, icon: "📈", isCurrency: true }, { title: "Ventas por día (promedio)", value: kpis.sales_per_day, icon: "📅", isCurrency: true }, { title: "Cuentas por cobrar", value: kpis.accounts_receivable, icon: "🏦", isCurrency: true }, { title: "Saldos vencidos", value: kpis.overdue_balances, icon: "🚨", isCurrency: true },
  ];

  console.log("Dashboard: Final monthlySalesChartData para gráfica:", JSON.parse(JSON.stringify(monthlySalesChartData)));

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-8 font-inter">
      <div className="max-w-full mx-auto">
        
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-semibold text-slate-800">Dashboard</h1>
          <HomeDateRangePicker
              startDate={startDate}
              endDate={endDate}
              onStartDateChange={setStartDate}
              onEndDateChange={setEndDate}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-8">
          {kpiCards.map(kpi => (
            <HomeKpiCard
              key={kpi.title}
              title={kpi.title}
              value={kpi.value}
              icon={kpi.icon}
              isLoading={loadingMetrics}
              isCurrency={kpi.isCurrency}
            />
          ))}
          {metricsError && <p className="col-span-full text-center text-red-500 font-medium py-4">{metricsError}</p>}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-8">
          <div className="lg:col-span-3">
            <HomeChartContainer
              // MODIFICADO: La key ahora también depende del tipo de gráfico para forzar re-render si cambia entre línea y barra
              key={`sales-trend-chart-${salesTrendChartType}-${JSON.stringify(monthlySalesChartData.labels)}`}
              title="Tendencia de Ventas por Período" 
              chartData={monthlySalesChartData}
              chartOptions={monthlySalesChartOptions}
              isLoading={loadingCharts}
              chartType={salesTrendChartType} // MODIFICADO: Tipo de gráfico dinámico
              loadingError={chartsError}
              noDataMessage="No hay datos de ventas para el período."
            />
          </div>
          <div className="lg:col-span-2">
            <HomeChartContainer
              key={`pie-chart-${JSON.stringify(paymentMethodChartData.labels)}`}
              title="Ventas por Forma de Pago"
              chartData={paymentMethodChartData}
              chartOptions={paymentMethodChartOptions}
              isLoading={loadingCharts}
              chartType="pie"
              loadingError={chartsError}
              noDataMessage="No hay datos de ventas por forma de pago para el período."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-8">
          <HomeTopListCard title="Top Productos por Ventas" items={topProducts} isLoading={loadingLists} loadingError={listsError} noDataMessage="No hay datos de productos top." />
          <HomeTopListCard title="Top Clientes por Compras" items={topClients} isLoading={loadingLists} loadingError={listsError} noDataMessage="No hay datos de clientes top." />
          <HomeTopListCard title="Top Vendedores por Ventas" items={topVendors} isLoading={loadingLists} loadingError={listsError} noDataMessage="No hay datos de vendedores top." />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <HomeTopListCard title="Productos con Bajo Stock (Umbral ≤ 10)" items={lowStockProducts} isLoading={loadingLists} loadingError={inventoryError} noDataMessage="No hay productos con bajo stock." valueFormatter={(value) => value} />
        </div>
      </div>
    </div>
  );
}
