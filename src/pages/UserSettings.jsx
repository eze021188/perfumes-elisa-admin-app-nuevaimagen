// src/pages/UserSettings.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function UserSettings() { // Nombre del componente UserSettings
  const { user } = useAuth();
  // Definimos explícitamente todos los tipos de notificación que manejaremos
  const [notificationSettings, setNotificationSettings] = useState({
    new_budget_created: true,
    budget_aceptado: true,
    budget_rechazado: true,
    new_sale_registered: true,
    sale_devuelto: true,
    sale_cancelado: true,
    new_purchase_registered: true,
    inventory_discrepancy: true,
    new_client_registered: true,
    client_account_movement: true,
    new_user_registered: true,
  });
  // --- ESTADOS PARA IDIOMA, ZONA HORARIA Y TEMA ---
  const [languagePreference, setLanguagePreference] = useState('es'); // Default español
  const [timezonePreference, setTimezonePreference] = useState('America/Mexico_City'); // Default Ciudad de México
  const [themePreference, setThemePreference] = useState('dark'); // Default tema oscuro
  // --------------------------------------------------------
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

  // Opciones para selectores de idioma y zona horaria
  const languageOptions = [
    { value: 'es', label: 'Español' },
    { value: 'en', label: 'English' },
  ];

  // Lista parcial de zonas horarias comunes, puedes expandirla
  const timezoneOptions = [
    { value: 'America/Mexico_City', label: 'Ciudad de México (CST)' },
    { value: 'America/New_York', label: 'Nueva York (EST)' },
    { value: 'America/Los_Angeles', label: 'Los Ángeles (PST)' },
    { value: 'Europe/Madrid', label: 'Madrid (CET)' },
    { value: 'America/Bogota', label: 'Bogotá (COT)' },
  ];


  useEffect(() => {
    async function fetchSettings() {
      if (!user) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        // Cargar preferencias de notificación
        const { data: notifData, error: notifError } = await supabase
          .from('user_notification_settings')
          .select('notification_type, enabled')
          .eq('user_id', user.id);

        if (notifError && notifError.code === 'PGRST116') {
          console.log("No se encontraron configuraciones de notificación existentes para este usuario.");
        } else if (notifError) {
          throw notifError;
        }

        const currentNotifSettings = {};
        if (notifData) {
          notifData.forEach(setting => {
            currentNotifSettings[setting.notification_type] = setting.enabled;
          });
        }
        
        setNotificationSettings(prev => {
            const mergedSettings = { ...prev };
            Object.keys(notificationLabels).forEach(type => {
                mergedSettings[type] = currentNotifSettings.hasOwnProperty(type) ? currentNotifSettings[type] : true;
            });
            return mergedSettings;
        });

        // Cargar preferencias de usuario (idioma, zona horaria, tema)
        const { data: userData, error: userError } = await supabase
          .from('usuarios')
          .select('language_preference, timezone_preference, theme_preference')
          .eq('id', user.id)
          .single();

        if (userError && userError.code === 'PGRST116') {
          console.log("No se encontraron preferencias de usuario existentes en la tabla 'usuarios'.");
        } else if (userError) {
          throw userError;
        }

        if (userData) {
          setLanguagePreference(userData.language_preference || 'es');
          setTimezonePreference(userData.timezone_preference || 'America/Mexico_City');
          setThemePreference(userData.theme_preference || 'dark');
        }

      } catch (err) {
        console.error("Error al cargar configuración:", err.message);
        toast.error("Error al cargar tus preferencias.");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [user]);

  // Manejar el cambio de preferencias de notificación
  const handleNotificationToggle = async (type) => {
    if (!user) {
      toast.error("Debes iniciar sesión para guardar preferencias.");
      return;
    }
    const newEnabledState = !notificationSettings[type];
    setNotificationSettings(prev => ({ ...prev, [type]: newEnabledState }));

    try {
      const { error } = await supabase
        .from('user_notification_settings')
        .upsert(
          { user_id: user.id, notification_type: type, enabled: newEnabledState },
          { onConflict: ['user_id', 'notification_type'] }
        );

      if (error) throw error;
      toast.success(`Preferencia de '${notificationLabels[type]}' guardada.`);
    } catch (err) {
      console.error("Error al guardar preferencia de notificación:", err.message);
      toast.error("Error al guardar tu preferencia de notificación.");
      setNotificationSettings(prev => ({ ...prev, [type]: !newEnabledState }));
    }
  };

  // Manejar el cambio de preferencias de idioma, zona horaria y tema
  const handleUserPreferenceChange = async (preferenceType, value) => {
    if (!user) {
      toast.error("Debes iniciar sesión para guardar preferencias.");
      return;
    }

    let updatedValue;
    if (preferenceType === 'language') {
      setLanguagePreference(value);
      updatedValue = { language_preference: value };
    } else if (preferenceType === 'timezone') {
      setTimezonePreference(value);
      updatedValue = { timezone_preference: value };
    } else if (preferenceType === 'theme') {
      setThemePreference(value);
      updatedValue = { theme_preference: value };
      // Aplicar el tema inmediatamente
      document.documentElement.classList.remove('dark', 'light');
      document.documentElement.classList.add(value);
      localStorage.setItem('theme', value); // Guardar en localStorage
    }

    try {
      const { error } = await supabase
        .from('usuarios')
        .update(updatedValue)
        .eq('id', user.id);

      if (error) throw error;
      toast.success(`Preferencia de ${preferenceType} guardada.`);
    } catch (err) {
      console.error(`Error al guardar preferencia de ${preferenceType}:`, err.message);
      toast.error(`Error al guardar tu preferencia de ${preferenceType}.`);
      // Revertir estado local en caso de error
      if (preferenceType === 'language') setLanguagePreference(languagePreference);
      else if (preferenceType === 'timezone') setTimezonePreference(timezonePreference);
      else if (preferenceType === 'theme') setThemePreference(themePreference);
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
    <div className="p-6 text-gray-100 light:text-light-900">
      <h1 className="text-2xl font-bold mb-6">Configuración de Usuario</h1>
      
      {/* Sección de Preferencias de Interfaz y Datos */}
      <div className="card-dark p-6 mb-8 bg-dark-800 border border-dark-700 light:bg-white light:border-light-300">
        <h2 className="text-xl font-semibold mb-4 text-gray-100 light:text-light-800">Preferencias de Interfaz y Datos</h2>
        <p className="text-gray-400 text-sm mb-6 light:text-light-600">Ajusta cómo la aplicación se ve y muestra la información para ti.</p>
        <div className="space-y-4">
          {/* Selector de Idioma */}
          <div className="flex items-center justify-between py-2 border-b border-dark-700 light:border-light-300">
            <span className="text-gray-200 text-lg light:text-light-800">Idioma de la Interfaz</span>
            <select
              value={languagePreference}
              onChange={(e) => handleUserPreferenceChange('language', e.target.value)}
              className="bg-dark-900 border border-dark-700 rounded-md p-2 text-gray-100 focus:ring-primary-500 focus:border-primary-500 light:bg-light-100 light:border-light-300 light:text-light-800 flex-shrink-0" /* Added flex-shrink-0 */
            >
              {languageOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Selector de Zona Horaria */}
          <div className="flex items-center justify-between py-2 border-b border-dark-700 light:border-light-300">
            <span className="text-gray-200 text-lg light:text-light-800">Zona Horaria</span>
            <select
              value={timezonePreference}
              onChange={(e) => handleUserPreferenceChange('timezone', e.target.value)}
              className="bg-dark-900 border border-dark-700 rounded-md p-2 text-gray-100 focus:ring-primary-500 focus:border-primary-500 light:bg-light-100 light:border-light-300 light:text-light-800 flex-shrink-0" /* Added flex-shrink-0 */
            >
              {timezoneOptions.map(option => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>

          {/* Selector de Tema (Claro/Oscuro) */}
          <div className="flex items-center justify-between py-2">
            <span className="text-gray-200 text-lg light:text-light-800">Tema Visual</span>
            <select
              value={themePreference}
              onChange={(e) => handleUserPreferenceChange('theme', e.target.value)}
              className="bg-dark-900 border border-dark-700 rounded-md p-2 text-gray-100 focus:ring-primary-500 focus:border-primary-500 light:bg-light-100 light:border-light-300 light:text-light-800 flex-shrink-0" /* Added flex-shrink-0 */
            >
              <option value="dark">Oscuro</option>
              <option value="light">Claro</option>
            </select>
          </div>
        </div>
      </div>

      {/* Sección de Preferencias de Notificación */}
      <div className="card-dark p-6 bg-dark-800 border border-dark-700 light:bg-white light:border-light-300">
        <h2 className="text-xl font-semibold mb-4 text-gray-100 light:text-light-800">Preferencias de Notificación</h2>
        <p className="text-gray-400 text-sm mb-6 light:text-light-600">Elige qué tipos de notificaciones deseas recibir en tu panel.</p>
        
        <div className="space-y-4">
          {Object.keys(notificationLabels).map(type => (
            <div key={type} className="flex items-center justify-between py-2 border-b border-dark-700 last:border-b-0 light:border-light-300">
              <span className="text-gray-200 text-lg light:text-light-800">{notificationLabels[type]}</span>
              <label htmlFor={type} className="flex items-center cursor-pointer flex-shrink-0"> {/* Added flex-shrink-0 */}
                <div className="relative">
                  <input
                    type="checkbox"
                    id={type}
                    className="sr-only"
                    checked={notificationSettings[type]}
                    onChange={() => handleNotificationToggle(type)}
                  />
                  <div className={`block w-14 h-8 rounded-full transition-colors ${notificationSettings[type] ? 'bg-primary-600' : 'bg-gray-600 light:bg-light-500'}`}></div>
                  <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${notificationSettings[type] ? 'translate-x-full' : ''}`}></div>
                </div>
              </label>
            </div>
          ))}
        </div>
        {!user && (
          <p className="text-error-400 text-sm mt-4 light:text-error-600">Para guardar tus preferencias, por favor, inicia sesión.</p>
        )}
      </div>
    </div>
  );
}
