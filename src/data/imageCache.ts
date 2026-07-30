// Descarga y borrado de imágenes de carta en el cache del navegador (SPEC-041).
//
// Usa el MISMO cache que el Service Worker de SPEC-034 (`card-images-v1`), pero desde la página: no
// hace falta hablar con el SW, basta abrir el cache y hacer `cache.put`. El SW ya sirve desde ahí, así
// que lo descargado aquí se ve offline sin tocar sw.js.
//
// Ojo con CORS: con el mirror (SPEC-041) las respuestas son normales y se puede comprobar `res.ok`.
// Si la base apuntara a un host sin CORS (ARH), un `fetch` normal cross-origin lanza TypeError —no
// devuelve respuesta opaca, al revés que un <img> interceptado por el SW—, así que se reintenta con
// `mode: 'no-cors'` y se guarda la opaca con `cache.put` (nunca `cache.add`, que también falla).

import { cardImageUrl } from './cardImages';

const CACHE = 'card-images-v1';

/** ¿Hay Cache Storage? (contexto no seguro o navegador viejo → no). */
export function imageCacheAvailable(): boolean {
  return typeof caches !== 'undefined';
}

/** URLs de imagen de esos códigos, sin repetir y saltando las cartas sin imagen propia. */
export function imageUrlsFor(codes: string[]): string[] {
  const urls = new Set<string>();
  for (const code of codes) {
    const url = cardImageUrl(code);
    if (url) urls.add(url);
  }
  return [...urls];
}

/** Cuántas de esas URLs están ya en el cache. */
export async function countCached(urls: string[]): Promise<number> {
  if (!imageCacheAvailable()) return 0;
  const cache = await caches.open(CACHE);
  const hits = await Promise.all(urls.map((url) => cache.match(url)));
  return hits.filter(Boolean).length;
}

/** Nº total de imágenes guardadas en el cache (para el botón de borrado). */
export async function countAllCached(): Promise<number> {
  if (!imageCacheAvailable()) return 0;
  const cache = await caches.open(CACHE);
  return (await cache.keys()).length;
}

export interface DownloadResult {
  ok: number;
  failed: number;
  /** Cierto si se abortó por quedarse sin espacio (QuotaExceededError). */
  outOfSpace: boolean;
}

/** Descarga a cache las URLs que falten. Informa del progreso y se puede cancelar con `signal`.
 *  Las ya cacheadas no se vuelven a pedir (cuentan como ok). */
export async function downloadImages(
  urls: string[],
  onProgress: (done: number, total: number) => void,
  signal?: AbortSignal,
): Promise<DownloadResult> {
  const result: DownloadResult = { ok: 0, failed: 0, outOfSpace: false };
  if (!imageCacheAvailable()) {
    result.failed = urls.length;
    return result;
  }
  const cache = await caches.open(CACHE);
  let done = 0;
  for (const url of urls) {
    if (signal?.aborted) break;
    try {
      if (await cache.match(url)) {
        result.ok++;
      } else {
        const res = await fetchImage(url, signal);
        if (res) {
          await cache.put(url, res);
          result.ok++;
        } else {
          result.failed++;
        }
      }
    } catch (e) {
      // Sin espacio: no tiene sentido seguir intentando las demás.
      if (e instanceof DOMException && e.name === 'QuotaExceededError') {
        result.outOfSpace = true;
        break;
      }
      result.failed++;
    }
    done++;
    onProgress(done, urls.length);
  }
  bumpCacheVersion();
  return result;
}

/** Pide la imagen. Devuelve la respuesta cacheable, o null si no se pudo. */
async function fetchImage(url: string, signal?: AbortSignal): Promise<Response | null> {
  try {
    const res = await fetch(url, { signal });
    return res.ok ? res : null; // un 404 no se cachea
  } catch (e) {
    if (signal?.aborted) return null;
    // Host sin CORS: el fetch normal ha lanzado. Se guarda la respuesta opaca, que sirve para <img>.
    try {
      const opaque = await fetch(url, { mode: 'no-cors', signal });
      return opaque.type === 'opaque' ? opaque : null;
    } catch {
      return null;
    }
  }
}

/** Vacía el cache de imágenes. No toca el cache del app shell (SPEC-040), que es otro. */
export async function clearImageCache(): Promise<void> {
  if (!imageCacheAvailable()) return;
  await caches.delete(CACHE);
  bumpCacheVersion();
}

// --- Estado global "hay una descarga en curso" -------------------------------------------------
// Es global, no de una ficha: mientras se descarga un mazo, el botón de borrar está deshabilitado
// aunque el usuario se vaya a otra pantalla de la DB (y al revés).

let busy = false;
const listeners = new Set<() => void>();

export function isDownloading(): boolean {
  return busy;
}

export function subscribeDownloading(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function setDownloading(value: boolean): void {
  busy = value;
  for (const fn of listeners) fn();
}

// --- "El contenido del cache ha cambiado" -------------------------------------------------------
// Sin esto, el botón de un mazo abierto seguiría diciendo "Imágenes descargadas ✓" después de que el
// usuario pulse "Borrar imágenes descargadas" en la cabecera, que está en la misma pantalla.

let version = 0;
const versionListeners = new Set<() => void>();

export function cacheVersion(): number {
  return version;
}

export function subscribeCacheVersion(fn: () => void): () => void {
  versionListeners.add(fn);
  return () => versionListeners.delete(fn);
}

function bumpCacheVersion(): void {
  version++;
  for (const fn of versionListeners) fn();
}
