// supabase/functions/invite-user/index.ts

// Importa createClient desde la versión especificada
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define headers CORS completos para permitir solicitudes desde el frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Permite peticiones desde cualquier origen
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

// Inicializa el cliente Supabase con la SERVICE_ROLE_KEY
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  }
) as any

// Define el manejador principal de la función (Deno.serve)
Deno.serve(async (req) => {
  // 📝 DEBUG: mostrar body crudo en los logs
  try {
    const rawBody = await req.json();
    console.log('▶️ Request JSON:', rawBody);
  } catch {
    console.log('⚠️ No se pudo parsear JSON del body');
  }

  // Maneja solicitudes OPTIONS (preflight de CORS)
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    // Verifica método POST
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parsea el cuerpo de la solicitud para obtener el email
    const { email } = await req.json();

    // Valida que se haya proporcionado un email
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Acción principal: Invitar al usuario ---
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);

    if (error) {
      console.error('Error inviting user:', error.message);
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Respuesta de éxito
    return new Response(JSON.stringify({ message: 'Invitation sent', data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err: unknown) {
    console.error('Unexpected error:', err instanceof Error ? err.message : err);
    let errorMessage = 'An unexpected error occurred';
    if (err instanceof Error) errorMessage = err.message;
    else if (typeof err === 'string') errorMessage = err;

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
