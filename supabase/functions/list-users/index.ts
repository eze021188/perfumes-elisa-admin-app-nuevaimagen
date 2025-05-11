// supabase/functions/list-users/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Tu clave service_role está disponible como una variable de entorno en Edge Functions
// NUNCA expongas esta clave en el frontend.
const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Usa la clave service_role
);

// Define los headers CORS permitidos
const corsHeaders = {
  // *** NOTA IMPORTANTE: '*' permite cualquier origen. Para producción, CAMBIA esto a tu dominio específico:
  // 'Access-Control-Allow-Origin': 'https://app.perfumeselisa.com',
  'Access-Control-Allow-Origin': '*', // Permite cualquier origen. Para producción, considera restringirlo a tu dominio.
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', // Headers permitidos
  'Access-Control-Allow-Methods': 'POST, OPTIONS', // Métodos permitidos para esta función
};

serve(async (req) => {
    // Manejar solicitudes OPTIONS (preflight CORS)
    if (req.method === 'OPTIONS') {
        return new Response('ok', {
            headers: corsHeaders, // Devuelve los headers CORS en la respuesta preflight
        });
    }

    // Opcional pero recomendado: Verificar si el usuario que llama tiene permisos (ej: es administrador)
    // Puedes obtener el token del usuario logueado desde el header Authorization
    const authHeader = req.headers.get('Authorization');
    const token = authHeader?.replace('Bearer ', '');

    let userId = null;
    let userRole = null; // Asume que guardas el rol en user_metadata

    if (token) {
        // Verificar el token para obtener la información del usuario logueado
        // Usa la instancia admin para verificar el token sin requerir RLS
        const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

        if (userError || !user) {
            // Si el token es inválido, denegar acceso
            return new Response(JSON.stringify({ error: 'Unauthorized' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Incluye headers CORS
                status: 401,
            });
        }
        userId = user.id;
        userRole = user.user_metadata?.role; // Obtener el rol del usuario logueado

        // *** Implementar lógica de permisos aquí ***
        // Ejemplo: Solo permitir a los usuarios con rol 'admin' listar usuarios
        if (userRole !== 'admin') {
             return new Response(JSON.stringify({ error: 'Forbidden: Only administrators can list users.' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Incluye headers CORS
                status: 403, // Código de estado 403 Forbidden
            });
        }
    } else {
         // Si no hay token, denegar acceso (si la función requiere autenticación)
         return new Response(JSON.stringify({ error: 'Authentication required' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Incluye headers CORS
            status: 401,
        });
    }


    // Si el usuario tiene permisos, procede a listar los usuarios
    try {
        // Llama al método de la Admin API para listar usuarios
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();

        if (error) {
            console.error('Error listing users:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Incluye headers CORS
                status: 500, // Error interno del servidor
            });
        }

        // Devuelve la lista de usuarios al frontend
        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Incluye headers CORS
            status: 200,
        });

    } catch (error) {
        console.error('Unexpected error listing users:', error);
         return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }, // Incluye headers CORS
            status: 500,
        });
    }
});
