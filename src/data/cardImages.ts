// URL de la imagen de una carta (SPEC-034). Se reconstruye desde el `code` (no del `imagesrc` del
// snapshot, que viene en http://): `<BASE>/<NN>/<code>.jpg`, con NN = los 2 primeros dígitos (set).
// BASE es configurable (VITE_CARD_IMAGE_BASE) para poder apuntar a un mirror propio sin tocar código;
// debe ser https (mixed-content en GitHub Pages). Verificado contra ARH: 200 image/jpeg.

const IMAGE_BASE =
  (import.meta.env.VITE_CARD_IMAGE_BASE as string | undefined)?.replace(/\/+$/, '') ??
  'https://db.swdrenewedhope.com/bundles/app/images/cards/en';

/** URL de la imagen de la carta `code`, p. ej. `02036` → `<BASE>/02/02036.jpg`. */
export function cardImageUrl(code: string): string {
  return `${IMAGE_BASE}/${code.slice(0, 2)}/${code}.jpg`;
}

/** Prefijo base de las imágenes, para que el Service Worker sepa qué peticiones cachear. */
export const CARD_IMAGE_BASE = IMAGE_BASE;
