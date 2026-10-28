// Everything the gallery can show from LayerLab itself: figure looks, shop
// items and starting bases. Sketchfab results are mixed in on the page.
import { PRODUCTS, CATEGORIES } from "./catalog.js";
import { FIGURE_LOOKS, lookUrl } from "./figure.js";

const CAT = Object.fromEntries(CATEGORIES.map((c) => [c.id, c.name]));

export const OUR_ITEMS = [
  ...FIGURE_LOOKS.map((f) => ({
    id: `fig-${f.id}`,
    source: "layerlab",
    kind: "figure",
    title: f.name,
    by: "Figure builder",
    image: `/shots/fig-${f.id}.png`,
    href: lookUrl(f),
    tint: f.color,
    words: `figure character ${f.name} ${Object.values(f.values).join(" ")} kids`,
  })),
  ...PRODUCTS.map((p) => ({
    id: p.id,
    source: "layerlab",
    kind: p.category,
    title: p.name,
    by: CAT[p.category],
    image: `/shots/${p.id}.png`,
    href: `/make?p=${p.id}`,
    tint: p.color || "#f0742b",
    blurb: p.blurb,
    season: p.season,
    words: `${p.name} ${p.blurb} ${p.category} ${p.season} ${p.kit}`,
  })),
];

// Filter chips shared by the home page and the explore page. `q` is what
// Sketchfab gets searched for; `match` picks our own items.
export const TOPICS = [
  { id: "all", label: "Trending", q: "" },
  { id: "figures", label: "Characters", q: "character figure", match: (i) => i.kind === "figure" },
  { id: "seasonal", label: "Seasonal", q: "halloween", match: (i) => i.kind === "seasonal" },
  { id: "desk", label: "Desk", q: "desk organizer", match: (i) => /desk|sign|plant|pot/i.test(i.words || "") },
  { id: "toys", label: "Toys", q: "articulated toy", match: (i) => /robot|dice|game/i.test(i.words || "") },
  { id: "dragons", label: "Dragons", q: "dragon" },
  { id: "space", label: "Space", q: "rocket" },
  { id: "gifts", label: "Gifts", q: "keychain", match: (i) => i.kind === "personal" },
  { id: "minis", label: "Minis", q: "miniature" },
  { id: "home", label: "Home", q: "vase planter", match: (i) => /pot|plant/i.test(i.words || "") },
];

export function ourMatches(q, topic) {
  const words = (q || "").toLowerCase().split(/\s+/).filter(Boolean);
  return OUR_ITEMS.filter((i) => {
    if (topic?.match && !topic.match(i)) return false;
    if (topic && !topic.match && topic.id !== "all" && !words.length) return false;
    return words.every((w) => i.words.toLowerCase().includes(w) || i.title.toLowerCase().includes(w));
  });
}
