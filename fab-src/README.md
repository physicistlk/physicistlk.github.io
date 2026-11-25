# The Cascade — source

The front page of [physicistlk.github.io](https://physicistlk.github.io/): a
scroll-driven 3D narrative set inside a semiconductor fabrication facility.
Vite + Three.js, no runtime CDN dependency.

```
fab-src/
├── index.html          page shell: loader, title card, HUD, overlay
├── src/
│   ├── main.js         entry point
│   ├── content.js      every string in the narrative (edit copy here)
│   ├── core/           app loop, scroll, pointer, environment map
│   └── scenes/         fab tool, wafer, theory, tunnel, contrast, epilogue
├── scripts/
│   ├── prepare-model.mjs   stages + verifies the model parts
│   └── pack-app.mjs        packs the built bundle for transport
├── tools/              model optimisation pipeline (sharp, gltf-transform)
└── public/             static files served as-is (generated model parts live here)
```

## Commands

```bash
npm ci          # install
npm run dev     # dev server on http://127.0.0.1:5173
npm run build   # -> dist/  (bundle + packed copy + stylesheet + favicon)
npm run preview # serve dist/
```

`npm run build` runs two steps:

1. **`prepare-model.mjs`** copies the base64 model parts from the
   repository-root `model/` directory into `public/model/`, verifies that they
   decode to the exact GLB the manifest describes (size + SHA-256), and fails
   the build if they do not. The staged copy is git-ignored; the canonical
   parts live once, in `model/`.
2. **`pack-app.mjs`** gzips and base64-encodes the built bundle into
   `dist/fab-assets/app.js.gz.b64` and rewrites `dist/index.html` to inflate
   it in the browser and import it as a blob module. This keeps the site
   self-contained — no CDN, no import map — while the bundle stays small
   enough to move through a text-only transport.

## The model

> "Space Station 4" by re1monsen — <https://sketchfab.com/re1monsen>
> Licensed under CC BY 4.0 — <https://creativecommons.org/licenses/by/4.0/>

The model is re-interpreted here as a circular cleanroom cluster tool: a
central transfer module ringed by process chambers, with load-lock pods and
service ports. All materials, lighting, indicator lamps, edge geometry and the
reveal choreography are original work for this site.

`tools/build-model.mjs` rebuilds the optimised GLB from the source model
(sharp + gltf-transform, kept out of the site's own dependencies).

## Deployment

The Pages workflow publishes the repository as it stands, so the **built**
front page lives at the repository root. After `npm run build`, copy the
output there:

```bash
cp dist/index.html dist/fab-assets dist/fab-favicon.svg ../
```
