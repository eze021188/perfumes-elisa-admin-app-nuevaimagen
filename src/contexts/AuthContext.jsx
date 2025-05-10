// src/contexts/AuthContext.jsx
import React, { useContext, useState, useEffect, createContext } from 'react';
import { supabase } from '../supabase'; // Asegúrate de que esta ruta sea correcta

// Crear el contexto de autenticación
const AuthContext = createContext({
  session: null,
  user: null,
  loading: true, // Estado de carga inicial mientras se verifica la sesión
});

// Hook personalizado para usar el contexto de autenticación
export const useAuth = () => useContext(AuthContext);

// Proveedor de autenticación
export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // Inicialmente true mientras se carga la sesión

  useEffect(() => {
    // Suscribirse a los cambios en el estado de autenticación de Supabase
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession); // Para depuración
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false); // La carga inicial termina después de la primera verificación

         // Nota: La redirección basada en el estado (ej: de /login a /)
         // se manejará mejor en componentes que usen este contexto,
         // no directamente aquí en el listener.
      }
    );

    // Obtener la sesión actual inmediatamente al montar el componente
    // Esto es redundante con el listener, pero ayuda a asegurar que el estado
    // se establece rápidamente si ya hay una sesión en localStorage.
     supabase.auth.getSession().then(({ data: { session } }) => {
         setSession(session);
         setUser(session?.user || null);
         setLoading(false); // La carga inicial termina después de obtener la sesión o null
     });


    // Limpiar el listener al desmontar el componente
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []); // Array vacío para que el efecto se ejecute solo una vez al montar

  // Proporcionar el estado de la sesión a través del contexto
  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {!loading && children} {/* Renderiza los hijos solo después de verificar la sesión inicial */}
      {loading && <p>Cargando sesión...</p>} {/* O un spinner de carga */}
    </AuthContext.Provider>
  );
};