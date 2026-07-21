# SPEC-017: Importar el "text file" de ARH DB (además del JSON)

**Estado:** Pendiente
**Sección del GDD:** §1/§7 (mazos descargados de ARH DB) + nota de formatos de import a añadir (ver
"Aviso GDD" abajo)
**Depende de:** SPEC-001 (parseDeck → DeckSlot[] → resolveCards → API), SPEC-016 (mazo de robo)

## Qué es (2-4 líneas)

Hoy el import solo acepta el JSON con `slots` de ARH DB, que el botón "Download" de la web **no
genera** (solo da un "text file" legible y una copia). Con esta spec, el mismo textarea de importar
acepta también ese **text file**: el jugador pega el listado tal cual lo descarga ("2x Luminara
Unduli, Inspiring Commander (Spirit of Rebellion #36)") y la app lo convierte a los mismos `slots`
que ya sabe resolver. Sin UI nueva: el botón "Importar" detecta solo el formato.

## Formato de entrada (referencia)

El text file de ARH DB es texto plano con secciones. Ejemplo abreviado:

```
Unduli, clone commander (Retro 1-4)

Hero
Command / Force
Sets: From Awakenings to Rivals

BATTLEFIELD
-----------
Emperor's Throne Room, Death Star II (Awakenings #167)

CHARACTER
---------
2x Luminara Unduli, Inspiring Commander (Spirit of Rebellion #36)
2x Clone Trooper (Legacies #38)

UPGRADE
-------
2x Force Speed (Spirit of Rebellion #55)
...
```

- Una **línea de carta** es cualquiera que termine en `(<Nombre de set> #<número>)`. Puede llevar
  prefijo `Nx ` (cantidad); si no lo lleva, la cantidad es **1** (caso del battlefield).
- El nombre de la carta puede contener comas y paréntesis; el set y el número se toman siempre del
  **último** paréntesis de la línea.
- El resto de líneas (título, `Hero`, `Command / Force`, `Sets: …`, cabeceras de sección como
  `BATTLEFIELD`/`CHARACTER`/`UPGRADE`/`SUPPORT`/`EVENT`, líneas de guiones `-----`, líneas en
  blanco) **no** contienen ese patrón y se **ignoran**.

## Conversión set → código

El código de ARH DB es `<NN><nnn>`: 2 dígitos de set + número de coleccionista con **relleno a 3
dígitos** (`#5` → `005`, `#36` → `036`, `#167` → `167`). Tabla fija de sets (validada contra
`db.swdrenewedhope.com/api/public/card/<código>` el 2026-07-21):

| Set (nombre en el text file) | NN |
|---|---|
| Awakenings | 01 |
| Spirit of Rebellion | 02 |
| Empire at War | 03 |
| Two-Player Game | 04 |
| Legacies | 05 |
| Rivals | 06 |
| Way of the Force | 07 |
| Across the Galaxy | 08 |
| Convergence | 09 |
| Allies of Necessity | 10 |
| Spark of Hope | 11 |
| Covert Missions | 12 |

Ejemplo: `Spirit of Rebellion #36` → `02` + `036` → **`02036`**.

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] Pegar el text file completo de "Unduli, clone commander" (tal cual lo descarga ARH DB) y pulsar
      Importar → el bando se importa igual que con el JSON: 4 personajes en pie y **"Mazo: 30"**
      (mismo resultado que SPEC-016 con el JSON equivalente).
- [ ] Pegar el **JSON** con `slots` de siempre → sigue funcionando idéntico (no se rompe el flujo
      actual): la app detecta el formato por sí sola, sin selector.
- [ ] Pegar un text file cuya línea de carta usa un set **fuera de la tabla** (p. ej.
      `(Foobar #12)`) → el import se **cancela entero** con un error claro que nombra el set/línea; no
      se importa nada a medias (coherente con SPEC-001/016).
- [ ] Pegar un text file con una línea de carta **malformada** (falta el `#número`, número no
      numérico, cantidad `Nx` no numérica) → import cancelado con error claro; nada a medias.
- [ ] El battlefield del text file (`Emperor's Throne Room, Death Star II (Awakenings #167)`, sin
      `Nx`) se convierte a `01167` y se resuelve contra la API, pero **no** cuenta en "Mazo" (lo
      excluye `buildDrawPile`, igual que hoy con el JSON) → "Mazo" sigue siendo 30, no 31.
- [ ] Una carta con `2x` cuenta **dos veces** en el mazo de robo (igual que `qty: 2` en el JSON).

## Fuera de alcance (explícito)

- **Selector/pestañas JSON vs Texto**: no hay UI nueva; la detección es automática (empieza por `{`
  → JSON; si no → text file).
- **Otros formatos de export** (Tabletop Simulator JSON de SWDestinyDB, OCTGN, etc.): solo el "text
  file" de ARH DB y el JSON `slots` que ya se soportaba. El JSON de TTS (`ObjectStates`/`DeckIDs`)
  **no** se soporta.
- **Validar reglas de mazo** (30 cartas, límites de copias, legalidad de formato): igual que
  SPEC-001/016, no se valida; se refleja lo que trae el texto.
- **Sets nuevos que ARH publique después**: la tabla es fija; un set no listado es un error hasta
  que se amplíe la tabla (una línea nueva, no cambia la spec).
- **Cabeceras de sección como fuente de verdad del tipo**: el tipo de carta (personaje, battlefield,
  evento…) lo sigue decidiendo la API vía `type_code` al resolver, **no** la sección
  `CHARACTER`/`UPGRADE`/… del text file (que se ignora como el resto de líneas no-carta).

## Casos límite

- **Texto sin ninguna línea de carta** (solo cabeceras, o pegado vacío) → error claro "no se
  reconoció ninguna carta en el texto" (equivalente al `slots` vacío de parseDeck), no importa nada.
- **Cantidad ausente** (línea sin `Nx`, como el battlefield) → cantidad 1.
- **Número con menos de 3 dígitos** (`#5`) → se rellena a `005`; con 3 o más se deja igual (`#167`
  → `167`).
- **Misma carta (mismo código) en dos líneas** → defensivo: se **suman** las cantidades en el mismo
  slot (el text file real no duplica; evita doble-conteo si lo hiciera).
- **Espacios/tabs sobrantes** al inicio/fin de línea o dobles espacios → se toleran (trim + colapso
  razonable) sin romper el match.
- **JSON inválido que sí empieza por `{`** → se intenta como JSON y falla con el error de JSON de
  siempre (no se reintenta como texto); es coherente con la detección por primer carácter.

## Notas técnicas (opcional)

- Nueva función `parseTextDeck(raw): DeckSlot[]` en `src/import/` (paralela a `parseDeck`), que
  produce **el mismo** `DeckSlot[]` para que el resto del pipeline (`resolveCards`, `buildCharacters`,
  `buildDrawPile`) no cambie.
- Punto de detección: en `importDeck` (o donde hoy se llama `parseDeck`), elegir parser por
  `raw.trim().startsWith('{')`. JSON → `parseDeck`; si no → `parseTextDeck`.
- Regex de línea de carta sugerida (anclada al final para tomar el último paréntesis):
  `^\s*(?:(\d+)x\s+)?.+\(([^)#]+?)\s*#(\d+)\)\s*$`. Grupo 1 = cantidad (opcional), grupo 2 = nombre
  de set (trim), grupo 3 = número. Una línea que **no** casa este patrón se ignora (es estructura);
  una que casa pero cuyo set no está en la tabla, o cuyo número/cantidad es inválido, **lanza
  `ImportError('invalid-text', …)`** (nuevo `kind` o reutilizar `'invalid-json'` con mensaje de
  texto; decidir al implementar sin cambiar el contrato de `ImportError`).
- Tabla de sets: constante `SET_CODES: Record<string, string>` en el mismo archivo, con las claves
  exactas de la columna "nombre en el text file" de arriba. Validar contra un export real al
  implementar (como SPEC-001 hizo con `type_code`); si algún nombre difiere, ajustar la constante,
  no la spec.
- Tests unitarios de `parseTextDeck` (paralelos a `parseDeck.test.ts`): text file de Unduli →
  DeckSlot[] esperado (incluye `01167` battlefield y las cantidades); set desconocido → lanza; línea
  malformada → lanza; texto sin cartas → lanza; suma de duplicados.

## Nota de tamaño (regla 4 CLAUDE.md)

Pequeña-media: un parser nuevo aislado + tabla de datos + un `if` de detección en el punto de
import. No toca gameplay, ni el store, ni la resolución contra la API (reutiliza todo el pipeline de
SPEC-001/016). Bajo el umbral de ~300 líneas.

## Resultado del playtest

(pendiente)
