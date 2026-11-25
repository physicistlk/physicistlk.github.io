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
| `fab-assets/` | Built front-page assets (packed bundle + stylesheet) |

The front page is a **built artifact committed to the repository root**: the
Pages workflow publishes the repository as it stands, so `index.html` and
`fab-assets/` at the root are exactly what the browser downloads. The
academic pages remain plain HTML and can be edited directly.

To change the front page, edit `fab-src/`, rebuild, and copy the output to the
repository root:

```bash
cd fab-src
npm ci
npm run build
cp dist/index.html dist/fab-assets dist/fab-favicon.svg ../
```

`npm run build` also runs `npm run verify`, which checks that the published
page has everything it needs: the packed bundle, the stylesheet, and no
leftover raw bundle.

## Working on the front page

```bash
cd fab-src
npm ci
npm run dev       # http://127.0.0.1:5173
```

All narrative copy — the title card, the seven theory beats, the process flow,
the film sections and the credits — lives in `fab-src/src/content.js`.

## The Cascade — the front page

A scroll-driven 3D narrative set inside a semiconductor fabrication facility,
built with Vite and Three.js. It runs in four movements:

1. **Entry** — a thin-film transistor assembles itself from a wireframe
   draw-in: silicon substrate, back gate, gate dielectric, an organic
   semiconductor channel with source and drain, and an electrolyte gel where
   cations drift down toward the channel and are captured by receptor sites.
2. **The Cascade** — the lithography chapter. Type cascades word by word in
   parallax over the device as it decomposes into a process-flow diagram:
   deposition, lithography, etch, encapsulation, integration, biosensing.
3. **The cinema** — a scroll-locked sixteen-second descent: a brief flash of
   light on the optical path, the mask aligning, the plasma, the silicon
   lattice — and then the landing, where the light falls on photoresist over
   an array of silicon atoms and the CMOS circuit comes out of it. The
   footage is rendered live, and a dot-and-line field samples its own contrast
   frame by frame.
4. **Epilogue** — credits and a closing line.

The thread running through it is the route from a fab process to the
electrochemical transistors and biosensors that come out of it.

Every element on the page — geometry, materials, textures and simulation — is
generated in the browser. There is no third-party model or image asset.

## Attribution

The typefaces (Hanken Grotesk, Inter, JetBrains Mono) are used under the SIL
Open Font License and served from Google Fonts. Everything else is original —
see [`ATTRIBUTION.md`](ATTRIBUTION.md).
