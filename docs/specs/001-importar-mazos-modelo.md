# SPEC-001: Importar mazos (pegar JSON) y modelo de personajes/dados

**Estado:** Pendiente
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
- **Personaje no-único con 2 copias** → 2 fichas con dados independientes.
  **Personaje único jugado elite** → 1 ficha con 2 dados.
- **Reimportar el mismo mazo** → resultado idéntico, sin duplicar fichas.

## Notas técnicas (opcional)

Restricciones que vienen del SDD (arquitectura):

- **Caché: localStorage** (esta spec resuelve el "a decidir en SPEC-001" del SDD). Se cachea el
  export parseado y/o las cartas de personaje resueltas, para que recargar y jugar offline
  funcionen.
- **Resolución de caras**: vía la API pública de ARH DB (`/api/public/card/{code}` o
  `/api/public/cards/`), cacheada localmente. Sin backend propio en v1.
- El **motor de resolución de dados NO entra** en esta spec: los símbolos se guardan y muestran
  como dato, no se interpretan como efecto.
- Modelo interno mínimo sugerido (a fijar en implementación):
  `Character { name, health, points, isUnique, isElite, dice: Die[] }`, `Die { sides: string[] }`.
- El export del sitio identifica los personajes por su código de carta; el mapeo exacto de
  **elite / número de copias / número de dados** debe validarse contra un export real de Unduli
  durante la implementación (los criterios de aceptación fijan el resultado observable esperado).

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>
