import React from 'react';
import { NavLink } from 'react-router-dom';
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
  Wallet
} from 'lucide-react';

export default function Sidebar({ open, onClose }) {
  const links = [
    { to: '/', icon: <LayoutDashboard size={20} />, label: 'Inicio' },
    { to: '/checkout', icon: <ShoppingCart size={20} />, label: 'Checkout' },
    { to: '/presupuestos/crear', icon: <FileText size={20} />, label: 'Presupuestos' },
    { to: '/productos', icon: <Store size={20} />, label: 'Productos' },
    { to: '/clientes', icon: <Users size={20} />, label: 'Clientes' },
    { to: '/compras', icon: <PackageSearch size={20} />, label: 'Compras' },
    { to: '/ventas', icon: <Receipt size={20} />, label: 'Ventas' },
    { to: '/reportes', icon: <BarChart3 size={20} />, label: 'Reportes' },
    { to: '/usuarios', icon: <Shield size={20} />, label: 'Usuarios' },
    { to: '/saldos-clientes', icon: <Wallet size={20} />, label: 'Saldos' },
  ];

  return (
    <nav
      className={`fixed inset-y-0 left-0 w-64 bg-dark-900 text-gray-100 z-50
        transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0 lg:static lg:inset-auto flex-shrink-0
        border-r border-dark-800`}
    >
      <div className="h-full flex flex-col">
        {/* Logo and Brand */}
        <div className="p-6 border-b border-dark-800 flex justify-center">
          <img
            src="/images/PERFUMESELISA.png"
            alt="Perfumes Elisa"
            className="h-24 w-auto object-contain"
          />
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2">
          {links.map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `nav-link-dark group ${isActive ? 'active' : ''}`
              }
              onClick={onClose}
            >
              <div className="w-10 h-10 flex items-center justify-center rounded-lg bg-dark-800 group-hover:bg-primary-900/50 transition-colors">
                {icon}
              </div>
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </div>
    </nav>
  );
}