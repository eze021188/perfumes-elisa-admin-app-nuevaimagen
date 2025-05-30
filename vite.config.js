import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // Esto permite que Vite escuche en todas las interfaces de red (0.0.0.0)
    port: 5173, // Asegúrate de que este es el puerto de tu app Vite
    strictPort: true, // Esto hará que Vite falle si el puerto ya está en uso, en lugar de intentar el siguiente
    hmr: { // Configuración para Hot Module Replacement (HMR)
      // ESTA URL DEBE COINCIDIR CON LA URL EXACTA DE "FORWARDING" QUE TE DA NGROK EN LA TERMINAL
      host: '643b-2806-2f0-42c1-ed1b-3c19-9695-70a9-7619.ngrok-free.app', // <-- ¡ACTUALIZA ESTA LÍNEA CON TU URL ACTUAL DE NGROK!
      clientPort: 443 // Puerto estándar HTTPS para ngrok
    },
    allowedHosts: [
      '643b-2806-2f0-42c1-ed1b-3c19-9695-70a9-7619.ngrok-free.app', // <-- ¡ACTUALIZA ESTA LÍNEA TAMBIÉN!
      // 'localhost', // Ya permitido por defecto, pero puedes añadirlo explícitamente
      // '127.0.0.1', // Ya permitido por defecto
    ],
    fs: {
      strict: false,
      cachedChecks: false,
    },
  },
});