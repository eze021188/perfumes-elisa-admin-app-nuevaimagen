// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// No necesitas importar 'supabase' directamente aquí si solo lo usas en contextos y páginas

// Importa tus Contextos
import { ClientesProvider } from './contexts/ClientesContext';
import { ProductosProvider } from './contexts/ProductosContext';
import { ComprasProvider } from './contexts/ComprasContext';
// >>> Importa tu nuevo AuthProvider y useAuth <<<
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Páginas públicas (importadas del directorio pages)
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordCallback from './pages/ResetPasswordCallback';
import InviteCallback from './pages/InviteCallback';

// Layout y páginas protegidas (importadas del directorio pages)
import DashboardLayout from './layouts/DashboardLayout'; // Tu layout principal
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Compras from './pages/Compras';
import Ventas from './pages/Ventas';
import Reportes from './pages/Reportes';
import UsersPermissions from './pages/UsersPermissions';
import SaldosClientes from './pages/SaldosClientes';

// >>> Componente para proteger rutas usando el contexto de Auth <<<
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth(); // Obtiene el estado del usuario y carga del AuthContext

  // Si todavía estamos verificando la sesión inicial, muestra un indicador de carga
  if (loading) {
    return <p>Cargando autenticación...</p>; // O un spinner de carga
  }

  // Si no hay usuario (no autenticado), redirige a la página de login
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario (autenticado) y la carga terminó, renderiza los elementos hijos (la ruta protegida)
  return children;
}

// >>> Componente para redirigir si el usuario *ya* está logueado <<<
// Se usa en rutas como /login, /signup, /reset-password
function RedirectIfAuthenticated({ children }) {
    const { user, loading } = useAuth(); // Obtiene el estado del usuario y carga del AuthContext

    // Si todavía estamos verificando la sesión inicial, muestra un indicador de carga
    if (loading) {
        return <p>Cargando autenticación...</p>; // O un spinner de carga
    }

    // Si hay usuario (autenticado) y la carga terminó, redirige a la página principal
    if (user) {
        return <Navigate to="/" replace />;
    }

    // Si no hay usuario (no autenticado), renderiza los elementos hijos (la página de autenticación)
    return children;
}


export default function App() {
  return (
    // >>> Envuelve toda la aplicación con AuthProvider <<<
    <AuthProvider>
      <ClientesProvider>
        <ProductosProvider>
          <ComprasProvider>
            {/* Toast notifications */}
            <Toaster position="top-right" reverseOrder={false} />

            <BrowserRouter>
              <Routes>
                {/** ===== RUTAS PÚBLICAS (redireccionan si ya estás logueado) ===== */}
                {/* Envuelve estas rutas con RedirectIfAuthenticated */}
                <Route path="/login" element={<RedirectIfAuthenticated><Login /></RedirectIfAuthenticated>} />
                <Route path="/signup" element={<RedirectIfAuthenticated><Signup /></RedirectIfAuthenticated>} />
                <Route path="/reset-password" element={<RedirectIfAuthenticated><ResetPassword /></RedirectIfAuthenticated>} />

                {/** ===== RUTAS DE CALLBACK DE AUTH (Siempre públicas) ===== */}
                {/* Supabase redirige a estas, no deben requerir login ni redirigir si ya lo estás */}
                <Route
                  path="/reset-password/callback"
                  element={<ResetPasswordCallback />}
                />
                 {/* Asegúrate que la ruta de callback de invitación en Supabase es /usuarios/callback */}
                <Route
                  path="/usuarios/callback"
                  element={<InviteCallback />}
                />
                 {/* Asegúrate que la ruta de callback de confirmación (si la usas) es /usuarios/confirm */}
                 {/* <Route path="/usuarios/confirm" element={<ConfirmCallback />} /> */}


                {/** ===== RUTAS PROTEGIDAS BAJO LAYOUT ===== */}
                {/* La ruta padre usa ProtectedRoute. Si el usuario está logueado,
                    ProtectedRout renderizará el DashboardLayout y las rutas anidadas. */}
                <Route
                  path="/" // Cambia path="/*" a path="/" o el base path de tus rutas protegidas
                          // Si todas tus rutas protegidas inician con /, path="/" está bien.
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Las rutas anidadas ahora no necesitan ProtectedRoute individualmente
                      si están bajo un padre protegido por ProtectedRoute. */}
                  <Route index element={<Home />} /> {/* Ruta para / */}
                  <Route path="checkout" element={<Checkout />} /> {/* Ruta para /checkout */}
                  <Route path="productos" element={<Productos />} /> {/* Ruta para /productos */}
                  <Route path="clientes" element={<Clientes />} /> {/* Ruta para /clientes */}
                  <Route path="compras" element={<Compras />} /> {/* Ruta para /compras */}
                  <Route path="ventas" element={<Ventas />} /> {/* Ruta para /ventas */}
                  <Route path="reportes" element={<Reportes />} /> {/* Ruta para /reportes */}
                  <Route path="usuarios" element={<UsersPermissions />} /> {/* Ruta para /usuarios */}
                  <Route path="saldos-clientes" element={<SaldosClientes />} /> {/* Ruta para /saldos-clientes */}

                   {/* Puedes añadir aquí rutas protegidas adicionales si no usan el DashboardLayout,
                       o si quieres proteger solo algunas rutas dentro del layout.
                       Ej: <Route path="/mi-ruta-protegida" element={<ProtectedRoute><MiRutaProtegida /></ProtectedRoute>} />
                   */}

                  {/* Ruta comodín dentro del layout: si la URL coincide con /... pero no con las rutas anidadas */}
                  {/* Esto redirige a la ruta base del layout (en este caso /) */}
                  <Route path="*" element={<Navigate to="/" replace />} /> {/* Redirige a la ruta base protegida */}

                </Route>

                 {/* Ruta comodín fuera del layout: Si la URL no coincide con NINGUNA de las rutas definidas arriba */}
                 {/* Por ejemplo, si alguien intenta ir a /ruta-inexistente Y no coincide con /* */}
                 {/* Esta ruta debería ser la ÚLTIMA */}
                 {/* Dependiendo de cómo quieras manejar las rutas 404, puedes redirigir a una página 404 o a login/home */}
                {/* <Route path="*" element={<Navigate to={user ? '/' : '/login'} replace />} /> */}
                {/* La Route path="/" anidada con /* dentro ya maneja la mayoría de los casos */}


              </Routes>
            </BrowserRouter>
          </ComprasProvider>
        </ProductosProvider>
      </ClientesProvider>
    </AuthProvider>
  );
}