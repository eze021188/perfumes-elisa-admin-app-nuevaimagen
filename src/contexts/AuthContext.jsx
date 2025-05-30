// src/contexts/AuthContext.jsx
import React, { useContext, useState, useEffect, createContext } from 'react'; // Eliminado useCallback de aquí
import { supabase } from '../supabase';

const AuthContext = createContext({
  session: null,
  user: null,
  loading: true,
  // checkAuthAndPerformAction ha sido eliminado de este contexto
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        console.log('Auth state changed:', event, currentSession); // Deja este console.log
        setSession(currentSession);
        setUser(currentSession?.user || null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
         setSession(session);
         setUser(session?.user || null);
         setLoading(false);
     });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ session, user, loading }}>
      {children}
    </AuthContext.Provider>
  );
};