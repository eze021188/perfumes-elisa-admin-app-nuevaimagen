import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
// No necesitas importar 'supabase' directamente aquí si solo lo usas en contextos y páginas

// Importa tus Contextos
import { ClientesProvider } from './contexts/ClientesContext';
import { ProductosProvider } from './contexts/ProductosContext'; // Asegúrate de que el archivo sea ProductosContext.jsx
import { ComprasProvider } from './contexts/ComprasContext'; // <-- Nombre de archivo corregido
// >>> Importa tu nuevo AuthProvider y useAuth <<<
import { AuthProvider, useAuth } from './contexts/AuthContext'; // Asegúrate de que la ruta sea correcta

// Importa la nueva página de Crear Presupuesto
import CrearPresupuesto from './pages/CrearPresupuesto';

// Páginas públicas (importadas del directorio pages)
import Login from './pages/Login';
import Signup from './pages/Signup';
import ResetPassword from './pages/ResetPassword';
import ResetPasswordCallback from './pages/ResetPasswordCallback';
import InviteCallback from './pages/InviteCallback';

// Layout y páginas protegidas (importadas del directorio pages)
import DashboardLayout from './layouts/DashboardLayout.jsx'; // Tu layout principal
import Home from './pages/Home';
import Checkout from './pages/Checkout';
import Productos from './pages/Productos';
import Clientes from './pages/Clientes';
import Compras from './pages/Compras';
import Ventas from './pages/Ventas';
import Reportes from './pages/Reportes';
import UsersPermissions from './pages/UsersPermissions';
import SaldosClientes from './pages/SaldosClientes';
import Perfil from './pages/Perfil';
import Settings from './pages/Settings'; // Ya importado para las notificaciones

// Importa el componente de la página de Notificaciones
import Notifications from './pages/Notifications';

// !!! Importa el componente de la NUEVA página de Configuración de Usuario !!!
import UserSettings from './pages/UserSettings'; // <-- ¡NUEVA IMPORTACIÓN!


// >>> Componente para proteger rutas usando el contexto de Auth <<<
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
      </div>
    );
  }

  if (!user) {
    console.log('ProtectedRoute - No user found, redirecting to /login');
    return <Navigate to="/login" replace />;
  }

  console.log('ProtectedRoute - User found, rendering children.');
  return children;
}

// >>> Componente para redirigir si el usuario *ya* está logueado <<<
function RedirectIfAuthenticated({ children }) {
    const { user, loading } = useAuth();

    if (loading) {
        return (
          <div className="flex items-center justify-center min-h-screen bg-dark-950">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-400"></div>
          </div>
        );
    }

    if (user) {
         console.log('RedirectIfAuthenticated - User found, redirecting to /');
        return <Navigate to="/" replace />;
    }

     console.log('RedirectIfAuthenticated - No user found, rendering children.');
    return children;
}


export default function App() {
  return (
    <AuthProvider>
      <ClientesProvider>
        <ProductosProvider>
          <ComprasProvider>
            <Toaster
              position="top-right"
              reverseOrder={false}
              toastOptions={{
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
                <Route path="/login" element={<RedirectIfAuthenticated><Login /></RedirectIfAuthenticated>} />
                <Route path="/signup" element={<RedirectIfAuthenticated><Signup /></RedirectIfAuthenticated>} />
                <Route path="/reset-password" element={<RedirectIfAuthenticated><ResetPassword /></RedirectIfAuthenticated>} />

                {/** ===== RUTAS DE CALLBACK DE AUTH (Siempre públicas) ===== */}
                <Route
                  path="/reset-password/callback"
                  element={<ResetPasswordCallback />}
                />
                <Route
                  path="/usuarios/callback"
                  element={<InviteCallback />}
                />


                {/** ===== RUTAS PROTEGIDAS BAJO LAYOUT ===== */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <DashboardLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route index element={<Home />} />
                  <Route path="checkout" element={<Checkout />} />
                  <Route path="productos" element={<Productos />} />
                  <Route path="clientes" element={<Clientes />} />
                  <Route path="compras" element={<Compras />} />
                  <Route path="ventas" element={<Ventas />} />
                  <Route path="reportes" element={<Reportes />} />
                  <Route path="usuarios" element={<UsersPermissions />} />
                  <Route path="saldos-clientes" element={<SaldosClientes />} />
                  <Route path="presupuestos/crear" element={<CrearPresupuesto />} />
                  <Route path="perfil" element={<Perfil />} />
                  <Route path="settings" element={<Settings />} /> {/* Para las configuraciones de Notificaciones */}
                  <Route path="notifications" element={<Notifications />} /> {/* Para la página de todas las notificaciones */}

                  {/* !!! NUEVA RUTA PARA CONFIGURACIÓN DE USUARIO (Idioma, Tema, Zona Horaria) !!! */}
                  <Route path="user-settings" element={<UserSettings />} /> {/* <-- ¡NUEVA RUTA! */}
                  {/* !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!! */}


                   {/* Puedes añadir aquí rutas protegidas adicionales si no usan el DashboardLayout,
                       o si quieres proteger solo algunas rutas dentro del layout, pero
                       la estructura actual protege todo lo que está dentro de este Route padre. */}

                  {/* Ruta comodín dentro de este Route padre: si la URL coincide con el path padre (/)
                      pero no con ninguna de las rutas anidadas definidas arriba.
                      Esto redirige a la ruta index del padre (en este caso /). */}
                  <Route path="*" element={<Navigate to="/" replace />} />

                </Route>

              </Routes>
            </BrowserRouter>
          </ComprasProvider>
        </ProductosProvider>
      </ClientesProvider>
    </AuthProvider>
  );
}
