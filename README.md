# Trinket Forge (placeholder name)

A novelty 3D print shop for kids and grown-ups. People pick a ready-made base (a robot, a pumpkin, a keychain…), change it with big sliders and buttons like a video game character creator, and order the print or save the 3D file.

Built on the ProtoLab CAD engine (replicad/OpenCascade + Manifold, in a web worker).

## Pages

| Path | What it is |
|---|---|
| `/` | Landing page: categories, how it works, what's in season |
| `/shop` | Ready-made items, filtered by kind (novelty, seasonal, personal) and season |
| `/make` | The maker: pick a base, change it, see size, printer fit and an estimate. Links are shareable (`/make?kit=robot&v=…`) |
| `/community` | Links to free model sites, each flagged with its license situation, plus a quick license guide |
| `/studio` | The full ProtoLab editor (import STL/3MF/STEP, sketch, holes, measure…). Anything from the maker opens here with "More tools" |

## How it fits together

- **Kits** (`src/kits.js`): each kit is a list of options (slider, choice, toggle, text) and a `build(values)` function that returns plain builder parts. The same parts open in the Studio.
- **Shop items** (`src/catalog.js`): a kit plus preset values, a category and a season. Add an item there, then render its picture.
- **Maker preview** uses a fast mesh path (`previewMesh` in `src/cad/engine.js`): each part is meshed once by OpenCascade and cached, then joined and cut in Manifold. It's much faster, and it avoids an OpenCascade memory leak on 3D text (about 70 MB per join) that crashed the page after a dozen rebuilds. Parts are placed with Manifold's own transforms because replicad's `MeshShape.rotate` gave inconsistent results. STEP export from the Studio still uses the exact path.
- **Pictures** in `public/shots/` are rendered from the maker itself: `npm run build && npx vite preview --port 4173`, then `node scripts/render-shots.cjs` and build again.

## Placeholder settings (`src/config.js`)

| Setting | Placeholder |
|---|---|
| Name | Trinket Forge |
| Build volume | 256 × 256 × 256 mm (same as ProtoLab) |
| Price | ProtoLab's formula on the bounding box, labelled "Placeholder price" |
| Ordering | "Order this print" shows the estimate and saves the file; no checkout yet |

## Owner should confirm

- The name (and the subdomain to match).
- Printer, pricing, and how orders work (same open questions as ProtoLab).
- Whether to print non-commercial (CC BY-NC) models from other sites as paid orders. The community page currently says "We check with you before printing it as an order."
- The license summaries on the community page (they describe each site in general; each model's own license is what counts).

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # builds every kit option (fast path, checked against the exact path), then the Studio engine tests
npm run build
```

Fonts for 3D text are SIL Open Font License fonts from Fontsource (Fredoka, Archivo Black, Courgette, Space Mono) in `public/fonts/`. Pacifico was dropped: its overlapping letter strokes made the letters vanish when joined to a base.
