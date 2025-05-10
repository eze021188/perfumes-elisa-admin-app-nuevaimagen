// supabase/functions/invite-user/index.ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, x-client-info, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Max-Age': '86400',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
) as any

Deno.serve(async (req) => {
  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  // Solo parseamos body en POST
  let rawBody: any = null
  if (req.method === 'POST') {
    try {
      rawBody = await req.json()
      console.log('▶️ Request JSON:', rawBody)
    } catch {
      console.log('⚠️ No se pudo parsear JSON del body')
    }
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const email = rawBody?.email
    if (!email) {
      return new Response(JSON.stringify({ error: 'Email is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email)
    if (error) {
      console.error('Error inviting user:', error.message)
      return new Response(JSON.stringify({ error: error.message }), {
        status: error.status || 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ message: 'Invitation sent', data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    console.error('Unexpected error:', err instanceof Error ? err.message : err)
    const errorMessage = err instanceof Error ? err.message : String(err)
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
