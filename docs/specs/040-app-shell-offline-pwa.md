# SPEC-040: App offline de verdad e instalable (app shell + PWA)

**Estado:** Completada
**Sección del GDD:** §7 (nota "App offline e instalable (PWA)")
**Depende de:** SPEC-034 (Service Worker de imágenes, `public/sw.js`), SPEC-030 (snapshot bundleado)

## Qué es (2-4 líneas)

Hoy, si recargas la página sin red, no arranca nada (sale el dinosaurio de Chrome): el Service Worker
solo cachea imágenes de carta, no la app. Con esta spec la **app entera funciona sin red** —abrirla,
elegir mazo y jugar una partida completa— y además se puede **instalar** como aplicación (icono
propio, sin barra del navegador). Cuando publiques una versión nueva, la app avisa con un botón
**"Actualizar"** en vez de dejarte con una build vieja sin enterarte.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Offline

- [ ] Abrir la app online una vez y recargar (para que el Service Worker tome el control). Después
      poner el navegador en **offline** (DevTools → Network → Offline) y **recargar** → la app
      **arranca igual** (no sale el dinosaurio), con su interfaz completa.
- [ ] Estando **offline**, jugar una **partida entera**: elegir un mazo precargado para cada bando,
      repartir, tirar dados, resolver daño, pasar turnos, hasta Victoria/Derrota → todo funciona sin
      una sola petición de red. (Los mazos precargados, los de la comunidad y el snapshot de cartas
      ya van dentro del bundle, SPEC-030/031/035.)
- [ ] Estando **offline**, entrar en la sección DB y buscar cartas y mazos → la lista, los filtros y
      las fichas de **texto** funcionan. Las imágenes siguen la regla de SPEC-034: se ven las ya
      vistas (cacheadas), y las que no, caen al detalle de texto.
- [ ] Cerrar del todo el navegador, volver a abrirlo **sin red** y entrar a la app → sigue
      arrancando (el cache persiste entre sesiones, no solo entre recargas).

### Instalable

- [ ] Con la app abierta online en Chrome/Edge de escritorio, aparece la opción de **instalar**
      (icono en la barra de direcciones o menú → "Instalar SW Destiny").
- [ ] Instalarla y abrirla desde el icono → se abre en **ventana propia**, sin barra de direcciones,
      con el icono y el nombre de la app, y **funciona igual** que en pestaña (incluido offline).

### Aviso de versión nueva

- [ ] Tras desplegarse una build nueva, **recargar la app o abrirla en una pestaña nueva** → aparece
      un **aviso visible** tipo "Hay una versión nueva" con un botón **"Actualizar"**.
- [ ] Con la app **ya abierta y sin recargar**, volver a ella tras cambiar de pestaña (o de app) →
      el aviso también aparece, sin recargar nada. *(El navegador no busca actualizaciones del SW por
      su cuenta mientras la pestaña sigue abierta; hace falta el disparador de las notas técnicas.)*
- [ ] Pulsar "Actualizar" → la página se recarga y queda en la versión nueva (verificable porque el
      cambio de esa build ya se ve).
- [ ] **No** se recarga nunca sola: si estás a mitad de partida e ignoras el aviso, sigues jugando en
      la versión vieja sin interrupción y sin perder el estado. El aviso puede **descartarse** y no
      vuelve a molestar hasta la siguiente visita.

## Fuera de alcance (explícito)

- **Descargar todas las imágenes de carta (~2977, ~226 MB) ni montar un mirror propio con CORS**:
  va a **SPEC-041**, decidido con el usuario (2026-07-27). Esta spec **no toca** la lógica de cache
  de imágenes de SPEC-034: sigue cacheando solo las que se miran.
- **Botón "Descargar imágenes de este mazo"** (precache por mazo, ~3 MB): también SPEC-041.
  *(Acordado en conversación el 2026-07-27; si lo quieres aquí, hay que decirlo antes de implementar.)*
- **Notificaciones push, background sync** y demás APIs de PWA: nada de eso entra.
- **Refrescar el snapshot de cartas desde dentro del juego**: sigue siendo un script de desarrollo
  (SPEC-030), no cambia.
- **Actualización automática silenciosa**: descartada explícitamente a favor del aviso (ver arriba).

## Casos límite

- **Primera visita de todas** (SW aún no instalado) y sin red → no hay nada que hacer: no arranca.
  Es inevitable y aceptado; el offline empieza a partir de la primera carga online.
- **Primera visita online, sin recargar todavía**: el SW se instala pero **no controla** la página
  hasta la siguiente carga (igual que ya pasa con las imágenes en SPEC-034). No se fuerza
  `clients.claim()`, para no cambiar el comportamiento ya jugado de SPEC-034.
- **Navegador que ya tenía el Service Worker de SPEC-034** (todos los que hayan abierto la app antes
  de esta spec, incluida la build de GitHub Pages): el SW nuevo se instala pero queda **en espera**,
  y hasta que el usuario pulse "Actualizar" (o cierre todas las pestañas) **sigue mandando el SW
  viejo, que no cachea el shell** → offline la app no arranca bien (puede llegar a verse sin estilos,
  con HTML/JS colados del cache HTTP del navegador). Es el comportamiento correcto, no un fallo: el
  offline empieza a funcionar en cuanto el SW nuevo toma el control. **Al hacer QA hay que tenerlo en
  cuenta**: probar en un perfil limpio, o pulsar "Actualizar" antes de medir el offline.
  *(Verificado el 2026-07-28: en un Chrome con perfil nuevo, matando el servidor, la app arranca
  offline con estilos; el síntoma "sin estilos" solo aparece con el SW viejo aún al mando.)*
- **Build nueva desplegada mientras la app está abierta**: el SW nuevo queda en estado *waiting* y
  **no** toma el control hasta que el usuario pulse "Actualizar". Los caches de la build vieja se
  borran solo cuando el SW nuevo se activa.
- **Modo desarrollo (`npm run dev`)**: el SW se registra igual (ya lo hace hoy, `src/main.tsx`), pero
  la lista de precache no existe porque no ha habido build. El SW debe tratar la lista vacía como
  válida y **no romper nada**: sin precache, se comporta como hoy (solo cachea imágenes).
- **Cache lleno / `caches.put` falla** (cuota agotada): el fallo se traga, la app sigue funcionando
  online. Nunca se rompe la navegación por un fallo de cache.
- **Petición de navegación offline a una ruta que no es la raíz**: se sirve el `index.html` cacheado
  (la app es una SPA de una sola página, no hay rutas reales).
- **Desinstalar/limpiar datos del sitio** → vuelve al estado de primera visita, sin errores.
- **Probar el aviso de versión en local**: `vite preview` y GitHub Pages no sirven `sw.js` con las
  mismas cabeceras. Si `sw.js` se sirve cacheado, el navegador no detecta el SW nuevo y el aviso no
  sale aunque el código esté bien. Al hacer QA, verificar en DevTools → Application → Service Workers
  (o forzar con "Update on reload") antes de dar por fallado el criterio.

## Notas técnicas

Decisiones tomadas con el usuario el 2026-07-27; si alguna cambia, actualizar el SDD antes.

- **Lista de precache: script postbuild casero, sin dependencias nuevas.** Vite pone hash a los
  assets (`index-<hash>.js`), así que la lista hay que generarla en build. Se añade
  `scripts/build-sw-precache.mjs` (al estilo del ya existente `scripts/build-card-snapshot.mjs`) que
  corre después de `vite build`, lee `dist/`, y **reescribe `dist/sw.js`** sustituyendo un
  marcador por la lista real de ficheros (`index.html`, JS, CSS, manifest, iconos). Reescribe la
  copia de `dist/`, **nunca `public/sw.js`**, para no ensuciar el fuente en cada build.
  `package.json` → `"build": "tsc -b && vite build && node scripts/build-sw-precache.mjs"`.
  Descartado `vite-plugin-pwa`/Workbox: obligaría a portar la lógica de imágenes de SPEC-034 dentro
  de su configuración y añade dependencia.
- **`public/sw.js` se amplía, no se reescribe**: la lógica de cache de imágenes de SPEC-034 (respuestas
  opacas, `CARD_IMAGE_RE`) se queda **igual**. Se le añaden `install` (precache del shell), `activate`
  (borrar caches de builds viejas **respetando `card-images-v1`**) y una rama de `fetch` para
  `request.mode === 'navigate'` y assets propios.
- **Nombre de cache versionado por build** (p. ej. `app-shell-<hash>`), inyectado por el mismo script,
  para que cada build tenga su cache y el `activate` sepa cuáles borrar.
- **Marcador de precache**: en `public/sw.js` la lista debe declararse de forma que **también sea JS
  válido sin inyectar**, p. ej. `const PRECACHE = self.__PRECACHE_MANIFEST__ ?? [];`, y el script
  postbuild sustituye/antepone la definición de `self.__PRECACHE_MANIFEST__` en `dist/sw.js`. Así en
  `npm run dev` (que sirve `public/sw.js` tal cual, sin build) la lista queda vacía y el SW se
  comporta como hoy, sin romper nada.
- **Sin `skipWaiting()` automático.** El SW solo llama a `skipWaiting()` cuando la página le manda un
  mensaje (`postMessage({ type: 'SKIP_WAITING' })`) al pulsar "Actualizar"; la página escucha
  `controllerchange` y recarga una sola vez. La detección del SW en espera necesita el objeto
  `registration` (`registration.waiting` / evento `updatefound`), así que el `register()` que hoy vive
  suelto en `src/main.tsx` **se mueve al componente del aviso**, que es quien lo necesita; se sigue
  registrando tras el evento `load`, igual que ahora, para no competir con la carga inicial. Como el navegador
  **no** busca actualizaciones solo mientras la pestaña sigue abierta (lo hace en cada navegación, y
  un chequeo propio cada ~24 h), hay que llamar a `registration.update()` explícitamente en
  `visibilitychange`/`focus` para que el aviso salga al volver a la app.
- **Instalable**: `public/manifest.webmanifest` (nombre, `display: standalone`, colores) + iconos PNG
  192 y 512, enlazados desde `index.html` junto a `theme-color`. Ojo con `base: '/SWDestiny/'` de
  `vite.config.ts`: `start_url` y `scope` deben ser esa ruta, no `/`, o GitHub Pages rompe la
  instalación. **Y lo mismo con las rutas a los propios ficheros**: Vite solo reescribe con el base
  las rutas que pasan por su grafo de módulos, no las de `public/`. El `<link rel="manifest">` de
  `index.html` debe usar `%BASE_URL%manifest.webmanifest` (Vite sustituye ese marcador), y los
  iconos dentro del manifest deben ir en **ruta relativa** (`"./icon-192.png"`, que resuelve contra
  la URL del manifest), nunca `/manifest.webmanifest` ni `/icon-192.png`.
- **Iconos**: salvo que el usuario aporte arte, se generan **placeholder** (cuadrado plano con las
  iniciales) para no bloquear la spec; sustituirlos después no requiere tocar código, solo los PNG.

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña-media, y **no tiene gameplay**: un script de build nuevo, ampliar `sw.js`, un manifest con
iconos y un aviso de actualización en la UI. Toca pocos ficheros y ninguno del motor de juego. Si al
implementar se dispara, lo primero que se mueve a SPEC-041 es la parte **instalable**
(manifest+iconos), dejando el offline y el aviso de versión aquí — avisando antes, no subdividir con
sufijos.

## Resultado del playtest

Completada tras playtest 2026-07-28. Offline real (servidor caído, no solo el Offline de DevTools):
la app arranca con estilos, se juega una partida entera con mazos precargados y la DB funciona; las
imágenes ya vistas siguen ahí y las no vistas caen a ficha de texto (SPEC-034 intacta). Instalable y
funcionando en ventana propia. El aviso de versión nueva salió al volver a la pestaña sin recargar,
no recargó solo, "Ahora no" lo descartó y "Actualizar" aplicó la build nueva conservando el cache de
imágenes.

Un susto durante el playtest que resultó no ser un fallo: la primera prueba offline salió **sin
estilos**, porque el navegador aún tenía al mando el Service Worker viejo de SPEC-034 (el nuevo estaba
en espera, que es el comportamiento buscado). Verificado con un Chrome de perfil limpio y el servidor
muerto: con el SW nuevo al mando la app arranca offline con estilos (184 reglas CSS aplicadas). Queda
anotado como caso límite arriba, porque le pasará a todo el que ya hubiera abierto la app.
