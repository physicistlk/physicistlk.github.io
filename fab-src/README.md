# The Channel — source

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
│   └── scenes/         device, wafer, theory, tunnel, contrast, endlinks
├── scripts/
│   ├── pack-app.mjs        packs the built bundle for transport
│   └── verify-build.mjs    checks a finished build
└── public/             static files served as-is
```

## Commands

```bash
npm ci          # install
npm run dev     # dev server on http://127.0.0.1:5173
npm run build   # -> dist/  (bundle + packed copy + stylesheet + favicon)
npm run verify  # check a finished build
npm run preview # serve dist/
```

`npm run build` runs two steps:

1. **`pack-app.mjs`** gzips and base64-encodes the built bundle into
   `dist/fab-assets/app.js.gz.b64` and rewrites `dist/index.html` to inflate
   it in the browser and import it as a blob module. This keeps the site
   self-contained — no CDN, no import map — while the bundle stays small
   enough to move through a text-only transport.
2. **`verify-build.mjs`** checks that the published page has everything it
   needs: the packed bundle, the stylesheet, and no leftover raw bundle.

## The narrative

| Movement | Scroll | What happens |
|----------|--------|--------------|
| Entry | 0 – 0.30 | A thin-film transistor draws itself in as a wireframe, then materialises: silicon substrate, back gate, gate dielectric, an organic semiconductor channel with source and drain, and an electrolyte gel where cations drift down and are captured by receptor sites. |
| The Channel | 0.30 – 0.56 | Type cascades word by word in parallax while the device decomposes into a six-stage process flow: deposition, lithography, etch, encapsulation, integration, biosensing. |
| The cinema | 0.56 – 0.62 | Scroll locks for a five-second descent, played as one continuous move with no chapter cards — a short light path, the mask, the plasma, the lattice, and the landing on the die: silicon atoms under photoresist, printing a CMOS circuit. Rendered live; a dot-and-line field samples its own contrast. |
| The way out | 0.62 – 1.0 | The rest of the site, set large: About, Research, Publications, Contact, the CV. |

All copy lives in `src/content.js`.

## Everything is procedural

There is no model, image or video asset anywhere in the project. The device,
the silicon lattice, the ions, the receptor sites, the wafer map, the tunnel
and the CMOS layout are all built in code — geometry, canvas-drawn textures,
shaders and per-frame simulation. `src/scenes/device.js` is the device,
`src/scenes/tunnel.js` the cinema, and `src/scenes/contrast.js` the
contrast-sampled overlay.

## Deployment

The Pages workflow publishes the repository as it stands, so the **built**
front page lives at the repository root. After `npm run build`, copy the
output there:

```bash
cp dist/index.html dist/fab-assets dist/fab-favicon.svg ../
```
