// Descarga TODAS las imágenes de carta a una carpeta local (SPEC-034, dev/opcional, NO se ejecuta en
// build/CI). Sirve para alojarlas en un mirror propio (idealmente con CORS) y apuntar
// VITE_CARD_IMAGE_BASE ahí, por si ARH desaparece. Son ~2977 imágenes (~226 MB): tarda y ocupa.
//
// Uso: node scripts/download-card-images.mjs [carpeta-destino]   (default: ./card-images)
// Estructura de salida: <destino>/<NN>/<code>.jpg (igual que el origen), lista para servir tal cual.

import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = 'https://db.swdrenewedhope.com/bundles/app/images/cards/en';
const root = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(process.argv[2] ?? join(root, '..', 'card-images'));
const SNAPSHOT = resolve(root, '..', 'src', 'data', 'cards.json');

async function main() {
  const snap = JSON.parse(await import('node:fs/promises').then((fs) => fs.readFile(SNAPSHOT, 'utf8')));
  const codes = Object.keys(snap).filter((c) => c !== '_meta');
  console.log(`${codes.length} cartas → descargando a ${OUT}`);

  let ok = 0;
  let miss = 0;
  for (const code of codes) {
    const nn = code.slice(0, 2);
    const dir = join(OUT, nn);
    const file = join(dir, `${code}.jpg`);
    if (existsSync(file)) {
      ok++;
      continue; // ya descargada: reanudable
    }
    try {
      const res = await fetch(`${BASE}/${nn}/${code}.jpg`);
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
