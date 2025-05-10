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
  // En V2 de supabase-js getSession es síncrono:
  const { data: { session } } = supabase.auth.getSession()
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
              {/* 1. Rutas públicas */}
              <Route path="/login" element={<Login />} />
              <Route path="/usuarios/callback" element={<InviteCallback />} />

              {/* 2. Rutas protegidas con layout */}
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                {/* Estas rutas se renderizan dentro de <DashboardLayout><Outlet/></DashboardLayout> */}
                <Route index element={<Home />} />
                <Route path="checkout" element={<Checkout />} />
                <Route path="productos" element={<Productos />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="compras" element={<Compras />} />
                <Route path="ventas" element={<Ventas />} />
                <Route path="reportes" element={<Reportes />} />
                <Route path="usuarios" element={<UsersPermissions />} />
                <Route path="saldos-clientes" element={<SaldosClientes />} />
                {/* Si no coincide ninguna, redirige a Home */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Route>
            </Routes>
          </BrowserRouter>
        </ComprasProvider>
      </ProductosProvider>
    </ClientesProvider>
  )
}
