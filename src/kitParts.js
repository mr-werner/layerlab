// Small shape helpers shared by the maker kits. Everything is drawn flat in
// X/Y (sitting on z) unless a helper says otherwise.
import { makeObject as o } from "./objects.js";

export const SQ2 = Math.SQRT2;
export const r1 = (v) => Math.round(v * 10) / 10;

// Rough width of a line of 3D text, used to size tags and plates around it.
export const FONT_WIDTH = { Fredoka: 0.6, "Archivo Black": 0.74, Courgette: 0.6, "Space Mono": 0.62 };
export function textWidth(text, font, size) {
  const t = (text || "").trim() || "Text";
  let w = 0;
  for (const ch of t) w += ch === " " ? 0.35 : /[A-Z0-9]/.test(ch) ? 1.08 : /[ilj.,'!|]/.test(ch) ? 0.45 : 0.92;
  return w * size * (FONT_WIDTH[font] || 0.65);
}

export const FONT_CHOICES = [
  { value: "Fredoka", label: "Rounded" },
  { value: "Archivo Black", label: "Block" },
  { value: "Courgette", label: "Script" },
  { value: "Space Mono", label: "Mono" },
];

// ---- small shape helpers (all drawn flat in X/Y, sitting on z) ----

export function heart(size, z, h, extra = {}) {
  // A square turned 45° with two circles on its upper sides. `size` is the overall width.
  const s = size / 1.707;
  const c = s / (2 * SQ2);
  const cy = -c * 0.35; // nudges the heart so it sits centered
  return [
    o("box", { name: "Heart point", params: { w: s, d: s, h }, position: [0, cy, z], rotation: [0, 0, 45], ...extra }),
    o("cylinder", { name: "Heart left", params: { d: s, h }, position: [-c, cy + c, z], ...extra }),
    o("cylinder", { name: "Heart right", params: { d: s, h }, position: [c, cy + c, z], ...extra }),
  ];
}
export const heartTop = (size) => {
  const s = size / 1.707;
  const c = s / (2 * SQ2);
  return -c * 0.35 + c + s / 2;
};

export function starPoints(outer, inner = 0.45, points = 5) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 ? outer * inner : outer;
    pts.push([r1(r * Math.cos(a)), r1(r * Math.sin(a))]);
  }
  return pts;
}

export function star(size, z, h, extra = {}, round = 1.2) {
  return o("sketch", {
    name: "Star",
    params: { shapes: [{ kind: "poly", pts: starPoints(size / 2), radius: round }], op: "extrude", height: h },
    position: [0, 0, z],
    ...extra,
  });
}

export function treePoints(w, hgt) {
  // Three stacked tiers, drawn as one outline (right side, then mirrored).
  const right = [
    [0, hgt / 2],
    [w * 0.26, hgt * 0.2],
    [w * 0.14, hgt * 0.2],
    [w * 0.38, -hgt * 0.1],
    [w * 0.22, -hgt * 0.1],
    [w * 0.5, -hgt * 0.38],
    [w * 0.08, -hgt * 0.38],
    [w * 0.08, -hgt * 0.5],
  ];
  const left = right
    .slice(1)
    .reverse()
    .map(([x, y]) => [-x, y]);
  return [...right, ...left].map(([x, y]) => [r1(x), r1(y)]);
}

export function text(value, font, size, depth, position, extra = {}) {
  return o("text", { name: "Words", params: { text: value, font, size, depth }, position, ...extra });
}

// Stands a flat X/Y part up onto a face that looks toward -Y.
// Flat (x, y, z) becomes (x, faceY - z, baseZ + y).
export function standUp(part, faceY, baseZ) {
  const [x, y, z] = part.position;
  return { ...part, position: [x, r1(faceY - z), r1(baseZ + y)], rotation: [90, -(part.rotation?.[2] || 0), 0] };
}

// A hanging loop: a round tab with a hole through it.
export function loop(x, y, h, d = 12) {
  return [
    o("cylinder", { name: "Loop", params: { d, h }, position: [x, y, 0] }),
    o("cylinder", { name: "Loop hole", hole: true, params: { d: d * 0.42, h: h + 4 }, position: [x, y, -2] }),
  ];
}
