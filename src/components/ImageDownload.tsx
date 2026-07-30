import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  cacheVersion,
  clearImageCache,
  countAllCached,
  countCached,
  downloadImages,
  imageCacheAvailable,
  imageUrlsFor,
  isDownloading,
  setDownloading,
  subscribeCacheVersion,
  subscribeDownloading,
} from '../data/imageCache';

/** ¿Hay una descarga de imágenes en curso? (estado global, SPEC-041). */
function useDownloading(): boolean {
  return useSyncExternalStore(subscribeDownloading, isDownloading, () => false);
}

/** Botón "Descargar imágenes de este mazo" (SPEC-041): deja ese mazo completo con imágenes sin
 *  conexión. El estado "ya descargado" NO se persiste: se pregunta al cache al abrir la ficha, así
 *  nunca miente si el navegador desalojó las imágenes por su cuenta. */
export function DeckImagesButton({ codes }: { codes: string[] }) {
  const busy = useDownloading();
  const [urls, setUrls] = useState<string[]>([]);
  const [cached, setCached] = useState<number | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  // Identidad estable de la lista, para no relanzar el efecto en cada render.
  const key = codes.join(',');

  const refresh = useCallback(async (list: string[]) => {
    setCached(await countCached(list));
  }, []);

  // `version` cambia al descargar o al borrar: así este botón no se queda diciendo "descargadas ✓"
  // cuando el usuario vacía el cache desde la cabecera, que está en la misma pantalla.
  const version = useSyncExternalStore(subscribeCacheVersion, cacheVersion, () => 0);

  useEffect(() => {
    const list = imageUrlsFor(key === '' ? [] : key.split(','));
    setUrls(list);
    void refresh(list);
  }, [key, version, refresh]);

  // Salir de la ficha a mitad de descarga la cancela; lo ya bajado se queda cacheado.
  useEffect(() => () => abort.current?.abort(), []);

  if (!imageCacheAvailable() || urls.length === 0) return null;

  const complete = cached !== null && cached >= urls.length;

  const start = async () => {
    const ac = new AbortController();
    abort.current = ac;
    setDownloading(true);
    setMessage(null);
    setProgress(0);
    try {
      const res = await downloadImages(urls, (done) => setProgress(done), ac.signal);
      if (ac.signal.aborted) return;
      if (res.outOfSpace) setMessage('No cabe: borra imágenes descargadas.');
      else if (res.failed > 0) setMessage(`${res.ok}/${urls.length}, ${res.failed} fallaron.`);
      await refresh(urls);
    } finally {
      abort.current = null;
      setProgress(null);
      setDownloading(false);
    }
  };

  const label =
    progress !== null
      ? `Descargando… ${progress}/${urls.length}`
      : complete
        ? 'Imágenes descargadas ✓'
        : `Descargar imágenes de este mazo (${urls.length})`;

  return (
    <p className="deck-images">
      <button
        type="button"
        className={complete ? 'deck-images__btn deck-images__btn--done' : 'deck-images__btn'}
        onClick={start}
        disabled={busy}
      >
        {label}
      </button>
      {message && <span className="deck-images__msg">{message}</span>}
    </p>
  );
}

/** Botón "Borrar imágenes descargadas" (SPEC-041), con el nº de imágenes guardadas. Vacía solo el
 *  cache de imágenes: el del app shell (SPEC-040) es otro, así que la app sigue arrancando offline. */
export function ImageCacheControls() {
  const busy = useDownloading();
  const [count, setCount] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const version = useSyncExternalStore(subscribeCacheVersion, cacheVersion, () => 0);

  const refresh = useCallback(() => {
    void countAllCached().then(setCount);
  }, []);

  // Se recuenta al montar y cada vez que el cache cambia (una descarga que termina, un borrado).
  useEffect(refresh, [refresh, version]);

  if (!imageCacheAvailable() || count === null || count === 0) return null;

  if (confirming) {
    return (
      <span className="image-cache">
        <span className="image-cache__count">¿Borrar {count} imágenes?</span>
        <button
          type="button"
          onClick={async () => {
            await clearImageCache();
            setConfirming(false);
          }}
        >
          Sí, borrar
        </button>
        <button type="button" onClick={() => setConfirming(false)}>
          Cancelar
        </button>
      </span>
    );
  }

  return (
    <span className="image-cache">
      <button type="button" onClick={() => setConfirming(true)} disabled={busy}>
        Borrar imágenes descargadas ({count})
      </button>
    </span>
  );
}
