/**
 * Stages the base64 model parts for the build and verifies the payload.
 *
 * The GLB travels through the repository as plain text — sixteen parts in the
 * repository-root model/ directory — because the deployment transport stores
 * file contents verbatim as UTF-8 and rejects binary. The published site
 * fetches those parts at runtime and reassembles the model in memory, so this
 * script does not have to produce a .glb at all: it only stages the parts
 * where Vite's public directory can pick them up, and checks that they decode
 * to exactly the model the manifest describes.
 *
 *   "Space Station 4" by re1monsen — https://sketchfab.com/re1monsen
 *   Licensed under CC BY 4.0 — https://creativecommons.org/licenses/by/4.0/
 */
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.join(here, '..');                 // fab-src/
const sourceDir = path.join(appRoot, '..', 'model');   // repository-root model/
const targetDir = path.join(appRoot, 'public', 'model');

if (!existsSync(sourceDir)) {
  console.error('[prepare-model] missing', sourceDir);
  process.exit(1);
}

const manifest = JSON.parse(readFileSync(path.join(sourceDir, 'manifest.json'), 'utf8'));
const parts = manifest.parts || readdirSync(sourceDir).filter((f) => f.endsWith('.b64')).sort();

// --- verify the payload decodes to the expected GLB ----------------------
const b64 = parts
  .map((name) => readFileSync(path.join(sourceDir, name), 'utf8'))
  .join('')
  .replace(/\s+/g, '');

const bytes = Buffer.from(b64, 'base64');

if (bytes.length < 12 || bytes.toString('ascii', 0, 4) !== 'glTF') {
  console.error('[prepare-model] decoded payload is not a GLB');
  process.exit(1);
}
if (manifest.bytes && bytes.length !== manifest.bytes) {
  console.error(`[prepare-model] size mismatch: ${bytes.length} != ${manifest.bytes}`);
  process.exit(1);
}

const sha256 = createHash('sha256').update(bytes).digest('hex');
if (manifest.sha256 && sha256 !== manifest.sha256) {
  console.error(`[prepare-model] checksum mismatch: ${sha256} != ${manifest.sha256}`);
  process.exit(1);
}
console.log(
  `[prepare-model] ${parts.length} part(s) -> ${bytes.length.toLocaleString()} byte GLB ` +
    `(sha256:${sha256.slice(0, 16)})`
);

// --- stage the parts where Vite's public directory can see them ----------
rmSync(targetDir, { recursive: true, force: true });
mkdirSync(targetDir, { recursive: true });
for (const name of parts) copyFileSync(path.join(sourceDir, name), path.join(targetDir, name));
copyFileSync(path.join(sourceDir, 'manifest.json'), path.join(targetDir, 'manifest.json'));
console.log(`[prepare-model] staged ${parts.length + 1} file(s) in public/model/`);
