import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import Sidebar from '../components/Sidebar'; // Asegúrate de que esta importación sea correcta
import {
  Menu, // Para el botón de hamburguesa en el header
  X,    // Para el botón de cerrar en el header
  Bell,
  Search,
  Settings,
  User,
  ChevronDown,
  LogOut,
  ImageIcon,
  BarChart3, // Importado para el logo de ejemplo en el sidebar
  Home, // Importado para los enlaces de navegación en el sidebar
  ShoppingCart, // Importado para los enlaces de navegación en el sidebar
  ClipboardList, // Importado para los enlaces de navegación en el sidebar
  Package, // Importado para los enlaces de navegación en el sidebar
  Users, // Importado para los enlaces de navegación en el sidebar
  DollarSign // Importado para los enlaces de navegación en el sidebar
} from 'lucide-react';
import { supabase } from '../supabase';
import toast from 'react-hot-toast';

import SearchModal from '../components/common/SearchModal';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [userAvatarUrl, setUserAvatarUrl] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const notificationButtonRef = useRef(null);
  const notificationPanelRef = useRef(null);
  
  const navigate = useNavigate();
  const { user } = useAuth();

  const userMenuButtonRef = useRef(null);
  const userMenuPanelRef = useRef(null);

  // navRoutes ahora se define en Sidebar.jsx, pero aún se puede usar aquí si es necesario para lógica
  // Sin embargo, para la búsqueda global, la definimos aquí para que sea accesible.
  // Solo los campos 'name', 'path', 'description' son relevantes para la búsqueda aquí.
  const navRoutes = useMemo(() => [
    { name: 'Inicio', path: '/', description: 'Panel principal' },
    { name: 'Checkout', path: '/checkout', description: 'Realizar nuevas ventas' },
    { name: 'Presupuestos', path: '/presupuestos/crear', description: 'Crear y gestionar presupuestos' },
    { name: 'Productos', path: '/productos', description: 'Administrar inventario de productos' },
    { name: 'Clientes', path: '/clientes', description: 'Gestionar información de clientes' },
    { name: 'Compras', path: '/compras', description: 'Registrar compras y proveedores' },
    { name: 'Ventas', path: '/ventas', description: 'Ver historial de ventas' },
    { name: 'Reportes', path: '/reportes', description: 'Acceder a informes y estadísticas' },
    { name: 'Usuarios', path: '/usuarios', description: 'Gestionar usuarios y permisos' },
    { name: 'Saldos Clientes', path: '/saldos-clientes', description: 'Ver saldos pendientes de clientes' },
    { name: 'Perfil', path: '/perfil', description: 'Configuración de mi perfil' },
    { name: 'Configuración', path: '/settings', description: 'Ajustes generales de la aplicación' },
    { name: 'Notificaciones', path: '/notifications', description: 'Ver todas las notificaciones' },
  ], []);


  useEffect(() => {
    async function fetchUserAvatar() {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('usuarios')
            .select('profile_pic_url')
            .eq('id', user.id)
            .single();

          if (error && error.code !== 'PGRST116') {
            throw error;
          }

          if (data?.profile_pic_url) {
            setUserAvatarUrl(data.profile_pic_url);
            console.log("DEBUG DASHBOARD: Avatar URL cargado:", data.profile_pic_url);
          } else {
            setUserAvatarUrl(null);
            console.log("DEBUG DASHBOARD: No hay URL de avatar en la BD para el usuario.");
          }
        } catch (err) {
          console.error("DEBUG DASHBOARD: Error al cargar el avatar del usuario:", err.message);
          setUserAvatarUrl(null);
        }
      } else {
        setUserAvatarUrl(null);
      }
    }

    async function fetchNotifications() {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('notificaciones')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(10);

          if (error) throw error;
          setNotifications(data || []);
        } catch (err) {
          console.error("DEBUG DASHBOARD: Error al cargar notificaciones:", err.message);
          setNotifications([]);
        }
      } else {
        setNotifications([]);
      }
    }

    fetchUserAvatar();
    fetchNotifications();

    const handleClickOutside = (event) => {
      if (userMenuPanelRef.current && !userMenuPanelRef.current.contains(event.target) &&
          userMenuButtonRef.current && !userMenuButtonRef.current.contains(event.target)) {
        setUserMenuOpen(false);
      }
      if (notificationPanelRef.current && !notificationPanelRef.current.contains(event.target) &&
          notificationButtonRef.current && !notificationButtonRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };

  }, [user]);


  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(savedTheme);
    } else {
      if (user) {
        async function fetchUserTheme() {
          try {
            const { data, error } = await supabase
              .from('usuarios')
              .select('theme_preference')
              .eq('id', user.id)
              .single();

            if (error && error.code !== 'PGRST116') throw error;

            const userTheme = data?.theme_preference || 'dark';
            document.documentElement.classList.remove('dark', 'light');
            document.documentElement.classList.add(userTheme);
            localStorage.setItem('theme', userTheme);
          } catch (e) {
            console.error("Error al aplicar tema desde DB:", e.message);
            document.documentElement.classList.remove('dark', 'light');
            document.documentElement.classList.add('dark');
            localStorage.setItem('theme', 'dark');
          }
        }
        fetchUserTheme();
      } else {
        document.documentElement.classList.remove('dark', 'light');
        document.documentElement.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      }
    }
  }, [user]);


  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error('Error al cerrar sesión.');
    } else {
      toast.success('Sesión cerrada.');
      navigate('/login');
    }
  };

  const handleGlobalSearch = useCallback(async (term) => {
    setIsLoadingSearch(true);
    setSearchResults([]);
    const lowerCaseTerm = term.toLowerCase();
    console.log("Realizando búsqueda global de rutas para:", term);

    if (!term.trim()) {
        setSearchResults([]);
        setIsLoadingSearch(false);
        return;
    }

    try {
      const formattedNavResults = navRoutes.filter(route =>
        route.name.toLowerCase().includes(lowerCaseTerm) ||
        route.description.toLowerCase().includes(lowerCaseTerm)
      ).map(route => ({
        id: `nav-${route.path}`,
        name: route.name,
        type: 'Acceso a la página',
        description: route.description,
        link: route.path
      }));
      
      setSearchResults(formattedNavResults);

    } catch (error) {
      console.error("Error al realizar búsqueda de rutas:", error.message);
      toast.error('Error al buscar rutas. Intenta de nuevo.');
      setSearchResults([]);
    } finally {
      setIsLoadingSearch(false);
    }
  }, [navRoutes]);

  const unreadNotificationsCount = notifications.filter(n => !n.is_read).length;

  const handleNotificationClick = async (notificationId, link) => {
    setNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (err) {
      console.error("Error al marcar notificación como leída:", err.message);
      toast.error("No se pudo marcar la notificación como leída en la BD.");
    }

    if (link) {
      navigate(link);
      setIsNotificationsOpen(false);
    }
  };

  const markAllNotificationsAsRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;
      toast.success("Todas las notificaciones marcadas como leídas.");
    } catch (err) {
      console.error("Error al marcar todas las notificaciones como leídas:", err.message);
      toast.error("No se pudieron marcar todas las notificaciones como leídas en la BD.");
    }
  };


  return (
    <div className="min-h-screen bg-dark-950 text-gray-100 light:bg-light-100 light:text-light-900 flex">
      {/* Sidebar - Ahora es un componente separado */}
      {/* Pasamos isOpen y toggleSidebar al componente Sidebar */}
      {/* El Sidebar se renderiza aquí, y su visibilidad es controlada por sus propias clases */}
      <Sidebar isOpen={sidebarOpen} toggleSidebar={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content Area - Se ajusta para el sidebar fijo */}
      <div className="flex-1 flex flex-col min-h-screen lg:ml-64">
        {/* Top Navigation Bar */}
        <header className="h-16 bg-dark-900 border-b border-dark-800 light:bg-light-200 light:border-light-300 px-4 flex items-center justify-between sticky top-0 z-10">
          {/* Left Section (Botón de hamburguesa para móvil y título de la app) */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)} /* Este es el botón de hamburguesa */
              className="lg:hidden w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-800 text-gray-400 hover:text-gray-100 light:hover:bg-light-300 light:text-light-600 light:hover:text-light-800 transition-colors"
              aria-label="Toggle sidebar"
            >
              {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="text-xl font-semibold text-gray-100 light:text-light-800 hidden lg:block">Perfumes Elisa</span>
          </div>

          {/* Right Section - Iconos de usuario */}
          <div className="flex items-center space-x-2">
            {/* Search Button (abre el modal) */}
            <button
              onClick={() => setIsSearchModalOpen(true)}
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-800 text-gray-400 hover:text-gray-100 light:hover:bg-light-300 light:text-light-600 light:hover:text-light-800 transition-colors"
              aria-label="Abrir búsqueda global"
            >
              <Search size={20} />
            </button>

            {/* Notifications Button */}
            <div className="relative">
              <button
                ref={notificationButtonRef}
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-800 text-gray-400 hover:text-gray-100 light:hover:bg-light-300 light:text-light-600 light:hover:text-light-800 transition-colors relative"
                aria-label="Ver notificaciones"
              >
                <Bell size={20} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full transform translate-x-1/2 -translate-y-1/2">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>

              {isNotificationsOpen && (
                <div
                  ref={notificationPanelRef}
                  className="absolute right-0 mt-2 w-80 bg-dark-800 rounded-lg shadow-lg z-40 border border-dark-700 light:bg-white light:border-light-300 max-h-96 overflow-y-auto"
                >
                  <div className="p-4 border-b border-dark-700 light:border-light-300 flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-100 light:text-light-800">Notificaciones</h3>
                    {unreadNotificationsCount > 0 && (
                      <button
                        onClick={markAllNotificationsAsRead}
                        className="text-primary-400 text-sm hover:text-primary-300 transition-colors"
                      >
                        Marcar todo leído
                      </button>
                    )}
                  </div>
                  {notifications.length === 0 ? (
                    <p className="text-gray-400 p-4 text-center light:text-light-600">No hay notificaciones.</p>
                  ) : (
                    <ul>
                      {notifications.map(notif => (
                        <li
                          key={notif.id}
                          className={`p-3 border-b last:border-b-0 border-dark-700 light:border-light-300 cursor-pointer ${notif.is_read ? 'bg-dark-800 text-gray-400 light:bg-light-50 light:text-light-500' : 'bg-dark-700/50 text-gray-100 light:bg-light-200 light:text-light-900 hover:bg-dark-700/70 light:hover:bg-light-300'}`}
                          onClick={() => handleNotificationClick(notif.id, notif.link)}
                        >
                          <p className={`text-sm ${notif.is_read ? 'text-gray-300 light:text-light-700' : 'font-medium text-gray-100 light:text-light-900'}`}>{notif.message}</p>
                          <span className="text-xs text-gray-500 mt-1 block light:text-light-600">{new Date(notif.created_at).toLocaleString()}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="p-3 text-center border-t border-dark-700 light:border-light-300">
                    <Link to="/notifications" onClick={() => setIsNotificationsOpen(false)} className="text-primary-400 text-sm hover:underline">Ver todas las notificaciones</Link>
                  </div>
                </div>
              )}
            </div>

            {/* Settings Button (general application settings) */}
            <Link
              to="/settings"
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-dark-800 text-gray-400 hover:text-gray-100 light:hover:bg-light-300 light:text-light-600 light:hover:text-light-800 transition-colors"
              aria-label="Ajustes de la aplicación"
            >
              <Settings size={20} />
            </Link>

            {/* User Menu */}
            <div className="relative">
              <button
                ref={userMenuButtonRef}
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-dark-800 transition-colors light:hover:bg-light-300"
                aria-label="Menú de usuario"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-600 flex items-center justify-center text-white font-medium overflow-hidden">
                  {userAvatarUrl ? (
                    <img src={userAvatarUrl} alt="Avatar de usuario" className="w-full h-full object-cover" />
                  ) : (
                    user?.email?.[0].toUpperCase() || <ImageIcon size={20} className="text-gray-300 light:text-light-700" />
                  )}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-100 light:text-light-800">
                  {user?.email?.split('@')[0]}
                </span>
                <ChevronDown size={16} className={`text-gray-400 light:text-light-600 transition-transform ${userMenuOpen ? 'rotate-180' : 'rotate-0'}`} />
              </button>

              {userMenuOpen && (
                <div
                  ref={userMenuPanelRef}
                  className="absolute right-0 mt-2 w-48 bg-dark-800 rounded-lg shadow-dropdown-dark border border-dark-700 light:bg-white light:border-light-300 z-20 py-1"
                >
                  <Link
                    to="/perfil"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-700 hover:text-primary-400 light:text-light-700 light:hover:bg-light-200 light:hover:text-primary-600 transition-colors"
                  >
                    <User size={16} className="inline-block mr-2" /> Perfil
                  </Link>
                  <Link
                    to="/user-settings"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center px-4 py-2 text-left text-sm text-gray-300 hover:bg-dark-700 hover:text-primary-400 light:text-light-700 light:hover:bg-light-200 light:hover:text-primary-600 transition-colors"
                  >
                    <Settings size={16} className="inline-block mr-2" /> Configuración
                  </Link>
                  <div className="border-t border-dark-700 my-1 light:border-light-300"></div>
                  <button
                    onClick={handleLogout}
                    className="w-full px-4 py-2 text-left text-sm text-error-400 hover:bg-dark-700 hover:text-error-300 light:text-error-600 light:hover:bg-light-200 transition-colors flex items-center"
                  >
                    <LogOut size={16} className="mr-2" />
                    Cerrar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 p-6 bg-gradient-to-br from-dark-950 to-dark-900 light:from-light-100 light:to-light-200 overflow-auto">
          <Outlet />
        </main>

        {/* Footer */}
        <footer className="bg-dark-900 border-t border-dark-800 light:bg-light-200 light:border-light-300 py-4 px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500 light:text-light-600">
              © {new Date().getFullYear()} Perfumes Elisa. Todos los derechos reservados.
            </p>
            <div className="flex items-center space-x-6">
              <a href="#" className="text-sm text-gray-500 hover:text-gray-400 light:text-light-600 light:hover:text-light-800 transition-colors">Términos</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-400 light:text-light-600 light:hover:text-light-800 transition-colors">Privacidad</a>
              <a href="#" className="text-sm text-gray-500 hover:text-gray-400 light:text-light-600 light:hover:text-light-800 transition-colors">Soporte</a>
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Search Modal Component */}
      <SearchModal
        isOpen={isSearchModalOpen}
        onClose={() => {
          setIsSearchModalOpen(false);
          setSearchResults([]);
          setIsLoadingSearch(false);
        }}
        onSearch={handleGlobalSearch}
        searchResults={searchResults}
        isLoadingSearch={isLoadingSearch}
      />
    </div>
  );
}
