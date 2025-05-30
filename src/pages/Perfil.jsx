import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { ArrowLeft, User, Phone, Mail, MapPin, Save, Lock, Image as ImageIcon, Upload } from 'lucide-react';

export default function Perfil() {
  const navigate = useNavigate();
  const { user } = useAuth(); 
  
  const [profile, setProfile] = useState({
    nombre: '',
    telefono: '',
    direccion: '',
    profile_pic_url: '' // Nuevo estado para la URL de la foto de perfil
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState({ newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);

  // Estados para la carga de imagen de perfil
  const [selectedImageFile, setSelectedImageFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null); // Ref para el input de archivo

  // Cargar perfil al iniciar
  useEffect(() => {
    async function fetchProfile() {
      if (!user) {
        setLoading(false);
        setError("No hay usuario autenticado.");
        return;
      }

      try {
        const { data, error } = await supabase
          .from('usuarios')
          .select('nombre, telefono, direccion, profile_pic_url') // Incluir profile_pic_url
          .eq('id', user.id)
          .single();

        if (error && error.code !== 'PGRST116') {
          throw error;
        }

        setProfile({
          nombre: data?.nombre || '',
          telefono: data?.telefono || '',
          correo: user.email || '',
          direccion: data?.direccion || '',
          profile_pic_url: data?.profile_pic_url || '' // Setear la URL existente
        });
        // Modificado: Este setImagePreviewUrl es importante para la carga inicial
        // No necesitamos el `profile.profile_pic_url || null` aquí, el useEffect lo gestionará.
        // Lo que sí necesitamos es que `profile` se actualice y el `useEffect` reaccione.
      } catch (err) {
        console.error("Error al cargar perfil:", err);
        setError(`Error al cargar perfil: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [user]);

  // --- CAMBIO CLAVE EN ESTE useEffect ---
  // Efecto para gestionar la URL de previsualización de la imagen
  useEffect(() => {
    console.log("DEBUG PREVIEW UE: selectedImageFile cambió:", selectedImageFile);
    console.log("DEBUG PREVIEW UE: profile.profile_pic_url cambió:", profile.profile_pic_url);

    // Caso 1: Hay un archivo nuevo seleccionado (para previsualización inmediata)
    if (selectedImageFile) {
      const objectUrl = URL.createObjectURL(selectedImageFile);
      setImagePreviewUrl(objectUrl);
      console.log("DEBUG PREVIEW UE: Estableciendo URL temporal para previsualización:", objectUrl);
      // Limpiar la URL temporal cuando el componente se desmonte o el archivo cambie
      return () => URL.revokeObjectURL(objectUrl);
    }
    // Caso 2: No hay archivo nuevo seleccionado, pero sí hay una URL de perfil guardada (para avatar persistente)
    else if (profile.profile_pic_url) {
      setImagePreviewUrl(profile.profile_pic_url);
      console.log("DEBUG PREVIEW UE: Estableciendo URL de perfil existente:", profile.profile_pic_url);
      // No hay cleanup para URLs no temporales, así que no se retorna nada aquí.
    }
    // Caso 3: No hay archivo nuevo ni URL de perfil guardada, limpiar previsualización (mostrar el icono por defecto)
    else {
      setImagePreviewUrl(null);
      console.log("DEBUG PREVIEW UE: No hay avatar ni temporal ni guardado, estableciendo preview a null.");
    }
  }, [selectedImageFile, profile.profile_pic_url]); // Depende de ambos estados

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedImageFile(e.target.files[0]);
    } else {
      setSelectedImageFile(null);
      // Ya no necesitamos establecer imagePreviewUrl aquí, el useEffect de arriba se encargará
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    setError(null);
    let newProfilePicUrl = profile.profile_pic_url;

    try {
      if (!user) {
        toast.error("No hay usuario autenticado para guardar.");
        setSaving(false);
        return;
      }

      // 1. Cargar imagen si hay una nueva seleccionada
      if (selectedImageFile) {
        setUploadingImage(true);
        const fileExtension = selectedImageFile.name.split('.').pop();
        // Asegúrate de que la extensión sea válida (ej. 'jpg', 'png', 'jpeg')
        const filePath = `${user.id}/profile.${fileExtension}`; 

        console.log("DEBUG IMAGEN: Iniciando subida de imagen...");
        console.log("DEBUG IMAGEN: Archivo a subir:", selectedImageFile.name, "Tamaño:", selectedImageFile.size, "Tipo:", selectedImageFile.type);
        console.log("DEBUG IMAGEN: Ruta de destino (filePath):", filePath);

        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, selectedImageFile, {
            cacheControl: '3600',
            upsert: true,
          });

        if (uploadError) {
          console.error("DEBUG IMAGEN: Error al subir imagen:", uploadError.message);
          throw uploadError;
        }
        console.log("DEBUG IMAGEN: Subida de imagen exitosa. uploadData:", uploadData);

        // Obtener la URL pública de la imagen cargada
        console.log("DEBUG IMAGEN: Intentando obtener URL pública para filePath:", filePath);
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        if (publicUrlData && publicUrlData.publicUrl) {
          newProfilePicUrl = publicUrlData.publicUrl;
          // No es necesario llamar a setImagePreviewUrl aquí.
          // El cambio a `profile.profile_pic_url` abajo hará que el useEffect se dispare
          // y actualice `imagePreviewUrl` automáticamente con la URL permanente.
          toast.success('Imagen de perfil cargada.');
          console.log("DEBUG IMAGEN: URL Pública obtenida con éxito:", newProfilePicUrl);
        } else {
          console.error("DEBUG IMAGEN: ¡ATENCIÓN! No se pudo obtener publicUrlData.publicUrl.");
          console.error("DEBUG IMAGEN: Contenido de publicUrlData:", publicUrlData);
        }
      }
      setUploadingImage(false); // Siempre resetear al terminar la subida

      // 2. Actualizar datos de perfil en la tabla 'usuarios'
      const dataToUpdate = {
        id: user.id,
        nombre: profile.nombre,
        // Si 'telefono' es numeric y puede estar vacío:
        telefono: profile.telefono === '' ? null : Number(profile.telefono),
        direccion: profile.direccion,
        profile_pic_url: newProfilePicUrl // Usar la nueva URL o la existente
      };
      
      console.log("DEBUG PERFIL: Datos a enviar a la tabla 'usuarios':", dataToUpdate);

      const { error: updateError } = await supabase
        .from('usuarios')
        .upsert(dataToUpdate);

      if (updateError) {
        console.error("DEBUG PERFIL: Error al actualizar datos de usuario:", updateError.message);
        throw updateError;
      }
      
      // *** Importante: Actualizar el estado `profile` con la nueva URL permanente
      // Esto disparará el `useEffect` para actualizar `imagePreviewUrl` correctamente
      setProfile(prev => ({ ...prev, profile_pic_url: newProfilePicUrl }));

      toast.success('Perfil actualizado exitosamente.');
    } catch (err) {
      console.error("Error general al guardar perfil (catch principal):", err.message);
      setError(`Error al guardar perfil: ${err.message}`);
      toast.error('Error al actualizar perfil.');
    } finally {
      setSaving(false);
      setUploadingImage(false);
      setSelectedImageFile(null); // Limpiar archivo seleccionado después de intentar guardar
      // fileInputRef.current.value = ''; // Opcional: limpiar el input de archivo visualmente
    }
  };

  const validatePassword = () => {
    const errs = { newPassword: '', confirmPassword: '' };
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      errs.newPassword = 'La contraseña debe tener al menos 6 caracteres.';
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      errs.confirmPassword = 'Las contraseñas no coinciden.';
    }
    setPasswordErrors(errs);
    return !errs.newPassword && !errs.confirmPassword;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) {
      toast.error("Corrige los errores de la contraseña.");
      return;
    }
    setSavingPassword(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordForm.newPassword,
      });

      if (error) throw error;

      toast.success('Contraseña actualizada exitosamente.');
      setPasswordForm({ newPassword: '', confirmPassword: '' });
      setPasswordErrors({ newPassword: '', confirmPassword: '' });
    } catch (err) {
      console.error("Error al cambiar contraseña:", err);
      toast.error(`Error al cambiar contraseña: ${err.message}`);
    } finally {
      setSavingPassword(false);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-4">
        <p className="text-gray-300">Debes iniciar sesión para ver tu perfil.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 p-4 md:p-8 lg:p-12">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-8">
        <button
          onClick={() => navigate('/')}
          className="px-6 py-2 bg-dark-800 text-gray-200 font-semibold rounded-lg shadow-elegant-dark hover:bg-dark-700 transition-colors flex items-center gap-2"
        >
          <ArrowLeft size={18} />
          Volver al inicio
        </button>
        <h1 className="text-3xl font-bold text-gray-100 text-center">Mi Perfil</h1>
        <div className="w-full md:w-[150px]" />
      </div>

      <div className="bg-dark-800 rounded-lg shadow-card-dark p-6 md:p-8 border border-dark-700/50 max-w-2xl mx-auto">
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary-400"></div>
          </div>
        ) : error ? (
          <p className="text-error-400 text-center">{error}</p>
        ) : (
          <div className="space-y-8">
            {/* Sección de Información Personal */}
            <div>
              <h2 className="text-2xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <User size={20} className="text-primary-400" /> Información Personal
              </h2>
              <div className="space-y-4">
                {/* Foto de Perfil */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-24 h-24 rounded-full bg-dark-700 flex items-center justify-center overflow-hidden border-2 border-primary-500 shadow-lg">
                    {/* Aquí usamos imagePreviewUrl */}
                    {imagePreviewUrl ? (
                      <img src={imagePreviewUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <ImageIcon size={48} className="text-gray-500" />
                    )}
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    onChange={handleFileChange}
                    className="hidden"
                    disabled={uploadingImage || saving}
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage || saving}
                    className="mt-3 px-4 py-2 bg-dark-700 text-gray-200 rounded-lg hover:bg-dark-600 transition-colors flex items-center gap-2 text-sm"
                  >
                    <Upload size={16} />
                    {uploadingImage ? 'Subiendo...' : 'Cambiar Foto'}
                  </button>
                </div>

                {/* Correo Electrónico (No editable directamente) */}
                <div>
                  <label htmlFor="perfil-correo" className="block text-sm font-medium text-gray-300 mb-1">Correo Electrónico</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail size={16} className="text-gray-500" />
                    </div>
                    <input
                      id="perfil-correo"
                      type="email"
                      className="w-full pl-10 p-2 bg-dark-900 border border-dark-700 rounded-md text-gray-400 cursor-not-allowed"
                      value={user?.email || ''} // Asegurarse de tomar el correo directamente del usuario de autenticación
                      disabled 
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">El correo electrónico principal se gestiona en la configuración de cuenta de Supabase.</p>
                </div>
                
                {/* Nombre */}
                <div>
                  <label htmlFor="perfil-nombre" className="block text-sm font-medium text-gray-300 mb-1">Nombre</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User size={16} className="text-gray-500" />
                    </div>
                    <input
                      id="perfil-nombre"
                      name="nombre"
                      className="w-full pl-10 p-2 bg-dark-900 border border-dark-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200"
                      value={profile.nombre}
                      onChange={handleProfileChange}
                      disabled={saving || uploadingImage}
                    />
                  </div>
                </div>

                {/* Teléfono */}
                <div>
                  <label htmlFor="perfil-telefono" className="block text-sm font-medium text-gray-300 mb-1">Teléfono</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Phone size={16} className="text-gray-500" />
                    </div>
                    <input
                      id="perfil-telefono"
                      name="telefono"
                      type="tel"
                      className="w-full pl-10 p-2 bg-dark-900 border border-dark-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200"
                      value={profile.telefono}
                      onChange={handleProfileChange}
                      disabled={saving || uploadingImage}
                    />
                  </div>
                </div>

                {/* Dirección */}
                <div>
                  <label htmlFor="perfil-direccion" className="block text-sm font-medium text-gray-300 mb-1">Dirección</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin size={16} className="text-gray-500" />
                    </div>
                    <input
                      id="perfil-direccion"
                      name="direccion"
                      className="w-full pl-10 p-2 bg-dark-900 border border-dark-700 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200"
                      value={profile.direccion}
                      onChange={handleProfileChange}
                      disabled={saving || uploadingImage}
                    />
                  </div>
                </div>

              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={saving || uploadingImage}
                  className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {saving || uploadingImage ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>{uploadingImage ? 'Subiendo imagen...' : 'Guardando…'}</span>
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      <span>Guardar Perfil</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Sección de Cambiar Contraseña */}
            <hr className="border-dark-700" />
            <div>
              <h2 className="text-2xl font-semibold text-gray-100 mb-4 flex items-center gap-2">
                <Lock size={20} className="text-primary-400" /> Cambiar Contraseña
              </h2>
              <div className="space-y-4">
                {/* Nueva Contraseña */}
                <div>
                  <label htmlFor="new-password" className="block text-sm font-medium text-gray-300 mb-1">Nueva Contraseña</label>
                  <input
                    id="new-password"
                    type="password"
                    name="newPassword"
                    className={`w-full p-2 bg-dark-900 border ${passwordErrors.newPassword ? 'border-error-500' : 'border-dark-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200`}
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                    disabled={savingPassword}
                  />
                  {passwordErrors.newPassword && <p className="text-error-400 text-xs mt-1">{passwordErrors.newPassword}</p>}
                </div>
                {/* Confirmar Contraseña */}
                <div>
                  <label htmlFor="confirm-password" className="block text-sm font-medium text-gray-300 mb-1">Confirmar Contraseña</label>
                  <input
                    id="confirm-password"
                    type="password"
                    name="confirmPassword"
                    className={`w-full p-2 bg-dark-900 border ${passwordErrors.confirmPassword ? 'border-error-500' : 'border-dark-700'} rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-gray-200`}
                    value={passwordForm.confirmPassword}
                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                    disabled={savingPassword}
                  />
                  {passwordErrors.confirmPassword && <p className="text-error-400 text-xs mt-1">{passwordErrors.confirmPassword}</p>}
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <button
                  onClick={handleChangePassword}
                  disabled={savingPassword}
                  className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {savingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                      <span>Guardando…</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Cambiar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}