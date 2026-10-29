// Poly Haven (polyhaven.com): a few hundred free models, all public domain
// (CC0). Their API needs no key and lets the browser download the files,
// so these open straight in the builder.
const API = "https://api.polyhaven.com";
const PAGE = 24;

let all;
const list = () =>
  (all ||= fetch(`${API}/assets?t=models`)
    .then((r) => {
      if (!r.ok) throw new Error(`Poly Haven search failed (${r.status})`);
      return r.json();
    })
    .then((d) => Object.entries(d).map(([id, a]) => ({ id, ...a })))
    .catch((e) => {
      all = null;
      throw e;
    }));

// `next` is the page number. The whole list is small, so it's searched here.
export async function searchPolyHaven(q, { next = 0 } = {}) {
  const words = (q || "").toLowerCase().split(/\s+/).filter(Boolean);
  const hay = (a) => [a.name, ...(a.tags || []), ...(a.categories || [])].join(" ").toLowerCase();
  const found = (await list()).filter((a) => words.every((w) => hay(a).includes(w)));
  found.sort((a, b) => (b.download_count || 0) - (a.download_count || 0));
  const items = found.slice(next * PAGE, (next + 1) * PAGE).map((a) => ({
    id: `ph-${a.id}`,
    uid: a.id,
    source: "polyhaven",
    title: a.name,
    by: Object.keys(a.authors || {}).join(", ") || "Poly Haven",
    byUrl: "https://polyhaven.com/",
    image: `https://cdn.polyhaven.com/asset_img/thumbs/${a.id}.png?width=384&height=384`,
    url: `https://polyhaven.com/a/${a.id}`,
    licenseLabel: "CC0 Public Domain",
    license: "cc0",
    download: `polyhaven:${a.id}`,
  }));
  return { items, next: found.length > (next + 1) * PAGE ? next + 1 : null };
}

// Downloads just the shape (the .gltf and its .bin, no textures) for the builder.
export async function downloadPolyHaven(id, onStatus = () => {}) {
  if (!/^[\w-]+$/.test(id)) throw new Error("That isn't a Poly Haven model.");
  onStatus("Downloading from Poly Haven…");
  const res = await fetch(`${API}/files/${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error("Poly Haven didn't send the file.");
  const files = await res.json();
  const g = files.gltf?.["1k"]?.gltf || Object.values(files.gltf || {})[0]?.gltf;
  if (!g) throw new Error("This model has no file we can load.");
  const ok = (u) => /^https:\/\/dl\.polyhaven\.org\//.test(u);
  if (!ok(g.url)) throw new Error("Unexpected download link.");
  const json = await (await fetch(g.url)).json();
  // Printing only needs the shape: drop the pictures painted on it.
  delete json.images;
  delete json.textures;
  delete json.samplers;
  for (const m of json.materials || []) {
    for (const k of Object.keys(m)) if (k !== "name") delete m[k];
  }
  const out = { [`${id}.gltf`]: new TextEncoder().encode(JSON.stringify(json)).buffer };
  for (const [path, f] of Object.entries(g.include || {})) {
    if (!/\.bin$/i.test(path) || !ok(f.url)) continue;
    const r = await fetch(f.url);
    if (!r.ok) throw new Error("The download didn't finish.");
    out[path] = await r.arrayBuffer();
  }
  return { gltfFiles: out };
}
