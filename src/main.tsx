import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { UpdateBanner } from './components/UpdateBanner';
import './styles.css';

// El registro del Service Worker (imágenes de carta offline, SPEC-034; app shell, SPEC-040) vive en
// UpdateBanner, que además necesita su `registration` para detectar la versión nueva y avisar.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
    <UpdateBanner />
  </StrictMode>,
);
