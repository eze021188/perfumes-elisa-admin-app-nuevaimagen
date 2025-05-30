// src/pages/Settings.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function Settings() {
  const { user } = useAuth();
  // Definimos explícitamente todos los tipos de notificación que manejaremos
  // y su estado inicial por defecto (ej. true)
  const [notificationSettings, setNotificationSettings] = useState({
    new_budget_created: true,
    budget_aceptado: true,
    budget_rechazado: true,
    new_sale_registered: true,
    sale_devuelto: true, // Asumiendo que tienes 'devuelto' como estado de venta
    sale_cancelado: true, // Asumiendo que tienes 'cancelado' como estado de venta
    new_purchase_registered: true,
    inventory_discrepancy: true,
    new_client_registered: true,
    client_account_movement: true, // Para abonos/saldos a favor
    new_user_registered: true,
    // Puedes añadir más tipos aquí si creas más notificaciones en la DB
  });
  const [loading, setLoading] = useState(true);

  // Mapeo amigable para mostrar en la UI
  const notificationLabels = {
    new_budget_created: 'Nuevo Presupuesto Creado',
    budget_aceptado: 'Presupuesto Aceptado',
    budget_rechazado: 'Presupuesto Rechazado',
    new_sale_registered: 'Nueva Venta Registrada',
    sale_devuelto: 'Venta Devuelta',
    sale_cancelado: 'Venta Cancelada',
    new_purchase_registered: 'Nueva Compra Registrada',
    inventory_discrepancy: 'Discrepancia de Inventario',
    new_client_registered: 'Nuevo Cliente Registrado',
    client_account_movement: 'Movimiento en Cuenta Cliente (Abono/Saldo)',
    new_user_registered: 'Nuevo Usuario Registrado',
  };

  useEffect(() => {
    async function fetchSettings() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Cargar las preferencias existentes del usuario desde la DB
        const { data, error } = await supabase
          .from('user_notification_settings')
          .select('notification_type, enabled')
          .eq('user_id', user.id);

        if (error) {
          if (error.code === 'PGRST116') { // No se encontraron filas, es el primer acceso
            console.log("No se encontraron configuraciones de notificación existentes para este usuario.");
            // No hay error, simplemente no hay configuración personalizada aún
          } else {
            throw error;
          }
        }

        const currentSettings = {};
        if (data) {
          data.forEach(setting => {
            currentSettings[setting.notification_type] = setting.enabled;
          });
        }
        
        // Fusionar las preferencias por defecto con las cargadas de la DB
        setNotificationSettings(prev => {
            const mergedSettings = { ...prev };
            Object.keys(notificationLabels).forEach(type => { // Asegura que todas las opciones se muestren
                mergedSettings[type] = currentSettings.hasOwnProperty(type) ? currentSettings[type] : true; // Por defecto true si no está en DB
            });
            return mergedSettings;
        });

      } catch (err) {
        console.error("Error al cargar configuración de notificaciones:", err.message);
        toast.error("Error al cargar tus preferencias de notificación.");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [user]); // Vuelve a cargar si el usuario cambia

  const handleToggle = async (type) => {
    if (!user) {
      toast.error("Debes iniciar sesión para guardar preferencias.");
      return;
    }
    const newEnabledState = !notificationSettings[type];
    setNotificationSettings(prev => ({ ...prev, [type]: newEnabledState })); // Actualiza UI inmediatamente

    try {
      // Usa upsert para insertar si no existe, o actualizar si ya existe
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert(
          { user_id: user.id, notification_type: type, enabled: newEnabledState },
          { onConflict: ['user_id', 'notification_type'] } // Define la clave para detectar conflictos
        );

      if (error) throw error;
      toast.success(`Preferencia de '${notificationLabels[type]}' guardada.`);
    } catch (err) {
      console.error("Error al guardar preferencia de notificación:", err.message);
      toast.error("Error al guardar tu preferencia de notificación.");
      setNotificationSettings(prev => ({ ...prev, [type]: !newEnabledState })); // Revertir en caso de error
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400 mr-2"></div>
        Cargando configuración...
      </div>
    );
  }

  return (
    <div className="p-6 text-gray-100">
      <h1 className="text-2xl font-bold mb-6">Configuración</h1>
      <div className="card-dark p-6"> {/* Usa la clase card-dark que ya tienes */}
        <h2 className="text-xl font-semibold mb-4 text-gray-100">Preferencias de Notificación</h2>
        <p className="text-gray-400 text-sm mb-6">Elige qué tipos de notificaciones deseas recibir en tu panel.</p>
        
        <div className="space-y-4">
          {Object.keys(notificationLabels).map(type => (
            <div key={type} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-b-0">
              <span className="text-gray-200 text-lg">{notificationLabels[type]}</span>
              <label htmlFor={type} className="flex items-center cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    id={type}
                    className="sr-only" // Oculta el checkbox original
                    checked={notificationSettings[type]}
                    onChange={() => handleToggle(type)}
                  />
                  {/* Toggle visual */}
                  <div className={`block w-14 h-8 rounded-full transition-colors ${notificationSettings[type] ? 'bg-primary-600' : 'bg-gray-600'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${notificationSettings[type] ? 'translate-x-full' : ''}`}></div>
                </div>
              </label>
            </div>
          ))}
        </div>
        {!user && (
          <p className="text-error-400 text-sm mt-4">Para guardar tus preferencias de notificación, por favor, inicia sesión.</p>
        )}
      </div>
    </div>
  );
}
