# Academic website — Lokesh Kumar, PhD

Personal / academic site for [GitHub Pages](https://physicistlk.github.io/).

## Live site

https://physicistlk.github.io/

## Structure

| Path | What it is |
|------|------------|
| `/` | **The Cascade** — a scroll-driven 3D narrative set inside a semiconductor fabrication facility |
| `/about.html` | Profile, expertise and education |
| `/research.html` | Research themes and group |
| `/publications.html` | Publication list |
| `/contact.html` | Contact and links |
| `fab-src/` | Source of the front page — Vite + Three.js. See [`fab-src/README.md`](fab-src/README.md) |
| `model/` | The 3D model as base64 text parts (see below) |
| `fab-assets/` | Built front-page assets (packed bundle + stylesheet) |

The front page is a **built artifact committed to the repository root**: the
Pages workflow publishes the repository as it stands, so `index.html`,
`fab-assets/` and `model/` at the root are exactly what the browser downloads.
The academic pages remain plain HTML and can be edited directly.

To change the front page, edit `fab-src/`, rebuild, and copy the output to the
repository root:

```bash
cd fab-src
npm ci
npm run build
cp dist/index.html dist/fab-assets dist/fab-favicon.svg ../
```

### Why the model is stored as text

The 3D model is a binary `.glb`, but it travels through this repository as
sixteen base64 parts in `model/` so that it survives any text-oriented
transport intact. The site fetches the parts at runtime, joins and decodes
them in the browser, and parses the result with `GLTFLoader` — the binary is
never committed.

## Attribution

The 3D model on the front page is *"Space Station 4" by re1monsen*, used under
CC BY 4.0 — see [`ATTRIBUTION.md`](ATTRIBUTION.md).
