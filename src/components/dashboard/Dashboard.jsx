import React, { useState } from 'react';
import { Bar, Doughnut } from 'react-chartjs-2';
import { 
  BarChart3, ShoppingCart, Users, DollarSign, Calendar, 
  TrendingUp, Clock, AlertTriangle, Package 
} from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Chart as ChartJS, registerables } from 'chart.js';
ChartJS.register(...registerables);

import KpiCard from './KpiCard';
import Card from '../ui/Card';
import Table from '../ui/Table';
import Badge from '../ui/Badge';
import Button from '../ui/Button';

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
      backgroundColor: 'rgba(59, 130, 246, 0.5)',
      borderColor: 'rgba(59, 130, 246, 1)',
      borderWidth: 1,
    }
  ]
};

const mockPaymentMethodsData = {
  labels: ['Efectivo', 'Tarjeta', 'Transferencia', 'Crédito', 'Otros'],
  datasets: [
    {
      data: [45, 25, 20, 8, 2],
      backgroundColor: [
        'rgba(59, 130, 246, 0.7)', // Azul
        'rgba(16, 185, 129, 0.7)', // Verde
        'rgba(245, 158, 11, 0.7)', // Ámbar
        'rgba(99, 102, 241, 0.7)', // Índigo
        'rgba(156, 163, 175, 0.7)', // Gris
      ],
      borderColor: [
        'rgba(59, 130, 246, 1)',
        'rgba(16, 185, 129, 1)',
        'rgba(245, 158, 11, 1)',
        'rgba(99, 102, 241, 1)',
        'rgba(156, 163, 175, 1)',
      ],
      borderWidth: 1,
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

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        
        <div className="mt-4 md:mt-0 flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Desde:</span>
            <DatePicker
              selected={startDate}
              onChange={(date) => setStartDate(date)}
              selectsStart
              startDate={startDate}
              endDate={endDate}
              className="border border-gray-300 rounded-md p-2 text-sm"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">Hasta:</span>
            <DatePicker
              selected={endDate}
              onChange={(date) => setEndDate(date)}
              selectsEnd
              startDate={startDate}
              endDate={endDate}
              minDate={startDate}
              className="border border-gray-300 rounded-md p-2 text-sm"
            />
          </div>
          <Button 
            variant="primary" 
            size="sm"
            icon={<Calendar size={16} />}
          >
            Aplicar
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="Ventas Totales"
          value={mockDashboardMetrics.totalSales}
          prefix="$"
          icon={<DollarSign size={24} />}
          change={{ value: 12.5, isPositive: true }}
        />
        <KpiCard
          title="Pedidos Totales"
          value={mockDashboardMetrics.totalOrders}
          icon={<ShoppingCart size={24} />}
          change={{ value: 8.2, isPositive: true }}
        />
        <KpiCard
          title="Clientes Nuevos"
          value={mockDashboardMetrics.newCustomers}
          icon={<Users size={24} />}
          change={{ value: 5.1, isPositive: true }}
        />
        <KpiCard
          title="Venta Promedio"
          value={mockDashboardMetrics.averageSale}
          prefix="$"
          icon={<TrendingUp size={24} />}
          change={{ value: 3.4, isPositive: false }}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        <KpiCard
          title="Ventas del Día"
          value={mockDashboardMetrics.dailySales}
          prefix="$"
          icon={<Calendar size={24} />}
        />
        <KpiCard
          title="Ventas a Clientes Nuevos"
          value={mockDashboardMetrics.newCustomerSales}
          prefix="$"
          icon={<Users size={24} />}
          change={{ value: 15.3, isPositive: true }}
        />
        <KpiCard
          title="Cuentas por Cobrar"
          value={mockDashboardMetrics.accountsReceivable}
          prefix="$"
          icon={<Clock size={24} />}
        />
        <KpiCard
          title="Saldos Vencidos"
          value={mockDashboardMetrics.overdueBalance}
          prefix="$"
          icon={<AlertTriangle size={24} />}
          change={{ value: 8.7, isPositive: false }}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Tendencia de Ventas por Período">
          <div className="h-80">
            <Bar 
              data={mockSalesTrendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'top',
                  },
                  tooltip: {
                    mode: 'index',
                    intersect: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      callback: function(value) {
                        return '$' + value.toLocaleString();
                      }
                    }
                  }
                }
              }}
            />
          </div>
        </Card>

        <Card title="Ventas por Forma de Pago">
          <div className="h-80 flex items-center justify-center">
            <Doughnut 
              data={mockPaymentMethodsData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: 'bottom',
                  },
                },
                cutout: '65%',
              }}
            />
          </div>
        </Card>
      </div>

      {/* Top Lists and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Productos Más Vendidos">
          <Table
            data={mockTopProducts}
            columns={[
              { header: 'Producto', accessor: 'name' },
              { 
                header: 'Unidades', 
                accessor: 'sales',
                className: 'text-center' 
              },
              { 
                header: 'Monto', 
                accessor: (row) => `$${row.amount.toLocaleString()}`,
                className: 'text-right' 
              },
            ]}
            keyExtractor={(item) => item.id}
          />
        </Card>

        <Card title="Clientes con Más Compras">
          <Table
            data={mockTopCustomers}
            columns={[
              { header: 'Cliente', accessor: 'name' },
              { 
                header: 'Compras', 
                accessor: 'purchases',
                className: 'text-center' 
              },
              { 
                header: 'Monto', 
                accessor: (row) => `$${row.amount.toLocaleString()}`,
                className: 'text-right' 
              },
            ]}
            keyExtractor={(item) => item.id}
          />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Mejores Vendedores">
          <Table
            data={mockTopSellers}
            columns={[
              { header: 'Vendedor', accessor: 'name' },
              { 
                header: 'Ventas', 
                accessor: 'sales',
                className: 'text-center' 
              },
              { 
                header: 'Monto', 
                accessor: (row) => `$${row.amount.toLocaleString()}`,
                className: 'text-right' 
              },
            ]}
            keyExtractor={(item) => item.id}
          />
        </Card>

        <Card 
          title="Productos con Bajo Stock" 
          icon={<AlertTriangle className="text-warning-500" size={20} />}
        >
          <Table
            data={mockLowStockProducts}
            columns={[
              { 
                header: 'Producto', 
                accessor: 'name' 
              },
              { 
                header: 'Stock Actual', 
                accessor: (row) => (
                  <span className={row.stock === 0 ? 'text-error-600 font-medium' : ''}>
                    {row.stock}
                  </span>
                ),
                className: 'text-center'
              },
              { 
                header: 'Stock Mínimo', 
                accessor: 'minStock',
                className: 'text-center' 
              },
              { 
                header: 'Estado', 
                accessor: (row) => (
                  <Badge 
                    variant={row.stock === 0 ? 'danger' : 'warning'} 
                    rounded={true}
                    icon={row.stock === 0 ? <AlertTriangle size={12} /> : <Package size={12} />}
                  >
                    {row.stock === 0 ? 'Sin Stock' : 'Bajo Stock'}
                  </Badge>
                ),
                className: 'text-center'
              },
            ]}
            keyExtractor={(item) => item.id}
          />
          <div className="mt-4 flex justify-end">
            <Button 
              variant="outline" 
              size="sm"
              icon={<Package size={16} />}
            >
              Gestionar Inventario
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;