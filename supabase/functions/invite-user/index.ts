// supabase/functions/invite-user/index.ts o index.js

// Importa createClient desde la versión especificada
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Define headers CORS completos para permitir solicitudes desde el frontend
const corsHeaders = {
  'Access-Control-Allow-Origin': '*', // Permite peticiones desde cualquier origen. En producción, considera restringir a tu dominio.
  'Access-Control-Allow-Headers': 'apikey, X- supabase-Event, X- supabase-Using-JWT, Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Permite específicamente los métodos POST y OPTIONS
  'Access-Control-Max-Age': '86400', // Opcional: cachea los resultados de la preflight request por 24 horas
}

// Inicializa el cliente Supabase usando la URL del proyecto y la SERVICE_ROLE_KEY
// La SERVICE_ROLE_KEY está disponible automáticamente como variable de entorno SECURE_SUPABASE_KEY en Edge Functions.
// Asegúrate de que configuras SECURE_SUPABASE_KEY en Project Settings > Edge Functions > Configuration.
const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '', // URL del proyecto Supabase, disponible por defecto
  Deno.env.get('SECURE_SUPABASE_KEY') ?? '', // SERVICE_ROLE_KEY, configurada en el dashboard
  {
    auth: {
      autoRefreshToken: false, // No necesitas refrescar tokens admin
      persistSession: false,   // No necesitas persistir sesión admin
      detectSessionInUrl: false, // No necesitas detectar sesión en la URL
    },
  }
) as any // Usamos as any por compatibilidad de tipos con el cliente admin

// Define el manejador principal de la función (Deno.serve)
Deno.serve(async (req) => {
  // Maneja solicitudes OPTIONS (preflight de CORS)
  if (req.method === 'OPTIONS') {
    // Responde con status 200 OK y los headers CORS
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Asegúrate de que la solicitud sea POST
    if (req.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
            status: 405, // 405 Method Not Allowed
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // Parsea el cuerpo de la solicitud para obtener el email
    const { email } = await req.json();

    // Valida que se haya proporcionado un email
    if (!email) {
        return new Response(JSON.stringify({ error: 'Email is required' }), {
            status: 400, // 400 Bad Request
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    // --- Acción principal: Invitar al usuario ---
    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
    // --- Fin Acción principal ---

    if (error) {
      console.error('Error inviting user:', error.message);
       // Devuelve un error con status adecuado y headers CORS
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status || 500, // Usa el status del error de Supabase si está disponible (ej: 422 si ya existe)
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Devuelve una respuesta de éxito con status 200 OK y headers CORS
    return new Response(JSON.stringify({ message: 'Invitation sent', data: data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: unknown) { // <<< Añade ': unknown' aquí
    console.error('Unexpected error:', error instanceof Error ? error.message : error); // <<< Maneja si no es un Error

    // Decide si quieres lanzar un error o devolver una respuesta
    // Si quieres devolver una respuesta de error al frontend:
    let errorMessage = 'An unexpected error occurred';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'string') {
         errorMessage = error;
    }
     // Usa los headers CORS definidos localmente
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500, // 500 Internal Server Error
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // Si prefieres simplemente lanzar el error y que Deno lo maneje (menos común en funciones de API)
    // throw error; // Esto dependerá de cómo quieras manejar errores no atrapados por la lógica principal
  }
})