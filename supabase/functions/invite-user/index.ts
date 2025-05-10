// supabase/functions/invite-user/index.ts o index.js

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Si usaste el template por defecto, es probable que necesites importar esto para CORS
// Verifica si tienes el archivo _shared/cors.ts/js
// Si no lo tienes, puedes eliminar la importación y el uso de corsHeaders
import { corsHeaders } from '../_shared/cors.ts'


// Inicializa el cliente Supabase usando la URL del proyecto y la SERVICE_ROLE_KEY
// La SERVICE_ROLE_KEY está disponible automáticamente como variable de entorno SECURE_SUPABASE_KEY en Edge Functions.
// Asegúrate de que la variable SECURE_SUPABASE_KEY esté configurada en tu proyecto Supabase.
// Usamos 'as any' para evitar errores de tipo si el cliente no es exactamente el que espera TS por defecto.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '', // URL del proyecto Supabase, disponible por defecto
  Deno.env.get('SECURE_SUPABASE_KEY') ?? '', // SERVICE_ROLE_KEY, disponible si la configuras
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
) as any


Deno.serve(async (req) => {
  // Maneja solicitudes OPTIONS (para CORS) si es necesario
  // Si eliminaste corsHeaders, también elimina este bloque if
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parsea el cuerpo de la solicitud para obtener el email
    const { email } = await req.json();

    if (!email) {
        // Usa corsHeaders si los tienes definidos
        return new Response(JSON.stringify({ error: 'Email is required' }), {
            status: 400,
            headers: { ...(corsHeaders || {}), 'Content-Type': 'application/json' }
        });
    }

    // Invita al usuario usando el cliente admin
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (error) {
      console.error('Error inviting user:', error.message);
       // Usa corsHeaders si los tienes definidos
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status || 500,
        headers: { ...(corsHeaders || {}), 'Content-Type': 'application/json' }
      });
    }

    // Devuelve una respuesta de éxito
     // Usa corsHeaders si los tienes definidos
    return new Response(JSON.stringify({ message: 'Invitation sent', data: data }), {
      status: 200,
      headers: { ...(corsHeaders || {}), 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error.message);
    // Maneja errores inesperados
    // Usa corsHeaders si los tienes definidos
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...(corsHeaders || {}), 'Content-Type': 'application/json' }
    });
  }
})