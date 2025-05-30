// src/components/dashboard/Dashboard.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import {
  ShoppingCart, Users, DollarSign, Calendar,
  TrendingUp, Clock, AlertTriangle, Package
} from 'lucide-react';
import 'react-datepicker/dist/react-datepicker.css';
import { Chart as ChartJS, registerables } from 'chart.js';
import {
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);


// Importar Supabase y useAuth
import { supabase } from '../../supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

// Importar la función formatCurrency desde utilidades compartidas
import { formatCurrency } from '../../utils/formatters'; 

// Importar los componentes
import HomeKpiCard from '../home/HomeKpiCard.jsx';
import HomeChartContainer from '../home/HomeChartContainer.jsx';
import HomeTopListCard from '../home/HomeTopListCard.jsx';
import HomeDateRangePicker from '../home/HomeDateRangePicker.jsx';


// --- HELPERS (formatCurrency ahora se importa, así que se elimina de aquí) ---
// Modificado para ya no formatear la fecha para la gráfica, ya que Supabase la formateará.
// Solo se usa para depuración o si se necesita un formato diferente en otros lugares.
const formatDateLabel = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
        const date = new Date(dateString);
        let d = date;
        if (typeof dateString === 'string' && dateString.indexOf('T') === -1) {
            d = new Date(dateString + 'T00:00:00');
        }
        // Este formato ya no es el que se usa en la gráfica, pero se mantiene para otras posibles visualizaciones
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: '2-digit' });
    } catch (e) {
        console.error("Error en formatDateLabel:", e, "con dateString:", dateString);
        return dateString;
    }
};

// Colores base para el dashboard (ajustados para tema oscuro, basados en tu HTML de referencia y tailwind.config.js)
const CHART_COLORS = {
  primary: 'rgb(99, 102, 241)', // Indigo 500
  primaryLight: 'rgba(99, 102, 241, 0.5)',
  secondary: 'rgb(16, 185, 129)', // Emerald 500
  tertiary: 'rgb(245, 158, 11)', // Amber 500
  quaternary: 'rgb(244, 63, 94)', // Rose 500
  neutralLight: 'rgba(75, 85, 99, 0.2)', // Gray 600 (para bordes y grids en oscuro)
  textPrimary: 'rgba(229, 231, 235, 0.9)', // Gray 200/100 para texto principal
  textSecondary: 'rgba(156, 163, 175, 0.8)', // Gray 400 para texto secundario
  textMuted: 'rgba(156, 163, 175, 0.8)', // Gray 500 para ticks, etc.
  error: 'rgb(244, 63, 94)', // Rose 500 para errores
  success: 'rgb(16, 185, 129)', // Emerald 500 para éxito
  backgroundDark: 'rgba(17, 24, 39, 0.9)', // Fondo de tooltip
  cardDark: 'rgb(31, 41, 55)', // Gray 800 (Fondo de tarjetas y elementos) - manejado por la clase card-dark
  borderDark: 'rgb(55, 65, 81)', // Gray 700 (Bordes de tarjetas y elementos)
  bgDashboard: 'rgb(23, 23, 23)', // Ajustado a bg-dark-900 (franja oscura)
  bgPage: 'rgb(10, 10, 10)' // Ajustado a bg-dark-950 (fondo principal de la página)
};


const Dashboard = () => {
  const { user } = useAuth();
  // Se mantienen los estados de fecha originales para el selector de rango y periodType
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), 0, 1));
  // CORRECCIÓN: Inicializar endDate correctamente con useState.
  const [endDate, setEndDate] = useState(new Date()); 
  const [periodType, setPeriodType] = useState('month'); // Puedes dejarlo en 'month' si es tu vista principal

  const [kpis, setKpis] = useState({
      total_orders: 0, total_sales: 0, new_clients_count: 0, new_clients_sales: 0,
      accounts_receivable: 0, overdue_balances: 0, average_sale_value: 0, sales_per_day: 0,
  });
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [metricsError, setMetricsError] = useState(null);

  const [salesTrendData, setSalesTrendData] = useState([]);
  const [salesByPaymentMethodData, setSalesByPaymentMethodData] = useState([]);
  const [loadingCharts, setLoadingCharts] = useState(true);
  // CORRECCIÓN: Esta es la única declaración correcta para chartsError y setChartsError
  const [chartsError, setChartsError] = useState(null);


  const [topProducts, setTopProducts] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [topVendors, setTopVendors] = useState([]);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [loadingLists, setLoadingLists] = useState(true);
  const [listsError, setListsError] = useState(null);
  const [inventoryError, setInventoryError] = useState(null); 


  // useEffect para ajustar las fechas según el tipo de período (añadido para manejar el radio button)
  useEffect(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Inicio del día actual

    let newStartDate = new Date(today);
    let newEndDate = new Date(today);

    if (periodType === 'day') {
      // Para "Día", el rango es solo hoy
      newEndDate.setHours(23, 59, 59, 999); // Fin del día
    } else if (periodType === 'week') {
      // Para "Semana", el rango es de Lunes a Domingo de la semana actual
      const dayOfWeek = today.getDay(); // 0 = Domingo, 1 = Lunes
      newStartDate.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1)); // Ir al Lunes de esta semana
      newEndDate.setDate(newStartDate.getDate() + 6); // 6 días después para el Domingo
      newEndDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'month') {
      // Para "Mes", el rango es del 1 al último día del mes actual
      newStartDate = new Date(today.getFullYear(), today.getMonth(), 1); // Primer día del mes
      newEndDate = new Date(today.getFullYear(), today.getMonth() + 1, 0); // Último día del mes (día 0 del siguiente mes)
      newEndDate.setHours(23, 59, 59, 999);
    } else if (periodType === 'year') {
      // Para "Año", el rango es del 1 de enero al 31 de diciembre del año actual
      newStartDate = new Date(today.getFullYear(), 0, 1); // 1 de enero
      newEndDate = new Date(today.getFullYear(), 11, 31); // 31 de diciembre
      newEndDate.setHours(23, 59, 59, 999);
    }

    // Solo actualiza los estados si las fechas han cambiado para evitar bucles infinitos
    if (startDate.getTime() !== newStartDate.getTime() || endDate.getTime() !== newEndDate.getTime()) {
      setStartDate(newStartDate);
      setEndDate(newEndDate);
    }
  }, [periodType]);


  const fetchAllDashboardData = useCallback(async () => {
    console.log("Dashboard: Iniciando fetchAllDashboardData con rango:", startDate.toISOString().split('T')[0], "a", endDate.toISOString().split('T')[0], "y granularidad:", periodType);

    setLoadingMetrics(true); setLoadingCharts(true); setLoadingLists(true);
    setMetricsError(null); setChartsError(null); setListsError(null); setInventoryError(null);

    try {
        // Llamada a get_kpi_metrics para el rango completo seleccionado
        const { data: kpiData, error: kpiErr } = await supabase.rpc('get_kpi_metrics', {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        }).single();

        if (kpiErr) throw kpiErr;

        // Asignación de KPIs
        setKpis(prev => ({ 
            ...prev, 
            total_orders: kpiData?.total_orders ?? 0,
            total_sales: kpiData?.total_sales ?? 0,
            new_clients_count: kpiData?.new_clients_count ?? 0,
            new_clients_sales: kpiData?.new_clients_sales ?? 0,
            accounts_receivable: kpiData?.accounts_receivable ?? 0,
            overdue_balances: kpiData?.overdue_balances ?? 0,
            average_sale_value: kpiData?.average_sale_value ?? 0, // Promedio por pedido
            sales_per_day: kpiData?.sales_per_day ?? 0, // Promedio por día del rango completo
        }));
        console.log("Dashboard: Datos KPI recibidos:", kpiData);

    } catch (err) {
        console.error('Error fetching KPI metrics:', err.message);
        setMetricsError('Error al cargar métricas.');
        toast.error('Error al cargar métricas.');
    } finally {
        setLoadingMetrics(false);
    }

    try {
        // Llama a la función RPC flexible para la tendencia de ventas
        const { data: trendData, error: trendErr } = await supabase.rpc('get_sales_trend_by_period', {
            p_start_date: startDate.toISOString().split('T')[0],
            p_end_date: endDate.toISOString().split('T')[0],
            p_period_type: periodType 
        });
        if (trendErr) throw trendErr;
        setSalesTrendData(trendData || []);
        console.log("Dashboard: Datos RECIBIDOS de get_sales_trend_by_period:", trendData);

        // Llama a la función RPC para ventas por forma de pago
        const { data: paymentData, error: paymentErr } = await supabase.rpc('get_sales_by_payment_method', {
            start_date: startDate.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0]
        });
        if (paymentErr) throw paymentErr;
        setSalesByPaymentMethodData(paymentData || []);
        console.log("Dashboard: Datos RECIBIDOS de get_sales_by_payment_method:", paymentData);

    } catch (err) {
        console.error('Error fetching sales chart data:', err.message);
        setChartsError('Error al cargar datos de gráficos.');
        toast.error('Error al cargar datos de gráficos.');
    } finally {
        setLoadingCharts(false);
    }

    try {
        // Llama a las funciones RPC para listas Top
        const { data: topCliData, error: topCliErr } = await supabase.rpc('get_top_clients_by_sales_subtotal', { limit_count: 5, start_date: startDate.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0] });
        if (topCliErr) {
            console.error('Error fetching top clients:', topCliErr.message);
            setListsError(prev => prev ? `${prev}, Error clientes top.` : 'Error clientes top.');
        } else {
            setTopClients((topCliData || []).map(c => ({ id: c.client_id, name: c.client_name, value: c.total_value_of_goods_purchased })));
            console.log("Dashboard: Top clientes:", topCliData);
        }

        const { data: topProdData, error: topProdErr } = await supabase.rpc('get_top_products_by_sales', { limit_count: 5, start_date: startDate.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0] });
        if (topProdErr) {
            console.error('Error fetching top products:', topProdErr.message);
            setListsError(prev => prev ? `${prev}, Error productos top.` : 'Error productos top.');
        } else {
            setTopProducts((topProdData || []).map(p => ({ id: p.product_id, name: p.product_name, value: p.total_sales })));
            console.log("Dashboard: Top productos:", topProdData);
        }

        const { data: topSellData, error: topSellErr } = await supabase.rpc('get_top_sellers_by_sales', { limit_count: 5, start_date: startDate.toISOString().split('T')[0], end_date: endDate.toISOString().split('T')[0] });
        if (topSellErr) {
            console.error('Error fetching top sellers:', topSellErr.message);
            setListsError(prev => prev ? `${prev}, Error vendedores top.` : 'Error vendedores top.');
        } else {
            setTopVendors((topSellData || []).map(s => ({ id: s.seller_id, name: s.seller_name, value: s.total_sales })));
            console.log("Dashboard: Top vendedores:", topSellData);
        }

        const { data: lowStockData, error: lowStockErr } = await supabase.rpc('get_low_stock_products', { stock_threshold: 5 });
        if (lowStockErr) {
            console.error('Error fetching low stock products:', lowStockErr.message);
            setInventoryError('Error al cargar productos con bajo stock.');
        } else {
            setLowStockProducts((lowStockData || []).map(p => ({ id: p.id, name: p.name, value: p.stock, valueLabel: `/ ${p.min_stock_level || 0}` }))); // Corregido: usar p.id, p.name, p.stock
            console.log("Dashboard: Productos con bajo stock:", lowStockData);
        }

    } catch (err) {
        console.error('Error general fetching top lists/inventory:', err.message);
        if (!listsError) setListsError('Error al cargar algunas listas top.');
        toast.error('Error al cargar listas top.');
    } finally {
        setLoadingLists(false);
    }
  }, [startDate, endDate, periodType]);

  useEffect(() => {
    fetchAllDashboardData();
  }, [fetchAllDashboardData]);

  const commonChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: { size: 12, family: "'Inter', sans-serif" },
          color: CHART_COLORS.textPrimary,
          padding: 15
        },
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: CHART_COLORS.backgroundDark,
        titleColor: 'rgba(243, 244, 246, 1)',
        bodyColor: 'rgba(229, 231, 235, 0.9)',
        borderColor: 'rgba(75, 85, 99, 0.3)',
        borderWidth: 1,
        titleFont: { family: "'Inter', sans-serif", size: 13 },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 8,
        caretSize: 6,
        boxPadding: 4
      },
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: CHART_COLORS.textMuted,
          padding: 8
        }
      },
      y: {
        beginAtZero: true,
        grid: {
          color: CHART_COLORS.neutralLight,
          drawBorder: false
        },
        ticks: {
          font: { family: "'Inter', sans-serif", size: 11 },
          color: CHART_COLORS.textMuted,
          padding: 8,
          callback: function(value) {
            return '$' + formatCurrency(value);
          }
        }
      },
    },
  }), []);


  // Determina el tipo de gráfico (línea o barra) basado en la granularidad o cantidad de datos
  const salesTrendChartType = useMemo(() => {
    // Si es por día y el rango es muy grande, o por mes/año, tal vez sea mejor barra.
    // Para rangos pequeños o por día, línea.
    if (periodType === 'day' && salesTrendData.length > 30) return 'line';
    if (periodType === 'week') return 'line'; // Las semanas se ven mejor en línea
    if (periodType === 'month' || periodType === 'year') return 'bar'; // Meses y años en barra
    // Si solo hay un punto de dato, siempre es barra
    if (salesTrendData && salesTrendData.length === 1) return 'bar';
    return 'line'; // Por defecto, línea
  }, [salesTrendData, periodType]);


  const monthlySalesChartData = useMemo(() => {
      // Los labels y datos ya vienen formateados desde la función RPC
      const labels = salesTrendData.map(item => item.period_label);
      const data = salesTrendData.map(item => item.sales_amount);

      const datasetBase = {
        label: 'Ventas',
        data: data,
        backgroundColor: CHART_COLORS.primaryLight,
        borderColor: CHART_COLORS.primary,
        borderWidth: 2,
        borderRadius: 6, // Para barras
        fill: true,
      };

      if (salesTrendChartType === 'line') {
          return {
              labels: labels,
              datasets: [{
                  ...datasetBase,
                  tension: 0.3,
                  pointRadius: 6, // Tamaño del punto
                  pointBackgroundColor: CHART_COLORS.primary,
                  pointBorderWidth: 2,
                  pointHoverRadius: 8,
                  pointHoverBackgroundColor: '#fff',
                  pointHoverBorderWidth: 2,
              }],
          }
      }
      // Por defecto, o si es 'bar'
      return {
          labels: labels,
          datasets: [{
              ...datasetBase,
          }]
      };
  }, [salesTrendData, salesTrendChartType]);


  const monthlySalesChartOptions = useMemo(() => {
    const options = {
        ...commonChartOptions,
        plugins: {
          ...commonChartOptions.plugins,
          legend: {
            ...commonChartOptions.plugins.legend,
            // Ocultar leyenda para barras, ya que el color es el mismo
            display: salesTrendChartType === 'line' ? true : false,
          },
          tooltip: {
            ...commonChartOptions.plugins.tooltip,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.raw || 0;
                return `${label}: $${formatCurrency(value)}`;
              },
            },
          },
        },
        elements: {
            line: {
                skipNull: true
            },
            bar: {
                borderRadius: 6, // Para consistencia si es barra
            }
        },
        scales: {
            x: {
                ...commonChartOptions.scales.x,
                // Mostrar la cuadrícula para barras también si se desea, o solo para líneas
                grid: {
                    ...commonChartOptions.scales.x.grid,
                    display: salesTrendChartType === 'bar' ? false : commonChartOptions.scales.x.grid.display
                }
            },
            y: {
                ...commonChartOptions.scales.y,
            }
        }
    };
    return options;
  }, [salesTrendChartType, commonChartOptions]);


  const paymentMethodChartData = useMemo(() => {
      const DOUGHNUT_COLORS = [
        'rgba(99, 102, 241, 0.8)',   // Primary
        'rgba(16, 185, 129, 0.8)',   // Secondary
        'rgba(245, 158, 11, 0.8)',   // Tertiary
        'rgba(244, 63, 94, 0.8)',    // Quaternary
        'rgba(156, 163, 175, 0.8)',  // Muted/Otros
      ];
      const DOUGHNUT_BORDERS = [
        'rgba(99, 102, 241, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(244, 63, 94, 1)',
        'rgba(156, 163, 175, 1)',
      ];

      return {
          labels: salesByPaymentMethodData.map(item => item.payment_method),
          datasets: [{
              data: salesByPaymentMethodData.map(item => item.method_sales), // <-- CORREGIDO A 'method_sales'
              backgroundColor: salesByPaymentMethodData.map((_, i) => DOUGHNUT_COLORS[i % DOUGHNUT_COLORS.length]),
              borderColor: salesByPaymentMethodData.map((_, i) => DOUGHNUT_BORDERS[i % DOUGHNUT_BORDERS.length]),
              borderWidth: 2,
              hoverOffset: 10,
          }],
      };
  }, [salesByPaymentMethodData]);

  const paymentMethodChartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: { family: "'Inter', sans-serif", size: 12 },
          color: 'rgba(229, 231, 235, 0.9)', // Color de leyenda de referencia
          boxWidth: 15,
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)', // Fondo de tooltip de referencia
        titleFont: { family: "'Inter', sans-serif", size: 13 },
        bodyFont: { family: "'Inter', sans-serif", size: 12 },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            // Calcula el porcentaje
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${percentage}% ($${formatCurrency(value)})`; // Muestra porcentaje y valor
          }
        }
      }
    },
    cutout: '70%',
    animation: {
      animateScale: true,
      animateRotate: true
    }
  }), []);


  const kpiCards = [
    { title: "Ventas Totales", value: (kpis.total_sales ?? 0).toFixed(2), icon: <DollarSign size={20} />, change: { value: 12.5, isPositive: true } },
    { title: "Pedidos Totales", value: kpis.total_orders, icon: <ShoppingCart size={20} />, change: { value: 8.2, isPositive: true } },
    { title: "Clientes Nuevos", value: kpis.new_clients_count, icon: <Users size={20} />, change: { value: 5.1, isPositive: true } },
    { title: "Venta Promedio", value: (kpis.average_sale_value ?? 0).toFixed(2), icon: <TrendingUp size={20} />, change: { value: 3.4, isPositive: false } },
    { title: "Venta Promedio por Día", value: (kpis.sales_per_day ?? 0).toFixed(2), icon: <Calendar size={20} /> },
    { title: "Ventas a Clientes Nuevos", value: (kpis.new_clients_sales ?? 0).toFixed(2), icon: <Users size={20} />, change: { value: 15.3, isPositive: true } },
    { title: "Cuentas por Cobrar", value: (kpis.accounts_receivable ?? 0).toFixed(2), icon: <Clock size={20} /> },
    { title: "Saldos Vencidos", value: (kpis.overdue_balances ?? 0).toFixed(2), icon: <AlertTriangle size={20} />, change: { value: 8.7, isPositive: false } },
  ];

  return (
    <div className="space-y-8 p-6 md:p-8 bg-dark-900 min-h-screen"> {/* Contenedor principal con padding y fondo */}
      {/* Date Range Picker y selector de granularidad */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Dashboard</h1>
          <p className="text-gray-400">Bienvenido al panel de control de Perfumes Elisa</p>
        </div>

        {/* Contenedor para el selector de rango y el selector de granularidad */}
        <div className="flex flex-col sm:flex-row gap-4 items-center">
            <HomeDateRangePicker
                startDate={startDate.toISOString().split('T')[0]}
                endDate={endDate.toISOString().split('T')[0]}
                onStartDateChange={(date) => setStartDate(new Date(date))}
                onEndDateChange={(date) => setEndDate(new Date(date))}
            />

            {/* Selector de granularidad */}
            <div className="bg-dark-800/50 p-3 rounded-xl border border-dark-700/50 backdrop-blur-sm flex gap-2 text-sm text-gray-300">
                <label>
                    <input
                        type="radio"
                        name="period"
                        value="day"
                        checked={periodType === 'day'}
                        onChange={() => setPeriodType('day')}
                        className="mr-1 accent-primary-500"
                    /> Día
                </label>
                <label>
                    <input
                        type="radio"
                        name="period"
                        value="week"
                        checked={periodType === 'week'}
                        onChange={() => setPeriodType('week')}
                        className="mr-1 accent-primary-500"
                    /> Semana
                </label>
                <label>
                    <input
                        type="radio"
                        name="period"
                        value="month"
                        checked={periodType === 'month'}
                        onChange={() => setPeriodType('month')}
                        className="mr-1 accent-primary-500"
                    /> Mes
                </label>
                <label>
                    <input
                        type="radio"
                        name="period"
                        value="year"
                        checked={periodType === 'year'}
                        onChange={() => setPeriodType('year')}
                        className="mr-1 accent-primary-500"
                    /> Año
                </label>
            </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((kpi) => (
          <HomeKpiCard
            key={kpi.title}
            title={kpi.title}
            value={kpi.value}
            prefix={kpi.prefix}
            icon={kpi.icon}
            change={kpi.change}
          />
        ))}
        {loadingMetrics && <p className="col-span-full text-center text-gray-400 font-medium py-4">Cargando métricas...</p>}
        {metricsError && <p className="col-span-full text-center text-error-400 font-medium py-4">{metricsError}</p>}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <HomeChartContainer
          className="lg:col-span-2"
          title="Tendencia de Ventas por Período"
          chartData={monthlySalesChartData}
          chartOptions={monthlySalesChartOptions}
          isLoading={loadingCharts}
          chartType={salesTrendChartType}
          loadingError={chartsError}
          noDataMessage="No hay datos de ventas para el período."
        />

        <HomeChartContainer
          title="Ventas por Forma de Pago"
          chartData={paymentMethodChartData}
          chartOptions={paymentMethodChartOptions}
          isLoading={loadingCharts}
          chartType="doughnut"
          loadingError={chartsError}
          noDataMessage="No hay datos de ventas por forma de pago para el período."
        />
      </div>

      {/* Top Lists and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HomeTopListCard
          title="Productos Más Vendidos"
          items={topProducts.map(p => ({
            id: p.id,
            name: p.name,
            value: p.value
          }))}
          isLoading={loadingLists}
          loadingError={listsError}
          noDataMessage="No hay datos de productos top."
        />

        <HomeTopListCard
          title="Clientes con Más Compras"
          items={topClients.map(c => ({
            id: c.id,
            name: c.name,
            value: c.value
          }))}
          isLoading={loadingLists}
          loadingError={listsError}
          noDataMessage="No hay datos de clientes top."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HomeTopListCard
          title="Mejores Vendedores"
          items={topVendors.map(s => ({
            id: s.id,
            name: s.name,
            value: s.value
          }))}
          isLoading={loadingLists}
          loadingError={listsError}
          noDataMessage="No hay datos de vendedores top."
        />

        <HomeTopListCard
          title="Productos con Bajo Stock"
          items={lowStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            value: p.value,
            valueLabel: p.valueLabel
          }))}
          valueFormatter={(value) => String(value ?? 0)} // CORREGIDO: Asegura que el valor sea un string
          isLoading={loadingLists}
          loadingError={inventoryError}
          noDataMessage="No hay productos con bajo stock."
        />
      </div>
    </div>
  );
};

export default Dashboard;