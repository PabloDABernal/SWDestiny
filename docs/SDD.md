# SDD — Star Wars Destiny: PVE con mazos de la comunidad

**Estado:** Vivo (v1.0, v2 en curso) — decisiones confirmadas por specs jugadas (TypeScript,
Zustand, localStorage, proxy /arh en dev, estado por bando y motor del autómata desde
SPEC-004/004b, escudos y recursos por bando desde SPEC-005/006, despliegue a GitHub Pages)

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
- **Importador de mazos**: capa separada que traduce el JSON de un decklist de ARH DB al modelo
  interno de personajes/cartas del juego. En v1 solo se usan los personajes del decklist
  importado (el resto del mazo se ignora hasta Fase 3-4).
- **Estado de partida por bando** (desde SPEC-004): el estado mutable (personajes en juego,
  activaciones, daño, pool de dados) se organiza por bando (`player` / `enemy`); cada bando tiene
  su propio pool. Los mazos importados se persisten en claves separadas por bando; el estado de
  partida (pools, activaciones, daño, fin de partida) no se persiste.
- **Escudos y recursos** (desde SPEC-005/006): `shields: number[]` por instancia (tope
  `MAX_SHIELDS`, absorben daño antes que la vida en `resolveDamage`) y `resources: number` único
  por bando (sin tope; **persiste entre rondas** y empieza en 2 al importar, SPEC-009; "Nueva ronda"
  suma **+2** a cada bando como mantenimiento, SPEC-011). El
  objetivo válido de un dado ya no es siempre "el bando contrario": depende del tipo de dado
  (daño → bando contrario; escudo → propio bando; recurso → sin objetivo, un solo clic). El
  autómata resuelve daño/escudo/activar/recurso/reroll/pasar (tabla ampliada en SPEC-007); el
  escudo lo aplica a su aliado no-KO de menor vida y el recurso suma a su contador. La resolución
  pura de recurso (`resolveResourcePure`) se comparte entre el jugador y el autómata.

## Reglas técnicas de alcance por fase (para revisor-código y revisor-specs)

- **v1:** costes de recursos en caras de dado = tratados como si no se pudieran pagar nunca
  (equivalente a blanco), hasta que exista el sistema de recursos (v2). **Superado en SPEC-008b**:
  con recursos ya implementados, el jugador paga costes de cara (recurso amarillo / daño indirecto
  propio rojo). Formato de coste en ARH DB: `<valor><SÍMBOLO>[i]<coste>` (`i` = coste indirecto; sin
  `i` = coste de recurso). El autómata sigue sin pagar costes.
- Cualquier símbolo, keyword o mecánica no listada como "dentro de alcance" en la spec en curso
  se considera fuera de alcance y debe ir a BACKLOG.md, no implementarse "de paso".

## Roadmap de fases

Ver GDD sección 5 para el resumen; cada fase se divide en specs individuales vía `/nueva-spec`
según se vaya llegando a ella. No crear specs de fases futuras por adelantado.
