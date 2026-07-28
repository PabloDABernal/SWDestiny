// Inyecta la lista de precache del app shell en dist/sw.js (SPEC-040).
//
// Uso: se ejecuta solo, después de `vite build` (ver "build" en package.json).
//
// Vite pone hash al nombre de los assets (index-<hash>.js), así que la lista de qué precachear no se
// puede escribir a mano en public/sw.js: se genera aquí leyendo dist/ y se antepone a la copia de
// dist/sw.js como definiciones de `self.__PRECACHE_*`. Se toca SOLO dist/, nunca public/sw.js, para
// no ensuciar el fuente en cada build (public/sw.js sigue siendo válido tal cual en `npm run dev`,
// donde las constantes caen a sus defaults y el shell queda desactivado).
//
// Aborta SIN escribir si dist/sw.js no existe o si no se encuentra el index.html (build incompleta).

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join, relative, posix, sep } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(ROOT, 'dist');
const SW = resolve(DIST, 'sw.js');

// Debe coincidir con `base` de vite.config.ts: las rutas del precache son las que pide el navegador
// (URL absolutas dentro del sitio), no las del disco.
const BASE = '/SWDestiny/';

// Qué entra en el shell. Las imágenes de carta NO (son de otro host y las cachea la lógica de
// SPEC-034 bajo demanda); el snapshot de cartas y los mazos de la comunidad tampoco hacen falta
// aparte, porque se importan como JSON y acaban dentro de los chunks JS (SPEC-030/035).
const PRECACHE_EXT = ['.html', '.js', '.css', '.webmanifest', '.png', '.svg', '.ico', '.woff2'];

// El propio SW no se precachea (lo gestiona el navegador, y meterlo en su propio cache es un lío).
const EXCLUDE = new Set(['sw.js']);

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let swSource;
try {
  swSource = readFileSync(SW, 'utf8');
} catch {
  console.error('[sw-precache] No existe dist/sw.js — ¿se ha ejecutado `vite build` antes?');
  process.exit(1);
}

const files = walk(DIST)
  .map((full) => relative(DIST, full).split(sep).join(posix.sep))
  .filter((rel) => !EXCLUDE.has(rel))
  .filter((rel) => PRECACHE_EXT.some((ext) => rel.endsWith(ext)))
  .sort();

if (!files.includes('index.html')) {
  console.error('[sw-precache] dist/index.html no encontrado — build incompleta, no se inyecta nada.');
  process.exit(1);
}

const urls = files.map((rel) => BASE + rel);
const indexUrl = BASE + 'index.html';

// Nombre de cache versionado por el contenido del build: cada build estrena cache y el `activate`
// del SW borra los de las builds viejas.
const version = createHash('sha256').update(urls.join('\n')).digest('hex').slice(0, 8);

const banner = `// Generado por scripts/build-sw-precache.mjs (SPEC-040). No editar a mano.
self.__PRECACHE_MANIFEST__ = ${JSON.stringify(urls, null, 2)};
self.__PRECACHE_CACHE__ = ${JSON.stringify(`app-shell-${version}`)};
self.__PRECACHE_INDEX__ = ${JSON.stringify(indexUrl)};

`;

writeFileSync(SW, banner + swSource, 'utf8');
console.log(`[sw-precache] ${urls.length} ficheros precacheados en dist/sw.js (cache app-shell-${version}).`);
