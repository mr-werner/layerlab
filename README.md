# LayerLab

**Discover it. Customize it. Print it.**

A 3D print shop and "model mall". People search the big model sites (Printables, MakerWorld, Thingiverse…) from one box, bring a downloaded file back to recolor, resize, turn and add a name stand, or start from one of our bases, like the figure builder, which works like a game's character screen. Then they order the print or save the file.

Built on the ProtoLab CAD engine (replicad/OpenCascade + Manifold, in a web worker).

## Pages

| Path | What it is |
|---|---|
| `/` | Home: Discover / Customize / Print, the figure builder, the mall, what's in season |
| `/discover` | The model mall: one search that deep-links into every store, aisles (ready-made searches), store cards with license flags, a license guide. `/community` goes here too |
| `/remix` | Drop a .stl/.3mf/.step from any site: size, side on the table, spin, mirror, round or plinth name stand, color, and a License tab (store, license, designer, link). ND licenses lock the stand; NC/unknown licenses get a "we'll check first" note on the order |
| `/shop` | Ready-made items, filtered by kind (novelty, seasonal, personal) and season |
| `/make` | The maker: pick a base (the figure builder first), change it, see size, printer fit and an estimate. Links are shareable (`/make?kit=figure&v=…`) |
| `/studio` | The full ProtoLab editor (import STL/3MF/STEP, sketch, holes, measure…). Anything from the maker opens here with "More tools" |

## How it fits together

- **Figure builder** (`src/figure.js`): the kit with the most options (head, face, hair and hats, body, arms and held items, legs, gear, stand). `FIGURE_LOOKS` are the starter looks on the home page.
- **Stores** (`src/stores.js`): the mall's stores, their search URL patterns, license flags, aisles and the license table used by the remixer.
- **Remixer** (`src/remix.js`, `src/maker/Remix.jsx`): turns an imported file into parts (the file plus an optional stand). The file is kept in the browser's IndexedDB so a reload keeps it.
- **Kits** (`src/kits.js`): each kit is a list of options (slider, choice, toggle, text) and a `build(values)` function that returns plain builder parts. The same parts open in the Studio.
- **Shop items** (`src/catalog.js`): a kit plus preset values, a category and a season. Add an item there, then render its picture.
- **Maker preview** uses a fast mesh path (`previewMesh` in `src/cad/engine.js`): each part is meshed once by OpenCascade and cached, then joined and cut in Manifold. It's much faster, and it avoids an OpenCascade memory leak on 3D text (about 70 MB per join) that crashed the page after a dozen rebuilds. Parts are placed with Manifold's own transforms because replicad's `MeshShape.rotate` gave inconsistent results. STEP export from the Studio still uses the exact path.
- **Pictures** in `public/shots/` are rendered from the maker itself: `npm run build && npx vite preview --port 4173`, then `node scripts/render-shots.cjs` and build again.

## Placeholder settings (`src/config.js`)

| Setting | Placeholder |
|---|---|
| Build volume | 256 × 256 × 256 mm (same as ProtoLab) |
| Price | ProtoLab's formula on the bounding box, labelled "Placeholder price" |
| Ordering | "Order this print" shows the estimate and saves the file; no checkout yet |

## Owner should confirm

- Printer, pricing, and how orders work (same open questions as ProtoLab).
- Whether to print non-commercial (CC BY-NC) models from other sites as paid orders. The remixer currently says "We'll check it with you first."
- The license summaries on the mall page (they describe each site in general; each model's own license is what counts).
- The store search links (`src/stores.js`) follow each site's current search URL. They couldn't be tested from the build machine (the sites block scripted requests), so click through each once.

## AI models (Meshy)

`api/meshy.js` is a Vercel function that calls Meshy's text-to-3D API. Set `MESHY_API_KEY` (and optionally `MESHY_DAILY_LIMIT`, default 25) in the Vercel project's environment variables. Without the key the "Describe it" box on /remix stays hidden. Prompts go through the same family filter as Sketchfab results, and Meshy's own moderation is on.

## Model sources and sign-in

- Sketchfab and the Smithsonian (CC0 museum scans) are searched from the browser. Smithsonian models open straight in the upload page.
- "Sign in with Sketchfab" lets Sketchfab models load straight into the builder. Register an app at Sketchfab (implicit grant, redirect URI `https://layerlab.blueprintwebstudio.com/auth/sketchfab`), then set `SKETCHFAB_CLIENT_ID` in Vercel. Until then the button stays hidden.
- Thingiverse and MyMiniFactory show in Explore once `THINGIVERSE_TOKEN` or `MYMINIFACTORY_KEY` is set (searched through `api/search.js` so the keys stay private).
- Models that aren't watertight get repaired on import (`src/cad/repair.js`): weld first, then rebuild as a solid if needed.

## Develop

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # builds every kit option (fast path, checked against the exact path), then the Studio engine tests
npm run build
```

3D text joins letters one by one in the mesh path when a script font's letters overlap (e.g. "KL" in Courgette), so names never come out broken.

The site uses Bricolage Grotesque and Inter. Fonts for 3D text are SIL Open Font License fonts from Fontsource (Fredoka, Archivo Black, Courgette, Space Mono) in `public/fonts/`. Pacifico was dropped: its overlapping letter strokes made the letters vanish when joined to a base.
