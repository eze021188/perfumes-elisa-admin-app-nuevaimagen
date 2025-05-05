// src/App.jsx
import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import { ClientesProvider } from './contexts/ClientesContext'
import { ProductosProvider } from './contexts/ProductosContext'
import { InventariosProvider } from './contexts/InventariosContext'
import { ComprasProvider } from './contexts/ComprasContext'

import Home from './pages/Home'
import Checkout from './pages/Checkout'
import Productos from './pages/Productos'
import Clientes from './pages/Clientes'
import Compras from './pages/Compras'
import Ventas from './pages/Ventas'
import Inventarios from './pages/Inventarios'
import Reportes from './pages/Reportes'
import UsersPermissions from './pages/UsersPermissions'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const toggleSidebar = () => setSidebarOpen(o => !o)

  return (
    <ClientesProvider>
      <ProductosProvider>
        <InventariosProvider>
          <ComprasProvider>
            <BrowserRouter>
              <div className="min-h-screen flex bg-pink-50 relative">

                {/* Sidebar */}
                <nav
                  className={`
                    fixed inset-y-0 left-0 w-64 bg-black text-white p-6 z-50
                    transform transition-transform duration-200 ease-in-out
                    ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                    md:translate-x-0 md:static md:inset-auto
                  `}
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
                      ['/inventarios', 'Stock'],
                      ['/reportes', 'Reportes'],
                      ['/usuarios', 'Usuarios y permisos']
                    ].map(([to, label]) => (
                      <li key={to}>
                        <NavLink
                          to={to}
                          end={to === '/'}
                          className={({ isActive }) =>
                            `block px-4 py-2 rounded ${
                              isActive ? 'bg-gray-700' : 'hover:bg-gray-800'
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
                  className={`
                    fixed top-4 left-4 z-60 bg-black text-white rounded-md
                    w-14 h-12 flex items-center justify-center
                    md:hidden transform transition-transform duration-200
                    ${sidebarOpen ? 'translate-x-64' : 'translate-x-0'}
                  `}
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
                <main className="flex-1 py-6 pr-4 pl-14 md:ml-64 md:pl-4">
                  <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/checkout" element={<Checkout />} />
                    <Route path="/productos" element={<Productos />} />
                    <Route path="/clientes" element={<Clientes />} />
                    <Route path="/compras" element={<Compras />} />
                    <Route path="/ventas" element={<Ventas />} />
                    <Route path="/inventarios" element={<Inventarios />} />
                    <Route path="/reportes" element={<Reportes />} />
                    <Route path="/usuarios" element={<UsersPermissions />} />
                  </Routes>
                </main>
              </div>
            </BrowserRouter>
          </ComprasProvider>
        </InventariosProvider>
      </ProductosProvider>
    </ClientesProvider>
  )
}
