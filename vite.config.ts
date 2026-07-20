import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El proxy /arh evita CORS en desarrollo al resolver cartas contra la API pública de ARH DB.
// En producción (sin backend) se llama directo a la API; ver src/import/resolveCards.ts.
export default defineConfig({
  // GitHub Pages sirve el proyecto en /SWDestiny/, no en la raíz.
  base: '/SWDestiny/',
  plugins: [react()],
  server: {
    proxy: {
      '/arh': {
        target: 'https://db.swdrenewedhope.com',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/arh/, ''),
      },
    },
  },
});
