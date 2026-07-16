import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El proxy /arh evita CORS en desarrollo al resolver cartas contra la API pública de ARH DB.
// En producción no hay backend (v1): resolver CORS de prod está anotado en docs/BACKLOG.md.
export default defineConfig({
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
