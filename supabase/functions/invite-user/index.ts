// supabase/functions/invite-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Elimina la importación: import { corsHeaders } from '../_shared/cors.ts' // <<< ELIMINA O COMENTA ESTA LÍNEA

// Define headers CORS básicos aquí si los necesitas, o usa un objeto vacío si no estás seguro
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Permite peticiones desde cualquier origen (seguro si la función no requiere auth)
  'Access-Control-Allow-Headers': 'apikey, X- supabase-Event, X- supabase-Using-JWT, Content-Type, Authorization',
}

// Inicializa el cliente Supabase usando la URL del proyecto y la SERVICE_ROLE_KEY
// La SERVICE_ROLE_KEY está disponible automáticamente como variable de entorno SECURE_SUPABASE_KEY en Edge Functions.
// Asegúrate de que la variable SECURE_SUPABASE_KEY esté configurada en tu proyecto Supabase.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SECURE_SUPABASE_KEY') ?? '',
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
  // Usa los headers CORS definidos localmente
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Parsea el cuerpo de la solicitud para obtener el email
    const { email } = await req.json();

    if (!email) {
        // Usa los headers CORS definidos localmente
        return new Response(JSON.stringify({ error: 'Email is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Invita al usuario usando el cliente admin
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (error) {
      console.error('Error inviting user:', error.message);
       // Usa los headers CORS definidos localmente
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Devuelve una respuesta de éxito
     // Usa los headers CORS definidos localmente
    return new Response(JSON.stringify({ message: 'Invitation sent', data: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Unexpected error:', error.message);
    // Maneja errores inesperados
    // Usa los headers CORS definidos localmente
    return new Response(JSON.stringify({ error: error.message || 'An unexpected error occurred' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})