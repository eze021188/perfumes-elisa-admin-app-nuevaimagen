import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  Home, 
  ShoppingCart, 
  FileText, 
  Tag, 
  Users, 
  Package, 
  DollarSign, 
  BarChart2, 
  UserCog, 
  CreditCard,
  LogOut
} from 'lucide-react';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error al cerrar sesión.');
    } else {
      toast.success('Sesión cerrada.');
    }
  };

  const links = [
    { to: '/', label: 'Inicio', icon: <Home size={18} /> },
    { to: '/checkout', label: 'Checkout', icon: <ShoppingCart size={18} /> },
    { to: '/presupuestos/crear', label: 'Presupuestos', icon: <FileText size={18} /> },
    { to: '/productos', label: 'Productos', icon: <Tag size={18} /> },
    { to: '/clientes', label: 'Clientes', icon: <Users size={18} /> },
    { to: '/compras', label: 'Compras', icon: <Package size={18} /> },
    { to: '/ventas', label: 'Ventas', icon: <DollarSign size={18} /> },
    { to: '/reportes', label: 'Reportes', icon: <BarChart2 size={18} /> },
    { to: '/usuarios', label: 'Usuarios', icon: <UserCog size={18} /> },
    { to: '/saldos-clientes', label: 'Saldos', icon: <CreditCard size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-soft transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static`}
      >
        <div className="h-full flex flex-col">
          <div className="p-6">
            <img
              src="/images/PERFUMESELISA.png"
              alt="Perfumes Elisa"
              className="h-12 w-auto mx-auto"
            />
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            {links.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <span className="text-current">{icon}</span>
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center space-x-3 px-4 py-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 text-sm font-medium">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  Administrador
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full btn-secondary flex items-center justify-center space-x-2"
            >
              <LogOut size={16} />
              <span>Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-100 h-16 flex items-center px-6">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden text-gray-600 hover:text-gray-900 w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
          
          <div className="flex-1 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800">
              Perfumes Elisa
            </h1>
            
            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100">
                  <span className="text-gray-600">🔔</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}