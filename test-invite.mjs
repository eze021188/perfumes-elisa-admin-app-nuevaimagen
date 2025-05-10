// test-invite.mjs
import { createClient } from '@supabase/supabase-js';

(async () => {
  const supabase = createClient(
    'https://huwyzzrelxzunvetzawp.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imh1d3l6enJlbHh6dW52ZXR6YXdwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NzU1OTcsImV4cCI6MjA2MjA1MTU5N30.KocplrkEfBOQUCLb3Em6JpX-9dqrFR9bruxzVnemxoU'
  );

  try {
    const { data, error } = await supabase.functions.invoke('invite-user', {
      body: { email: 'test@example.com' },
    });
    if (error) throw error;
    console.log('✅ Función invocada con éxito:', data);
  } catch (err) {
    console.error('❌ Error al invocar la función:', err);
  }
})();
