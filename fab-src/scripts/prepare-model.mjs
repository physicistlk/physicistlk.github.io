/**
 * Restores the binary model from the base64 parts stored in the repository.
 *
 * The GLB is carried as plain text (in four chunks) so it survives any
 * repository / CI transport; this script reassembles and decodes it into the
 * real .glb that GLTFLoader expects. Runs automatically via the
 * `prebuild` / `predev` npm hooks.
 *
 *   "Space Station 4" by re1monsen — https://sketchfab.com/re1monsen
 *   Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const assets = path.join(here, '..', 'src', 'assets');
const partsDir = path.join(assets, 'model');
const glbPath = path.join(assets, 'fab-tool.glb');

if (!existsSync(partsDir)) {
  console.error('[prepare-model] missing', partsDir);
  process.exit(1);
}

const parts = readdirSync(partsDir)
  .filter((f) => f.endsWith('.b64'))
  .sort();

if (!parts.length) {
  console.error('[prepare-model] no base64 parts found');
  process.exit(1);
}

const b64 = parts.map((f) => readFileSync(path.join(partsDir, f), 'utf8')).join('');
const bytes = Buffer.from(b64.replace(/\s+/g, ''), 'base64');

// sanity check: a GLB container starts with the magic "glTF"
if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'glTF') {
  console.error('[prepare-model] decoded payload is not a GLB');
  process.exit(1);
}

const sha = createHash('sha256').update(bytes).digest('hex');
writeFileSync(glbPath, bytes);
console.log(
  `[prepare-model] fab-tool.glb — ${bytes.length.toLocaleString()} bytes ` +
    `from ${parts.length} part(s) (sha256:${sha.slice(0, 16)})`
);
