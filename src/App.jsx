// src/App.jsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// No necesitas importar 'supabase' directamente aquí si solo lo usas en contextos y páginas

// Importa tus Contextos
import { ClientesProvider } from './contexts/ClientesContext';
// CORRECCIÓN: Sintaxis de importación para ProductosProvider
import { ProductosProvider } from './contexts/ProductosContext';
// >>> CORRECCIÓN: Cambiada la ruta de importación para ComprasProvider <<<
import { ComprasProvider } from './contexts/ComprasContext'; // <-- Nombre de archivo corregido
// >>> Importa tu nuevo AuthProvider y useAuth <<<
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Asegúrate de que la ruta sea correcta

// Importa la nueva página de Crear Presupuesto
import CrearPresupuesto from './pages/CrearPresupuesto'; // <--- Importa aquí

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
  // Usar useAuth para obtener el estado reactivo
  const { user, loading } = useAuth(); // Obtiene el estado del usuario y carga del AuthContext

  // Si todavía estamos verificando la sesión inicial, muestra un indicador de carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  // Si no hay usuario (no autenticado) y la carga terminó, redirige a la página de login
  if (!user) {
    console.log('ProtectedRoute - No user found, redirecting to /login'); // Log para depuración
    return <Navigate to="/login" replace />;
  }

  // Si hay usuario (autenticado) y la carga terminó, renderiza los elementos hijos (la ruta protegida)
   console.log('ProtectedRoute - User found, rendering children.'); // Log para depuración
  return children;
}

// >>> Componente para redirigir si el usuario *ya* está logueado <<<
// Se usa en rutas como /login, /signup, /reset-password
function RedirectIfAuthenticated({ children }) {
    // Usar useAuth para obtener el estado reactivo
    const { user, loading } = useAuth(); // Obtiene el estado del usuario y carga del AuthContext

    // Si todavía estamos verificando la sesión inicial, muestra un indicador de carga
    if (loading) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-dark-950">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
          </div>
        );
    }

    // Si hay usuario (autenticado) y la carga terminó, redirige a la página principal
    if (user) {
         console.log('RedirectIfAuthenticated - User found, redirecting to /'); // Log para depuración
        return <Navigate to="/" replace />;
    }

    // Si no hay usuario (no autenticado), renderiza los elementos hijos (la página de autenticación)
     console.log('RedirectIfAuthenticated - No user found, rendering children.'); // Log para depuración
    return children;
}


export default function App() {
  return (
    // >>> Envuelve toda la aplicación con AuthProvider <<<
    // Esto asegura que el contexto de autenticación esté disponible para todas las rutas y componentes hijos
    <AuthProvider>
      {/* Envuelve tus otros proveedores de contexto dentro del AuthProvider */}
      <ClientesProvider>
        <ProductosProvider>
          <ComprasProvider>
            {/* Toast notifications */}
            <Toaster 
              position="top-right" 
              reverseOrder={false} 
              toastOptions={{
                // Estilos para los toasts en modo oscuro
                style: {
                  background: '#1f2937',
                  color: '#e5e7eb',
                  border: '1px solid #374151',
                },
                success: {
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#1f2937',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#1f2937',
                  },
                },
              }}
            />

            <BrowserRouter>
              <Routes>
                {/** ===== RUTAS PÚBLICAS (redireccionan si ya estás logueado) ===== */}
                {/* Envuelve estas rutas con RedirectIfAuthenticated */}
                {/* Si el usuario ya está logueado, RedirectIfAuthenticated lo enviará a / */}
                <Route path="/login" element={<RedirectIfAuthenticated><Login /></RedirectIfAuthenticated>} />
                <Route path="/signup" element={<RedirectIfAuthenticated><Signup /></RedirectIfAuthenticated>} />
                <Route path="/reset-password" element={<RedirectIfAuthenticated><ResetPassword /></RedirectIfAuthenticated>} />

                {/** ===== RUTAS DE CALLBACK DE AUTH (Siempre públicas) ===== */}
                {/* Supabase redirige a estas URLs después de ciertas acciones (reset, invite, confirm).
                    Deben ser accesibles sin importar el estado de login y no deben redirigir si ya lo estás,
                    ya que a menudo necesitan procesar información de la URL. */}
                <Route
                  path="/reset-password/callback"
                  element={<ResetPasswordCallback />}
                />
                 {/* Asegúrate que la ruta de callback de invitación en Supabase está configurada como /usuarios/callback */}
                <Route
                  path="/usuarios/callback"
                  element={<InviteCallback />}
                />
                 {/* Si tienes confirmación por email, asegúrate que la ruta de callback en Supabase es /usuarios/confirm */}
                 {/* <Route path="/usuarios/confirm" element={<ConfirmCallback />} /> */}


                {/** ===== RUTAS PROTEGIDAS BAJO LAYOUT ===== */}
                {/* Esta ruta padre usa ProtectedRoute. Si el usuario está logueado,
                    ProtectedRoute renderizará el DashboardLayout y las rutas anidadas.
                    Si no está logueado, ProtectedRoute redirigirá a /login. */}
                <Route
                  path="/" // Define la ruta base para este grupo de rutas protegidas (generalmente '/')
                  element={
                    <ProtectedRoute>
                      {/* Si ProtectedRoute permite el acceso, renderiza el DashboardLayout */}
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  {/* Las rutas anidadas dentro de esta Route padre no necesitan ProtectedRoute individualmente
                      porque ya están bajo un padre protegido. */}
                  {/* La ruta index coincide con la ruta padre (en este caso /) */}
                  <Route index element={<Home />} />
                  {/* Las rutas con path="" coinciden con la ruta padre + el path especificado */}
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="productos" element={<Productos />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="compras" element={<Compras />} />
                  <Route path="ventas" element={<Ventas />} />
                  <Route path="reportes" element={<Reportes />} />
                  <Route path="usuarios" element={<UsersPermissions />} />
                  <Route path="saldos-clientes" element={<SaldosClientes />} />

                   {/* AGREGA AQUÍ LA RUTA PARA CREAR PRESUPUESTOS */}
                   {/* >>> AJUSTE: Cambiado el path a "presupuestos/crear" para coincidir con la URL esperada <<< */}
                   <Route path="presupuestos/crear" element={<CrearPresupuesto />} />


                   {/* Puedes añadir aquí rutas protegidas adicionales si no usan el DashboardLayout,
                       o si quieres proteger solo algunas rutas dentro del layout, pero
                       la estructura actual protege todo lo que está dentro de este Route padre. */}

                  {/* Ruta comodín dentro de este Route padre: si la URL coincide con el path padre (/)
                      pero no con ninguna de las rutas anidadas definidas arriba.
                      Esto redirige a la ruta index del padre (en este caso /). */}
                  <Route path="*" element={<Navigate to="/" replace />} />

                </Route>

                 {/* Ruta comodín final: Si la URL no coincide con NINGUNA de las rutas definidas arriba.
                     Por ejemplo, si alguien intenta ir a /una-ruta-completamente-inexistente
                     Esta ruta debe ser la ÚLTIMA en la lista de Routes.
                     Puedes redirigir a una página 404, a login, o a home.
                     La lógica actual de ProtectedRoute y RedirectIfAuthenticated ya maneja la mayoría de los casos,
                     pero esta es una ruta de "último recurso". */}
                {/* La Route path="/" anidada con /* dentro ya maneja la mayoría de los casos de URLs mal escritas dentro del área protegida. */}
                {/* Si quieres una página 404 genérica fuera del layout, la definirías aquí. */}
                {/* <Route path="*" element={<NotFoundPage />} /> */}


              </Routes>
            </BrowserRouter>
          </ComprasProvider>
        </ProductosProvider>
      </ClientesProvider>
    </AuthProvider>
  );
}