// src/components/Sidebar.jsx
import React from 'react';
import { NavLink } from 'react-router-dom';

export default function Sidebar({ open, onClose }) {
  const links = [
    ['/', 'Inicio'],
    ['/checkout', 'Checkout'],
    ['/presupuestos/crear', 'Presupuestos'],
    ['/productos', 'Productos'],
    ['/clientes', 'Clientes'],
    ['/compras', 'Compras'],
    ['/ventas', 'Ventas'],
    ['/reportes', 'Reportes'],
    ['/usuarios', 'Usuarios y permisos'],
    ['/saldos-clientes', 'Saldos Clientes'],
  ];

  return (
    <nav
      className={`fixed inset-y-0 left-0 w-64 bg-black text-white p-6 z-50
        transform transition-transform duration-200 ease-in-out
        ${open ? 'translate-x-0' : '-translate-x-full'}
        md:translate-x-0 md:static md:inset-auto flex-shrink-0`}
    >
      <h1 className="text-2xl font-bold mb-6">Perfumes Elisitaa</h1>
      <ul className="space-y-4">
        {links.map(([to, label]) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `block px-4 py-2 rounded transition duration-150 ease-in-out ${
                  isActive
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }`
              }
              onClick={onClose}
            >
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
