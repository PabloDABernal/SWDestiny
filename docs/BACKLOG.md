# Backlog (ideas para v2+)

Ideas que surgen durante la implementación. Una línea por idea. NO se implementan hasta que se conviertan en spec.

- CORS en producción: en v1 la resolución de cartas contra ARH DB solo funciona en dev vía proxy `/arh` (vite.config.ts). Sin backend, prod necesita otra estrategia (dataset de cartas empaquetado, proxy propio o API con CORS abierto). (Detectado en SPEC-001.)
- Validar la forma de la caché al cargar de localStorage (`swd:deck`): hoy se hace `JSON.parse ... as Character[]` sin comprobar estructura; caché corrupta renderizaría fichas con campos undefined en vez de error claro. (Detectado en SPEC-001.)
