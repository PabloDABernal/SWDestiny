# SPEC-044: Ver el texto de las cartas en la mesa de juego

**Estado:** Pendiente
**Sección del GDD:** §7, nueva nota "Texto de carta en la mesa"
**Depende de:** SPEC-039 (`formatCardText`, que hoy vive dentro de `DbSection.tsx`), SPEC-042
(registro de habilidades por código), SPEC-030 (snapshot: de ahí sale el texto)

## Qué es (2-4 líneas)

Hoy, jugando, **no hay forma de saber qué hace una carta**: la mesa solo enseña nombre, vida y caras
de dado. El texto solo se ve en la sección DB, en otra pantalla. Con esta spec cada carta de la mesa
(personajes de ambos bandos, mejoras, apoyos y cartas de la mano) puede **desplegar su texto** con un
clic, y las que el juego **ya aplica de verdad** se distinguen de las que son solo informativas.

## Por qué ahora

Bloqueó el playtest de SPEC-042 (2026-08-02): el usuario activó a "Luke Skywalker" esperando que
robara una carta y no pasó nada, porque el suyo era **05031 (Legacies)** y el implementado es **01035
(Awakenings)**. Hay **9 cartas distintas llamadas "Luke Skywalker"**. Sin ver el texto en la mesa, hay
que saberse de memoria qué carta exacta lleva cada mazo, y eso va a empeorar con cada spec de texto.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

### Ver el texto

- [ ] Cada ficha de personaje en mesa (de **ambos bandos**) tiene un control tipo **"ℹ Texto"**.
      Cerrado por defecto: el tablero se ve exactamente igual que ahora hasta que lo abras.
- [ ] Pulsarlo **despliega el texto de esa carta** bajo la ficha; volver a pulsarlo lo cierra. Se
      pueden tener varios abiertos a la vez, y abrir uno no cierra los demás.
- [ ] El texto se ve **legible**, sin markup en crudo: nada de `[special]`, `<i>` o `<b>` a la vista
      (mismo formateo que ya hace la ficha de la DB desde SPEC-039).
- [ ] Un personaje **sin texto** (los hay) no muestra el control, o lo muestra vacío diciendo que no
      tiene texto — pero nunca un desplegable en blanco sin explicación.
- [ ] Las **mejoras** pegadas a un personaje y los **apoyos** en juego también pueden desplegar su
      texto, donde hoy solo se ve su nombre y sus caras.
- [ ] Las cartas de **tu mano** también, para saber qué hace una carta antes de jugarla (y cuál
      descartar con Tusken).
- [ ] Todo esto funciona **offline**: el texto sale del snapshot bundleado (SPEC-030), no de la red.

### Saber qué está implementado

- [ ] Las cartas cuyo texto el juego **ya aplica de verdad** se distinguen a simple vista (marca o
      color). Hoy son **10**: los 7 personajes de SPEC-042 (Veers, Nightsister, Leia, Vader 01010,
      Jabba, Tusken, Luke 01035) y los 3 Especiales de SPEC-039 (Luminara, Zuckuss, Vader 02010).
- [ ] Una carta con texto **no implementado** se ve claramente como informativa: su texto está ahí
      para leerlo, pero el juego no lo aplica. Al desplegarlo se entiende sin tener que adivinarlo.
- [ ] Esa marca es **automática**: sale del registro de habilidades (SPEC-042) y de la lista de
      Especiales (SPEC-039), así que cada spec futura que implemente un texto lo marca sola, sin
      tener que acordarse de tocar esta pantalla.

## Fuera de alcance (explícito)

- **Implementar ningún texto nuevo**: esta spec solo MUESTRA. Los reactivos (`Before…`) siguen en
  **SPEC-045** y las keywords pasivas en **SPEC-046** (renumeradas al insertarse esta).
- **Imágenes de carta en el tablero**: el arte sigue siendo cosa de la sección DB (SPEC-034/041).
- **Rediseñar la pantalla de juego**: no se reorganiza nada, solo se añade el desplegable donde ya
  están las fichas. *(Asunción: el usuario no lo marcó explícitamente como fuera, pero tampoco pidió
  rediseño; si quiere aprovechar para reordenar el tablero, es otra spec.)*
- **Buscar/filtrar por texto en la mesa**: eso ya existe en la DB, no se duplica aquí.
- **Explicar los símbolos de dado** (`1MD`, `+2RD`, `Sp`…): fuera; es otra necesidad distinta y
  merece su propia decisión. Anotar en BACKLOG si al jugar se ve que hace falta.

## Casos límite

- **Carta que no está en el snapshot** (código raro de un mazo importado): no se rompe; se muestra sin
  texto, como el resto de la ficha ya hace hoy con el nombre.
- **Texto muy largo** (algunos personajes tienen 3-4 líneas): el desplegable crece, pero **no debe
  descolocar** el resto del tablero ni tapar los dados; si hace falta, con scroll propio.
- **Personaje KO**: sigue pudiendo desplegar su texto (útil para entender qué hacía).
- **Dos copias del mismo personaje no-único**: cada ficha abre y cierra su texto por separado.
- **Cambiar de mazo o "Reset total"** con textos desplegados: no debe quedar ningún desplegable
  colgado apuntando a una carta que ya no está.
- **La misma carta en mano y en mesa**: son fichas distintas, cada una con su propio desplegable.

## Notas técnicas

- **`formatCardText` hay que sacarlo de `DbSection.tsx`** (donde lo dejó SPEC-039) a un módulo propio
  reutilizable, p. ej. `src/game/cardText.ts` o `src/components/CardText.tsx`. Es el mismo formateo:
  no se duplica ni se reescribe.
- **De dónde sale el texto**: `getCardFromSnapshot(code)?.text` / `readCache(code)?.text`, como ya
  hacen los componentes de la mesa para el nombre. El modelo `Character` no lleva `text`, así que se
  busca por `code` — no hace falta tocar el modelo ni el pipeline de import.
- **La marca de "implementado"** debe salir de una única función, p. ej. `hasImplementedText(code)`
  en `characterAbilities.ts`, que mire el registro de SPEC-042 **y** `KNOWN_SPECIAL_CODES` de
  SPEC-039. Así una spec futura que añada una entrada al registro marca la carta sola.
- **Estado del desplegable**: es estado de UI, del componente; **no** entra en el store de Zustand ni
  se persiste (igual que no se persiste ningún estado de partida).

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña-media: un componente de texto reutilizable + engancharlo en cuatro sitios (personaje, mejora,
apoyo, mano) + la marca de implementado + estilos. No toca el motor de juego ni el store, así que el
riesgo es bajo. Si se dispara, lo primero que se mueve a otra spec es el texto en **mano** y en
**mejoras/apoyos**, dejando los personajes de ambos bandos, que es lo que bloqueó el playtest.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>
