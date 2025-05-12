// src/pages/Home.jsx
import React, { useEffect, useState, useMemo } from 'react'; // Import useMemo
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
// Importar librerías de gráficos
import { Line, Pie } from 'react-chartjs-2'; // Importa Line y Pie
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement, // Necesario para gráficos de pastel/dona
  Title,
  Tooltip,
  Legend
} from 'chart.js';

// Registrar componentes necesarios de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement, // Registrar ArcElement
  Title,
  Tooltip,
  Legend
);


// Helper simple para formatear moneda
const formatCurrency = (amount) => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount)) {
        return '$0.00';
    }
    return numericAmount.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD', // Ajusta según tu moneda
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

// Helper para formatear fechas para etiquetas de gráfico (ej: "Ene 2024")
const formatDateLabel = (dateString) => {
    if (!dateString) return 'Fecha desconocida';
    try {
        const date = new Date(dateString);
        // Usar opciones para formatear mes y año
        return date.toLocaleDateString('es-ES', { month: 'short', year: 'numeric' });
    } catch (e) {
        console.error("Error formatting date label:", dateString, e);
        return dateString; // Fallback al string original
    }
};


export default function Home() {
  // --- Estados para las métricas ---
  const [kpis, setKpis] = useState({
      total_orders: 0,
      total_sales: 0,
      new_clients_count: 0,
      new_clients_sales: 0,
      accounts_receivable: 0,
      overdue_balances: 0,
      // >>> Nuevos KPIs placeholder <<<
      average_sale_value: 0,
      sales_per_day: 0,
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

  // --- Estado para errores (combinado para todas las secciones) ---
  const [error, setError] = useState(null); // Error general si falla alguna carga crítica
  const [metricsError, setMetricsError] = useState(null); // Error específico para métricas
  const [chartsError, setChartsError] = useState(null); // Error específico para gráficos
  const [listsError, setListsError] = useState(null); // Error específico para listas
  const [inventoryError, setInventoryError] = useState(null); // Error específico para inventario


  // --- Estado para el rango de fechas ---
  const [startDate, setStartDate] = useState(() => {
      // Calcular el inicio del año actual por defecto
      const now = new Date();
      return `${now.getFullYear()}-01-01`;
  });
  const [endDate, setEndDate] = useState(() => {
      // Calcular la fecha de hoy por defecto
      const now = new Date();
      return now.toISOString().split('T')[0];
  });

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
      setMetricsError(null); // Limpiar error previo
      try {
          // Llama a la RPC get_kpi_metrics
          // Asegúrate de que tu RPC en Supabase retorne todos los campos esperados, incluyendo los nuevos
          const { data, error } = await supabase.rpc('get_kpi_metrics', { start_date: start, end_date: end }).single();

          if (error) throw error;

          // Mapear data para asegurar que todos los campos existen, incluso si la RPC no los retorna (útil para placeholders)
          const mappedKpis = {
              total_orders: data?.total_orders ?? 0,
              total_sales: data?.total_sales ?? 0,
              new_clients_count: data?.new_clients_count ?? 0,
              new_clients_sales: data?.new_clients_sales ?? 0,
              accounts_receivable: data?.accounts_receivable ?? 0,
              overdue_balances: data?.overdue_balances ?? 0,
              // >>> Mapear nuevos KPIs (asumiendo que la RPC los retorna o para inicializarlos) <<<
              average_sale_value: data?.average_sale_value ?? 0,
              sales_per_day: data?.sales_per_day ?? 0,
          };
          setKpis(mappedKpis);

      } catch (err) {
          console.error('Error fetching KPI metrics:', err.message);
          setMetricsError('Error al cargar métricas clave.'); // Establecer error específico
          toast.error('Error al cargar métricas.');
      } finally {
          setLoadingMetrics(false);
      }
  };

   // --- Función para obtener datos de Gráficos de Ventas ---
  const fetchSalesChartsData = async (start, end) => {
      setLoadingCharts(true);
      setChartsError(null); // Limpiar error previo
      try {
          // Llama a la RPC get_monthly_sales_trend
          const { data: monthlyData, error: monthlyError } = await supabase.rpc('get_monthly_sales_trend', { start_date: start, end_date: end });
          if (monthlyError) throw monthlyError;
          // Asegúrate de que monthlyData tenga el formato [{ sale_month: 'YYYY-MM-DD', monthly_sales: N }]
          setMonthlySalesData(monthlyData || []);

          // Llama a la RPC get_sales_by_payment_method
          const { data: paymentMethodData, error: paymentMethodError } = await supabase.rpc('get_sales_by_payment_method', { start_date: start, end_date: end });
           if (paymentMethodError) throw paymentMethodError;
           // Asegúrate de que paymentMethodData tenga el formato [{ payment_method: '...', method_sales: N }]
           setSalesByPaymentMethodData(paymentMethodData || []);

      } catch (err) {
          console.error('Error fetching sales chart data:', err.message);
          setChartsError('Error al cargar datos de gráficos.'); // Establecer error específico
          toast.error('Error al cargar gráficos.');
      } finally {
          setLoadingCharts(false);
      }
  };


  // --- Función para obtener Listas Top ---
   const fetchTopLists = async (start, end) => {
       setLoadingLists(true);
       setListsError(null); // Limpiar error previo
       try {
           // Llama a la RPC get_top_products_by_sales (ejemplo: top 10)
           const { data: topProductsData, error: topProductsError } = await supabase.rpc('get_top_products_by_sales', { limit_count: 10, start_date: start, end_date: end });
           if (topProductsError) throw topProductsError;
           // Asegúrate de que topProductsData tenga el formato [{ product_id: '...', product_name: '...', total_sales: N }]
           setTopProducts(topProductsData || []);

           // Llama a la RPC get_top_clients_by_sales (ejemplo: top 10)
           const { data: topClientsData, error: topClientsError } = await supabase.rpc('get_top_clients_by_sales', { limit_count: 10, start_date: start, end_date: end });
           if (topClientsError) throw topClientsError;
            // Asegúrate de que topClientsData tenga el formato [{ client_id: '...', client_name: '...', total_purchases: N }]
           setTopClients(topClientsData || []);

           // Llama a la RPC get_top_sellers_by_sales (ejemplo: top 5) - Requiere vendedor_id en ventas
            // Si no tienes vendedores, puedes omitir esta sección o adaptarla
           const { data: topSellersData, error: topSellersError } = await supabase.rpc('get_top_sellers_by_sales', { limit_count: 5, start_date: start, end_date: end });
           if (topSellersError) console.warn('Error fetching top sellers (check vendedor_id and RPC):', topSellersError.message); // Warning si no existe la tabla/col
            // Asegúrate de que topSellersData tenga el formato [{ seller_id: '...', seller_name: '...', total_sales: N }]
            setTopVendors(topSellersData || []); // Usar [] si falla o no aplica

       } catch (err) {
           console.error('Error fetching top lists:', err.message);
           setListsError('Error al cargar listas top.'); // Establecer error específico
           toast.error('Error al cargar listas top.');
       } finally {
           setLoadingLists(false);
       }
   };

    // --- Función para obtener datos de Inventario (no depende del rango de ventas) ---
    const fetchInventoryData = async () => {
        // Podrías tener un estado de carga/error separado para inventario si se carga en otro momento
        setInventoryError(null); // Limpiar error previo
        try {
            // Llama a la RPC get_low_stock_products (ejemplo: umbral 10)
            const { data: lowStockData, error: lowStockError } = await supabase.rpc('get_low_stock_products', { stock_threshold: 10 });
            if (lowStockError) throw lowStockError;
             // Asegúrate de que lowStockData tenga el formato [{ product_id: '...', product_name: '...', current_stock: N }]
            setLowStockProducts(lowStockData || []);

            // Podrías añadir aquí la consulta para el Valor del Inventario Total si creas la RPC/View correspondiente

        } catch (err) {
            console.error('Error fetching inventory data:', err.message);
             setInventoryError('Error al cargar datos de inventario.'); // Establecer error específico
             toast.error('Error al cargar datos de inventario.');
        }
        // No hay loading state específico para inventario en los estados actuales, podrías añadir uno si es necesario
    };

    // --- Preparar datos para Chart.js ---

    // Datos para el gráfico de línea de ventas mensuales
    const monthlySalesChartData = useMemo(() => {
        return {
            labels: monthlySalesData.map(item => formatDateLabel(item.sale_month)),
            datasets: [{
                label: 'Ventas Mensuales',
                data: monthlySalesData.map(item => item.monthly_sales),
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.5)', // Área bajo la línea
                tension: 0.3, // Curva más suave
                fill: true, // Rellenar bajo la línea
                pointBackgroundColor: 'rgb(75, 192, 192)', // Color de los puntos
                pointBorderColor: '#fff', // Borde de los puntos
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(75, 192, 192)',
            }],
        };
    }, [monthlySalesData]); // Regenerar si monthlySalesData cambia

    // Opciones para el gráfico de línea
    const monthlySalesChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false, // Permite controlar la altura con CSS
        plugins: {
            legend: {
                position: 'top',
                labels: {
                    font: {
                        size: 12, // Tamaño de fuente de la leyenda
                    },
                    color: '#333', // Color de la leyenda
                }
            },
            title: {
                display: false, // El título se maneja en el h3 del JSX
            },
            tooltip: {
                 callbacks: {
                     label: function(context) {
                         let label = context.dataset.label || '';
                         if (label) {
                             label += ': ';
                         }
                         if (context.raw !== null) {
                             label += formatCurrency(context.raw);
                         }
                         return label;
                     }
                 },
                 backgroundColor: 'rgba(0, 0, 0, 0.7)', // Fondo oscuro del tooltip
                 bodyColor: '#fff', // Color del texto del tooltip
                 borderColor: '#fff', // Borde del tooltip
                 borderWidth: 1,
                 cornerRadius: 4, // Bordes redondeados del tooltip
                 padding: 10, // Padding del tooltip
             }
        },
        scales: {
            x: { // Estilo del eje X
                ticks: {
                    color: '#666', // Color de las etiquetas del eje X
                    font: {
                        size: 10, // Tamaño de fuente del eje X
                    }
                },
                grid: {
                    display: false, // Ocultar líneas de la cuadrícula del eje X
                }
            },
            y: { // Estilo del eje Y
                beginAtZero: true,
                 ticks: {
                     callback: function(value) {
                         return formatCurrency(value); // Formatear ticks del eje Y como moneda
                     },
                     color: '#666', // Color de las etiquetas del eje Y
                     font: {
                        size: 10, // Tamaño de fuente del eje Y
                    }
                 },
                 grid: {
                    color: '#eee', // Color de las líneas de la cuadrícula del eje Y
                    borderDash: [2, 2], // Líneas punteadas
                 }
            }
        }
    }), []); // Las opciones no dependen de los datos, solo de la configuración


    // Datos para el gráfico de pastel de formas de pago
    const paymentMethodChartData = useMemo(() => {
        // Colores de ejemplo (puedes expandir o usar una paleta)
        const backgroundColors = [
            'rgba(255, 99, 132, 0.7)', // Rojo
            'rgba(54, 162, 235, 0.7)', // Azul
            'rgba(255, 206, 86, 0.7)', // Amarillo
            'rgba(75, 192, 192, 0.7)', // Verde azulado
            'rgba(153, 102, 255, 0.7)', // Morado
            'rgba(255, 159, 64, 0.7)', // Naranja
            'rgba(199, 199, 199, 0.7)', // Gris
            'rgba(83, 102, 255, 0.7)', // Azul claro
        ];
         const borderColors = [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(199, 199, 199, 1)',
            'rgba(83, 102, 255, 1)',
        ];

        return {
            labels: salesByPaymentMethodData.map(item => item.payment_method),
            datasets: [{
                data: salesByPaymentMethodData.map(item => item.method_sales),
                backgroundColor: salesByPaymentMethodData.map((_, index) => backgroundColors[index % backgroundColors.length]),
                borderColor: salesByPaymentMethodData.map((_, index) => borderColors[index % borderColors.length]),
                borderWidth: 1,
                hoverOffset: 8, // Efecto hover
            }],
        };
    }, [salesByPaymentMethodData]); // Regenerar si salesByPaymentMethodData cambia

     // Opciones para el gráfico de pastel
     const paymentMethodChartOptions = useMemo(() => ({
        responsive: true,
        maintainAspectRatio: false, // Permite controlar la altura con CSS
        plugins: {
            legend: {
                position: 'right', // Posición de la leyenda
                 labels: {
                    font: {
                        size: 12, // Tamaño de fuente de la leyenda
                    },
                    color: '#333', // Color de la leyenda
                    usePointStyle: true, // Usar el color del punto en la leyenda
                }
            },
             tooltip: {
                 callbacks: {
                     label: function(context) {
                         let label = context.label || '';
                         if (label) {
                             label += ': ';
                         }
                         if (context.raw !== null) {
                             label += formatCurrency(context.raw);
                         }
                         // Opcional: Añadir porcentaje
                         const total = context.dataset.data.reduce((sum, value) => sum + value, 0);
                         const percentage = total > 0 ? ((context.raw / total) * 100).toFixed(1) + '%' : '0%';
                         return `${label} (${percentage})`;
                     }
                 },
                  backgroundColor: 'rgba(0, 0, 0, 0.7)', // Fondo oscuro del tooltip
                  bodyColor: '#fff', // Color del texto del tooltip
                  borderColor: '#fff', // Borde del tooltip
                  borderWidth: 1,
                  cornerRadius: 4, // Bordes redondeados del tooltip
                  padding: 10, // Padding del tooltip
             }
        },
     }), []); // Las opciones no dependen de los datos


  // --- Renderizado (JSX) ---
  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 lg:p-12">
      {/* Encabezado del Dashboard */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dashboard</h1>
        {/* Selector de Rango de Fechas */}
         <div className="flex flex-col sm:flex-row items-center gap-2"> {/* Flexbox para alinear inputs */}
             <label htmlFor="startDate" className="text-gray-600 text-sm font-medium">Rango de Fechas:</label> {/* Etiqueta mejorada */}
             <input
                type="date"
                id="startDate"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
             />
             <span className="text-gray-600 hidden sm:inline">-</span> {/* Guion visible en sm+ */}
             <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
             />
         </div>
      </div>

      {/* Indicadores del Período (Métricas Principales) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {loadingMetrics ? (
              // Skeleton loader para métricas
              Array.from({ length: 8 }).map((_, i) => ( // Ajustado a 8 para los nuevos KPIs
                  <div key={i} className="bg-white rounded-lg shadow-md p-5 animate-pulse border border-gray-200"> {/* Sombra y borde mejorados */}
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-3"></div> {/* Color y mb ajustados */}
                      <div className="h-6 bg-gray-200 rounded w-1/2"></div> {/* Color ajustado */}
                  </div>
              ))
          ) : metricsError ? (
              <> {/* Wrap in fragment */}
                  <p className="col-span-full text-center text-red-600 font-semibold">{metricsError}</p> {/* Color y fuente mejorados */}
              </>
          ) : (
              <>
                {/* Tarjeta Total Pedidos */}
                <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between border border-gray-200"> {/* Sombra, padding, borde mejorados */}
                    <div>
                        <p className="text-sm font-medium text-gray-500">Pedidos en total</p>
                        <p className="text-2xl font-bold text-blue-600">{kpis.total_orders}</p>
                    </div>
                    <div className="text-blue-500 text-4xl opacity-80">🛒</div> {/* Color y opacidad ajustados */}
                </div>

                 {/* Tarjeta Total Ventas */}
                 <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between border border-gray-200">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Total ventas</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(kpis.total_sales)}</p>
                    </div>
                    <div className="text-green-500 text-4xl opacity-80">💰</div> {/* Color y opacidad ajustados */}
                </div>

                 {/* Tarjeta Clientes Nuevos */}
                 <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between border border-gray-200">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Clientes nuevos</p>
                        <p className="text-2xl font-bold text-cyan-600">{kpis.new_clients_count}</p>
                    </div>
                     <div className="text-cyan-500 text-4xl opacity-80">👤+</div> {/* Color y opacidad ajustados */}
                </div>

                 {/* Tarjeta Ventas Clientes Nuevos */}
                  <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between border border-gray-200">
                     <div>
                         <p className="text-sm font-medium text-gray-500">Ventas clientes nuevos</p>
                         <p className="text-2xl font-bold text-cyan-600">{formatCurrency(kpis.new_clients_sales)}</p>
                     </div>
                      <div className="text-cyan-500 text-4xl opacity-80">💸</div> {/* Color y opacidad ajustados */}
                 </div>

                 {/* >>> Nueva Tarjeta: Venta Promedio por Pedido <<< */}
                 <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between border border-gray-200">
                     <div>
                         <p className="text-sm font-medium text-gray-500">Venta promedio / pedido</p>
                         <p className="text-2xl font-bold text-purple-600">{formatCurrency(kpis.average_sale_value)}</p>
                     </div>
                      <div className="text-purple-500 text-4xl opacity-80">📈</div> {/* Color y opacidad ajustados */}
                 </div>

                 {/* >>> Nueva Tarjeta: Ventas por Día <<< */}
                 <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between border border-gray-200">
                     <div>
                         <p className="text-sm font-medium text-gray-500">Ventas por día</p>
                         <p className="text-2xl font-bold text-teal-600">{formatCurrency(kpis.sales_per_day)}</p>
                     </div>
                      <div className="text-teal-500 text-4xl opacity-80">📅</div> {/* Color y opacidad ajustados */}
                 </div>


                 {/* Tarjeta Cuentas por cobrar */}
                 <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between border border-gray-200">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Cuentas por cobrar</p>
                        {/* Usamos color rojo para deuda */}
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(kpis.accounts_receivable)}</p>
                    </div>
                     <div className="text-red-500 text-4xl opacity-80">🏦</div> {/* Color y opacidad ajustados */}
                </div>

                 {/* Tarjeta Saldos Vencidos (Placeholder - Requiere BD) */}
                 <div className="bg-white rounded-lg shadow-md p-5 flex items-center justify-between border border-gray-200">
                    <div>
                        <p className="text-sm font-medium text-gray-500">Saldos vencidos</p>
                        {/* Mostrar en rojo o naranja si hay saldo vencido */}
                        <p className="text-2xl font-bold text-orange-600">{formatCurrency(kpis.overdue_balances)}</p>
                    </div>
                    <div className="text-orange-500 text-4xl opacity-80">🚨</div> {/* Color y opacidad ajustados */}
                </div>


              </>
          )}
      </div>

{/* Gráficos de Ventas */}
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
  {loadingCharts ? (
    // Skeleton loader para gráficos
    Array.from({ length: 2 }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-lg shadow-md p-4 animate-pulse h-80 flex items-center justify-center border border-gray-200"
      >
        <div className="w-3/4 h-3/4 bg-gray-200 rounded"></div>
      </div>
    ))
  ) : chartsError ? (
    <div className="col-span-full">
      {/* Color y fuente mejorados */}
      <p className="text-center text-red-600 font-semibold">
        {chartsError}
      </p>
    </div>
  ) : (
    <>
      {/* Gráfico Tendencia de Ventas Mensuales */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          Tendencia de Ventas Mensuales
        </h3>
        {monthlySalesData.length > 0 ? (
          <div className="h-64 w-full">
            {/* >>> Gráfico de Líneas Real <<< */}
            <Line
              data={monthlySalesChartData}
              options={monthlySalesChartOptions}
            />
          </div>
        ) : (
          <p className="text-center text-gray-500 italic">
            No hay datos de ventas mensuales para el período.
          </p>
        )}
      </div>

      {/* Gráfico Ventas por Forma de Pago */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          Ventas por Forma de Pago
        </h3>
        {salesByPaymentMethodData.length > 0 ? (
          <div className="h-64 w-full flex justify-center items-center">
            {/* >>> Gráfico de Pastel Real <<< */}
            <Pie
              data={paymentMethodChartData}
              options={paymentMethodChartOptions}
            />
          </div>
        ) : (
          <p className="text-center text-gray-500 italic">
            No hay datos de ventas por forma de pago para el período.
          </p>
        )}
      </div>
    </>
  )}
</div>

{/* Secciones de Listas Top */}
<div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
  {loadingLists ? (
    // Skeleton loader para listas
    Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className="bg-white rounded-lg shadow-md p-4 animate-pulse border border-gray-200"
      >
        <div className="h-6 bg-gray-200 rounded w-2/3 mb-4"></div>
        <ul>
          {Array.from({ length: 5 }).map((_, j) => (
            <li
              key={j}
              className="flex justify-between items-center py-3 border-b border-gray-200 last:border-b-0"
            >
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/4"></div>
            </li>
          ))}
        </ul>
      </div>
    ))
  ) : listsError ? (
    <p className="col-span-full text-center text-red-600 font-semibold">
      {listsError}
    </p>
  ) : (
    <>
      {/* Top Productos por Ventas */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          Top productos por Ventas
        </h3>
        <ul>
          {topProducts.map((p, index) => (
            <li
              key={p.product_id || index}
              className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0 text-sm"
            >
              <span className="text-gray-800">{p.product_name}</span>
              <span className="font-semibold text-gray-700">
                {formatCurrency(p.total_sales)}
              </span>
            </li>
          ))}
          {topProducts.length === 0 && (
            <li className="text-sm text-gray-500 italic">
              No hay datos de productos top para el período.
            </li>
          )}
        </ul>
      </div>

      {/* Top Clientes por Compras */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          Top Clientes por Compras
        </h3>
        <ul>
          {topClients.map((c, index) => (
            <li
              key={c.client_id || index}
              className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0 text-sm"
            >
              <span className="text-gray-800">{c.client_name}</span>
              <span className="font-semibold text-gray-700">
                {formatCurrency(c.total_purchases)}
              </span>
            </li>
          ))}
          {topClients.length === 0 && (
            <li className="text-sm text-gray-500 italic">
              No hay datos de clientes top para el período.
            </li>
          )}
        </ul>
      </div>

      {/* Top Vendedores por Ventas */}
      <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
        <h3 className="text-lg font-semibold mb-3 text-gray-700">
          Top Vendedores por Ventas
        </h3>
        {topVendors.length === 0 && !listsError ? (
          <p className="text-sm text-gray-500 italic">
            No hay datos de vendedores top o la función no aplica.
          </p>
        ) : (
          <ul>
            {topVendors.map((s, index) => (
              <li
                key={s.seller_id || index}
                className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0 text-sm"
              >
                <span className="text-gray-800">{s.seller_name}</span>
                <span className="font-semibold text-gray-700">
                  {formatCurrency(s.total_sales)}
                </span>
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
  <div className="bg-white rounded-lg shadow-md p-4 border border-gray-200">
    <h3 className="text-lg font-semibold mb-3 text-gray-700">
      Productos con Bajo Stock (Umbral 10)
    </h3>
    {inventoryError ? (
      <p className="text-red-600 font-semibold">{inventoryError}</p>
    ) : lowStockProducts.length === 0 ? (
      <p className="text-sm text-gray-500 italic">
        No hay productos por debajo del umbral de stock.
      </p>
    ) : (
      <ul>
        {lowStockProducts.map((p, index) => (
          <li
            key={p.product_id || index}
            className="flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0 text-sm text-orange-600 font-semibold"
          >
            <span>{p.product_name}</span>
            <span>Stock: {p.current_stock}</span>
          </li>
        ))}
      </ul>
    )}
  </div>
  {/* <div className="bg-white rounded-lg shadow p-4">Valor del Inventario Total</div> */}
</div>



       {/* Modales (Si los necesitas en Home) */}
       {/* <Modal... /> */}

    </div>
  );
}
