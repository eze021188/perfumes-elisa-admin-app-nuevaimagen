// src/App.jsx
import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ClientesProvider } from './contexts/ClientesContext';
import { ProductosProvider } from './contexts/ProductosContext'; // CORREGIDO: apuntando a ProductosContext.jsx
import { ComprasProvider } from './contexts/ComprasContext';

import DebugVentas from './pages/DebugVentas';
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Compras from './pages/Compras';
import Ventas from './pages/Ventas';
import Reportes from './pages/Reportes';
import UsersPermissions from './pages/UsersPermissions';
import TestPDF from './pages/TestPDF';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleSidebar = () => setSidebarOpen(o => !o);

  return (
    <ClientesProvider>
      <ProductosProvider>
        <ComprasProvider>
          {/* Toast notifications */}
          <Toaster position="top-right" reverseOrder={false} />

          <BrowserRouter>
            {/* Contenedor principal: flex para layout horizontal, sin fondo aquí */}
            <div className="min-h-screen flex relative">

              {/* Sidebar */}
              <nav
                className={
                  `fixed inset-y-0 left-0 w-64 bg-black text-white p-6 z-50
                  transform transition-transform duration-200 ease-in-out
                  ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                  md:translate-x-0 md:static md:inset-auto flex-shrink-0`
                }
              >
                <h1 className="text-2xl font-bold mb-6">Perfumes Elisa</h1>
                <ul className="space-y-4">
                  {[
                    ['/', 'Inicio'],
                    ['/checkout', 'Checkout'],
                    ['/productos', 'Productos'],
                    ['/clientes', 'Clientes'],
                    ['/compras', 'Compras'],
                    ['/ventas', 'Ventas'],
                    ['/reportes', 'Reportes'],
                    ['/usuarios', 'Usuarios y permisos']
                  ].map(([to, label]) => (
                    <li key={to}>
                      <NavLink
                        to={to}
                        end={to === '/'}
                        className={({ isActive }) =>
                          `block px-4 py-2 rounded transition duration-150 ease-in-out ${
                            isActive ? 'bg-gray-700 text-white' : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                          }`
                        }
                        onClick={() => setSidebarOpen(false)}
                      >
                        {label}
                      </NavLink>
                    </li>
                  ))}
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

              {/* Contenido principal - Este ocupa el espacio completo al lado del sidebar */}
              <main className="flex-1 overflow-auto pt-12 md:pt-0 md:ml-64">
                {/* === NUEVO WRAPPER para centrar el contenido === */}
                <div className="mx-auto max-w-screen-xl p-4 md:p-8">
                   <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/productos" element={<Productos />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/compras" element={<Compras />} />
                    <Route path="/ventas" element={<Ventas />} />
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/usuarios" element={<UsersPermissions />} />
                    <Route path="/test-pdf" element={<TestPDF />} />
                    <Route path="/debug-ventas" element={<DebugVentas />} />

                    {/* Ruta comodín para evitar errores 404 */}
                    <Route path="*" element={<Home />} />
                  </Routes>
                </div> {/* === FIN DEL WRAPPER === */}
              </main>
            </div>
          </BrowserRouter>
        </ComprasProvider>
      </ProductosProvider>
    </ClientesProvider>
  );
}