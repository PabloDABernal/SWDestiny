# SPEC-031: Mazos precargados (jugar/probar sin pegar nada)

**Estado:** Completada
**Sección del GDD:** §7 (mazos de referencia) + nota "Mazos precargados"
**Depende de:** SPEC-001 (importDeck, pipeline), SPEC-017 (parseTextDeck), SPEC-030 (snapshot local:
los precargados se resuelven offline). **Relación con SPEC-029** (disrupt/descarte): su código ya
está integrado (botones `resolver disrupt`/`descarte` existen), solo pendiente de playtest; el mazo
Zuckuss sirve para probarlo, pero SPEC-031 **no** exige resolverlos como criterio propio (ver
criterios).

## Qué es (2-4 líneas)

Hoy, para jugar hay que pegar un mazo (JSON o text file) en cada bando. Con esta spec el juego trae
**unos mazos ya listos**: junto al panel de importar de cada bando hay un desplegable "Mazos de
ejemplo"; eliges uno y se importa igual que si lo hubieras pegado (personajes, dados, mazo de robo),
al instante y **offline** (gracias al snapshot de SPEC-030). Pensado para arrancar partidas de
prueba sin buscar decklists.

## Mazos incluidos (los curo yo, decisión del usuario)

Tres mazos, empaquetados como datos en el repo (lista de cartas por código, `slots`):

1. **Unduli, clone commander** — el mazo de referencia héroe (Luminara Unduli + 2× Clone Trooper +
   30 cartas). Mismo decklist ya usado en specs/QA (SPEC-017).
2. **Villano — cazarrecompensas (Zuckuss)** — liderado por **Zuckuss** (`11041`), cuyo dado tiene
   caras `1Dr` (disrupt) y `1Dc` (descarte): sirve además para probar SPEC-029 de un clic. + un
   segundo personaje villano y 30 cartas afines.
3. **Villano — golpe directo** — un segundo mazo villano de estilo distinto (daño melee/ranged
   directo, sin disrupt/descarte), liderado por un villano azul de la Fuerza (candidato: **Darth
   Vader**), con su personaje cabecera y 30 cartas, para tener variedad de rival. El personaje
   líder concreto se **confirma con el usuario al fijar los datos** (no es una decisión de diseño a
   rellenar en silencio).

Las listas exactas de 30 cartas de los dos villanos se curan en la implementación (tirando del bulk
de ARH, que sí trae facción/afiliación) y se dejan fijadas como datos; el mazo héroe reutiliza el
`slots` ya conocido. No se valida legalidad de mazo (30 cartas exactas, puntos, afiliación) — igual
que el import manual (fuera de alcance desde SPEC-001), solo tienen que ser jugables.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] En el panel de importar de cada bando hay un desplegable "Mazos de ejemplo" con los 3 mazos.
- [ ] Elegir un mazo del desplegable en el bando **Jugador** → se importa igual que pegándolo:
      aparecen los personajes en pie y "Mazo: N", sin tener que pulsar "Importar".
- [ ] Elegir un mazo en el bando **Enemigo** → se importa en el enemigo (con el multiplicador de
      vida de la dificultad vigente, igual que un import normal, SPEC-015).
- [ ] Con la **red cortada** (DevTools → Network → Offline), elegir cualquier precargado → importa
      igual (los datos salen del snapshot, SPEC-030), sin error.
- [ ] Elegir el mazo "cazarrecompensas (Zuckuss)" y tirar/rerollear sus dados → pueden aparecer
      caras `Dr`/`Dc` en el pool (que se resuelvan es criterio de SPEC-029, no de esta spec).
- [ ] Elegir un precargado con una partida ya en curso en ese bando → reinicia ese bando y lo
      reconstruye (mismo comportamiento que reimportar pegando, SPEC-001/016).

## Fuera de alcance (explícito)

- **Editar, guardar o borrar** mazos desde la UI: los precargados son fijos (datos del repo); la
  biblioteca de mazos del jugador (importados + guardados) es la sección "DB" (SPEC-032).
- **Sección "DB"** para navegar cartas: SPEC-032.
- **Validar legalidad** de los mazos (30 cartas, puntos, afiliación coherente): no se valida, igual
  que el import manual.
- **Elegir battlefield / tirada de enfrentamiento** entre los dos battlefields: fuera de alcance
  (no implementado en ninguna spec todavía); cada mazo trae el suyo y se ignora igual que hoy.
- **Persistir la elección** del desplegable: tras recargar, el desplegable vuelve a su estado
  neutro; lo que persiste es el mazo importado (SPEC-001), no "qué opción del combo estaba elegida".

## Casos límite

- **Opción neutra del desplegable** ("— elige mazo —") → no importa nada ni borra el bando; solo
  elegir un mazo real dispara el import. El `<select>` **vuelve a la opción neutra inmediatamente
  tras cada import** (es un disparador, no un estado persistente): así re-elegir el mismo mazo sí
  vuelve a disparar `onChange` (en React, re-elegir la misma `option` no dispararía el evento si el
  `value` no volviera a neutro).
- **Volver a elegir el mismo mazo** ya importado → lo reimporta (reinicia y rebaraja), no es un
  no-op silencioso; el reset a neutro del punto anterior lo hace posible.
- **Elegir un mazo mientras un import de ese bando sigue en curso** (`importStatus === 'importing'`)
  → se ignora (el `<select>` queda deshabilitado mientras `importing`), para no lanzar imports
  solapados/en carrera.
- **Un código de un precargado que no esté en el snapshot** (no debería pasar si se curan bien) →
  cae al respaldo API (SPEC-030); si además no hay red, error claro como cualquier import.

## Notas técnicas (opcional)

- **Datos**: `src/data/decks.ts` exporta `PRESET_DECKS: { id: string; name: string; slots:
  DeckSlot[] }[]`. Los `slots` son código→cantidad, del mismo tipo que produce `parseDeck`.
- **Store**: hoy `importDeck(side, raw)` hace `parse → resolveCards → build…`. Extraer el núcleo a
  partir de `DeckSlot[]` (p. ej. `importSlots(side, slots)`) y que `importDeck` parsee y delegue;
  añadir `importPreset(side, id)` que busca el preset y llama a `importSlots`. Así el precargado
  reutiliza exactamente el mismo camino (trampa de vida enemiga, mazo de robo, reset de bando, etc.)
  sin duplicar lógica.
- **UI**: dentro de `ImportPanel` (`src/components/ImportPanel.tsx`), un `<select>` con una opción
  neutra + una por `PRESET_DECKS`; `onChange` con valor real → `importPreset(side, id)`. No añade
  botón: elegir ya importa (el `<select>` es la acción). El `<select>` es **controlado** con `value`
  fijo en la opción neutra (se re-neutraliza tras disparar) y se muestra **en ambos estados** del
  panel: tanto en el formulario expandido como en la vista colapsada "Reimportar mazo" (hoy, con mazo
  ya importado, el panel se colapsa a solo ese botón — `showForm`/`import-panel--collapsed`; el
  desplegable debe seguir visible ahí para poder cambiar de mazo con partida en curso). Deshabilitado
  mientras `importStatus === 'importing'`.
- **Curación de los villanos**: script/consulta de dev contra el bulk de ARH para elegir cartas por
  facción/afiliación del líder; el resultado se pega como `slots` fijos en `decks.ts`. Verificar al
  fijarlos que todos los códigos están en el snapshot de SPEC-030 (para que sean offline).

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña-media: un archivo de datos (3 decklists), un pequeño refactor de `importDeck` para reutilizar
el pipeline desde `slots`, y un `<select>` en la UI. Sin gameplay nuevo. El grueso es curar las dos
listas de villanos (datos, no lógica).

## Resultado del playtest

Completada tras playtest 2026-07-26. Desplegable "Mazos de ejemplo" en ambos bandos; elegir importa
de un clic (Unduli en Jugador, Vader en Enemigo con vida x dificultad), offline (Network→Offline)
sin error, re-elegir el mismo reimporta, el desplegable sigue visible en el panel colapsado, y el
mazo Zuckuss saca caras Dr/Dc en el pool. Líder del mazo 3 (Darth Vader `02010`) confirmado por el
usuario.
