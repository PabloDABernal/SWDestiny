import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service Worker para cachear imágenes de carta offline (SPEC-034). Se sirve desde la base de la app
// (`/SWDestiny/`); solo si el navegador lo soporta. Controla la página en la siguiente recarga.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {
      // best-effort: sin SW, las imágenes siguen mostrándose con red (sin cache offline gestionado).
    });
  });
}
