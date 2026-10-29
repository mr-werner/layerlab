// Every place the gallery searches live. Sketchfab and the Smithsonian work
// from the browser; stores that need a private key go through /api/search
// and only show up once their key is set in Vercel.
import { searchSketchfab } from "./sketchfab.js";
import { searchSmithsonian } from "./smithsonian.js";
import { searchPolyHaven } from "./polyhaven.js";

// `account`: whether people need their own account there to get the file.
export const SOURCE_INFO = {
  layerlab: { name: "LayerLab", account: false },
  sketchfab: { name: "Sketchfab", account: true },
  smithsonian: { name: "Smithsonian", note: "Museum scans, public domain", account: false },
  polyhaven: { name: "Poly Haven", note: "Free props and scans, public domain", account: false },
  thingiverse: { name: "Thingiverse", account: true },
  polypizza: { name: "Poly Pizza", note: "Free low-poly models", account: false },
  myminifactory: { name: "MyMiniFactory", account: true },
};

const BROWSER = ["sketchfab", "smithsonian", "polyhaven"];
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
  if (id === "polyhaven") return searchPolyHaven(q, { next: next || 0 });
  const res = await fetch(`/api/search?${new URLSearchParams({ source: id, q: q || "", page: String(next || 1) })}`, { signal });
  if (!res.ok) throw new Error(`${SOURCE_INFO[id]?.name || id} search failed`);
  return res.json();
}

// Sources someone turned off (because they have no account there, say).
// Kept in this browser only.
const OFF_KEY = "layerlab:sources-off";
export function sourcesOff() {
  try {
    return new Set(JSON.parse(localStorage.getItem(OFF_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
export function saveSourcesOff(set) {
  try {
    localStorage.setItem(OFF_KEY, JSON.stringify([...set]));
  } catch {
    /* private windows can block storage */
  }
}
