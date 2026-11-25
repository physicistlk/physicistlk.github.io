/**
 * Model pipeline for "The Cascade".
 *
 * Takes the original CC-BY model (Space Station 4 by re1monsen), retones its
 * albedo for the cleanroom reinterpretation, repacks it as WebP textures with
 * meshopt-compressed geometry, and writes the result as base64 parts.
 *
 * Usage:
 *   node tools/build-model.mjs <source-gltf-dir>
 *
 * The source directory must contain scene.gltf, scene.bin and textures/.
 */
import sharp from 'sharp';
import { readdir, readFile, writeFile, stat, mkdir, rm } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const src = path.resolve(process.argv[2] || path.join(here, 'source'));
const work = path.join(root, '.model-work');

const TEXTURES = [
  // [source file, target width, webp quality, brightness gain, saturation]
  ['station_1_baseColor.jpeg', 1536, 82, 2.45, 0.45],
  ['station_2_baseColor.jpeg', 1536, 82, 2.45, 0.45],
  ['station_1_emissive.jpeg', 1024, 84, 1.0, 1.0],
  ['station_2_emissive.jpeg', 1024, 84, 1.0, 1.0],
  ['station_1_metallicRoughness.png', 1024, 86, 1.0, 1.0],
  ['station_2_metallicRoughness.png', 1024, 86, 1.0, 1.0],
  ['station_1_normal.png', 1024, 90, 1.0, 1.0],
  ['station_2_normal.png', 1024, 90, 1.0, 1.0],
  ['station_1_clearcoat_normal.png', 512, 88, 1.0, 1.0],
];

await rm(work, { recursive: true, force: true });
await mkdir(path.join(work, 'textures'), { recursive: true });

// ---- copy the source package --------------------------------------------
for (const f of ['scene.gltf', 'scene.bin']) {
  await writeFile(path.join(work, f), await readFile(path.join(src, f)));
}

// ---- re-encode the textures ---------------------------------------------
const renames = {};
for (const [name, width, quality, gain, sat] of TEXTURES) {
  const from = path.join(src, 'textures', name);
  const toName = name.replace(/\.(jpeg|png)$/i, '.webp');
  const to = path.join(work, 'textures', toName);

  let pipeline = sharp(from, { failOn: 'none' }).resize({
    width, withoutEnlargement: true, kernel: 'lanczos3',
  });

  if (gain !== 1) {
    // lift the albedo into cleanroom-bright grey without clipping the detail
    pipeline = pipeline.modulate({ brightness: gain, saturation: sat });
  }

  await pipeline.webp({ quality, effort: 6 }).toFile(to);
  renames[`textures/${name}`] = `textures/${toName}`;
  const size = (await stat(to)).size;
  console.log(`${name.padEnd(34)} -> ${toName.padEnd(34)} ${(size / 1e3).toFixed(0)} kB`);
}

// ---- repoint the glTF ----------------------------------------------------
const gltfPath = path.join(work, 'scene.gltf');
const gltf = JSON.parse(await readFile(gltfPath, 'utf8'));
for (const img of gltf.images) {
  const next = renames[img.uri];
  if (next) {
    img.uri = next;
    img.mimeType = 'image/webp';
  }
}
await writeFile(gltfPath, JSON.stringify(gltf));

// ---- pack to a single GLB with meshopt geometry -------------------------
const outGlb = path.join(root, 'src', 'assets', 'fab-tool.glb');
const gltfBin = path.join(here, 'node_modules', '.bin', 'gltf-transform');
await run(gltfBin, [
  'optimize',
  gltfPath, outGlb,
  '--compress', 'meshopt',
  '--flatten', 'false', '--join', 'false', '--palette', 'false',
  '--instance', 'false', '--simplify', 'false', '--prune', 'false',
  '--texture-compress', 'false',
], { cwd: root });

const glb = await readFile(outGlb);
console.log(`\nGLB: ${glb.length.toLocaleString()} bytes`);

// ---- split into base64 parts for transport -------------------------------
const b64 = glb.toString('base64');
const CHUNK = 1_470_000;
const partsDir = path.join(root, 'src', 'assets', 'model');
await rm(partsDir, { recursive: true, force: true });
await mkdir(partsDir, { recursive: true });
let n = 0;
for (let i = 0; i < b64.length; i += CHUNK) {
  await writeFile(path.join(partsDir, `part-${String(n).padStart(3, '0')}.b64`), b64.slice(i, i + CHUNK));
  n++;
}
console.log(`base64: ${b64.length.toLocaleString()} chars in ${n} part(s)`);

await rm(work, { recursive: true, force: true });
