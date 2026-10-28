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

export async function searchSource(id, q, { next, signal } = {}) {
  if (id === "sketchfab") return searchSketchfab(q, { next, signal });
  if (id === "smithsonian") return searchSmithsonian(q, { next: next || 0, signal });
  const res = await fetch(`/api/search?${new URLSearchParams({ source: id, q: q || "", page: String(next || 1) })}`, { signal });
  if (!res.ok) throw new Error(`${SOURCE_INFO[id]?.name || id} search failed`);
  return res.json();
}
