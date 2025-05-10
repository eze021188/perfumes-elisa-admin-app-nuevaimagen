// Dentro del componente UsersPermissions en src/pages/UsersPermissions.jsx

const handleInviteUser = async (email) => {
  try {
      // >>> ESTA ES LA LLAMADA CORRECTA A LA EDGE FUNCTION <<<
      // Reemplaza '[YOUR_PROJECT_REF]' con la referencia real de tu proyecto Supabase
      const supabaseFunctionsUrl = 'https://huwyzzrelxzunvetzawp.functions.supabase.co/invite-user'; // <<< ¡USA ESTA URL!

      const response = await fetch(supabaseFunctionsUrl, {
          method: 'POST',
          headers: {
              'Content-Type': 'application/json',
              // No necesitas añadir la Service Role Key aquí. La Edge Function la usa internamente.
              // Si la Edge Function requiriera autenticación JWT del usuario que llama (ej: debe ser un admin logueado),
              // añadirías aquí el token JWT del usuario logueado:
              // 'Authorization': `Bearer ${YOUR_LOGGED_IN_USERS_JWT_TOKEN}`
          },
          body: JSON.stringify({ email }), // Envía el email en el cuerpo de la solicitud
      });

      const data = await response.json();

      if (!response.ok) {
           // Si la respuesta HTTP no es exitosa (status 400, 500, etc.)
           console.error('Error calling Edge Function:', data.error);
           toast.error(`Error en la Edge Function: ${data.error || 'Error desconocido.'}`);
           // Decide si quieres lanzar un error aquí para el catch general
           throw new Error(data.error || 'Error en la Edge Function.');
      }

      console.log('Edge Function response:', data);
      toast.success('Invitación enviada con éxito via Edge Function!');
      // Opcional: Refrescar la lista de usuarios si el trigger funciona y el usuario aparece al aceptar
      // fetchUsers(); // El usuario no aparecerá en public.usuarios hasta que acepte la invitación

  } catch (err) {
    console.error('Error en el fetch a la Edge Function:', err.message);
    toast.error('Ocurrió un error al comunicarse con el servidor.');
  }
};

// ... resto del componente ...