# SDD — Star Wars Destiny: PVE con mazos de la comunidad

**Estado:** Vivo (v1.0, v2 en curso) — decisiones confirmadas por specs jugadas (TypeScript,
Zustand, localStorage, proxy /arh en dev, estado por bando y motor del autómata desde
SPEC-004/004b, escudos y recursos por bando desde SPEC-005/006, despliegue a GitHub Pages,
autómata combinando modificadores/pagando costes y multi-objetivo desde SPEC-013/014, selector de
dificultad desde SPEC-015 — ver GDD hasta SPEC-015)

## Stack propuesto

- **React 19 + Vite**. Juego de navegador, mobile-first no es prioritario (juego de mesa digital,
  pantalla grande recomendable pero no excluyente).
- **TypeScript en todo el código** (tipado del modelo `Character`/`Die` y del motor de dados/autómata;
  sin overhead en runtime). Decidido en SPEC-001.
- **Zustand** para el estado de partida (personajes, dados, pools, recursos...). Encaja bien con
  el volumen de estado mutable y las transiciones frecuentes de este tipo de juego.
- **Sin backend en v1.** Todo el estado vive en el cliente. Los datos de cartas/mazos se importan
  bajo demanda desde la API pública de [ARH DB](https://db.swdrenewedhope.com/api/) y se cachean
  localmente en **localStorage** (decidido en SPEC-001; IndexedDB queda como opción futura si el
  volumen lo exige).
- Sin persistencia de partidas entre sesiones en v1 (a revisar si se pide más adelante).
- **Despliegue**: GitHub Pages sirviendo el build estático desde `main` (`.github/workflows/deploy-pages.yml`,
  `vite.config.ts` con `base: '/SWDestiny/'`). En dev, `resolveCards.ts` pasa por el proxy `/arh`
  de Vite para evitar CORS; en producción llama directo a la API de ARH DB (confirmado que permite
  CORS abierto desde el navegador, jugando en Pages durante el playtest de SPEC-005 — ver
  BACKLOG.md).

*(Alternativas descartadas por ahora, anotadas por si se quiere reabrir la decisión: Redux
Toolkit en vez de Zustand — más ceremonia, no aporta aquí; SolidJS en vez de React — menos
ecosistema de componentes de tablero/dados ya hechos.)*

## Arquitectura de alto nivel

- **Motor de resolución de dados**: funciones puras, símbolo → efecto. Símbolos no soportados en
  la fase actual se tratan como blanco (`—`), tanto para el jugador como para el enemigo, para
  mantener la simetría de reglas mientras se amplía el alcance.
- **Motor del autómata**: función pura que, dado el estado de partida, devuelve "la siguiente
  acción" evaluando la tabla de prioridades de arriba abajo (ver GDD sección 4). No conoce reglas
  fuera de esa tabla; no hay heurística de evaluación de jugadas.
- **Importador de mazos**: capa separada que traduce un decklist de ARH DB al modelo interno de
  personajes/cartas del juego. La entrada se detecta por formato (SPEC-017): empieza por `{` →
  `parseDeck` (JSON con `slots`); si no → `parseTextDeck` (el "text file" legible, con tabla fija
  nombre-de-set→código). Ambos producen el mismo `DeckSlot[]`, así que el resto del pipeline no
  cambia. `resolveCards` resuelve **todas** las cartas del export contra la API (no solo personajes). `buildCharacters` sigue quedándose solo con las de
  `type_code === 'character'`; desde SPEC-016, `buildDrawPile` construye además el mazo de robo
  (todo lo que no sea personaje, trama ni campo de batalla) con esas mismas cartas ya resueltas, sin
  llamadas nuevas a la API. Trama y campo de batalla, si el export las trae, no se guardan en
  ningún sitio todavía (quedan para cuando haga falta jugarlas, fases posteriores).
- **Estado de partida por bando** (desde SPEC-004): el estado mutable (personajes en juego,
  activaciones, daño, pool de dados) se organiza por bando (`player` / `enemy`); cada bando tiene
  su propio pool. Los mazos importados se persisten en claves separadas por bando; el estado de
  partida (pools, activaciones, daño, fin de partida) no se persiste.
- **Escudos y recursos** (desde SPEC-005/006): `shields: number[]` por instancia (tope
  `MAX_SHIELDS`, absorben daño antes que la vida) y `resources: number` único por bando (sin tope;
  **persiste entre rondas** y empieza en 2 al importar, SPEC-009; "Nueva ronda" suma **+2** a cada
  bando como mantenimiento, SPEC-011). El objetivo válido de un dado ya no es siempre "el bando
  contrario": depende del tipo de dado (daño → bando contrario; escudo → propio bando; recurso →
  sin objetivo, un solo clic). `resolvePlayerBatch` (SPEC-010) es el único motor de resolución de
  tandas, compartido tal cual entre jugador y autómata desde SPEC-013 (ya no hay funciones puras
  separadas por bando como `resolveDamage`/`resolveShield`/`resolveResourcePure`, eliminadas por
  código muerto en esa spec).
- **Autómata — tabla de prioridades y trampas** (SPEC-004b/007, ampliada en SPEC-013/014/015): daño
  → escudo → activar → recurso → reroll → pasar. Cada fila combina dados base + modificadores `+X`
  del mismo símbolo, paga su coste de recurso (greedy: incluye mientras sea pagable, salta y sigue
  con el resto) y resuelve el coste de daño indirecto propio (`…i<n>`) con un receptor propio
  determinista (sobrevivientes con escudo > sobrevivientes por vida > cualquiera por vida). Daño y
  escudo reparten sin *overkill*/sin pasar de `MAX_SHIELDS` entre varios objetivos si hace falta,
  a costa de varias pulsaciones de "Turno enemigo" (nunca resuelve más de un objetivo por
  pulsación, igual que el multi-objetivo manual del jugador, SPEC-011). Las trampas (multiplicador
  de vida enemiga, rerolls extra) son configurables por el jugador vía un selector de dificultad
  (Fácil/Normal/Difícil, SPEC-015), persistido en `localStorage`; el multiplicador de vida solo se
  aplica a la próxima importación del mazo enemigo (no retroactivo, ni con "Reset total").
- **Cartas en juego (mejoras, desde SPEC-020; apoyos, desde SPEC-021)**: una mejora jugada queda
  ligada al índice de un personaje de `characters` dentro de `SideState`, persistida igual que
  `drawPile`/`hand` (SPEC-016/018). Al activar un personaje, sus mejoras ligadas también tiran
  dados y se añaden al pool junto con los suyos — `PooledDie` deja de asumir que todo dado viene de
  un personaje del array `characters` (se reutiliza `characterIndex` con un centinela `-1` para
  dados sin personaje anfitrión, SPEC-021). Si el personaje queda KO, sus mejoras ligadas se
  descartan con él. Un apoyo, en cambio, no va ligado a ningún personaje: es una lista aparte por
  bando (`SideState.supports`), cada uno con su propio estado de activación (se resetea en "Nueva
  ronda" igual que los personajes) y su propio botón "Activar" en la UI. Ninguna de las dos
  (mejoras/apoyos) sale de juego salvo por KO del personaje anfitrión (mejoras) o "Reset total"
  (ambas): no hay destrucción por texto de carta todavía.

## Reglas técnicas de alcance por fase (para revisor-código y revisor-specs)

- **v1:** costes de recursos en caras de dado = tratados como si no se pudieran pagar nunca
  (equivalente a blanco), hasta que exista el sistema de recursos (v2). **Superado en SPEC-008b**:
  con recursos ya implementados, el jugador paga costes de cara (recurso amarillo / daño indirecto
  propio rojo). Formato de coste en ARH DB: `<valor><SÍMBOLO>[i]<coste>` (`i` = coste indirecto; sin
  `i` = coste de recurso). **Superado también para el autómata en SPEC-013/014**: paga los mismos
  costes (recurso e indirecto) que el jugador, en daño/escudo/recurso.
- Cualquier símbolo, keyword o mecánica no listada como "dentro de alcance" en la spec en curso
  se considera fuera de alcance y debe ir a BACKLOG.md, no implementarse "de paso".

## Roadmap de fases

Ver GDD sección 5 para el resumen; cada fase se divide en specs individuales vía `/nueva-spec`
según se vaya llegando a ella. No crear specs de fases futuras por adelantado.
