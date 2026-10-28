// Smithsonian 3D (3d.si.edu): museum objects scanned in 3D, released as
// public domain (CC0). Their API needs no key and lets the browser download
// the models, so these open straight in the builder.
const API = "https://3d-api.si.edu/api/v1.0/content/file/search";
const PAGE = 24;

const clean = (t) =>
  t
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim();

async function files(q, type, rows, start, signal) {
  const res = await fetch(`${API}?${new URLSearchParams({ q, file_type: type, rows: String(rows), start: String(start) })}`, { signal });
  if (!res.ok) throw new Error(`Smithsonian search failed (${res.status})`);
  return (await res.json()).rows || [];
}

// `next` is the page number. The API lists files, not models, so this asks for
// pictures (4 per model) and 3D files and joins them by model.
export async function searchSmithsonian(q, { next = 0, signal } = {}) {
  const term = (q || "").trim() || "*";
  const [pics, models] = await Promise.all([
    files(term, "jpg", PAGE * 4, next * PAGE * 4, signal),
    files(term, "glb", PAGE * 12, next * PAGE * 12, signal),
  ]);
  const glb = {};
  const rank = { Medium: 3, Low: 2, High: 1 };
  for (const r of models) {
    const c = r.content;
    if (c.usage !== "Web3D" || !rank[c.quality]) continue;
    if (!glb[c.model_url] || rank[c.quality] > glb[c.model_url].rank) glb[c.model_url] = { url: c.uri, rank: rank[c.quality] };
  }
  const items = new Map();
  for (const r of pics) {
    const c = r.content;
    const it = items.get(c.model_url) || { title: clean(r.title), pics: {} };
    it.pics[c.quality] = c.uri;
    items.set(c.model_url, it);
  }
  const out = [...items].map(([id, it]) => ({
    id: `si-${id}`,
    uid: id,
    source: "smithsonian",
    title: it.title,
    by: "Smithsonian Institution",
    byUrl: "https://3d.si.edu/",
    image: it.pics.Medium || it.pics.Low || it.pics.Thumb || it.pics.High,
    url: `https://3d-api.si.edu/voyager/${id}`,
    embedUrl: `https://3d-api.si.edu/voyager/${id}`,
    licenseLabel: "CC0 Public Domain",
    license: "cc0",
    download: glb[id]?.url || null,
  }));
  return { items: out.filter((i) => i.image), next: pics.length === PAGE * 4 ? next + 1 : null };
}

export const isSmithsonianFile = (url) => {
  try {
    const u = new URL(url);
    return u.protocol === "https:" && u.hostname === "3d-api.si.edu" && /\.glb$/i.test(u.pathname);
  } catch {
    return false;
  }
};
