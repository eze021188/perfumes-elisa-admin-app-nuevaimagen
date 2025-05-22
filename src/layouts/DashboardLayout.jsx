import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { motion } from 'framer-motion';

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

  const navItems = [
    { icon: '📊', label: 'Dashboard', to: '/' },
    { icon: '🛒', label: 'Checkout', to: '/checkout' },
    { icon: '📝', label: 'Presupuestos', to: '/presupuestos/crear' },
    { icon: '📦', label: 'Productos', to: '/productos' },
    { icon: '👥', label: 'Clientes', to: '/clientes' },
    { icon: '💰', label: 'Compras', to: '/compras' },
    { icon: '📈', label: 'Ventas', to: '/ventas' },
    { icon: '📊', label: 'Reportes', to: '/reportes' },
    { icon: '👤', label: 'Usuarios', to: '/usuarios' },
    { icon: '💳', label: 'Saldos', to: '/saldos-clientes' },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Sidebar */}
      <motion.aside
        initial={false}
        animate={{ x: sidebarOpen ? 0 : '-100%' }}
        transition={{ type: 'spring', damping: 20 }}
        className="fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-surface-200 md:translate-x-0"
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-6 border-b border-surface-200">
            <img
              src="/images/PERFUMESELISA.png"
              alt="Perfumes Elisa"
              className="h-8 w-auto"
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `nav-link ${isActive ? 'active' : ''}`
                }
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-sm font-medium">{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {/* User Profile */}
          <div className="p-4 border-t border-surface-200">
            <div className="flex items-center space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 text-sm font-medium">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-surface-900 truncate">
                  {user?.email}
                </p>
                <p className="text-xs text-surface-500 truncate">
                  Administrador
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full btn-secondary"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="md:pl-64 flex flex-col min-h-screen">
        {/* Header */}
        <header className="sticky top-0 z-40 bg-white border-b border-surface-200">
          <div className="flex h-16 items-center justify-between px-4 md:px-6">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="md:hidden p-2 rounded-lg text-surface-500 hover:bg-surface-100"
            >
              {sidebarOpen ? '✕' : '☰'}
            </button>

            <div className="flex items-center space-x-4">
              <div className="relative">
                <button className="p-2 rounded-lg text-surface-500 hover:bg-surface-100">
                  <span className="text-xl">🔔</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}