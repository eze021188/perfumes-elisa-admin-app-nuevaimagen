import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar';
import { 
  Menu, 
  X, 
  Bell, 
  Search,
  Settings,
  User,
  ChevronDown,
  LogOut
} from 'lucide-react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error al cerrar sesión.');
    } else {
      toast.success('Sesión cerrada.');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-gray-100 flex">
      {/* Sidebar */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-dark-900 border-b border-dark-800 px-4 flex items-center justify-between sticky top-0 z-10">
          {/* Left Section */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-800 text-gray-400 hover:text-gray-100 transition-colors"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            {/* Search */}
            <div className="relative">
              <button
                onClick={() => setSearchOpen(!searchOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-800 text-gray-400 hover:text-gray-100 transition-colors"
              >
                <Search size={20} />
              </button>
              {searchOpen && (
                <div className="absolute right-0 mt-2 w-72 bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700">
                  <input
                    type="text"
                    placeholder="Buscar..."
                    className="w-full px-4 py-2 bg-dark-900 border-none rounded-lg text-gray-100 placeholder-gray-500 focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              )}
            </div>

            {/* Notifications */}
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-800 text-gray-400 hover:text-gray-100 transition-colors">
              <Bell size={20} />
            </button>

            {/* Settings */}
            <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-800 text-gray-400 hover:text-gray-100 transition-colors">
              <Settings size={20} />
            </button>

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-dark-800 transition-colors"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-medium">
                  {user?.email?.[0].toUpperCase()}
                </div>
                <span className="hidden md:block text-sm font-medium">
                  {user?.email?.split('@')[0]}
                </span>
                <ChevronDown size={16} className="text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700">
                  <div className="py-1">
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors">
                      Perfil
                    </button>
                    <button className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-700 hover:text-white transition-colors">
                      Configuración
                    </button>
                    <div className="border-t border-dark-700"></div>
                    <button 
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-error-400 hover:bg-dark-700 hover:text-error-300 transition-colors flex items-center"
                    >
                      <LogOut size={16} className="mr-2" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gradient-to-br from-dark-950 to-dark-900 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-dark-900 border-t border-dark-800 py-4 px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Perfumes Elisa. Todos los derechos reservados.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">Términos</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">Privacidad</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-400 transition-colors">Soporte</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}