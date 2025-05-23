import React, { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  BarChart3, ShoppingCart, Users, DollarSign, Calendar, 
  TrendingUp, Clock, AlertTriangle, Package, ArrowRight
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

import HomeKpiCard from '../home/HomeKpiCard';
import HomeChartContainer from '../home/HomeChartContainer';
import HomeTopListCard from '../home/HomeTopListCard';
import HomeDateRangePicker from '../home/HomeDateRangePicker';

// Mock data for demonstration
const mockDashboardMetrics = {
  totalSales: 125850,
  totalOrders: 1458,
  newCustomers: 64,
  averageSale: 863.17,
  dailySales: 4250,
  newCustomerSales: 15420,
  accountsReceivable: 32680,
  overdueBalance: 8750
};

const mockSalesTrendData = {
  labels: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Ventas',
      data: [65000, 59000, 80000, 81000, 56000, 125850],
      backgroundColor: 'rgba(99, 102, 241, 0.5)',
      borderColor: 'rgba(99, 102, 241, 1)',
      borderWidth: 2,
      borderRadius: 6,
      tension: 0.3,
      fill: true,
    }
  ]
};

const mockPaymentMethodsData = {
  labels: ['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito', 'Otros'],
  datasets: [
    {
      data: [45, 25, 20, 8, 2],
      backgroundColor: [
        'rgba(99, 102, 241, 0.8)',
        'rgba(16, 185, 129, 0.8)',
        'rgba(245, 158, 11, 0.8)',
        'rgba(244, 63, 94, 0.8)',
        'rgba(156, 163, 175, 0.8)',
      ],
      borderColor: [
        'rgba(99, 102, 241, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(244, 63, 94, 1)',
        'rgba(156, 163, 175, 1)',
      ],
      borderWidth: 2,
      hoverOffset: 10,
    }
  ]
};

const mockTopProducts = [
  { id: '1', name: 'Perfume A', sales: 124, amount: 24800 },
  { id: '2', name: 'Perfume B', sales: 98, amount: 19600 },
  { id: '3', name: 'Perfume C', sales: 85, amount: 17000 },
  { id: '4', name: 'Perfume D', sales: 72, amount: 14400 },
  { id: '5', name: 'Perfume E', sales: 65, amount: 13000 },
];

const mockTopCustomers = [
  { id: '1', name: 'Juan Pérez', purchases: 12, amount: 10800 },
  { id: '2', name: 'María García', purchases: 10, amount: 9500 },
  { id: '3', name: 'Carlos López', purchases: 8, amount: 7200 },
  { id: '4', name: 'Ana Martínez', purchases: 7, amount: 6300 },
  { id: '5', name: 'Roberto Sánchez', purchases: 6, amount: 5400 },
];

const mockTopSellers = [
  { id: '1', name: 'Laura Jiménez', sales: 45, amount: 40500 },
  { id: '2', name: 'Miguel Ángel', sales: 38, amount: 34200 },
  { id: '3', name: 'Sofía Ramírez', sales: 32, amount: 28800 },
  { id: '4', name: 'Daniel Torres', sales: 28, amount: 25200 },
  { id: '5', name: 'Valentina Díaz', sales: 25, amount: 22500 },
];

const mockLowStockProducts = [
  { id: '1', name: 'Perfume F', stock: 3, minStock: 5 },
  { id: '2', name: 'Perfume G', stock: 2, minStock: 5 },
  { id: '3', name: 'Perfume H', stock: 0, minStock: 5 },
  { id: '4', name: 'Perfume I', stock: 4, minStock: 5 },
  { id: '5', name: 'Perfume J', stock: 1, minStock: 5 },
];

const Dashboard = () => {
  const [startDate, setStartDate] = useState(new Date(new Date().setDate(new Date().getDate() - 30)));
  const [endDate, setEndDate] = useState(new Date());

  // Chart options for dark theme
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: 12
          },
          color: 'rgba(229, 231, 235, 0.9)',
          boxWidth: 15,
          padding: 15
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleFont: {
          family: "'Inter', sans-serif",
          size: 13
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 12
        },
        padding: 12,
        cornerRadius: 8,
        caretSize: 6,
        boxPadding: 4
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(75, 85, 99, 0.2)',
          drawBorder: false
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          color: 'rgba(156, 163, 175, 0.8)',
          padding: 8,
          callback: function(value) {
            return '$' + value.toLocaleString();
          }
        }
      },
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          color: 'rgba(156, 163, 175, 0.8)',
          padding: 8
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          font: {
            family: "'Inter', sans-serif",
            size: 12
          },
          color: 'rgba(229, 231, 235, 0.9)',
          boxWidth: 15,
          padding: 15,
          usePointStyle: true
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.9)',
        titleFont: {
          family: "'Inter', sans-serif",
          size: 13
        },
        bodyFont: {
          family: "'Inter', sans-serif",
          size: 12
        },
        padding: 12,
        cornerRadius: 8,
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.raw || 0;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = Math.round((value / total) * 100);
            return `${label}: ${percentage}% (${value})`;
          }
        }
      }
    },
    cutout: '70%',
    animation: {
      animateScale: true,
      animateRotate: true
    }
  };

  return (
    <div className="space-y-8">
      {/* Date Range Picker */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 mb-1">Dashboard</h1>
          <p className="text-gray-400">Bienvenido al panel de control de Perfumes Elisa</p>
        </div>
        
        <HomeDateRangePicker
          startDate={startDate.toISOString().split('T')[0]}
          endDate={endDate.toISOString().split('T')[0]}
          onStartDateChange={(date) => setStartDate(new Date(date))}
          onEndDateChange={(date) => setEndDate(new Date(date))}
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <HomeKpiCard
          title="Ventas Totales"
          value={mockDashboardMetrics.totalSales}
          prefix="$"
          icon={<DollarSign size={20} />}
          change={{ value: 12.5, isPositive: true }}
        />
        <HomeKpiCard
          title="Pedidos Totales"
          value={mockDashboardMetrics.totalOrders}
          icon={<ShoppingCart size={20} />}
          change={{ value: 8.2, isPositive: true }}
        />
        <HomeKpiCard
          title="Clientes Nuevos"
          value={mockDashboardMetrics.newCustomers}
          icon={<Users size={20} />}
          change={{ value: 5.1, isPositive: true }}
        />
        <HomeKpiCard
          title="Venta Promedio"
          value={mockDashboardMetrics.averageSale}
          prefix="$"
          icon={<TrendingUp size={20} />}
          change={{ value: 3.4, isPositive: false }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <HomeKpiCard
          title="Ventas del Día"
          value={mockDashboardMetrics.dailySales}
          prefix="$"
          icon={<Calendar size={20} />}
        />
        <HomeKpiCard
          title="Ventas a Clientes Nuevos"
          value={mockDashboardMetrics.newCustomerSales}
          prefix="$"
          icon={<Users size={20} />}
          change={{ value: 15.3, isPositive: true }}
        />
        <HomeKpiCard
          title="Cuentas por Cobrar"
          value={mockDashboardMetrics.accountsReceivable}
          prefix="$"
          icon={<Clock size={20} />}
        />
        <HomeKpiCard
          title="Saldos Vencidos"
          value={mockDashboardMetrics.overdueBalance}
          prefix="$"
          icon={<AlertTriangle size={20} />}
          change={{ value: 8.7, isPositive: false }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <HomeChartContainer 
          className="lg:col-span-2" 
          title="Tendencia de Ventas por Período"
          chartData={mockSalesTrendData}
          chartOptions={chartOptions}
          chartType="line"
        />

        <HomeChartContainer 
          title="Ventas por Forma de Pago"
          chartData={mockPaymentMethodsData}
          chartOptions={doughnutOptions}
          chartType="doughnut"
        />
      </div>

      {/* Top Lists and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HomeTopListCard 
          title="Productos Más Vendidos"
          items={mockTopProducts.map(p => ({
            id: p.id,
            name: p.name,
            value: p.amount
          }))}
        />

        <HomeTopListCard 
          title="Clientes con Más Compras"
          items={mockTopCustomers.map(c => ({
            id: c.id,
            name: c.name,
            value: c.amount
          }))}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <HomeTopListCard 
          title="Mejores Vendedores"
          items={mockTopSellers.map(s => ({
            id: s.id,
            name: s.name,
            value: s.amount
          }))}
        />

        <HomeTopListCard 
          title="Productos con Bajo Stock"
          items={mockLowStockProducts.map(p => ({
            id: p.id,
            name: p.name,
            value: p.stock,
            valueLabel: `/ ${p.minStock}`
          }))}
          valueFormatter={(value) => value.toString()}
        />
      </div>
    </div>
  );
};

export default Dashboard;