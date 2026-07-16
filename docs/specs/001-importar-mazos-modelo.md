# SPEC-001: Importar mazos (pegar JSON) y modelo de personajes/dados

**Estado:** ✅ Completada (jugada)
**Sección del GDD:** §7 (mazo de referencia), §5 (alcance v1), §3 (reglas base); SDD "Importador de mazos" y caché de datos
**Depende de:** ninguna

## Qué es (2-4 líneas)

El jugador pega en una caja de texto el JSON exportado de un mazo desde ARH DB
(db.swdrenewedhope.com) y pulsa "Importar". El juego construye el modelo interno de los
**personajes** del mazo (vida, puntos, único/elite y las caras de sus dados) resolviendo cada
código de carta contra la API pública de ARH DB, y muestra en pantalla una ficha por personaje
con su vida y las 6 caras de cada dado. El resto del mazo (las 30 cartas no-personaje) se ignora
en esta fase.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] El jugador pega el export de "Unduli, clone commander" y pulsa Importar → aparecen 3 fichas
      de personaje: **Luminara Unduli** (11 PV) y **dos** fichas de **Clone Trooper** (con su vida).
- [ ] Unduli (único/elite) muestra **2 dados**; cada Clone Trooper muestra **1 dado**; las dos
      copias de Clone Trooper son fichas independientes (no una sola con "x2").
- [ ] Cada dado muestra sus **6 caras** con el símbolo tal cual lo da el dato (p. ej. `1RD`, `2M`,
      `1F`, `1Dc`, `1R`, `-`). No se interpreta el efecto, solo se muestra.
- [ ] El jugador recarga la página tras importar → los personajes siguen en pantalla sin volver a
      pegar nada (caché en localStorage).
- [ ] El jugador pega un JSON inválido y pulsa Importar → mensaje de error claro, sin crash y sin
      dejar la pantalla a medio importar.
- [ ] El jugador importa un mazo distinto → reemplaza al anterior (no se acumulan personajes).

## Fuera de alcance (explícito)

- Las **30 cartas no-personaje** del mazo (se ignoran hasta fase 3-4).
- **Tirar y resolver dados** y el cálculo de daño (es otra spec de v1). Aquí las caras solo se
  muestran, no se lanzan.
- **Trampas / dificultad** (multiplicador de vida enemiga, reroll extra) — pertenecen a la spec
  del autómata, no al importador.
- **Selección o import de un segundo mazo (enemigo)** — SPEC-001 importa un solo mazo.
- Recursos, mano, mazo/robo, escudos y campo de batalla.

## Casos límite

- **Cara/símbolo desconocido** → se pinta el texto crudo tal cual, sin romper (interpretar el
  efecto es otra spec).
- **Código de personaje no encontrado en la API** → error claro indicando qué código falló.
- **Mazo sin personajes** → error "el mazo no tiene personajes", no pantalla vacía silenciosa.
- **Sin red / CORS al resolver cartas y sin caché previa** → error claro. Con caché previa del
  mismo mazo, la importación funciona offline.
- **Contenido mínimo de todo mensaje de error**: debe indicar el motivo distinguible entre
  (a) JSON inválido/ilegible, (b) mazo sin personajes, (c) código de carta no encontrado
  —incluyendo el código—, (d) fallo de red/CORS al resolver. Un error genérico sin motivo no
  cumple.
- **Personaje no-único con 2 copias** → 2 fichas con dados independientes.
  **Personaje único jugado elite** → 1 ficha con 2 dados.
- **Reimportar el mismo mazo** → resultado idéntico, sin duplicar fichas.

## Notas técnicas (opcional)

Restricciones que vienen del SDD (arquitectura):

- **Caché: localStorage** (esta spec resuelve el "a decidir en SPEC-001" del SDD). Estrategia
  única: persistir el **modelo de personajes ya construido** (lista de `Character` con sus dados)
  bajo una sola clave, más las cartas de personaje resueltas por código para no re-pedirlas a la
  API. Recargar reconstruye la pantalla desde esa caché sin volver a pegar ni llamar a la red.
- **Resolución de caras**: vía la API pública de ARH DB (`/api/public/card/{code}` o
  `/api/public/cards/`), cacheada localmente. Sin backend propio en v1.
- El **motor de resolución de dados NO entra** en esta spec: los símbolos se guardan y muestran
  como dato, no se interpretan como efecto.
- Modelo interno mínimo (a fijar en implementación):
  `Character { name, health, isUnique, isElite, dice: Die[] }`, `Die { sides: string[] }`.
  `points` NO se incluye: ningún criterio de aceptación lo verifica en v1; se añadirá cuando una
  spec lo necesite.
- **Formato del export pegado**: JSON de ARH DB con `slots` (mapa código→cantidad); las caras NO
  vienen en el export, se resuelven por código contra `/api/public/card/{code}`. Validar la
  estructura real contra un export de Unduli al implementar; un JSON sin `slots` cuenta como
  "JSON inválido".
- El export del sitio identifica los personajes por su código de carta; el mapeo exacto de
  **elite / número de copias / número de dados** debe validarse contra un export real de Unduli
  durante la implementación (los criterios de aceptación fijan el resultado observable esperado).

## Nota de tamaño (regla 4 CLAUDE.md)

La spec combina parseo/validación, llamada a API + caché, modelado y UI de fichas. Puede superar
las ~300 líneas de cambios. Si al planificar la implementación se confirma, dividir en dos
rebanadas: **(1)** importar + resolver + cachear + modelo (`Character`/`Die`), con volcado mínimo
verificable; **(2)** render de fichas con vida y las 6 caras. Decidir al empezar a implementar.

## Resultado del playtest

2026-07-16: playtest manual completo. Todos los pasos del guion QA pasaron (camino feliz,
casos límite, red/offline). Confirmado por el usuario.
