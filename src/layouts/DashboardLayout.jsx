import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  Store, 
  Users, 
  PackageSearch, 
  Receipt, 
  BarChart3, 
  Shield, 
  Wallet,
  LogOut,
  Menu,
  X,
  Bell,
  Settings,
  Search
} from 'lucide-react';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
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
    { to: '/', label: 'Dashboard', icon: <LayoutDashboard size={20} className="text-blue-600" /> },
    { to: '/checkout', label: 'Checkout', icon: <ShoppingCart size={20} className="text-purple-600" /> },
    { to: '/presupuestos/crear', label: 'Presupuestos', icon: <FileText size={20} className="text-indigo-600" /> },
    { to: '/productos', label: 'Productos', icon: <Store size={20} className="text-emerald-600" /> },
    { to: '/clientes', label: 'Clientes', icon: <Users size={20} className="text-cyan-600" /> },
    { to: '/compras', label: 'Compras', icon: <PackageSearch size={20} className="text-amber-600" /> },
    { to: '/ventas', label: 'Ventas', icon: <Receipt size={20} className="text-rose-600" /> },
    { to: '/reportes', label: 'Reportes', icon: <BarChart3 size={20} className="text-violet-600" /> },
    { to: '/usuarios', label: 'Usuarios', icon: <Shield size={20} className="text-teal-600" /> },
    { to: '/saldos-clientes', label: 'Saldos', icon: <Wallet size={20} className="text-pink-600" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white shadow-elegant transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:static`}
      >
        <div className="h-full flex flex-col">
          {/* Logo - 100% más grande */}
          <div className="p-8 flex justify-center items-center border-b border-gray-100">
            <img
              src="/images/PERFUMESELISA.png"
              alt="Perfumes Elisa"
              className="h-32 w-auto" /* Tamaño duplicado de h-16 a h-32 */
            />
          </div>

          {/* Navegación con iconos mejorados y efectos */}
          <nav className="flex-1 px-6 py-6 space-y-1.5 overflow-y-auto">
            {links.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center space-x-3 px-4 py-3.5 rounded-xl text-gray-600 transition-all duration-200 ease-in-out
                   hover:bg-gray-50 hover:scale-[1.02] ${
                    isActive 
                      ? 'bg-blue-50/50 text-blue-700 font-medium shadow-sm backdrop-blur-sm border border-blue-100/50' 
                      : 'hover:text-blue-600'
                   }`
                }
              >
                <span className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-xl bg-white shadow-soft">
                  {icon}
                </span>
                <span className="font-medium">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Perfil de usuario y botón de cierre de sesión */}
          <div className="p-6 border-t border-gray-100 space-y-4">
            <div className="p-4 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100/50">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <span className="text-white text-lg font-medium">
                    {user?.email?.[0].toUpperCase()}
                  </span>
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
            </div>
            
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 hover:text-red-600 hover:border-red-100 transition-all duration-200 shadow-sm hover:shadow"
            >
              <LogOut size={18} />
              <span className="font-medium">Cerrar Sesión</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden">
        {/* Header con diseño premium */}
        <header className="bg-white shadow-sm border-b border-gray-100 h-20">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="md:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
              >
                {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
              
              <h1 className="text-xl font-semibold text-gray-800 hidden md:block">
                Perfumes Elisa
              </h1>
            </div>
            
            <div className="flex items-center space-x-2">
              <div className="relative">
                <button
                  onClick={() => setSearchOpen(!searchOpen)}
                  className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors"
                >
                  <Search size={18} />
                </button>
                {searchOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-elegant border border-gray-100 p-2">
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
              
              <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
                <Bell size={18} />
              </button>
              
              <button className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors">
                <Settings size={18} />
              </button>
              
              <div className="hidden md:flex items-center space-x-3 ml-4 pl-4 border-l border-gray-200">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                  <span className="text-white text-sm font-medium">
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

        {/* Page Content con fondo elegante */}
        <main className="flex-1 p-8 bg-gradient-to-br from-gray-50 to-blue-50/30">
          <Outlet />
        </main>
        
        {/* Footer elegante */}
        <footer className="bg-white border-t border-gray-100 py-6 px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Perfumes Elisa. Todos los derechos reservados.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Términos</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Privacidad</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">Soporte</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Overlay con efecto de cristal */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}