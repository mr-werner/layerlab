// Every place the gallery searches live. Sketchfab and the Smithsonian work
// from the browser; stores that need a private key go through /api/search
// and only show up once their key is set in Vercel.
import { searchSketchfab } from "./sketchfab.js";
import { searchSmithsonian } from "./smithsonian.js";

export const SOURCE_INFO = {
  layerlab: { name: "LayerLab" },
  sketchfab: { name: "Sketchfab" },
  smithsonian: { name: "Smithsonian", note: "Museum scans, public domain" },
  thingiverse: { name: "Thingiverse" },
  polypizza: { name: "Poly Pizza", note: "Free low-poly models" },
  myminifactory: { name: "MyMiniFactory" },
};

const BROWSER = ["sketchfab", "smithsonian"];
let list;
export function liveSources() {
  list ||= fetch("/api/search")
    .then((r) => (r.ok ? r.json() : {}))
    .then((d) => [...BROWSER, ...(Array.isArray(d.sources) ? d.sources : [])])
    .catch(() => BROWSER);
  return list;
}

// Free model files that can be downloaded straight into the builder.
const DIRECT = { "3d-api.si.edu": "the Smithsonian", "static.poly.pizza": "Poly Pizza" };
export function directSource(url) {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && /\.glb$/i.test(u.pathname) ? DIRECT[u.hostname] || null : null;
  } catch {
    return null;
  }
}

export async function searchSource(id, q, { next, signal, printOnly = true } = {}) {
  if (id === "sketchfab") return searchSketchfab(q, { next, signal, printOnly });
  if (id === "smithsonian") return searchSmithsonian(q, { next: next || 0, signal });
  const res = await fetch(`/api/search?${new URLSearchParams({ source: id, q: q || "", page: String(next || 1) })}`, { signal });
  if (!res.ok) throw new Error(`${SOURCE_INFO[id]?.name || id} search failed`);
  return res.json();
}
