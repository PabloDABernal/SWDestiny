# SPEC-036: Pulido de la sección DB (importar en pop-up, explorador de mazos, filtro por set)

**Estado:** Pendiente
**Sección del GDD:** §7 (nota "Sección DB")
**Depende de:** SPEC-032 (sección DB, navegador de cartas, biblioteca), SPEC-033 (`importToLibrary`,
`DeckPicker`), SPEC-035 (`COMMUNITY_DECKS`)

## Qué es (2-4 líneas)

Reorganiza la sección DB con tres mejoras: (1) **importar mazo** deja de ocupar sitio fijo y pasa a
un **botón + pop-up**; (2) la "biblioteca de mazos" se convierte en un **explorador de mazos** de
solo lectura con **todos** los mazos (precargados + comunidad + guardados), un **buscador único** (por
nombre, personaje o carta) y, al pulsar un mazo, la **lista de sus cartas** — sin botones de
Jugador/Enemigo (cargar un mazo se sigue haciendo en "Jugar → Elegir mazo"); (3) el **navegador de
cartas** gana un filtro por **set**.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Importar mazo (botón + pop-up)

- [ ] En la sección DB, "Importar mazo a la biblioteca" es ahora un **botón**; al pulsarlo se abre un
      **pop-up** con el nombre + textarea (JSON o text file, SPEC-017) + "Importar". Al importar OK, el
      mazo se añade a la biblioteca y el pop-up se cierra; con error, muestra el error y no cierra.
- [ ] El pop-up se cierra sin importar con un botón cerrar / clic fuera.

### Explorador de mazos

- [ ] La sección DB muestra un **explorador de mazos** con **todos** los mazos: precargados
      (etiqueta "precargado"), comunidad ("comunidad") y los guardados por el jugador ("guardado").
- [ ] Un **único buscador** filtra los mazos cuyo **nombre**, **algún personaje** o **alguna carta**
      contenga el texto (sin distinguir mayúsculas/acentos). Ej.: buscar "vader" lista mazos llamados
      así, o que lleven a Darth Vader, o una carta con "vader" en el nombre.
- [ ] Pulsar un mazo muestra la **lista de sus cartas** (nombre + cantidad), con los **personajes**
      primero. No hay botones de "→ Jugador"/"→ Enemigo": **cargar** un mazo para jugar se hace en la
      pantalla Jugar con "Elegir mazo" (SPEC-033).
- [ ] La lista de mazos no se congela con miles: render acotado (primeros N + "mostrar más") y el
      buscador acota al instante (mismo patrón que SPEC-035).
- [ ] Un mazo **guardado** por el jugador se puede **borrar** desde aquí (los precargados y de
      comunidad no).

### Navegador de cartas

- [ ] El navegador de cartas tiene un filtro por **set** (los sets presentes en el snapshot), además
      de los de tipo y facción; combinados acotan la lista.

## Fuera de alcance (explícito)

- **Cargar un mazo a un bando desde la DB**: se quita (decisión del usuario 2026-07-26); la carga vive
  solo en "Jugar → Elegir mazo". La DB es para explorar/inspeccionar.
- **Editar el contenido** de un mazo (deck-builder): sigue en BACKLOG. Aquí solo se ven las cartas.
- **Imágenes en la lista de cartas del mazo**: la vista del mazo es texto (nombre + cantidad); la
  imagen sigue solo en la ficha del navegador de cartas (SPEC-034).
- **Guardar un mazo de comunidad/precargado como copia editable**: no; para tenerlo en la biblioteca
  propia se importaría/guardaría aparte (flujo existente).

## Casos límite

- **Buscador sin resultados**: mensaje "sin resultados", sin error; vaciarlo vuelve a listar todo.
- **Mazo con muchas copias de una carta**: la vista muestra la cantidad (p. ej. "2× Force Speed").
- **Personaje/carta de un mazo cuyo código no esté en el snapshot**: no debería pasar (comunidad y
  precargados están filtrados; guardados se resolvieron al importar), pero si ocurre se muestra el
  código crudo en vez de romper.
- **Miles de mazos + búsqueda por carta**: el índice de búsqueda (nombre+personajes+cartas por mazo)
  se precalcula una vez para que filtrar por tecleo no recorra miles de mazos × decenas de códigos en
  cada pulsación.
- **Borrar un mazo guardado que además está cargado en un bando**: el bando no se toca; solo
  desaparece del explorador (igual que SPEC-032).

## Notas técnicas (opcional)

- **Importar (pop-up)**: reutilizar el `DeckImportPanel` existente (`DbSection.tsx`) dentro de un
  modal (mismo patrón de overlay que `DeckPicker`, SPEC-033), disparado por un botón.
- **Explorador de mazos**: nuevo componente que combina `PRESET_DECKS` + `COMMUNITY_DECKS` +
  `library` (store). Índice de búsqueda por mazo: string normalizado (`norm`, ya existe) con nombre +
  nombres de sus cartas (resueltas con `getCardFromSnapshot`), **memoizado** (los bundleados son
  estáticos; recomputar solo al cambiar `library`). Filtrado = `index.includes(query)`. Render con
  límite + "mostrar más" (como `DeckPicker`/`CardBrowser`). Al seleccionar un mazo, resolver sus
  `slots` a `{name, qty, isCharacter}` para la lista (personajes primero).
- **Borrado**: los guardados exponen borrar vía `deleteFromLibrary` (SPEC-032); precargados/comunidad
  no (se distinguen por origen: id de palabra = preset, en `library` = guardado, resto = comunidad).
- **Filtro por set en el navegador**: en `CardBrowser` (`DbSection.tsx`), añadir un `<select>` de
  `set_name`/`set_code` (valores presentes en el snapshot, como ya se hace con tipo/facción), y
  sumarlo al filtro combinado.
- Sin cambios en el store de partida ni en el pipeline de import a bando.

## Nota de tamaño (regla 4 CLAUDE.md)

Media: modal para el import (reusa panel), un explorador de mazos nuevo (buscador + índice memoizado +
vista de contenido) y un filtro más en el navegador. Sin gameplay. El explorador es lo más grande; si
se dispara, mover el filtro por set (trivial) o el pop-up de import a su propio número, no partir el
explorador.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>
