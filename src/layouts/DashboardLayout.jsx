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
  LogOut,
  Menu,
  X,
  Bell,
  Settings
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
    { to: '/', label: 'Inicio', icon: <Home size={18} className="text-blue-600" /> },
    { to: '/checkout', label: 'Checkout', icon: <ShoppingCart size={18} className="text-indigo-600" /> },
    { to: '/presupuestos/crear', label: 'Presupuestos', icon: <FileText size={18} className="text-purple-600" /> },
    { to: '/productos', label: 'Productos', icon: <Tag size={18} className="text-pink-600" /> },
    { to: '/clientes', label: 'Clientes', icon: <Users size={18} className="text-orange-600" /> },
    { to: '/compras', label: 'Compras', icon: <Package size={18} className="text-yellow-600" /> },
    { to: '/ventas', label: 'Ventas', icon: <DollarSign size={18} className="text-green-600" /> },
    { to: '/reportes', label: 'Reportes', icon: <BarChart2 size={18} className="text-teal-600" /> },
    { to: '/usuarios', label: 'Usuarios', icon: <UserCog size={18} className="text-cyan-600" /> },
    { to: '/saldos-clientes', label: 'Saldos', icon: <CreditCard size={18} className="text-blue-600" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-elegant transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static`}
      >
        <div className="h-full flex flex-col">
          {/* Logo - Ahora 100% más grande */}
          <div className="p-6 flex justify-center items-center border-b border-gray-100">
            <img
              src="/images/PERFUMESELISA.png"
              alt="Perfumes Elisa"
              className="h-24 w-auto" /* Tamaño duplicado de h-12 a h-24 */
            />
          </div>

          {/* Navegación - Ahora con mejor espaciado y colores por sección */}
          <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
            {links.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3 rounded-lg text-gray-700 hover:bg-gray-50 
                   transition-all duration-200 ease-in-out ${isActive ? 'bg-blue-50 text-blue-700 font-medium shadow-sm' : ''}`
                }
              >
                <span className="flex-shrink-0">{icon}</span>
                <span className="font-medium">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Perfil de usuario y botón de cierre de sesión */}
          <div className="p-4 border-t border-gray-100">
            <div className="flex items-center space-x-3 px-4 py-3 mb-4 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
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
              className="w-full flex items-center justify-center space-x-2 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-colors duration-200"
            >
              <LogOut size={16} />
              <span className="font-medium">Cerrar Sesión</span>
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
            aria-label={sidebarOpen ? "Cerrar menú" : "Abrir menú"}
          >
            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          
          <div className="flex-1 flex items-center justify-between">
            <h1 className="text-xl font-semibold text-gray-800 hidden md:block">
              Perfumes Elisa
            </h1>
            
            <div className="flex items-center space-x-4">
              <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors">
                <Bell size={18} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-600 hover:text-gray-900 transition-colors">
                <Settings size={18} />
              </button>
              <div className="hidden md:flex items-center space-x-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {user?.email?.[0].toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-700">
                  {user?.email?.split('@')[0]}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 bg-gray-50">
          <Outlet />
        </main>
        
        {/* Footer */}
        <footer className="bg-white border-t border-gray-100 py-4 px-6 text-center text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Perfumes Elisa. Todos los derechos reservados.</p>
        </footer>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}