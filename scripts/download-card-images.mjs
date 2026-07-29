// Descarga TODAS las imágenes de carta a una carpeta local (SPEC-034, dev/opcional, NO se ejecuta en
// build/CI). Sirve para alojarlas en un mirror propio (con CORS, ver SPEC-041) y apuntar
// VITE_CARD_IMAGE_BASE ahí, por si ARH desaparece. Son ~2560 imágenes (~200 MB): tarda y ocupa.
//
// Uso: node scripts/download-card-images.mjs [carpeta-destino]   (default: ./card-images)
// Estructura de salida: la MISMA ruta relativa que el origen (<destino>/01/01001.jpg,
// <destino>/101/14001.jpg), leída del campo `image` del snapshot, lista para servir tal cual.
// Reanudable: relanzarlo salta las que ya están en disco y reintenta solo las que faltan.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://db.swdrenewedhope.com/bundles/app/images/cards/en';
const root = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] ?? join(root, '..', 'card-images'));
const SNAPSHOT = resolve(root, '..', 'src', 'data', 'cards.json');

async function main() {
  const snap = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(SNAPSHOT, 'utf8')));
  // La ruta de cada imagen sale del snapshot (`image`, SPEC-041), no de los 2 primeros dígitos del
  // código: en los sets fan (14-25) la carpeta es irregular. Las cartas sin `image` (417, las que en
  // ARH apuntan al arte de otra carta) no se descargan: en el juego tampoco se muestran.
  const codes = Object.keys(snap).filter((c) => c !== '_meta' && snap[c].image);
  const sinImagen = Object.keys(snap).filter((c) => c !== '_meta' && !snap[c].image).length;
  console.log(`${codes.length} cartas con imagen propia → descargando a ${OUT} (${sinImagen} sin imagen, se omiten)`);

  let ok = 0;
  let miss = 0;
  for (const code of codes) {
    const relative = snap[code].image; // p. ej. "101/14001.jpg"
    const file = join(OUT, relative);
    const dir = dirname(file);
    if (existsSync(file)) {
      ok++;
      continue; // ya descargada: reanudable
    }
    try {
      const res = await fetch(`${BASE}/${relative}`);
      if (!res.ok) {
        miss++;
        continue; // 404 (p. ej. cartas de dos caras) → se salta
      }
      const buf = Buffer.from(await res.arrayBuffer());
      mkdirSync(dir, { recursive: true });
      writeFileSync(file, buf);
      ok++;
      if (ok % 200 === 0) console.log(`  ${ok} descargadas…`);
    } catch {
      miss++;
    }
  }
  console.log(`Hecho: ${ok} imágenes en ${OUT} (${miss} sin imagen/404).`);
}

main();
