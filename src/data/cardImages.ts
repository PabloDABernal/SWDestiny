// URL de la imagen de una carta (SPEC-034, corregido en SPEC-041).
//
// La ruta relativa (`01/01001.jpg`, `101/14001.jpg`) viene del snapshot, que la saca del `imagesrc`
// real de ARH. NO se deduce del código: hasta SPEC-041 se reconstruía como `<NN>/<code>.jpg` con NN =
// los 2 primeros dígitos, patrón que solo vale para los sets oficiales (01-13); en la continuación
// fan (14-25) la carpeta es irregular (14→101, 15→102, 18→105…) y eso dejaba 1375 cartas sin imagen.
//
// Una carta puede no tener imagen: 417 apuntan en ARH al arte de OTRA carta y el snapshot no les
// guarda ruta a propósito (mejor ninguna imagen que la equivocada). Para esas, esta función devuelve
// `undefined` y la ficha cae al detalle de texto.
//
// BASE es configurable (VITE_CARD_IMAGE_BASE) para poder apuntar a un mirror propio sin tocar código;
// debe ser https (mixed-content en GitHub Pages).

import { getCardFromSnapshot } from './cards';

// El default es el MIRROR propio (SPEC-041), no ARH: es el que manda CORS (`access-control-allow-
// origin: *`), así que sus respuestas no son opacas y se pueden precachear de verdad; y el juego deja
// de depender de que ARH siga vivo. Sigue siendo un swap de variable para apuntar a otro sitio.
const IMAGE_BASE =
  (import.meta.env.VITE_CARD_IMAGE_BASE as string | undefined)?.replace(/\/+$/, '') ??
  'https://pablodabernal.github.io/SWDestiny-images';

/** URL de la imagen de la carta `code`, o `undefined` si esa carta no tiene imagen propia. */
export function cardImageUrl(code: string): string | undefined {
  const path = getCardFromSnapshot(code)?.image;
  return path ? `${IMAGE_BASE}/${path}` : undefined;
}

/** Prefijo base de las imágenes, para que el Service Worker sepa qué peticiones cachear. */
export const CARD_IMAGE_BASE = IMAGE_BASE;
