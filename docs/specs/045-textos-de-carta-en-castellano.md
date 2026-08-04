# SPEC-045: Textos de carta en castellano (empezando por el set 01)

**Estado:** Pendiente
**Sección del GDD:** §7, amplía la nota "Texto de carta en la mesa" (SPEC-044)
**Depende de:** SPEC-044 (`cardText()` y `CardTextToggle`, el único sitio por el que pasa el texto),
SPEC-030 (snapshot)

## Qué es (2-4 líneas)

El juego es en castellano pero **los textos de carta salen en inglés**, porque vienen tal cual de ARH.
Esta spec añade las traducciones, **set a set**, empezando por el **01 (Awakenings)** —el mismo orden
que sigue la implementación de texto—. Donde haya traducción se ve en castellano; donde todavía no la
haya, se sigue viendo el inglés original, sin romper nada.

## Por qué set a set

Son **2.949 cartas con texto, 401.855 caracteres** en total. Traducirlo todo de una vez son varias
sesiones dedicadas solo a esto y un diff imposible de revisar. El **set 01 son 170 cartas / 16.447
caracteres**: una sentada, revisable, y es justo el set cuyo texto se está implementando ahora
(SPEC-042 y siguientes). Cada set futuro se traduce cuando le toque. Decidido con el usuario
(2026-08-04).

## Criterios de aceptación

Verificables jugando. Formato: acción → resultado observable.

- [ ] En la mesa, el desplegable "ℹ Texto" de una carta del **set 01** muestra el texto **en
      castellano**. Ejemplo comprobable: **Luke Skywalker (01035)** debe decir algo como *"Después de
      activar este personaje, roba una carta."*, no *"After you activate this character, draw a
      card."*.
- [ ] En la **ficha de la sección DB**, esa misma carta también se ve en castellano: es el mismo texto,
      no dos sitios distintos que puedan desincronizarse.
- [ ] Una carta de un set **todavía sin traducir** (p. ej. el Luke de Legacies, 05031) sigue
      mostrando su texto **en inglés**, sin ningún error ni hueco raro.
- [ ] Los **símbolos** siguen viéndose como ya los deja SPEC-039/044: `[special]` → "Especial",
      `[shield]` → "Escudo", etc. La traducción **no** debe romper esos tokens ni dejarlos en crudo.
- [ ] La **cursiva y la negrita** del original (`<i>Sith</i>`, `<b>Action</b>`) siguen viéndose como
      tales en la traducción.
- [ ] Los **nombres** de las cartas siguen en inglés (decisión del usuario, 2026-08-04): el buscador,
      los mazos de la comunidad y el import por "text file" de ARH usan los nombres ingleses, y las
      imágenes de carta también. Buscar "Luke Skywalker" en la DB sigue funcionando igual.
- [ ] Todo esto funciona **sin conexión**: las traducciones van bundleadas, como el snapshot.
- [ ] **Regenerar el snapshot** (`npm run cards:snapshot`) **no borra las traducciones**.

## Fuera de alcance (explícito)

- **Traducir los otros 24 sets ahora**: van set a set, cuando toque implementar su texto. Lo no
  traducido se ve en inglés.
- **Traducir los nombres** de las cartas (ver criterio arriba).
- **Selector ES/EN**: no hay conmutador de idioma (decisión del usuario, 2026-08-04). Si hay
  traducción, se ve; si no, el inglés.
- **Traducir la interfaz**: ya está en castellano; esto es solo el texto de las cartas.
- **Traducir los nombres de set, facción o tipo** (`Awakenings`, `Command`, `character`…): fuera de
  esta spec; si molesta, se anota en BACKLOG.

## Casos límite

- **Carta con traducción vacía o solo espacios** en el fichero: se trata como "sin traducir" y se
  muestra el inglés, en vez de dejar la ficha en blanco.
- **Traducción de un código que ya no está en el snapshot** (una carta retirada de ARH): no rompe
  nada; simplemente no se usa nunca. Debe detectarlo un test, para que no se acumule basura.
- **Texto original vacío**: no se traduce ni se muestra control, como ya hace SPEC-044.
- **Regenerar el snapshot** con textos originales cambiados (ARH corrige una carta): la traducción
  vieja se sigue mostrando; **no hay detección automática de "traducción desfasada"**, y se asume.
  Anotarlo como riesgo conocido en la propia spec.

## Notas técnicas

- **Fichero aparte, nunca dentro de `cards.json`**: `src/data/cardText.es.json`, mapa
  `{ "<code>": "<texto en castellano>" }`. `cards.json` se **regenera** desde ARH con
  `npm run cards:snapshot`, así que meter ahí las traducciones las borraría en la próxima
  regeneración. Este es el motivo principal de separarlas.
- **Un único punto de lectura**: `cardText(code)` en `src/components/CardText.tsx` (SPEC-044) es por
  donde ya pasa todo el texto de la mesa. Ahí se mira primero la traducción y se cae al inglés. **La
  ficha de la DB (`DbSection`) hay que hacerla pasar por esa misma función**, que hoy lee
  `selected.text` directamente — si no, la DB se quedaría en inglés.
- **Los tokens `[...]` y las etiquetas `<i>`/`<b>` se conservan literales** en la traducción: el
  formateo de SPEC-039 los sigue procesando igual. Traducir *alrededor* de ellos, no dentro.
- **Glosario obligatorio**, para que 25 sets acaben siendo coherentes entre sí. Mínimo:
  character→personaje, upgrade→mejora, support→apoyo, event→evento, die/dice→dado/dados,
  roll→tirar, reroll→volver a tirar, resolve→resolver, remove→retirar, discard→descartar,
  defeat→derrotar, damage→daño, shield→escudo, resource→recurso, hand→mano, deck→mazo,
  opponent→rival, ready→enderezar, exhaust→agotar, "you may"→"puedes". Las **keywords** (Guardian,
  Ambush, Redeploy…) se dejan **en inglés**, porque son términos de regla que el juego mostrará
  también en otros sitios. El glosario vive en la cabecera del propio fichero de traducciones.
- **Un test** que valide el fichero: que todo código traducido exista en el snapshot, que ninguna
  traducción esté vacía, y que no queden tokens `[...]` distintos de los del original (protege de
  traducir "dentro" de un símbolo por error).

## Nota de tamaño (regla 4 CLAUDE.md)

El código es pequeño (una función de lectura, un fichero de datos y un test). El grueso es
**trabajo de traducción**: 170 textos. Si se hace largo, se parte por tipo de carta dentro del set 01
(personajes primero, luego mejoras/apoyos, luego eventos), avisando antes; no subdividir con sufijos.

## Resultado del playtest

<Se rellena al jugar: fecha, qué pasos del guion QA pasaron/fallaron.>
