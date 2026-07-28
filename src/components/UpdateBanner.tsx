import { useEffect, useState } from 'react';

// Registro del Service Worker y aviso de versión nueva (SPEC-034 + SPEC-040).
//
// El SW nunca toma el control por su cuenta: cuando hay una build nueva se queda en espera
// (`waiting`) y aquí se enseña un aviso con "Actualizar". Solo al pulsarlo se le manda SKIP_WAITING y
// se recarga. Así no se interrumpe una partida a medias ni se pierde estado no persistido.

let reloading = false; // evita recargas en bucle si controllerchange se dispara más de una vez

export function UpdateBanner() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    let registration: ServiceWorkerRegistration | undefined;
    // Un solo AbortController para TODOS los listeners, incluidos los `statechange` que se añaden
    // más tarde: en dev, StrictMode monta el efecto dos veces y sin esto quedarían colgados.
    const ac = new AbortController();
    const { signal } = ac;

    // Un SW recién instalado solo es "versión nueva" si ya había uno controlando la página; en la
    // primerísima visita también pasa por `installed`, y ahí no hay nada que avisar.
    const watchInstalling = (sw: ServiceWorker | null) => {
      if (!sw) return;
      sw.addEventListener(
        'statechange',
        () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) setWaiting(sw);
        },
        { signal },
      );
    };

    // Se registra tras `load` (como hacía main.tsx en SPEC-034) para no competir por ancho de banda
    // con la carga inicial. Si la página ya cargó, se registra en el acto.
    const register = () => {
      navigator.serviceWorker
        .register(`${import.meta.env.BASE_URL}sw.js`)
        .then((reg) => {
          if (signal.aborted) return;
          registration = reg;
          if (reg.waiting && navigator.serviceWorker.controller) setWaiting(reg.waiting);
          reg.addEventListener('updatefound', () => watchInstalling(reg.installing), { signal });
        })
        .catch(() => {
          // best-effort: sin SW la app sigue funcionando con red (sin offline ni aviso de versión).
        });
    };
    if (document.readyState === 'complete') register();
    else window.addEventListener('load', register, { signal });

    // El navegador no busca actualizaciones del SW mientras la pestaña sigue abierta (solo al
    // navegar, y un chequeo propio cada ~24 h). Al volver a la app, se pregunta explícitamente.
    const checkForUpdate = () => {
      if (document.visibilityState === 'visible') registration?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', checkForUpdate, { signal });
    window.addEventListener('focus', checkForUpdate, { signal });

    navigator.serviceWorker.addEventListener(
      'controllerchange',
      () => {
        if (reloading) return;
        reloading = true;
        window.location.reload();
      },
      { signal },
    );

    return () => ac.abort();
  }, []);

  if (!waiting || dismissed) return null;

  return (
    <div className="update-banner" role="status">
      <span className="update-banner__text">Hay una versión nueva del juego.</span>
      <button type="button" onClick={() => waiting.postMessage({ type: 'SKIP_WAITING' })}>
        Actualizar
      </button>
      <button
        type="button"
        className="update-banner__dismiss"
        onClick={() => setDismissed(true)}
        aria-label="Descartar el aviso"
      >
        Ahora no
      </button>
    </div>
  );
}
