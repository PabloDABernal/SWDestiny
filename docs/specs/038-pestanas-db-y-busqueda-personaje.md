# SPEC-038: Pestañas Mazos/Cartas en DB, caras de personaje en la lista, enlace carta→mazos y búsqueda por personaje en "Elegir mazo"

**Estado:** Completada
**Sección del GDD:** §7 (nota "Sección DB")
**Depende de:** SPEC-032 (navegador de cartas), SPEC-034 (imágenes de carta), SPEC-036 (explorador de
mazos, buscador único), SPEC-037 (deck-builder)

## Qué es (2-4 líneas)

La sección DB deja de mostrar el explorador de mazos y el navegador de cartas apilados con scroll
vertical: pasan a **dos pestañas** ("Mazos" y "Cartas"), cada una visible entera sin desplazarse por
la otra. En la lista de mazos, cada mazo muestra ahora las **caras (miniaturas) de sus personajes**
junto al nombre, para reconocerlo de un vistazo. En la ficha de una carta del navegador, un nuevo
apartado **"Mazos que la usan"** lista (desplegado ahí mismo) los mazos que la incluyen; pulsar uno
lo abre en la pestaña Mazos. Además, el buscador de "Elegir mazo" de la pantalla Jugar (que hoy solo
busca por nombre) pasa a buscar también por **nombre de personaje** del mazo.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Pestañas Mazos/Cartas

- [ ] En la sección DB hay dos pestañas, **"Mazos"** y **"Cartas"**; solo una está visible a la vez,
      sin necesitar scroll para ver la otra.
- [ ] La pestaña **"Mazos"** contiene el explorador de mazos completo (SPEC-036: buscador, lista,
      vista de contenido de un mazo) y los botones/flujos de **"Importar mazo"** (pop-up) y **"Crear
      mazo"**/"Editar"/"Duplicar" (constructor, SPEC-037), igual que hoy.
- [ ] La pestaña **"Cartas"** contiene el navegador de cartas completo (SPEC-032/034/036: buscador,
      filtros tipo/facción/set, ficha con imagen).
- [ ] Cambiar de pestaña conserva el estado de cada una (buscador, filtros, mazo/carta seleccionada)
      mientras la sección DB siga montada; salir de DB y volver puede reiniciarlo (igual que hoy).

### Caras de personaje en la lista de mazos

- [ ] Cada fila de la lista de mazos (explorador, pestaña Mazos) muestra, junto al nombre del mazo,
      una **miniatura por cada personaje** del mazo (reusando la carga on-demand de imagen de
      SPEC-034: placeholder mientras carga, se oculta si falla/no hay imagen).
- [ ] Un mazo sin ningún personaje resoluble (código no encontrado en el snapshot) no muestra
      miniaturas rotas; se ve solo el nombre.

### Enlace carta → mazos que la usan

- [ ] En la ficha de una carta (pestaña Cartas), hay un apartado **"Mazos que la usan"** con la lista
      de nombres de los mazos (precargados, comunidad y guardados) que incluyen esa carta.
- [ ] Pulsar un nombre de esa lista cambia a la pestaña **Mazos** y abre la vista de contenido de ese
      mazo (igual que si se hubiera pulsado desde el explorador).
- [ ] Si ningún mazo usa la carta, el apartado lo dice explícitamente (p. ej. "Ningún mazo la usa"),
      sin ocultarse ni parecer un error.

### Búsqueda por personaje en "Elegir mazo" (pantalla Jugar)

- [ ] El buscador del `DeckPicker` ("Jugar → Elegir mazo") filtra también por **nombre de personaje**
      del mazo, no solo por nombre de mazo (ej.: buscar "vader" lista tanto mazos llamados así como
      mazos que lleven a Darth Vader).
- [ ] No busca por carta no-personaje (solo nombre de mazo + nombres de personaje): eso se queda en
      el buscador de la sección DB (SPEC-036).

## Fuera de alcance (explícito)

- Lo ya excluido en SPEC-036/037 (no validar reglas de construcción, no editar precargados/comunidad
  in situ, sin imágenes en la vista de contenido de un mazo —solo en la ficha del navegador de
  cartas—, sin deshacer/rehacer en el constructor).
- **Extender el buscador de "Elegir mazo" a buscar por cualquier carta del mazo** (no solo
  personajes): se queda fuera; ese buscador más amplio ya existe en la DB (SPEC-036).
- **Rediseño visual más allá de lo descrito**: no se tocan otros aspectos de layout/estilo de DB salvo
  pasar a pestañas y añadir las miniaturas/enlace descritos.

## Casos límite

- **Carta usada por muchos mazos (p. ej. una carta genérica muy común)**: la lista de "Mazos que la
  usan" se acota igual que el resto de listas de la DB (render con límite + "mostrar más", mismo
  patrón que SPEC-035/036) para no congelarse.
- **Mazo con personaje de código no resoluble**: no se pinta miniatura para ese slot (ni rota ni
  placeholder infinito); el resto de personajes del mazo sí muestran la suya.
- **Buscar en "Elegir mazo" un texto que coincide con nombre de mazo Y con personaje**: aparece una
  sola vez (no duplicado).
- **Cambiar de pestaña con la ficha de una carta abierta**: al volver a "Cartas" la ficha sigue
  seleccionada (mismo comportamiento que hoy con el resto del estado de la pestaña).

## Notas técnicas (opcional)

- **Pestañas**: estado local (`useState<'decks' | 'cards'>`) en `DbSection`; renderizar ambas
  pestañas condicionalmente (o con CSS `display: none` en la oculta) para no perder el estado
  interno de `DeckExplorer`/`CardBrowser` al cambiar. El enlace carta→mazo necesita poder cambiar de
  pestaña y pasar qué mazo abrir: subir el `open`/mazo seleccionado del `DeckExplorer` a `DbSection`
  (o exponer un callback) en vez de mantenerlo solo local a `DeckExplorer`.
- **Miniaturas en la lista**: reusar `CardImage` (ya existe en `DbSection.tsx`) por cada personaje de
  `slots` (filtrando por `isCharacter`, mismo criterio que la vista de contenido de SPEC-036/037);
  tamaño reducido vía clase CSS distinta (miniatura vs. ficha grande).
- **Índice carta→mazos**: derivar de `bundledEntries()` (SPEC-036, ya indexa `slots` por mazo) +
  `library`; para una carta dada, filtrar los `DeckEntry` cuyo `slots` contenga su `code`. Puede
  calcularse bajo demanda al abrir la ficha (no hace falta precalcular un índice inverso si el
  número de mazos ya cacheado por `bundledEntries` hace el filtro barato; si se demuestra lento con
  el volumen real de comunidad, memoizar un `Map<code, DeckEntry[]>` una vez).
- **Buscador de `DeckPicker` por personaje**: en `DeckPicker.tsx`, el `entries`/`filtered` actual solo
  compara `norm(e.name)`; añadir a cada entry un campo de nombres de personaje (resueltos con
  `getCardFromSnapshot`, filtrando `isCharacter`, igual criterio que `buildEntry`/`DeckExplorer` en
  `DbSection.tsx`) y ampliar el filtro a `norm(name + ' ' + personajes).includes(q)`. Para
  precargados/comunidad (estáticos) se puede precalcular igual que `bundledCache`; para `library` se
  recalcula si cambia (mismo patrón que SPEC-036).
- Sin cambios en el store de partida, en el pipeline de import a bando, ni en las reglas de
  construcción.

## Nota de tamaño (regla 4 CLAUDE.md)

Media: reestructurar `DbSection` en pestañas, añadir miniaturas a la lista de mazos, un apartado
nuevo en la ficha de carta (con su acotado de render) y ampliar el buscador de `DeckPicker`. Si al
implementar se dispara, dejar las **pestañas + miniaturas** en SPEC-038 y mover el **enlace
carta→mazos** y/o la **búsqueda por personaje en Jugar** a SPEC-039, avisando antes (no subdividir
con sufijos).

## Resultado del playtest

Completada tras playtest 2026-07-27. El usuario confirma que todo funciona: las pestañas Mazos/Cartas,
las miniaturas de personaje en la lista de mazos, el apartado "Mazos que la usan" en la ficha de
carta (con salto a la pestaña Mazos y apertura del mazo correcto) y la búsqueda por personaje en
"Jugar → Elegir mazo".
