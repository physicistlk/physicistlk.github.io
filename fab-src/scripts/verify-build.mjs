/**
 * Checks a finished build before it is published.
 *
 * The site boots from a packed (gzip + base64) copy of the bundle rather than
 * from the raw file, so a build that produced the raw bundle but never ran the
 * packer would publish a page that 404s on its own script. This verifies the
 * pieces the published page actually needs.
 *
 *   node scripts/verify-build.mjs [dist]
 */
import { existsSync, statSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.resolve(process.argv[2] || path.join(here, '..', 'dist'));

const problems = [];
const check = (ok, message) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'}  ${message}`);
  if (!ok) problems.push(message);
};

const assets = path.join(dist, 'fab-assets');
check(existsSync(path.join(dist, 'index.html')), 'dist/index.html exists');

const files = existsSync(assets) ? readdirSync(assets) : [];
const packed = files.find((f) => f.endsWith('.gz.b64'));
check(!!packed, 'the packed bundle is present');
check(
  !files.some((f) => /^index-.*\.js$/.test(f)),
  'the unpacked bundle has been removed'
);
check(
  files.some((f) => f.endsWith('.css')),
  'the stylesheet is present'
);

if (packed) {
  const size = statSync(path.join(assets, packed)).size;
  check(size > 0, `the packed bundle is not empty (${(size / 1024).toFixed(0)} kB)`);
}

const html = readFileSync(path.join(dist, 'index.html'), 'utf8');
check(html.includes('app.js.gz.b64'), 'the page boots from the packed bundle');
check(!/\ssrc="[^"]*index-[^"]*\.js"/.test(html), 'the page does not reference a raw bundle');

if (problems.length) {
  console.error(`\n${problems.length} problem(s) with the build`);
  process.exit(1);
}
console.log('\nbuild verified');
