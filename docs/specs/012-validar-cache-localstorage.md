# SPEC-012: Validar la forma de la caché de localStorage al cargar

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** (ninguna — fix técnico de robustez, no cambia gameplay; ver nota abajo)
**Depende de:** SPEC-001 (persistencia del mazo)

## Qué es (2-4 líneas)

Hoy, al cargar el mazo guardado en `localStorage` (`swd:deck:player` / `swd:deck:enemy`), la app
hace `JSON.parse(...) as Character[]` sin comprobar que el contenido sea realmente un array. Si la
caché está corrupta o manipulada (a mano, por un bug, por una versión anterior incompatible), hoy
se cargarían datos con forma inesperada y las fichas se renderizarían con campos `undefined`. Con
esta spec, si el valor guardado no es un array, se descarta y la app arranca como si no hubiera
nada guardado (mazo vacío), igual que hoy pasa cuando la clave no existe.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable. Los casos de caché corrupta se
provocan editando `localStorage` a mano en DevTools antes de recargar (no son alcanzables jugando
solo la UI).

- [ ] Con `swd:deck:player` **sin definir** (como hoy) → la app arranca con el mazo del jugador
      vacío (sin cambios respecto al comportamiento actual).
- [ ] Con `swd:deck:player` puesto a un valor **que no es un array** (p. ej. `{}`, `"hola"`, `123`,
      `null`) y recargando la página → la app arranca con el mazo del jugador **vacío**, sin
      errores en consola ni fichas con campos `undefined`.
- [ ] Con `swd:deck:player` puesto a un **array válido** de personajes (el caso normal, tal cual lo
      deja `persistDeck`) → se carga igual que hoy, sin cambios.
- [ ] Lo mismo aplica a `swd:deck:enemy` de forma independiente (corromper uno no afecta al otro).

## Fuera de alcance (explícito)

- Validar la forma **interna** de cada elemento del array (campos `code`/`name`/`health`/
  `isUnique`/`isElite`/`dice` con sus tipos correctos). Esta spec solo comprueba que el nivel
  superior es un array; un array de objetos con forma incorrecta dentro no se detecta aquí.
- Mostrar un aviso visible al jugador cuando la caché esté corrupta. Se descarta en silencio (mismo
  comportamiento que "no hay nada guardado").
- Logging o telemetría de cuándo ocurre una caché corrupta.
- Migración de versiones antiguas del formato guardado.
- La caché de cartas ARH (`swd:card:{code}` en `src/import/resolveCards.ts`, función `readCache`),
  que tiene el mismo problema de fondo (`JSON.parse(raw) as ArhCard` sin validar forma). No se toca
  en esta spec; si se quiere corregir, va a un spec aparte.

## Casos límite

- **JSON inválido** (no parsea, p. ej. una cadena a medio escribir) → también se trata como caché
  corrupta: mazo vacío, sin error en consola.
- **Array vacío `[]`** → se carga tal cual (es válido, mazo vacío por decisión del jugador, no por
  corrupción).
- **Recargar la página tras una partida en curso** → sin cambios respecto a hoy; esta spec solo
  toca la carga inicial del mazo persistido, no el estado de la partida.

## Notas técnicas (opcional)

- `loadPersistedDeck` (`src/store/gameStore.ts:33`): ya tiene `try/catch`, así que un JSON inválido
  (no parsea) ya cae a `[]`. Falta el caso "parsea pero no es un array": tras `JSON.parse(raw)`,
  comprobar `Array.isArray(...)` antes de devolverlo como `Character[]`; si no lo es, devolver `[]`
  igual que en el caso `!raw`.

## Nota de tamaño (regla 4 CLAUDE.md)

Muy pequeña: un guard de `Array.isArray` en una función existente. Un solo archivo.

## Resultado del playtest

2026-07-21: playtest manual OK. Confirmado con `localStorage.setItem` en DevTools: caché ausente,
no-array (`{}`, `123`, `null`) y array válido se comportan como especifica la spec; `player` y
`enemy` son independientes. revisor-codigo: CUMPLE. Confirmado por el usuario.
