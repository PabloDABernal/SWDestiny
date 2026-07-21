# SPEC-016: Mazo de robo (primera pieza de v3)

**Estado:** Pendiente
**Sección del GDD:** §5 ("Mazo de robo (primera pieza de v3, SPEC-016)")
**Depende de:** SPEC-001 (importar mazos, modelo, caché), SPEC-012 (patrón de validación de
localStorage)

## Qué es (2-4 líneas)

Hoy, al importar un mazo, solo se guardan las fichas de personaje; el resto de las 30 cartas se
ignora. Con esta spec, al importar también se construye el **mazo de robo** de ese bando: todas las
cartas del export que no sean personaje, trama ni campo de batalla, barajadas y guardadas. No hay
mano ni botón de robar todavía (specs siguientes) — lo único visible es un recuento de cartas
("Mazo: N") junto a cada bando, para poder comprobar que se construyó bien.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Al importar el mazo "Unduli, clone commander" (o cualquier mazo con 30 cartas de no-personaje)
      → junto al bando aparece **"Mazo: 30"** (o el número que corresponda si el export trae menos).
- [ ] Reimportar el mismo mazo → el recuento se reconstruye igual (no se duplica ni queda a 0).
- [ ] Recargar la página tras importar → el recuento sigue igual sin volver a pegar nada (persistido
      en localStorage, igual que el mazo de personajes).
- [ ] Si el export mezcla personajes, trama y cartas de mazo → el recuento de "Mazo" **no** incluye
      ni los personajes ni la trama (si el export trae una), solo el resto.
- [ ] Si alguna carta del mazo (de cualquier tipo) no se resuelve contra la API (404 o dato inválido)
      → el import se cancela con el mismo error claro que ya existe hoy para personajes no
      encontrados (SPEC-001); no se importa nada a medias.
- [ ] "Reset total" y "Nueva ronda" **no** cambian el recuento del mazo de robo (nada lo consume
      todavía; solo una reimportación lo reconstruye).

## Fuera de alcance (explícito)

- **Mano de cartas**: no hay UI de mano en esta spec; va en la siguiente.
- **Acción de robar**: no hay botón ni lógica de robo; va en una spec posterior.
- **Condición de victoria por deck-out**: depende de robar, queda para más adelante.
- **Mostrar el contenido del mazo de robo** (qué cartas son, en qué orden): solo se muestra el
  recuento total, no la lista ni el orden (evita "hacer trampas" mirando la consola, aunque en
  devtools es inevitable; en la UI del juego no se expone).
- **Cartas de trama (plot) y campo de batalla**: si el export las trae, no se guardan en ningún
  lado en esta spec (ni como mazo de robo, ni aparte); se ignoran igual que las cartas de personaje
  no encajan hoy en otros sitios. Guardarlas para su propio uso (trama jugable, campo de batalla)
  es una spec de fases posteriores (v3 tardío/v5).
- **Segunda copia de la misma carta con datos distintos**: no aplica; ARH DB da un único dato por
  código, la cantidad ya viene en `slots`.

## Casos límite

- **Mazo sin ninguna carta de no-personaje** (recuento 0) → "Mazo: 0", no es un error (el reglamento
  exige 30, pero esta spec no valida esa regla, solo refleja lo que trae el export).
- **Mazo con más o menos de 30** (export no reglamentario) → se refleja el número real, sin validar
  el límite de 30 (fuera de alcance; ver "Fuera de alcance" de SPEC-001 para el resto del export).
- **Corrupción del localStorage del mazo de robo** (mismo espíritu que SPEC-012) → si el valor
  guardado no es un array, se descarta y el mazo de robo arranca vacío (recuento 0) en vez de
  romper la carga de la app.
- **Bando sin mazo importado** → no se muestra el recuento (o se muestra "Mazo: 0"), igual que hoy
  no se muestran fichas de personaje sin importar.
- **Reimportar tras jugar una partida en curso** → igual que hoy con personajes: se reinicia el
  bando (SPEC-001), y el mazo de robo se reconstruye y rebaraja desde cero.

## Notas técnicas (opcional)

- Nueva función `buildDrawPile(slots, cards)` en `src/import/` (paralela a `buildCharacters`):
  recorre `slots`, para cada carta cuyo `card.type_code` **no** sea `'character'`, `'plot'` ni
  `'battlefield'`, añade su `code` tantas veces como `qty`. Validar los `type_code` reales de trama/
  campo de batalla contra un export real al implementar (como ya se hizo con `'character'` en
  SPEC-001); si difieren de `'plot'`/`'battlefield'`, ajustar las constantes, no la spec.
  `resolveCards` ya resuelve **todas** las cartas del export (no solo personajes) contra la API, así
  que no hace falta ninguna llamada nueva: reutilizar el mismo `Map<string, ArhCard>` que ya usa
  `buildCharacters`. Si `resolveCards` falla (404, red), el import ya se cancela antes de llegar a
  construir nada — comportamiento heredado, no hay que añadirlo.
- Barajado: Fisher-Yates estándar sobre el array de códigos resultante. Se baraja una vez al
  construirlo (en `importDeck`), no en cada lectura.
- Estado: nuevo campo `drawPile: string[]` en `SideState` (`src/store/gameStore.ts`), inicializado
  vacío en `freshSide` salvo que se reconstruya desde persistencia al arrancar. Persistencia con el
  mismo patrón que `loadPersistedDeck`/`persistDeck` (SPEC-001/012): clave `swd:drawpile:<side>`,
  `JSON.parse` + `Array.isArray` + elementos `string`, fallback a `[]` si es inválido.
  `resetAll`/`newRound` **no** tocan `drawPile` (no hay nada que resetear todavía: no se consume).
- UI: un texto pequeño junto al nombre del bando o cerca del panel de importar, p. ej. `Mazo: {s
  .drawPile.length}` en `BattleSide` (`src/App.tsx`).

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña: una función de construcción nueva (paralela a `buildCharacters`, reutiliza datos ya
resueltos), un campo de estado + persistencia (patrón ya conocido), un texto en la UI. Sin lógica de
juego nueva (robar, mano, deck-out quedan fuera).

## Resultado del playtest

(pendiente)
