import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home, ShoppingCart, ClipboardList, Package, Users,
  DollarSign, BarChart3, Settings, Bell, User, X,
  LayoutDashboard, FileText, Store, PackageSearch, Receipt, Shield, Wallet
} from 'lucide-react';

export default function Sidebar({ isOpen, toggleSidebar }) {
  const location = useLocation(); // Para resaltar el enlace activo

  const navItems = [
    { name: 'Inicio', icon: LayoutDashboard, path: '/' },
    { name: 'Checkout', icon: ShoppingCart, path: '/checkout' },
    { name: 'Presupuestos', icon: FileText, path: '/presupuestos/crear' },
    { name: 'Productos', icon: Store, path: '/productos' },
    { name: 'Clientes', icon: Users, path: '/clientes' },
    { name: 'Compras', icon: PackageSearch, path: '/compras' },
    { name: 'Ventas', icon: Receipt, path: '/ventas' },
    { name: 'Reportes', icon: BarChart3, path: '/reportes' },
    { name: 'Usuarios', icon: Shield, path: '/usuarios' },
    { name: 'Saldos Clientes', icon: Wallet, path: '/saldos-clientes' },

  ];

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden"
          onClick={toggleSidebar}
        ></div>
      )}

      <aside className={`
        fixed inset-y-0 left-0 w-64 p-5 flex-col shadow-lg z-40
        bg-dark-900 text-gray-100 light:bg-light-200 light:text-light-800
        transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        ${isOpen ? 'flex' : 'hidden'} flex-col
        lg:translate-x-0 lg:flex lg:flex-col
      `}>
        {/* Contenido del Sidebar */}
        <div className="flex flex-col items-center justify-center mb-8 h-24"> {/* Centrado y altura para el logo */}
            <Link to="/" className="flex flex-col items-center justify-center h-full" onClick={toggleSidebar}> {/* Centrado */}
                {/* Logo de la empresa - Más grande y centrado */}
                <img
                    src="/images/PERFUMESELISA.png"
                    alt="Perfumes Elisa Logo"
                    className="h-40 w-auto object-contain" // Ajustado para ser más grande y centrado
                />
                {/* El texto "Perfumes Elisa" y el comentario han sido eliminados */}
                {/* <span className="text-base font-bold md:text-lg lg:text-xl text-gray-100 light:text-light-800">Perfumes Elisa</span> */}
            </Link>
            {/* Botón de cerrar sidebar en móvil (solo visible en móvil) */}
            <button onClick={toggleSidebar} className="absolute top-4 right-4 lg:hidden text-gray-400 hover:text-gray-100 light:text-light-600 light:hover:text-light-800"> {/* Posición absoluta para botón de cerrar */}
                <X size={24} />
            </button>
        </div>
        <nav className="flex-grow">
            {navItems.map(item => (
                <Link
                    key={item.name}
                    to={item.path}
                    onClick={toggleSidebar}
                    className={`nav-link-dark group flex items-center space-x-3 px-4 py-2 my-1 rounded-lg transition-colors
                      ${location.pathname === item.path
                        ? 'active'
                        : ''
                      }`}
                >
                    <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-dark-800 group-hover:bg-primary-900/50 transition-colors light:bg-light-100 light:group-hover:bg-primary-200">
                        {item.icon && <item.icon size={20} />}
                    </div>
                    <span className="text-base">{item.name}</span>
                </Link>
            ))}
        </nav>
      </aside>
    </>
  );
}
