/**
 * Post-build packer.
 *
 * The repository is written through a connector that stores file contents as
 * UTF-8 text and rejects single requests above ~512 kB, so the built bundle
 * travels as base64-encoded gzip. At runtime the page inflates it and imports
 * it as a blob module — no CDN, no import map, no build-time dependency on a
 * third party.
 *
 * Also rewrites dist/index.html to load the packed bundle.
 */
import { readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const dist = path.join(root, 'dist');
const assets = path.join(dist, 'fab-assets');

const files = await readdir(assets);
const entry = files.find((f) => /^index-.*\.js$/.test(f));
if (!entry) {
  console.error('[pack-app] no built bundle found in dist/fab-assets');
  process.exit(1);
}

const source = await readFile(path.join(assets, entry));
const gz = gzipSync(source, { level: 9 });
const b64 = gz.toString('base64');

const packedName = 'app.js.gz.b64';
await writeFile(path.join(assets, packedName), b64);
console.log(
  `[pack-app] ${entry} ${(source.length / 1024).toFixed(0)} kB -> ` +
    `${packedName} ${(b64.length / 1024).toFixed(0)} kB (gzip ${(gz.length / 1024).toFixed(0)} kB)`
);

// the page boots from the packed copy, so the raw bundle is dead weight —
// and it is larger than a single repository write can carry
await rm(path.join(assets, entry), { force: true });
console.log(`[pack-app] removed the unpacked bundle (${entry})`);

// --- rewrite the page to boot from the packed bundle ---------------------
const htmlPath = path.join(dist, 'index.html');
let html = await readFile(htmlPath, 'utf8');

const bootstrap = `<script type="module">
/* The bundle is stored gzipped + base64; inflate it and import it in place. */
(async () => {
  const loader = document.getElementById('loader');
  try {
    const res = await fetch('./fab-assets/${packedName}');
    if (!res.ok) throw new Error('bundle ' + res.status);
    const b64 = (await res.text()).replace(/\\s+/g, '');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    if (typeof DecompressionStream === 'undefined') {
      throw new Error('this browser cannot decompress the bundle');
    }
    const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
    const src = await new Response(stream).text();
    await import(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
  } catch (err) {
    console.error('[cascade] boot failed', err);
    if (loader) {
      loader.innerHTML =
        '<p class="loader__label">THIS EXPERIENCE NEEDS A CURRENT BROWSER</p>' +
        '<p class="loader__pct">WebGL + ES2020</p>';
    }
  }
})();
</script>`;

const scriptTag = new RegExp(
  `<script[^>]*src="[^"]*${entry.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*></script>`
);
if (!scriptTag.test(html)) {
  console.error('[pack-app] could not find the bundle script tag in dist/index.html');
  process.exit(1);
}
html = html.replace(scriptTag, bootstrap);
await writeFile(htmlPath, html);
console.log('[pack-app] dist/index.html now boots from the packed bundle');
