// Live models from Sketchfab, shown right on LayerLab. Sketchfab's public
// search API allows this (no key needed) and their 3D viewer is made to be
// embedded. We only list models the designer marked downloadable and tagged
// for 3D printing, and every card shows the model's own license.
const API = "https://api.sketchfab.com/v3/search";

// Sketchfab license names -> our license table (src/stores.js).
const LICENSE_MAP = [
  [/CC0|Public Domain/i, "cc0"],
  [/Non-?Commercial/i, "nc"],
  [/No-?Deriv/i, "nd"],
  [/Share-?Alike/i, "by-sa"],
  [/Attribution/i, "by"],
];
export function licenseId(label = "") {
  for (const [re, id] of LICENSE_MAP) if (re.test(label)) return id;
  return "store";
}

// LayerLab is for kids too: skip anything that reads as adult, on top of
// Sketchfab's own age-restricted flag.
export const ADULT = /\b(sexy|sex|nsfw|nude|nudity|naked|bikini|lingerie|hentai|waifu|boobs?|busty|erotic|porn|18\+|r18|underwear|topless|lewd|ecchi|gore|futa)\b/i;
function familyFriendly(r) {
  if (r.isAgeRestricted) return false;
  const text = [r.name, (r.tags || []).map((t) => t.name || t.slug).join(" "), (r.description || "").slice(0, 400)].join(" ");
  return !ADULT.test(text);
}

function pickThumb(images = [], want = 480) {
  const sorted = [...images].sort((a, b) => a.width - b.width);
  return (sorted.find((i) => i.width >= want) || sorted[sorted.length - 1])?.url;
}

function toItem(r) {
  return {
    id: `sf-${r.uid}`,
    uid: r.uid,
    source: "sketchfab",
    title: r.name,
    by: r.user?.displayName || r.user?.username || "Unknown designer",
    byUrl: r.user?.profileUrl,
    image: pickThumb(r.thumbnails?.images, 480),
    bigImage: pickThumb(r.thumbnails?.images, 1024),
    url: r.viewerUrl,
    embedUrl: r.embedUrl,
    likes: r.likeCount,
    licenseLabel: r.license?.label || "See the model page",
    license: licenseId(r.license?.label),
    faces: r.faceCount,
  };
}

// Returns { items, next } where next is a cursor URL for "show more".
export async function searchSketchfab(q, { next, signal, count = 24 } = {}) {
  const url =
    next ||
    `${API}?${new URLSearchParams({
      type: "models",
      q: q || "",
      tags: "3dprint",
      downloadable: "true",
      count: String(count),
      ...(q ? {} : { sort_by: "-likeCount" }),
    })}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Sketchfab search failed (${res.status})`);
  const data = await res.json();
  return { items: (data.results || []).filter(familyFriendly).map(toItem), next: data.next || null };
}

export const embedSrc = (item) =>
  `${item.embedUrl}?${new URLSearchParams({ autostart: "1", ui_theme: "dark", ui_infos: "0", ui_watermark_link: "0", ui_hint: "0", dnt: "1" })}`;
