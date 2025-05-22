import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';

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

  const navigation = [
    { name: 'Dashboard', href: '/', icon: '📊' },
    { name: 'Ventas', href: '/checkout', icon: '🛒' },
    { name: 'Presupuestos', href: '/presupuestos/crear', icon: '📝' },
    { name: 'Productos', href: '/productos', icon: '🏷️' },
    { name: 'Clientes', href: '/clientes', icon: '👥' },
    { name: 'Compras', href: '/compras', icon: '📦' },
    { name: 'Historial', href: '/ventas', icon: '📋' },
    { name: 'Reportes', href: '/reportes', icon: '📈' },
    { name: 'Usuarios', href: '/usuarios', icon: '👤' },
    { name: 'Saldos', href: '/saldos-clientes', icon: '💰' },
  ];

  return (
    <div className="min-h-screen bg-surface-50">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 bg-surface-900/20 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.nav
        initial={false}
        animate={{
          x: sidebarOpen ? 0 : -320,
          width: 320,
        }}
        className={`fixed top-0 bottom-0 left-0 z-50 flex flex-col bg-white border-r border-surface-200/80 lg:translate-x-0`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-6 border-b border-surface-200/80">
            <img
              src="/images/PERFUMESELISA.png"
              alt="Perfumes Elisa"
              className="h-8 w-auto"
            />
          </div>

          {/* Navigation */}
          <div className="flex-1 px-3 py-4 overflow-y-auto">
            <nav className="flex-1 space-y-1">
              {navigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  end={item.href === '/'}
                  className={({ isActive }) =>
                    `nav-link ${isActive ? 'active' : ''}`
                  }
                >
                  <span className="text-xl">{item.icon}</span>
                  <span className="text-sm font-medium">{item.name}</span>
                </NavLink>
              ))}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex flex-col gap-3 p-4 border-t border-surface-200/80">
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                <span className="text-sm font-medium text-primary-700">
                  {user?.email?.[0].toUpperCase()}
                </span>
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
              className="btn-secondary w-full justify-center"
            >
              Cerrar Sesión
            </button>
          </div>
        </div>
      </motion.nav>

      {/* Main Content */}
      <div className="lg:pl-[320px]">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-x-4 border-b border-surface-200/80 bg-white/95 px-4 shadow-sm backdrop-blur-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <button
            type="button"
            className="-m-2.5 p-2.5 text-surface-700 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <span className="sr-only">Abrir menú</span>
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="1.5"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5"
              />
            </svg>
          </button>

          <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex flex-1 items-center gap-x-4 lg:gap-x-6">
              <h1 className="text-lg font-semibold text-surface-900">
                Perfumes Elisa
              </h1>
            </div>

            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <button
                type="button"
                className="-m-2.5 p-2.5 text-surface-400 hover:text-surface-500"
              >
                <span className="sr-only">Ver notificaciones</span>
                <svg
                  className="h-6 w-6"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                  />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="py-8">
          <div className="px-4 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}