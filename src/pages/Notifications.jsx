import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Loader2 } from 'lucide-react';
// --- INICIO DE CORRECCIÓN ---
import { Link } from 'react-router-dom'; // Importa el componente Link
// --- FIN DE CORRECCIÓN ---

export default function Notifications() {
  const { user } = useAuth();
  const [allNotifications, setAllNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchAllNotifications() {
      if (!user) {
        setLoading(false);
        setError("Debes iniciar sesión para ver tus notificaciones.");
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const { data, error } = await supabase
          .from('notificaciones')
          .select('*')
          .eq('user_id', user.id) // Asegúrate de filtrar por el ID del usuario actual
          .order('created_at', { ascending: false }); // Las más recientes primero

        if (error) throw error;
        setAllNotifications(data || []);
      } catch (err) {
        console.error("Error al cargar todas las notificaciones:", err.message);
        setError("Error al cargar tus notificaciones. Intenta de nuevo.");
        toast.error("Error al cargar todas las notificaciones.");
      } finally {
        setLoading(false);
      }
    }

    fetchAllNotifications();
  }, [user]);

  const handleMarkAsRead = async (notificationId) => {
    setAllNotifications(prev => prev.map(n =>
      n.id === notificationId ? { ...n, is_read: true } : n
    ));
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ is_read: true })
        .eq('id', notificationId);
      if (error) throw error;
      toast.success("Notificación marcada como leída.");
    } catch (err) {
      console.error("Error al marcar notificación como leída:", err.message);
      toast.error("No se pudo marcar la notificación como leída.");
    }
  };

  const handleMarkAllAsRead = async () => {
    setAllNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    try {
      const { error } = await supabase
        .from('notificaciones')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      if (error) throw error;
      toast.success("Todas las notificaciones marcadas como leídas.");
    } catch (err) {
      console.error("Error al marcar todas como leídas:", err.message);
      toast.error("No se pudieron marcar todas las notificaciones como leídas.");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px] text-gray-400">
        <Loader2 size={32} className="animate-spin mr-3" /> Cargando notificaciones...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-error-400 text-center">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="p-6 text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Todas mis Notificaciones</h1>
      <div className="card-dark p-6">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-dark-700">
          <p className="text-gray-400">{allNotifications.length} notificaciones en total</p>
          {allNotifications.some(n => !n.is_read) && (
            <button
              onClick={handleMarkAllAsRead}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm"
            >
              Marcar todas como leídas
            </button>
          )}
        </div>

        {allNotifications.length === 0 ? (
          <p className="text-gray-500 text-center py-10">No tienes notificaciones en este momento.</p>
        ) : (
          <ul className="space-y-3">
            {allNotifications.map(notif => (
              <li
                key={notif.id}
                className={`p-4 rounded-lg border border-dark-700 transition-colors ${notif.is_read ? 'bg-dark-800 text-gray-400' : 'bg-dark-700 text-gray-100 font-medium hover:bg-dark-700/80'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-lg">{notif.message}</p>
                    <span className="text-xs text-gray-500 mt-1 block">{new Date(notif.created_at).toLocaleString()}</span>
                  </div>
                  {!notif.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notif.id)}
                      className="ml-4 flex-shrink-0 px-3 py-1 bg-primary-700 text-white rounded-md hover:bg-primary-800 transition-colors text-xs"
                    >
                      Marcar como leída
                    </button>
                  )}
                </div>
                {notif.link && (
                  // --- INICIO DE CORRECCIÓN ---
                  <Link // Aquí se usaba Link sin importar
                    to={notif.link}
                    onClick={() => handleMarkAsRead(notif.id)} // Marcar como leída al hacer clic en el enlace
                    className="text-primary-400 hover:underline text-sm mt-2 inline-block"
                  >
                    Ver detalle
                  </Link>
                  // --- FIN DE CORRECCIÓN ---
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}