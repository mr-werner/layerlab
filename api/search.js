// Searches stores that need a private key, so the key stays on the server.
// Each one switches on when its env var is set in Vercel:
//   THINGIVERSE_TOKEN   (an app token from thingiverse.com/developers)
//   MYMINIFACTORY_KEY   (an API key from myminifactory.com/settings/developer)
//   POLY_PIZZA_KEY      (a free key from poly.pizza/settings/api)
//   GET /api/search                     -> { sources: ["thingiverse", ...] }
//   GET /api/search?source=..&q=..&page=1 -> { items, next }
import { ADULT, licenseId } from "../src/sketchfab.js";

const PER = 24;

const SOURCES = {
  thingiverse: {
    on: () => !!process.env.THINGIVERSE_TOKEN,
    async search(q, page) {
      const url = `https://api.thingiverse.com/search/${encodeURIComponent(q || "toy")}?${new URLSearchParams({
        type: "things",
        per_page: String(PER),
        page: String(page),
        sort: q ? "relevant" : "popular",
      })}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${process.env.THINGIVERSE_TOKEN}` } });
      if (!res.ok) throw new Error(`Thingiverse ${res.status}`);
      const data = await res.json();
      const hits = data.hits || (Array.isArray(data) ? data : []);
      return {
        items: hits.map((t) => ({
          id: `tv-${t.id}`,
          uid: String(t.id),
          source: "thingiverse",
          title: t.name,
          by: t.creator?.name || t.creator?.first_name || "Unknown designer",
          byUrl: t.creator?.public_url,
          image: t.preview_image || t.thumbnail,
          url: t.public_url || `https://www.thingiverse.com/thing:${t.id}`,
          licenseLabel: t.license || "See the model page",
          license: t.license ? licenseId(t.license) : "unknown",
        })),
        next: (data.total || 0) > page * PER ? page + 1 : null,
      };
    },
  },
  polypizza: {
    on: () => !!process.env.POLY_PIZZA_KEY,
    async search(q, page) {
      const url = `https://api.poly.pizza/v1.1/search/${encodeURIComponent(q || "animal")}?${new URLSearchParams({ Limit: String(PER), Page: String(page - 1) })}`;
      const res = await fetch(url, { headers: { "x-auth-token": process.env.POLY_PIZZA_KEY } });
      if (!res.ok) throw new Error(`Poly Pizza ${res.status}`);
      const data = await res.json();
      return {
        items: (data.results || []).map((t) => ({
          id: `pp-${t.ID}`,
          uid: String(t.ID),
          source: "polypizza",
          title: t.Title,
          by: t.Creator?.Username || "Unknown designer",
          byUrl: t.Creator?.Username ? `https://poly.pizza/u/${encodeURIComponent(t.Creator.Username)}` : undefined,
          image: t.Thumbnail,
          url: `https://poly.pizza/m/${t.ID}`,
          licenseLabel: t.Licence || "See the model page",
          license: /CC0/i.test(t.Licence || "") ? "cc0" : /CC-?BY/i.test(t.Licence || "") ? "by" : "unknown",
          download: /^https:\/\/static\.poly\.pizza\/.+\.glb$/i.test(t.Download || "") ? t.Download : null,
        })),
        next: (data.total || 0) > page * PER ? page + 1 : null,
      };
    },
  },
  myminifactory: {
    on: () => !!process.env.MYMINIFACTORY_KEY,
    async search(q, page) {
      const url = `https://www.myminifactory.com/api/v2/search?${new URLSearchParams({
        q: q || "",
        per_page: String(PER),
        page: String(page),
        key: process.env.MYMINIFACTORY_KEY,
      })}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`MyMiniFactory ${res.status}`);
      const data = await res.json();
      return {
        items: (data.items || []).map((t) => ({
          id: `mmf-${t.id}`,
          uid: String(t.id),
          source: "myminifactory",
          title: t.name,
          by: t.designer?.name || t.designer?.username || "Unknown designer",
          byUrl: t.designer?.profile_url,
          image: t.images?.[0]?.standard?.url || t.images?.[0]?.thumbnail?.url,
          url: t.url,
          licenseLabel: t.license || "See the model page",
          license: t.license ? licenseId(t.license) : "unknown",
        })),
        next: (data.total_count || 0) > page * PER ? page + 1 : null,
      };
    },
  },
};

export default async function handler(req, res) {
  const { source, q = "", page = "1" } = req.query;
  if (!source) {
    res.setHeader("Cache-Control", "public, max-age=300");
    return res.status(200).json({ sources: Object.keys(SOURCES).filter((s) => SOURCES[s].on()) });
  }
  const s = SOURCES[source];
  if (!s?.on()) return res.status(404).json({ error: "That store isn't set up." });
  try {
    const out = await s.search(String(q).slice(0, 80), Math.max(1, Number(page) || 1));
    out.items = out.items.filter((i) => i.image && !ADULT.test(i.title));
    res.setHeader("Cache-Control", "public, s-maxage=600, max-age=120");
    return res.status(200).json(out);
  } catch (e) {
    return res.status(502).json({ error: e.message });
  }
}
