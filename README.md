# Academic website — Lokesh Kumar, PhD

Personal / academic site for [GitHub Pages](https://physicistlk.github.io/).

## Live site

https://physicistlk.github.io/

## Structure

| Path | What it is |
|------|------------|
| `/` | **The Cascade** — a scroll-driven 3D narrative set inside a semiconductor fabrication facility (built from `fab-src/`) |
| `/about.html` | Profile, expertise and education |
| `/research.html` | Research themes and group |
| `/publications.html` | Publication list |
| `/contact.html` | Contact and links |
| `fab-src/` | Source of the front page — Vite + Three.js. See [`fab-src/README.md`](fab-src/README.md) |

The front page is built by GitHub Actions on every push to `main`: the app in
`fab-src/` is bundled with Vite and laid over the static pages above. The
academic pages remain plain HTML and can be edited directly.

## Attribution

The 3D model on the front page is *"Space Station 4" by re1monsen*, used under
CC BY 4.0 — see [`ATTRIBUTION.md`](ATTRIBUTION.md).
