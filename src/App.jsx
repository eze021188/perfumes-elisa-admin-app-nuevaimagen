// src/App.jsx
import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { supabase } from './supabase'

import { ClientesProvider } from './contexts/ClientesContext'
import { ProductosProvider } from './contexts/ProductosContext'
import { ComprasProvider } from './contexts/ComprasContext'

// Páginas públicas
import Login from './pages/Login'
import InviteCallback from './pages/InviteCallback'

// Layout y páginas privadas
import DashboardLayout from './layouts/DashboardLayout'
import Home from './pages/Home'
import Checkout from './pages/Checkout'
import Productos from './pages/Productos'
import Clientes from './pages/Clientes'
import Compras from './pages/Compras'
import Ventas from './pages/Ventas'
import Reportes from './pages/Reportes'
import UsersPermissions from './pages/UsersPermissions'
import SaldosClientes from './pages/SaldosClientes'

// Componente para proteger rutas
function ProtectedRoute({ children }) {
  // En v2 de supabase-js:
  const session = supabase.auth.getSession()?.data.session
  return session ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <ClientesProvider>
      <ProductosProvider>
        <ComprasProvider>
          <Toaster position="top-right" reverseOrder={false} />
          <BrowserRouter>
            <Routes>
              {/* RUTAS PÚBLICAS */}
              <Route path="/login" element={<Login />} />
              <Route path="/usuarios/callback" element={<InviteCallback />} />

              {/* RUTAS PROTEGIDAS */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <DashboardLayout>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="checkout" element={<Checkout />} />
                        <Route path="productos" element={<Productos />} />
                        <Route path="clientes" element={<Clientes />} />
                        <Route path="compras" element={<Compras />} />
                        <Route path="ventas" element={<Ventas />} />
                        <Route path="reportes" element={<Reportes />} />
                        <Route path="usuarios" element={<UsersPermissions />} />
                        <Route path="saldos-clientes" element={<SaldosClientes />} />
                        <Route path="*" element={<Navigate to="/" replace />} />
                      </Routes>
                    </DashboardLayout>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </BrowserRouter>
        </ComprasProvider>
      </ProductosProvider>
    </ClientesProvider>
  )
}
