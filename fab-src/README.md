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
npm run verify  # check a finished build
npm run preview # serve dist/
```

`npm run build` runs three steps:

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
3. **`verify-build.mjs`** checks that the published page has everything it
   needs: the packed bundle, the stylesheet, no leftover raw bundle, and all
   sixteen model parts.

## The narrative

| Movement | Scroll | What happens |
|----------|--------|--------------|
| Entry | 0 – 0.30 | The tool draws itself in as a wireframe, then materialises into brushed steel against a glowing wafer. Inertial mouse orbit. |
| The Cascade | 0.30 – 0.56 | Type cascades word by word in parallax while the model decomposes into a six-stage process flow: deposition, lithography, etch, encapsulation, integration, biosensing. |
| The cinema | 0.56 – 0.62 | Scroll locks for a sixteen-second descent — a short light path, the mask, the plasma, the lattice, and the landing on the die: silicon atoms under photoresist, printing a CMOS circuit. Rendered live; a dot-and-line field samples its own contrast. |
| Epilogue | 0.62 – 1.0 | Credits roll, then the closing quote. |

All copy lives in `src/content.js`.

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
