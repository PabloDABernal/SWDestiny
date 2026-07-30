# SPEC-041: Mirror propio de imágenes (con CORS) y descargar las imágenes de un mazo

**Estado:** Pendiente
**Sección del GDD:** §7 (nota "Sección DB" / imágenes, y "App offline e instalable")
**Depende de:** SPEC-034 (imágenes bajo demanda, `VITE_CARD_IMAGE_BASE`, cache `card-images-v1`),
SPEC-036/038 (explorador de mazos y ficha de mazo), SPEC-040 (Service Worker con app shell)

## Qué es (2-4 líneas)

Dos cosas que se apoyan la una en la otra. Primero, un **mirror propio** de las imágenes de carta:
un script de desarrollo se las baja todas de ARH y las dejas publicadas en un repo tuyo, de modo que
el juego ya no depende de que ARH siga vivo. Segundo, en la ficha de un mazo aparece un botón
**"Descargar imágenes de este mazo"**: le das, baja las ~40 imágenes de ese mazo con un contador de
progreso, y a partir de ahí ese mazo se ve **entero con imágenes sin conexión**. Y otro botón para
**borrarlas** cuando quieras.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Arreglo de la URL de imagen (descubierto al implementar, 2026-07-29)

Al montar el mirror se descubrió que **1375 cartas (46%) nunca han mostrado imagen** desde SPEC-034:
la URL se reconstruía como `<BASE>/<2 primeros dígitos del código>/<code>.jpg`, patrón verificado solo
contra los sets oficiales (01-13). En la continuación fan (sets 14-25) la carpeta real es otra e
**irregular** (14→`101`, 15→`102`, 16→`103`, 18→`105`, 19→`106`, 21→`107`…), así que esas peticiones
siempre daban 404 y caían a la ficha de texto. Decidido con el usuario (2026-07-29): se arregla dentro
de esta spec, porque sin ello el mirror nace cojo.

- [ ] Abrir en la DB una carta de un set fan (p. ej. **Ninth Sister**, `14001`, de *Faltering
      Allegiances*) → **ahora sí muestra su imagen**, donde antes salía solo la ficha de texto.
- [ ] Las cartas de sets oficiales (01-13) siguen mostrando su imagen exactamente igual que antes.
- [ ] **417 cartas cuyo `imagesrc` en ARH apunta al arte de OTRA carta** (dato malo de origen: p. ej.
      `01/01002.jpg` lo reclaman `01002`, `17002` y `20002`) → se tratan como **sin imagen** y muestran
      la ficha de texto. Nunca se enseña el arte de una carta distinta. Decisión del usuario
      (2026-07-29): en una base de datos, arte equivocado confunde más que ninguno.

### Descargar las imágenes de un mazo

- [ ] En la **ficha de un mazo** (pestaña "Mazos" de la DB, la vista que lista sus cartas) hay un
      botón **"Descargar imágenes de este mazo"** con el número de imágenes que va a bajar.
- [ ] Pulsarlo → el botón muestra **progreso** ("18/41") mientras descarga y al terminar queda como
      **"Imágenes descargadas ✓"**. Durante la descarga el botón no se puede volver a pulsar.
- [ ] Después de descargarlas, **cortar la red** y abrir las cartas de ese mazo en el navegador de la
      DB → **todas** muestran su imagen (no la ficha de texto de respaldo).
- [ ] Volver a entrar en la ficha de ese mazo (online u offline) → el botón ya aparece como
      **"Imágenes descargadas ✓"**, sin tener que volver a bajarlas. Sigue siendo pulsable para
      **reintentar** las que faltasen.
- [ ] Un mazo del que **no** se han descargado las imágenes sigue comportándose como hasta ahora
      (SPEC-034): online se ven al abrir cada carta, offline solo las ya vistas.

### Borrar

- [ ] En la sección DB hay un botón **"Borrar imágenes descargadas"** que indica **cuántas imágenes**
      hay guardadas.
- [ ] Pulsarlo → pide **confirmación**, y al confirmar el contador se queda a 0 y las fichas de carta
      vuelven a depender de la red. Los botones de los mazos vuelven a "Descargar…".
- [ ] Borrar las imágenes **no** rompe la app offline: recargar sin red sigue arrancando (eso es el
      cache del app shell de SPEC-040, que es otro cache distinto y no se toca).

### Mirror

- [ ] Con el mirror ya publicado y `VITE_CARD_IMAGE_BASE` apuntando a él, el juego muestra las
      imágenes igual que antes, **sin tocar nada de código** (verificable en la pestaña Network: las
      peticiones van al dominio del mirror, no al de ARH).
- [ ] Con el mirror configurado, las respuestas de imagen **ya no son opacas**: descargar las
      imágenes de un mazo y comprobar en **DevTools → Application → Cache Storage** que las entradas
      tienen tamaño real y estado 200 (no "opaque"). *(La verificación es por DevTools, no por lo que
      muestre la app: ver la nota técnica sobre `navigator.storage.estimate()`, que mide todo el
      sitio y no permite dar una cifra fiable solo de imágenes.)*
- [ ] Apagando el mirror (o con `VITE_CARD_IMAGE_BASE` sin definir) el juego **sigue funcionando**
      contra ARH como hasta ahora, solo que con respuestas opacas.

## Fuera de alcance (explícito)

- **Un botón de "descargar TODAS las imágenes" (~2977, ~226 MB)** dentro del juego: confirmado por el
  usuario (2026-07-28). No caben razonablemente en el almacenamiento de un navegador y Safari
  desaloja agresivamente. Solo por mazo.
- **Automatizar la creación del repo del mirror y el encendido de Pages**: no hay `gh` instalado ni
  token de API en este entorno, así que esos dos pasos los da el usuario en la web de GitHub (crear
  el repo vacío y Settings → Pages). Todo lo demás —ejecutar el script, montar el repo local,
  commitear y **hacer el push**, verificar CORS y apuntar el juego al mirror— lo hace Claude en la
  sesión de implementación (acordado con el usuario, 2026-07-28). Alternativa si el usuario prefiere
  no tocar nada: instalar `gh` y hacer `gh auth login` una vez, y entonces también repo y Pages se
  automatizan.
- **Miniaturas en las listas** del navegador de cartas: sigue vigente la decisión de SPEC-034, solo
  la ficha de detalle lleva imagen. Esta spec no lo cambia.
- **Bundlear las imágenes** en el repo del juego: descartado desde SPEC-034 por tamaño.
- **Descargar las imágenes de un mazo automáticamente** al cargarlo para jugar: siempre es una
  acción explícita del usuario, para no comerse su disco ni sus datos sin permiso.

## Casos límite

- **Pulsar "Descargar" sin red** → no descarga nada; el botón informa del fallo ("Sin conexión") y
  queda otra vez pulsable, sin dejar el mazo a medias marcado como descargado.
- **Una imagen concreta falla (404 o error)** → el resto sí se descargan; al terminar el botón dice
  cuántas faltaron ("38/41, 3 fallaron") y sigue pulsable para reintentar. Volver a pulsarlo solo
  pide las que faltan, no las ya cacheadas.
- **Cartas del mazo sin imagen posible**: **no cuentan ni como fallo ni en el total**, simplemente no
  entran en la descarga. *(Corregido el 2026-07-30 sobre la redacción inicial de esta spec, que decía
  "cuentan como fallo": se escribió antes de descubrir que hay 417 cartas legítimamente sin imagen.
  Contarlas como fallo haría que muchos mazos normales dijeran "38/41, 3 fallaron" sin que pase nada
  malo, que es justo la alarma que no queremos.)* El contador del botón enseña solo las descargables.
- **Cuota de almacenamiento llena** (`QuotaExceededError`) → la descarga se detiene con un aviso
  claro ("No cabe: borra imágenes descargadas"), sin dejar la app en estado roto.
- **Salir de la ficha del mazo a mitad de descarga** → la descarga se cancela; lo ya bajado se queda
  cacheado (no se borra), y al volver el botón muestra el estado real.
- **Pulsar dos veces / dos mazos a la vez**: mientras hay una descarga en curso, el botón está
  deshabilitado.
- **Mazos que comparten cartas**: una imagen ya cacheada por otro mazo no se vuelve a pedir; cuenta
  como ya descargada.
- **Borrar las imágenes mientras se está descargando**: el estado de "hay una descarga en curso" es
  **global**, no de la ficha: mientras cualquier mazo esté descargando, el botón "Borrar imágenes
  descargadas" está deshabilitado (aunque el usuario navegue a otra pantalla de la DB), y viceversa.
- **Sin mirror configurado** (base = ARH, sin CORS): el botón **sigue funcionando**, pero lo que se
  guarda son respuestas opacas; funciona igual de cara al jugador, con el riesgo de cuota ya conocido.

## Notas técnicas

- **Origen de la URL de imagen**: deja de deducirse del código. `scripts/build-card-snapshot.mjs`
  guarda en el snapshot la **ruta relativa real** de cada carta, sacada del `imagesrc` de la API
  (`101/14001.jpg`), y **solo si es su propia imagen** — o sea, si la ruta termina en
  `/<code>.jpg`. Las 417 que apuntan a otra carta **no guardan ruta**, y `cardImageUrl` devuelve
  entonces "sin imagen" para que la ficha caiga al texto. Se guarda solo la ruta relativa, nunca el
  `imagesrc` completo (que además viene en `http://`, bloqueado por mixed-content en Pages), para que
  `VITE_CARD_IMAGE_BASE` siga siendo un swap de base y el mirror no se ate a ARH.
- **Hay que regenerar el snapshot** (`npm run cards:snapshot`) como parte de esta spec, y adaptar
  `scripts/download-card-images.mjs` para que baje por esa ruta real en vez de por el patrón viejo
  (si no, el mirror se queda en las 1602 de los sets oficiales).
- **El script YA EXISTE**: `scripts/download-card-images.mjs` se escribió en SPEC-034 (descubierto al
  empezar a implementar 041, el 2026-07-28) y hace exactamente lo que hacía falta: recorre el
  snapshot, baja cada imagen a `card-images/<NN>/<code>.jpg` —la estructura que reconstruye
  `getCardImageUrl` (`src/data/cardImages.ts`)— y es **reanudable** (salta las que ya están en
  disco). **No se reescribe.** Esta spec solo lo *usa*. Sus limitaciones conocidas: va en serie (unos
  minutos para las ~2977), no reintenta, y cuenta igual un 404 real que un fallo de red; como es
  reanudable, la forma de reintentar es **relanzarlo** hasta que el número de fallos se estabilice.
  Si al usarlo resulta insuficiente, mejorarlo entra en esta spec; si no, se deja como está.
  `card-images/` va al `.gitignore` del repo del juego: son ~226 MB que no deben acabar aquí, sino
  en el repo del mirror.
- **Publicar el mirror** (manual, documentar los pasos en la propia spec/SDD): crear un repo aparte
  (p. ej. `SWDestiny-images`), volcar dentro el contenido de `card-images/`, push, activar GitHub
  Pages sobre él. GitHub Pages sirve con `access-control-allow-origin: *`, que es justo lo que hace
  falta para que las respuestas **no sean opacas**. Comprobarlo con las herramientas de red antes de
  dar el mirror por bueno.
- **Apuntar el juego al mirror**: en vez de pasar `VITE_CARD_IMAGE_BASE` en el workflow de Pages, se
  cambia el **default** de `IMAGE_BASE` al mirror. Así vale igual en dev, en tests y en producción sin
  tocar CI, y la variable de entorno sigue existiendo para apuntar a otro sitio. El mirror publicado
  es `https://pablodabernal.github.io/SWDestiny-images` (repo `PabloDABernal/SWDestiny-images`,
  público, Pages sobre `main`), verificado el 2026-07-29: responde 200 `image/jpeg` con
  `access-control-allow-origin: *`.
- **La descarga por mazo NO necesita al Service Worker**: la página puede abrir el mismo cache
  (`caches.open('card-images-v1')`) y hacer `cache.put`/`cache.add` de cada imagen. El SW de SPEC-034
  ya sirve desde ese cache, así que lo descargado se ve offline sin tocar `sw.js`. Descargar de una
  en una (o en tandas cortas) para poder pintar el progreso y poder cancelar.
- **Ojo con CORS al descargar desde la página**: si la base **no** es el mirror (o sea, ARH, que no
  manda CORS), un `fetch()` normal cross-origin **lanza `TypeError`**, no devuelve una respuesta
  opaca — al revés de lo que hace el SW interceptando un `<img>`. Para que se cumpla el criterio
  "sin mirror configurado el botón sigue funcionando", la petición debe hacerse con
  `fetch(url, { mode: 'no-cors' })` y guardarse con `cache.put` (nunca `cache.add`, que también
  falla con opacas). Con el mirror (CORS abierto) esto sigue siendo válido, pero conviene usar
  petición normal para poder comprobar `res.ok` y contar fallos de verdad: decidir por rama según
  si `CARD_IMAGE_BASE` es el mirror o no, o probar normal y caer a `no-cors` si falla.
- **En qué mazos aparece el botón**: en **todos** los de la pestaña "Mazos" (precargados, de la
  comunidad y guardados). No se restringe a los guardados: para jugar offline interesan sobre todo
  los precargados y los de comunidad.
- **Estado del botón**: "ya descargado" no se persiste en `localStorage`, se **calcula** preguntando
  al cache (`cache.match` de cada imagen del mazo) al abrir la ficha. Así nunca miente si el
  navegador desalojó el cache por su cuenta.
- **Contador de "Borrar imágenes descargadas"**: el nº de imágenes sale de `cache.keys()`. Si se
  quiere enseñar tamaño, `navigator.storage.estimate()` da el uso de **todo el sitio** (incluye el
  app shell y localStorage), así que o se etiqueta como aproximado del sitio entero, o se enseña solo
  el número de imágenes. Decidir al implementar, sin inventar precisión que no hay.

## Nota de tamaño (regla 4 CLAUDE.md)

Media. Un script de desarrollo nuevo (autónomo, sin UI), más una pieza de UI acotada (botón con
progreso en la ficha de mazo + botón de borrado en la DB) que reutiliza el cache y el SW ya
existentes. La parte de publicar el mirror es manual y no lleva código. Si al implementar se dispara,
lo primero que se mueve a SPEC-042 es el **botón de borrado**, dejando script + descarga por mazo
aquí — avisando antes, no subdividir con sufijos.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>
