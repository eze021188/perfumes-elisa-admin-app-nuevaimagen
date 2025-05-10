// src/functions/invite-user/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'apikey, Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } }
)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  const { email } = await req.json()
  if (!email) {
    return new Response(JSON.stringify({ error: 'Email is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  // <-- Redirige al callback para establecer contraseña
  const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(
    email,
    { redirectTo: 'https://app.perfumeselisa.com/usuarios/callback' }
  )

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.status || 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({ message: 'Invitation sent', data }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  })
})
