# The Cascade — front page of physicistlk.github.io

A scroll-driven 3D narrative set inside a semiconductor fabrication facility.
Vite + Three.js, no runtime dependencies beyond Three.

## Scenes

| # | Scene | What happens |
|---|-------|--------------|
| I | **The Fab Awakens** | The cluster tool resolves out of a wireframe reveal against a glowing wafer-diffraction backdrop. Bloom, inertial mouse orbit. |
| II | **The Lithography Cascade** | Lithography, deposition, etch, the OECT interface and biosensing cascade in word by word, floating in depth. The tool dissolves into a process-flow diagram. |
| III | **Into the Wafer** | Scroll locks; the camera falls through a scanner optical path, a reticle stage, a plasma etch chamber and into a silicon lattice. The frame's contrast is sampled live and drives a dot-and-line field. |
| IV | **Epilogue** | The tool returns, tiny and distant; credits roll and a closing quote fades in. |

## Build

```bash
npm ci
npm run build      # prebuild decodes the model, then vite bundles to dist/
npm run preview    # serve dist/ locally
```

`npm run build` produces `dist/`, which GitHub Actions lays over the static
pages of the site root. The published front page is `dist/index.html`.

## The model

The fab tool is a reinterpretation of:

> **"Space Station 4" by re1monsen** — <https://sketchfab.com/3d-models/space-station-4-cf80075368174bf9895f4fd266cf17e3>
> Licensed under **CC BY 4.0** — <https://creativecommons.org/licenses/by/4.0/>

All materials, lighting, the re-material as cleanroom hardware, the camera
work, the wafer backdrop and the entire tunnel sequence are original work for
this site.

### Why the model is stored as text

`src/assets/model/part-00*.b64` holds the model as base64 text in four parts.
`scripts/prepare-model.mjs` (run by the `prebuild` / `predev` hooks) decodes
them back into `src/assets/fab-tool.glb` — a 4.4 MB binary, meshopt-compressed
geometry with 1.5K WebP textures. Keeping the source of truth as plain text
means the model survives any repository or CI transport unchanged.

The model was optimised with [`gltf-transform`](https://gltf-transform.dev):
4K textures resized to WebP, geometry compressed with meshopt, the 20 original
meshes and the material structure left intact.

## Layout

```
src/
  main.js              bootstrap
  content.js           every line of narrative copy
  core/
    app.js             renderer, composer, camera choreography, state machine
    scroll.js          scroll progress, damping, scroll lock
    pointer.js         inertial mouse parallax
  scenes/
    fabtool.js         model load, re-material, wireframe reveal
    wafer.js           procedural wafer / diffraction backdrop
    theory.js          word-by-word chapter text + process-flow diagram
    tunnel.js          the procedural tunnel sequence
    contrast.js        live contrast sampling → dot-and-line field
    epilogue.js        credits and closing quote
```
