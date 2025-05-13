// src/layouts/DashboardLayout.jsx
import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom'; // Importa useNavigate
import { supabase } from '../supabase'; // Importa la instancia de Supabase
// Puedes importar useAuth si necesitas mostrar información del usuario logueado en el sidebar
// import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast'; // Importa toast para mensajes

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(o => !o);
  const navigate = useNavigate(); // Inicializa useNavigate

  // Puedes obtener el usuario del contexto si necesitas mostrar su nombre o email
  // const { user } = useAuth();

  // Estado para controlar qué menú desplegable está abierto
  const [expandedMenu, setExpandedMenu] = useState(null); // Usamos null o el 'label' del menú padre

  // Función para alternar la visibilidad de un menú desplegable
  const toggleMenu = (label) => {
    setExpandedMenu(expandedMenu === label ? null : label);
  };

  // Función para manejar el cierre de sesión
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error('Error al cerrar sesión:', error.message);
      // Opcional: mostrar un toast de error
      toast.error('No se pudo cerrar sesión.');
    } else {
      console.log('Sesión cerrada con éxito.');
      // La redirección a /login se maneja automáticamente por ProtectedRoute en App.jsx
      // una vez que el AuthContext detecte que la sesión es null.
      // No necesitas llamar a navigate aquí, aunque podrías si quisieras forzarla.
      // navigate('/login', { replace: true }); // Opcional: forzar redirección
       toast.success('Sesión cerrada.'); // Mensaje de éxito
    }
  };

  // Estructura de los ítems de navegación, ahora con soporte para hijos
  const navItems = [
    { to: '/', label: 'Inicio' },
    {
      label: 'Ventas', // Elemento padre para Ventas
      children: [
        { to: '/checkout', label: 'Procesar Venta' },
        { to: '/crear-presupuesto', label: 'Presupuesto' },
        { to: '/ventas', label: 'Historial de Ventas' }, // Renombrado para claridad
      ]
    },
    {
      label: 'Inventario', // Elemento padre para Inventario
      children: [
        { to: '/productos', label: 'Productos' }, // Podría ser 'Gestión de Productos'
        { to: '/compras', label: 'Compras' },
        // { to: '/productos-stock', label: 'Stock Actual' }, // Si tienes una página específica para stock
      ]
    },
     {
       label: 'Clientes', // Elemento padre para Clientes
       children: [
         { to: '/clientes', label: 'Gestión de Clientes' }, // Podría ser 'Listado de Clientes'
         { to: '/saldos-clientes', label: 'Saldos Pendientes' }, // Renombrado para claridad
       ]
     },
    { to: '/reportes', 'label': 'Reportes' }, // Reportes como enlace directo por ahora
     {
       label: 'Administración', // Elemento padre para Administración
       children: [
         { to: '/usuarios', 'label': 'Usuarios y permisos' },
         // { to: '/configuracion', label: 'Configuración' }, // Si tienes más opciones de admin
       ]
     },
    // Puedes añadir enlaces de Debug aquí si quieres que estén en el sidebar
    // { to: '/test-pdf', label: 'Test PDF' },
    // { to: '/debug-ventas', label: 'Debug Ventas' },
  ];


  return (
    <div className="min-h-screen flex relative bg-gray-100"> {/* Añadido fondo gris claro */}

      {/* Sidebar */}
      <nav
        className={
          `fixed inset-y-0 left-0 w-64 bg-black text-white p-6 z-50
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
          md:translate-x-0 md:static md:inset-auto flex-shrink-0`
        }
      >
        {/* --- Aquí añadimos la imagen de tu logo --- */}
        <div className="flex justify-center mb-6"> {/* Contenedor para centrar el logo */}
            <img
                src="/images/PERFUMESELISAblack.jpg" // Ruta a tu logo en la carpeta public/imagen
                alt="Logo Perfumes Elisa" // Texto alternativo
                className="h-auto w-32" // Clases de Tailwind para tamaño (altura automática, ancho fijo)
            />
        </div>
        {/* --- Fin de la imagen del logo --- */}

        {/* Eliminamos el h1 "Perfumes Elisa" ya que ahora tenemos el logo */}
        {/* <h1 className="text-2xl font-bold mb-6">Perfumes Elisa</h1> */}

        <ul className="space-y-2"> {/* Espaciado vertical reducido */}
          {navItems.map((item) => (
            <li key={item.label}>
              {item.children ? (
                // Si el ítem tiene hijos, renderizar como un encabezado desplegable
                <>
                  <button
                    onClick={() => toggleMenu(item.label)}
                    className={`w-full text-left px-4 py-2 rounded transition duration-150 ease-in-out font-semibold ${
                      expandedMenu === item.label ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    {item.label}
                    {/* Indicador de desplegable (opcional) */}
                    <span className="float-right">
                       {expandedMenu === item.label ? '▼' : '►'}
                    </span>
                  </button>
                  {/* Renderizar ítems hijos si el menú está expandido */}
                  {expandedMenu === item.label && (
                    <ul className="ml-4 mt-1 space-y-1 border-l border-gray-700"> {/* Indentación y borde para sub-menú */}
                      {item.children.map((child) => (
                        <li key={child.to}>
                          <NavLink
                            to={child.to}
                            end={child.to === '/'}
                            className={({ isActive }) =>
                              `block px-4 py-2 rounded transition duration-150 ease-in-out text-sm ${ // Tamaño de fuente reducido para hijos
                                isActive ? 'bg-gray-600 text-white' : 'text-gray-400 hover:bg-gray-700 hover:text-white' // Colores ajustados para hijos
                              }`
                            }
                            onClick={() => setSidebarOpen(false)} // Cierra el sidebar móvil al hacer clic
                          >
                            {child.label}
                          </NavLink>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                // Si el ítem no tiene hijos, renderizar como un enlace normal
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `block px-4 py-2 rounded transition duration-150 ease-in-out ${
                      isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`
                  }
                  onClick={() => setSidebarOpen(false)} // Cierra el sidebar móvil al hacer clic
                >
                  {item.label}
                </NavLink>
              )}
            </li>
          ))}

           {/* Botón de Cerrar Sesión como un ítem de la lista */}
           {/* Añadimos mt-4 para un pequeño espacio superior */}
           <li className="mt-4 pt-4 border-t border-gray-700"> {/* Añadido margen superior y borde */}
                {/* Puedes mostrar el email del usuario aquí usando el contexto */}
                 {/* {user && <p className="text-sm text-gray-400 mb-3">Logueado como: {user.email}</p>} */}
                <button
                    onClick={handleLogout} // Llama a la función de cerrar sesión
                    className="w-full text-left px-4 py-2 bg-red-600 text-white font-semibold rounded-md hover:bg-red-700 transition duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                    Cerrar Sesión
                </button>
            </li>
        </ul>

      </nav>

      {/* Toggle móvil */}
      <button
        className={
          `fixed top-4 left-4 z-60 bg-gray-800 text-white rounded-md
          w-10 h-10 flex items-center justify-center text-xl
          md:hidden transition-transform duration-200 shadow-lg
          ${sidebarOpen ? 'translate-x-64' : 'translate-x-0'}`
        }
        onClick={toggleSidebar}
        aria-label="Toggle menu"
      >
        {sidebarOpen ? '✕' : '☰'}
      </button>

      {/* Overlay móvil */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Contenido principal */}
      {/* flex-1 para ocupar el espacio restante, overflow-auto para scroll si el contenido es largo */}
      {/* pt-12 para dejar espacio al toggle móvil, md:pt-0 y md:ml-64 para ajustar en desktop */}
      <main className="flex-1 overflow-auto pt-12 md:pt-0 md:ml-64">
        {/* Outlet renderiza el componente de la ruta anidada que coincide */}
        <Outlet />
      </main>

    </div>
  );
}
