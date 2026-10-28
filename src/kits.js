// Maker kits: templates with easy options, like a character creator.
// Each kit turns a set of option values into a plain list of builder parts
// (the same parts the Studio uses), so any creation can be opened there later.
import { makeObject as o } from "./objects.js";

const SQ2 = Math.SQRT2;
const r1 = (v) => Math.round(v * 10) / 10;

// Rough width of a line of 3D text, used to size tags and plates around it.
const FONT_WIDTH = { Fredoka: 0.6, "Archivo Black": 0.74, Courgette: 0.6, "Space Mono": 0.62 };
export function textWidth(text, font, size) {
  const t = (text || "").trim() || "Text";
  let w = 0;
  for (const ch of t) w += ch === " " ? 0.35 : /[A-Z0-9]/.test(ch) ? 1.08 : /[ilj.,'!|]/.test(ch) ? 0.45 : 0.92;
  return w * size * (FONT_WIDTH[font] || 0.65);
}

export const FONT_CHOICES = [
  { value: "Fredoka", label: "Bubbly" },
  { value: "Archivo Black", label: "Bold" },
  { value: "Courgette", label: "Fancy" },
  { value: "Space Mono", label: "Robot" },
];

// ---- small shape helpers (all drawn flat in X/Y, sitting on z) ----

function heart(size, z, h, extra = {}) {
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
const heartTop = (size) => {
  const s = size / 1.707;
  const c = s / (2 * SQ2);
  return -c * 0.35 + c + s / 2;
};

function starPoints(outer, inner = 0.45, points = 5) {
  const pts = [];
  for (let i = 0; i < points * 2; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 ? outer * inner : outer;
    pts.push([r1(r * Math.cos(a)), r1(r * Math.sin(a))]);
  }
  return pts;
}

function star(size, z, h, extra = {}, round = 1.2) {
  return o("sketch", {
    name: "Star",
    params: { shapes: [{ kind: "poly", pts: starPoints(size / 2), radius: round }], op: "extrude", height: h },
    position: [0, 0, z],
    ...extra,
  });
}

function treePoints(w, hgt) {
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

function text(value, font, size, depth, position, extra = {}) {
  return o("text", { name: "Words", params: { text: value, font, size, depth }, position, ...extra });
}

// Stands a flat X/Y part up onto a face that looks toward -Y.
// Flat (x, y, z) becomes (x, faceY - z, baseZ + y).
function standUp(part, faceY, baseZ) {
  const [x, y, z] = part.position;
  return { ...part, position: [x, r1(faceY - z), r1(baseZ + y)], rotation: [90, -(part.rotation?.[2] || 0), 0] };
}

// A hanging loop: a round tab with a hole through it.
function loop(x, y, h, d = 12) {
  return [
    o("cylinder", { name: "Loop", params: { d, h }, position: [x, y, 0] }),
    o("cylinder", { name: "Loop hole", hole: true, params: { d: d * 0.42, h: h + 4 }, position: [x, y, -2] }),
  ];
}

// ---------------------------------------------------------------------------

export const KITS = [
  {
    id: "keychain",
    name: "Keychain",
    tagline: "Your name, your shape.",
    category: "personal",
    options: [
      { id: "text", label: "Name", group: "Words", type: "text", max: 12, default: "ALEX" },
      { id: "font", label: "Letter style", group: "Words", type: "choice", choices: FONT_CHOICES, default: "Fredoka" },
      { id: "letters", label: "Letter size", group: "Words", type: "slider", min: 7, max: 16, step: 0.5, unit: "mm", default: 11 },
      {
        id: "shape",
        label: "Shape",
        group: "Shape",
        type: "choice",
        choices: [
          { value: "tag", label: "Tag" },
          { value: "circle", label: "Circle" },
          { value: "heart", label: "Heart" },
          { value: "star", label: "Star" },
          { value: "bone", label: "Bone" },
        ],
        default: "tag",
      },
      { id: "size", label: "Size", group: "Shape", type: "slider", min: 34, max: 70, step: 1, unit: "mm", default: 46, hint: "For circle, heart, star and bone." },
      { id: "thick", label: "Thickness", group: "Shape", type: "slider", min: 2.4, max: 6, step: 0.2, unit: "mm", default: 3.2 },
      { id: "raise", label: "Letter height", group: "Extras", type: "slider", min: 0.8, max: 3, step: 0.2, unit: "mm", default: 1.6 },
      { id: "soft", label: "Soft edges", group: "Extras", type: "toggle", default: true },
      { id: "ring", label: "Key ring", group: "Extras", type: "toggle", default: true },
    ],
    build(v) {
      const t = v.thick;
      const soft = v.soft ? { edge: r1(Math.min(1, t * 0.3)), edgeStyle: "round" } : {};
      const tw = textWidth(v.text, v.font, v.letters);
      const parts = [];
      let textX = 0;
      let textY = 0;
      if (v.shape === "tag") {
        const ring = v.ring ? 10 : 0;
        const w = r1(Math.max(34, tw + 10 + ring));
        const d = r1(v.letters * 1.6 + 7);
        parts.push(o("box", { name: "Tag", params: { w, d, h: t, radius: Math.min(6, d / 2.5), ...soft } }));
        if (v.ring) parts.push(o("cylinder", { name: "Ring hole", hole: true, params: { d: 5, h: t + 6 }, position: [r1(-w / 2 + 6), 0, -2] }));
        textX = r1(ring / 2);
      } else if (v.shape === "bone") {
        const w = Math.max(v.size, tw + 14);
        const d = v.size * 0.36;
        const knob = d * 0.85;
        parts.push(o("box", { name: "Bone", params: { w: r1(w), d: r1(d), h: t, radius: 0, ...soft } }));
        for (const sx of [-1, 1]) for (const sy of [-1, 1])
          parts.push(o("cylinder", { name: "Bone end", params: { d: r1(knob), h: t, ...soft }, position: [r1((sx * w) / 2), r1(sy * d * 0.42), 0] }));
        if (v.ring) parts.push(...loop(r1(-w / 2 - knob * 0.55), 0, t));
      } else {
        const s = v.size;
        if (v.shape === "circle") parts.push(o("cylinder", { name: "Disc", params: { d: s, h: t, ...soft } }));
        if (v.shape === "heart") {
          parts.push(...heart(s, 0, t));
          textY = r1(s * 0.06);
        }
        if (v.shape === "star") {
          parts.push(star(s, 0, t));
          textY = r1(-s * 0.04);
        }
        const top = v.shape === "heart" ? heartTop(s) : v.shape === "star" ? s / 2 - 2 : s / 2;
        if (v.ring) parts.push(...loop(0, r1(top + 2), t, 11));
      }
      parts.push(text(v.text, v.font, v.letters, v.raise, [textX, textY, t - 0.2]));
      return parts;
    },
  },

  {
    id: "nameplate",
    name: "Name sign",
    tagline: "For a desk, a door or a bedroom.",
    category: "personal",
    options: [
      { id: "text", label: "Words", group: "Words", type: "text", max: 16, default: "Maya's Room" },
      { id: "font", label: "Letter style", group: "Words", type: "choice", choices: FONT_CHOICES, default: "Courgette" },
      { id: "letters", label: "Letter size", group: "Words", type: "slider", min: 10, max: 30, step: 1, unit: "mm", default: 18 },
      {
        id: "style",
        label: "Kind of sign",
        group: "Shape",
        type: "choice",
        choices: [
          { value: "desk", label: "Desk stand" },
          { value: "door", label: "Door hanger" },
          { value: "flat", label: "Flat plaque" },
        ],
        default: "door",
      },
      { id: "thick", label: "Thickness", group: "Shape", type: "slider", min: 3, max: 8, step: 0.5, unit: "mm", default: 4 },
      { id: "round", label: "Corner roundness", group: "Shape", type: "slider", min: 0, max: 20, step: 1, unit: "mm", default: 8 },
      {
        id: "decor",
        label: "End decorations",
        group: "Extras",
        type: "choice",
        choices: [
          { value: "none", label: "None" },
          { value: "stars", label: "Stars" },
          { value: "hearts", label: "Hearts" },
          { value: "dots", label: "Dots" },
        ],
        default: "stars",
      },
      { id: "border", label: "Raised border", group: "Extras", type: "toggle", default: true },
    ],
    build(v) {
      const t = v.thick;
      const decor = v.decor !== "none";
      const deco = v.letters * 1.1;
      const w = r1(Math.max(70, textWidth(v.text, v.font, v.letters) + 22 + (decor ? deco * 2 + 8 : 0)));
      const h = r1(v.letters * 2 + 16);
      const radius = Math.min(v.round, h / 2 - 1);
      // Everything on the face, drawn flat with the face on top at z = t.
      const face = [text(v.text, v.font, v.letters, 1.6, [0, 0, t - 0.2])];
      if (decor) {
        for (const sx of [-1, 1]) {
          const x = r1(sx * (w / 2 - 6 - deco / 2));
          if (v.decor === "stars") face.push({ ...star(deco, 0, 1.6), position: [x, 0, t - 0.2] });
          if (v.decor === "hearts") face.push(...heart(deco, t - 0.2, 1.6).map((p) => ({ ...p, position: [p.position[0] + x, p.position[1], p.position[2]] })));
          if (v.decor === "dots") face.push(o("cylinder", { name: "Dot", params: { d: r1(deco * 0.6), h: 1.6 }, position: [x, 0, t - 0.2] }));
        }
      }
      if (v.border) {
        const b = 2.4;
        const z = t - 0.2;
        face.push(
          o("box", { name: "Border top", params: { w: r1(w - 2 * radius - 4), d: b, h: 1.6 }, position: [0, r1(h / 2 - 3), z] }),
          o("box", { name: "Border bottom", params: { w: r1(w - 2 * radius - 4), d: b, h: 1.6 }, position: [0, r1(-h / 2 + 3), z] })
        );
      }
      if (v.style === "desk") {
        const depth = 40;
        const faceY = 4;
        const plate = o("box", { name: "Face", params: { w, d: t, h, radius: 0 }, position: [0, r1(faceY + t / 2), 4] });
        const base = o("box", { name: "Base", params: { w, d: depth, h: 5, radius: 3 }, position: [0, 10, 0] });
        // Lay the face parts onto the standing plate (its front is at y = faceY).
        const stood = face.map((p) => standUp({ ...p, position: [p.position[0], p.position[1], p.position[2] - t] }, faceY, 4 + h / 2));
        return [base, plate, ...stood];
      }
      const parts = [o("box", { name: "Sign", params: { w, d: h, h: t, radius } }), ...face];
      if (v.style === "door") {
        // A round hole near the top so it hangs on a door hook or a ribbon.
        parts.push(...loop(0, r1(h / 2 + 5), t, 14));
      }
      return parts;
    },
  },

  {
    id: "ornament",
    name: "Ornament",
    tagline: "Hang it on a tree, a window or a backpack.",
    category: "seasonal",
    options: [
      {
        id: "shape",
        label: "Shape",
        group: "Shape",
        type: "choice",
        choices: [
          { value: "ball", label: "Round" },
          { value: "star", label: "Star" },
          { value: "tree", label: "Tree" },
          { value: "snowflake", label: "Snowflake" },
          { value: "heart", label: "Heart" },
        ],
        default: "star",
      },
      { id: "size", label: "Size", group: "Shape", type: "slider", min: 45, max: 100, step: 1, unit: "mm", default: 70 },
      { id: "thick", label: "Thickness", group: "Shape", type: "slider", min: 2.4, max: 6, step: 0.2, unit: "mm", default: 3.6 },
      { id: "text", label: "Words (optional)", group: "Words", type: "text", max: 10, default: "2026" },
      { id: "font", label: "Letter style", group: "Words", type: "choice", choices: FONT_CHOICES, default: "Fredoka" },
      { id: "letters", label: "Letter size", group: "Words", type: "slider", min: 6, max: 16, step: 0.5, unit: "mm", default: 10 },
      { id: "rim", label: "Raised rim", group: "Extras", type: "toggle", default: true, hint: "Round shape only." },
      { id: "loop", label: "Hanging loop", group: "Extras", type: "toggle", default: true },
    ],
    build(v) {
      const s = v.size;
      const t = v.thick;
      const parts = [];
      let top = s / 2;
      let ty = 0;
      if (v.shape === "ball") {
        parts.push(o("cylinder", { name: "Disc", params: { d: s, h: t } }));
        if (v.rim) parts.push(o("tube", { name: "Rim", params: { d: s, id: r1(s - 5), h: t + 1.4 } }));
        // The little cap a glass ornament has.
        parts.push(o("box", { name: "Cap", params: { w: r1(s * 0.22), d: 6, h: t, radius: 1 }, position: [0, r1(s / 2 + 1), 0] }));
        top = s / 2 + 4;
      } else if (v.shape === "star") {
        parts.push(star(s, 0, t, {}, 1.6));
        top = s / 2 - 2;
        ty = -s * 0.04;
      } else if (v.shape === "tree") {
        parts.push(o("sketch", { name: "Tree", params: { shapes: [{ kind: "poly", pts: treePoints(s * 0.85, s), radius: 1 }], op: "extrude", height: t } }));
        parts.push(o("box", { name: "Trunk", params: { w: r1(s * 0.18), d: r1(s * 0.14), h: t, radius: 1 }, position: [0, r1(-s / 2 - s * 0.05), 0] }));
        top = s / 2 - 3;
        ty = -s * 0.2;
      } else if (v.shape === "snowflake") {
        const arm = Math.max(4, s * 0.08);
        for (const a of [0, 60, 120])
          parts.push(o("box", { name: "Arm", params: { w: s, d: r1(arm), h: t, radius: r1(arm / 2 - 0.1) }, rotation: [0, 0, a] }));
        for (let i = 0; i < 6; i++) {
          const a = (i * 60 * Math.PI) / 180;
          const L = s * 0.2;
          for (const turn of [-50, 50]) {
            const b = a + (turn * Math.PI) / 180;
            const cx = s * 0.28 * Math.cos(a) + (L / 2) * Math.cos(b);
            const cy = s * 0.28 * Math.sin(a) + (L / 2) * Math.sin(b);
            parts.push(o("box", { name: "Branch", params: { w: r1(L), d: r1(arm * 0.8), h: t, radius: r1(arm * 0.4 - 0.1) }, position: [r1(cx), r1(cy), 0], rotation: [0, 0, r1(i * 60 + turn)] }));
          }
        }
        parts.push(o("polygon", { name: "Center", params: { sides: 6, d: r1(s * 0.3), h: t } }));
        top = s / 2;
      } else if (v.shape === "heart") {
        parts.push(...heart(s, 0, t));
        top = heartTop(s);
        ty = s * 0.06;
      }
      if ((v.text || "").trim()) parts.push(text(v.text, v.font, v.letters, 1.4, [0, r1(ty), t - 0.2]));
      if (v.loop) parts.push(...loop(0, r1(top + 3), t, 11));
      return parts;
    },
  },

  {
    id: "pumpkin",
    name: "Pumpkin",
    tagline: "Pick a face. Make it plump or tall.",
    category: "seasonal",
    options: [
      { id: "size", label: "Size", group: "Shape", type: "slider", min: 50, max: 120, step: 1, unit: "mm", default: 80 },
      { id: "ribs", label: "Bumps", group: "Shape", type: "slider", min: 6, max: 12, step: 1, unit: "count", default: 8 },
      { id: "plump", label: "Plumpness", group: "Shape", type: "slider", min: 50, max: 75, step: 1, unit: "%", default: 62 },
      {
        id: "face",
        label: "Face",
        group: "Face",
        type: "choice",
        choices: [
          { value: "spooky", label: "Spooky" },
          { value: "happy", label: "Happy" },
          { value: "surprised", label: "Surprised" },
          { value: "none", label: "No face" },
        ],
        default: "spooky",
      },
      { id: "stem", label: "Stem height", group: "Extras", type: "slider", min: 4, max: 24, step: 1, unit: "mm", default: 12 },
      { id: "leaf", label: "Leaf", group: "Extras", type: "toggle", default: true },
    ],
    build(v) {
      const S = v.size;
      const D = r1(S * (v.plump / 100));
      const rr = S / 2 - D / 2;
      const cut = r1(D * 0.08);
      const parts = [o("sphere", { name: "Middle", params: { d: D }, position: [0, 0, -cut] })];
      for (let i = 0; i < v.ribs; i++) {
        const a = -Math.PI / 2 + (i * 2 * Math.PI) / v.ribs;
        parts.push(o("sphere", { name: "Bump", params: { d: D }, position: [r1(rr * Math.cos(a)), r1(rr * Math.sin(a)), -cut] }));
      }
      // Flat bottom so it stands up and prints well.
      parts.push(o("box", { name: "Flat bottom", hole: true, params: { w: S + 20, d: S + 20, h: 10 }, position: [0, 0, -10] }));
      const topZ = D - cut;
      parts.push(o("polygon", { name: "Stem", params: { sides: 6, d: r1(S * 0.12), h: v.stem + 4 }, position: [0, 0, r1(topZ - 4)] }));
      if (v.leaf) {
        parts.push(o("sphere", { name: "Leaf", params: { d: r1(S * 0.16) }, position: [r1(S * 0.09), 0, r1(topZ - S * 0.06)] }));
      }
      if (v.face !== "none") {
        const f = S * 0.5; // face width
        const midZ = (D - cut) * 0.48;
        const shapes = [];
        const eyeY = f * 0.18;
        if (v.face === "spooky") {
          for (const sx of [-1, 1])
            shapes.push({ kind: "poly", pts: [[sx * f * 0.1, eyeY - f * 0.1], [sx * f * 0.34, eyeY - f * 0.1], [sx * f * 0.22, eyeY + f * 0.14]].map((p) => p.map(r1)) });
          shapes.push({ kind: "poly", pts: [[-f * 0.06, -f * 0.02], [f * 0.06, -f * 0.02], [0, f * 0.1]].map((p) => p.map(r1)) });
          const m = [];
          const n = 4;
          for (let i = 0; i <= n * 2; i++) m.push([-f * 0.38 + (i * f * 0.76) / (n * 2), -f * 0.14 - (i % 2 ? f * 0.06 : 0)]);
          for (let i = n * 2; i >= 0; i--) m.push([-f * 0.38 + (i * f * 0.76) / (n * 2), -f * 0.26 - (i % 2 ? 0 : f * 0.06) + (i === 0 || i === n * 2 ? f * 0.08 : 0)]);
          shapes.push({ kind: "poly", pts: m.map((p) => p.map(r1)) });
        } else {
          for (const sx of [-1, 1]) shapes.push({ kind: "circle", c: [r1(sx * f * 0.2), r1(eyeY)], r: r1(f * 0.09) });
          if (v.face === "happy") {
            const m = [];
            for (let i = 0; i <= 10; i++) {
              const a = Math.PI + (i * Math.PI) / 10;
              m.push([f * 0.34 * Math.cos(a), -f * 0.08 + f * 0.24 * Math.sin(a)]);
            }
            for (let i = 10; i >= 0; i--) {
              const a = Math.PI + (i * Math.PI) / 10;
              m.push([f * 0.3 * Math.cos(a), -f * 0.08 + f * 0.1 * Math.sin(a)]);
            }
            shapes.push({ kind: "poly", pts: m.map((p) => p.map(r1)) });
          } else {
            shapes.push({ kind: "circle", c: [0, r1(-f * 0.2)], r: r1(f * 0.11) });
          }
        }
        const front = -(rr + D / 2);
        const depth = S * 0.13;
        parts.push(
          o("sketch", {
            name: "Face",
            hole: true,
            params: { shapes, op: "extrude", height: r1(depth + 20) },
            position: [0, r1(front + depth), r1(midZ)],
            rotation: [90, 0, 0],
          })
        );
      }
      return parts;
    },
  },

  {
    id: "snowman",
    name: "Snow buddy",
    tagline: "Hats, scarves and carrot noses.",
    category: "seasonal",
    options: [
      { id: "size", label: "Height", group: "Body", type: "slider", min: 60, max: 150, step: 1, unit: "mm", default: 100 },
      { id: "chub", label: "Chubbiness", group: "Body", type: "slider", min: 80, max: 125, step: 1, unit: "%", default: 100 },
      { id: "buttons", label: "Buttons", group: "Body", type: "slider", min: 0, max: 4, step: 1, unit: "count", default: 3 },
      {
        id: "hat",
        label: "Hat",
        group: "Outfit",
        type: "choice",
        choices: [
          { value: "top", label: "Top hat" },
          { value: "beanie", label: "Beanie" },
          { value: "none", label: "No hat" },
        ],
        default: "top",
      },
      { id: "scarf", label: "Scarf", group: "Outfit", type: "toggle", default: true },
      { id: "nose", label: "Nose length", group: "Face", type: "slider", min: 0, max: 18, step: 1, unit: "mm", default: 9 },
      { id: "arms", label: "Stick arms", group: "Extras", type: "toggle", default: true },
    ],
    build(v) {
      const k = v.chub / 100;
      const D1 = r1(v.size * 0.42 * k);
      const D2 = r1(D1 * 0.76);
      const D3 = r1(D1 * 0.56);
      const cut = r1(D1 * 0.1);
      const z1 = D1 / 2 - cut;
      const z2 = z1 + ((D1 + D2) / 2) * 0.78;
      const z3 = z2 + ((D2 + D3) / 2) * 0.8;
      const ball = (name, d, cz) => o("sphere", { name, params: { d }, position: [0, 0, r1(cz - d / 2)] });
      const parts = [
        ball("Bottom", D1, z1),
        ball("Middle", D2, z2),
        ball("Head", D3, z3),
        o("box", { name: "Flat bottom", hole: true, params: { w: D1 + 20, d: D1 + 20, h: 10 }, position: [0, 0, -10] }),
      ];
      // Surface of a sphere (center cz, diameter d) seen from the front at (x, z).
      const frontY = (d, cz, x, z) => -Math.sqrt(Math.max(0, (d / 2) ** 2 - x * x - (z - cz) ** 2));
      for (const sx of [-1, 1]) {
        const x = D3 * 0.17 * sx;
        const z = z3 + D3 * 0.12;
        parts.push(o("cylinder", { name: "Eye", hole: true, params: { d: r1(D3 * 0.11), h: 8 }, position: [r1(x), r1(frontY(D3, z3, x, z) + 1.6), r1(z)], rotation: [90, 0, 0] }));
      }
      if (v.nose > 0)
        parts.push(o("cone", { name: "Nose", params: { d1: r1(D3 * 0.16), d2: 1, h: v.nose + 3 }, position: [0, r1(-D3 / 2 + 3), r1(z3 - D3 * 0.02)], rotation: [90, 0, 0] }));
      for (let i = 0; i < v.buttons; i++) {
        const z = z2 + D2 * 0.28 - i * D2 * 0.2;
        const bd = r1(D2 * 0.11);
        parts.push(o("sphere", { name: "Button", params: { d: bd }, position: [0, r1(frontY(D2, z2, 0, z) + bd * 0.25), r1(z - bd / 2)] }));
      }
      if (v.hat === "top") {
        const zb = z3 + D3 * 0.34;
        parts.push(o("cylinder", { name: "Brim", params: { d: r1(D3 * 1.05), h: 2.4 }, position: [0, 0, r1(zb)] }));
        parts.push(o("cylinder", { name: "Crown", params: { d: r1(D3 * 0.68), h: r1(D3 * 0.55) }, position: [0, 0, r1(zb)] }));
      } else if (v.hat === "beanie") {
        const zb = z3 + D3 * 0.18;
        const ch = D3 * 0.48;
        parts.push(o("cone", { name: "Beanie", params: { d1: r1(D3 * 0.98), d2: r1(D3 * 0.36), h: r1(ch) }, position: [0, 0, r1(zb)] }));
        parts.push(o("tube", { name: "Beanie cuff", params: { d: r1(D3 * 1.02), id: r1(D3 * 0.8), h: r1(D3 * 0.14) }, position: [0, 0, r1(zb)] }));
        parts.push(o("sphere", { name: "Pompom", params: { d: r1(D3 * 0.32) }, position: [0, 0, r1(zb + ch - D3 * 0.08)] }));
      }
      if (v.scarf) {
        const zs = z2 + D2 / 2 - D2 * 0.12;
        parts.push(o("tube", { name: "Scarf", params: { d: r1(D3 * 1.0), id: r1(D3 * 0.6), h: r1(D3 * 0.2) }, position: [0, 0, r1(zs)] }));
        parts.push(o("box", { name: "Scarf end", params: { w: r1(D3 * 0.2), d: 4, h: r1(D3 * 0.42) }, position: [r1(D3 * 0.22), r1(-D3 * 0.42), r1(zs - D3 * 0.28)], rotation: [0, -8, 0] }));
      }
      if (v.arms) {
        for (const sx of [-1, 1])
          parts.push(o("cylinder", { name: "Arm", params: { d: 3.2, h: r1(D2 * 0.75) }, position: [r1(sx * D2 * 0.36), 0, r1(z2 + D2 * 0.05)], rotation: [0, sx * 58, 0] }));
      }
      return parts;
    },
  },

  {
    id: "robot",
    name: "Robot pal",
    tagline: "Mix and match heads, eyes and feet.",
    category: "novelty",
    options: [
      {
        id: "head",
        label: "Head",
        group: "Head",
        type: "choice",
        choices: [
          { value: "box", label: "Boxy" },
          { value: "can", label: "Can" },
          { value: "bubble", label: "Bubble" },
        ],
        default: "box",
      },
      {
        id: "eyes",
        label: "Eyes",
        group: "Head",
        type: "choice",
        choices: [
          { value: "round", label: "Round" },
          { value: "square", label: "Square" },
          { value: "visor", label: "Visor" },
          { value: "cyclops", label: "One eye" },
        ],
        default: "round",
      },
      {
        id: "antenna",
        label: "Antenna",
        group: "Head",
        type: "choice",
        choices: [
          { value: "one", label: "One" },
          { value: "two", label: "Two" },
          { value: "none", label: "None" },
        ],
        default: "one",
      },
      { id: "height", label: "Body height", group: "Body", type: "slider", min: 24, max: 60, step: 1, unit: "mm", default: 36 },
      { id: "width", label: "Body width", group: "Body", type: "slider", min: 28, max: 60, step: 1, unit: "mm", default: 40 },
      {
        id: "badge",
        label: "Chest badge",
        group: "Body",
        type: "choice",
        choices: [
          { value: "heart", label: "Heart" },
          { value: "star", label: "Star" },
          { value: "dial", label: "Dial" },
          { value: "none", label: "None" },
        ],
        default: "heart",
      },
      {
        id: "feet",
        label: "Feet",
        group: "Extras",
        type: "choice",
        choices: [
          { value: "legs", label: "Legs" },
          { value: "wheels", label: "Wheels" },
        ],
        default: "legs",
      },
      { id: "arms", label: "Arms", group: "Extras", type: "toggle", default: true },
    ],
    build(v) {
      const bw = v.width;
      const bd = r1(bw * 0.7);
      const bh = v.height;
      const legH = 12;
      const parts = [];
      if (v.feet === "legs") {
        for (const sx of [-1, 1]) {
          parts.push(o("box", { name: "Leg", params: { w: r1(bw * 0.24), d: r1(bd * 0.6), h: legH + 2 }, position: [r1(sx * bw * 0.24), 0, 0] }));
          parts.push(o("box", { name: "Foot", params: { w: r1(bw * 0.3), d: r1(bd * 0.9), h: 4, radius: 2 }, position: [r1(sx * bw * 0.24), r1(-bd * 0.1), 0] }));
        }
      } else {
        const wd = legH * 1.6;
        for (const sx of [-1, 1])
          parts.push(o("cylinder", { name: "Wheel", params: { d: r1(wd), h: 6 }, position: [r1(sx * (bw / 2 - 6)), 0, r1(wd / 2)], rotation: [0, 90, 0] }));
        parts.push(o("box", { name: "Axle box", params: { w: r1(bw * 0.7), d: r1(bd * 0.5), h: r1(legH + 2) }, position: [0, 0, 2] }));
      }
      const bz = legH;
      parts.push(o("box", { name: "Body", params: { w: bw, d: bd, h: bh, radius: 4, edge: 1.2, edgeStyle: "round" }, position: [0, 0, bz] }));
      // Chest badge, drawn flat then stood on the front of the body.
      const badgeZ = bz + bh * 0.5;
      const bs = Math.min(bw, bh) * 0.38;
      const front = -bd / 2;
      let badge = [];
      if (v.badge === "heart") badge = heart(bs, 0, 1.6);
      if (v.badge === "star") badge = [star(bs * 1.2, 0, 1.6)];
      if (v.badge === "dial")
        badge = [
          o("tube", { name: "Dial", params: { d: r1(bs), id: r1(bs * 0.6), h: 1.6 } }),
          o("box", { name: "Dial needle", params: { w: r1(bs * 0.45), d: 1.6, h: 1.6 }, position: [r1(bs * 0.12), r1(bs * 0.1), 0], rotation: [0, 0, 40] }),
        ];
      parts.push(...badge.map((p) => standUp({ ...p, position: [p.position[0], p.position[1], p.position[2] - 0.2] }, front, badgeZ)));
      if (v.arms) {
        for (const sx of [-1, 1]) {
          parts.push(o("box", { name: "Arm", params: { w: 7, d: 8, h: r1(bh * 0.7), radius: 3 }, position: [r1(sx * (bw / 2 + 3)), 0, r1(bz + bh * 0.18)] }));
          parts.push(o("sphere", { name: "Shoulder", params: { d: 10 }, position: [r1(sx * (bw / 2 + 3)), 0, r1(bz + bh * 0.88 - 10)] }));
        }
      }
      // Head.
      const hz = bz + bh - 1;
      const hw = r1(bw * 0.8);
      let hh = r1(hw * 0.8);
      let headFront = -hw * 0.35;
      if (v.head === "box") {
        parts.push(o("box", { name: "Head", params: { w: hw, d: r1(hw * 0.7), h: hh, radius: 3, edge: 1, edgeStyle: "round" }, position: [0, 0, hz] }));
        headFront = -hw * 0.35;
      } else if (v.head === "can") {
        parts.push(o("cylinder", { name: "Head", params: { d: hw, h: hh, edge: 1, edgeStyle: "round" }, position: [0, 0, hz] }));
        headFront = -hw / 2 + 0.6;
      } else {
        hh = hw;
        parts.push(o("sphere", { name: "Head", params: { d: hw }, position: [0, 0, r1(hz - 2)] }));
        parts.push(o("cylinder", { name: "Neck", params: { d: r1(hw * 0.5), h: 6 }, position: [0, 0, r1(hz - 2)] }));
        headFront = -hw / 2 + 1.4;
      }
      const eyeZ = hz + hh * 0.55;
      const eyes = [];
      if (v.eyes === "round") for (const sx of [-1, 1]) eyes.push(o("cylinder", { name: "Eye", params: { d: r1(hw * 0.22), h: 1.8 }, position: [r1(sx * hw * 0.2), 0, 0] }));
      if (v.eyes === "square") for (const sx of [-1, 1]) eyes.push(o("box", { name: "Eye", params: { w: r1(hw * 0.2), d: r1(hw * 0.2), h: 1.8, radius: 1 }, position: [r1(sx * hw * 0.2), 0, 0] }));
      if (v.eyes === "visor") eyes.push(o("box", { name: "Visor", params: { w: r1(hw * 0.7), d: r1(hw * 0.18), h: 1.8, radius: r1(hw * 0.09 - 0.1) } }));
      if (v.eyes === "cyclops") eyes.push(o("cylinder", { name: "Eye", params: { d: r1(hw * 0.32), h: 1.8 } }), o("cylinder", { name: "Pupil", params: { d: r1(hw * 0.12), h: 2.8 } }));
      eyes.push(o("box", { name: "Mouth", params: { w: r1(hw * 0.36), d: 2, h: 1.2, radius: 0.9 }, position: [0, r1(-hh * 0.28), 0] }));
      parts.push(...eyes.map((p) => standUp({ ...p, position: [p.position[0], p.position[1], -0.4] }, r1(headFront), eyeZ)));
      if (v.antenna !== "none") {
        const top = v.head === "bubble" ? hz - 2 + hw - 1 : hz + hh - 1;
        const xs = v.antenna === "two" ? [-hw * 0.25, hw * 0.25] : [0];
        for (const x of xs) {
          parts.push(o("cylinder", { name: "Antenna", params: { d: 2.4, h: 12 }, position: [r1(x), 0, r1(top)] }));
          parts.push(o("sphere", { name: "Antenna ball", params: { d: 6 }, position: [r1(x), 0, r1(top + 10)] }));
        }
      }
      return parts;
    },
  },

  {
    id: "dice",
    name: "Game dice",
    tagline: "Big, small, sharp or squishy-round.",
    category: "novelty",
    options: [
      { id: "size", label: "Size", group: "Shape", type: "slider", min: 12, max: 30, step: 1, unit: "mm", default: 18 },
      { id: "round", label: "Roundness", group: "Shape", type: "slider", min: 0, max: 30, step: 1, unit: "%", default: 14 },
      { id: "count", label: "How many", group: "Shape", type: "slider", min: 1, max: 4, step: 1, unit: "count", default: 2 },
      { id: "pip", label: "Dot size", group: "Dots", type: "slider", min: 12, max: 22, step: 1, unit: "%", default: 17 },
    ],
    build(v) {
      const s = v.size;
      const pd = r1(s * (v.pip / 100));
      const edge = r1(Math.max(0, Math.min(s * (v.round / 100), s / 2 - 0.6)));
      const k = s * 0.26;
      const patterns = {
        1: [[0, 0]],
        2: [[-1, -1], [1, 1]],
        3: [[-1, -1], [0, 0], [1, 1]],
        4: [[-1, -1], [1, -1], [-1, 1], [1, 1]],
        5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]],
        6: [[-1, -1], [-1, 0], [-1, 1], [1, -1], [1, 0], [1, 1]],
      };
      // Each face: where a dot at (u, w) on it sits, and which way to turn the dot so it cuts inward.
      const depth = r1(Math.max(0.8, pd * 0.35));
      const h = depth + 2;
      const faces = {
        1: (u, w) => ({ p: [u, w, s - depth], r: [0, 0, 0] }),
        6: (u, w) => ({ p: [u, w, depth - h], r: [0, 0, 0] }),
        2: (u, w) => ({ p: [u, -s / 2 + depth, s / 2 + w], r: [90, 0, 0] }),
        5: (u, w) => ({ p: [u, s / 2 - depth, s / 2 + w], r: [-90, 0, 0] }),
        3: (u, w) => ({ p: [s / 2 - depth, u, s / 2 + w], r: [0, 90, 0] }),
        4: (u, w) => ({ p: [-s / 2 + depth, u, s / 2 + w], r: [0, -90, 0] }),
      };
      const parts = [];
      const gap = s + 8;
      for (let n = 0; n < v.count; n++) {
        const ox = (n - (v.count - 1) / 2) * gap;
        parts.push(o("box", { name: `Die ${n + 1}`, params: { w: s, d: s, h: s, radius: 0, edge, edgeStyle: edge > 0.2 ? "round" : "none" }, position: [r1(ox), 0, 0] }));
        for (const [num, at] of Object.entries(faces))
          for (const [u, w] of patterns[num]) {
            const { p, r } = at(u * k, w * k);
            parts.push(o("cylinder", { name: `Dot ${num}`, hole: true, params: { d: pd, h }, position: [r1(ox + p[0]), r1(p[1]), r1(p[2])], rotation: r }));
          }
      }
      return parts;
    },
  },

  {
    id: "planter",
    name: "Plant pot",
    tagline: "A home for a succulent or a pencil cup.",
    category: "personal",
    options: [
      {
        id: "style",
        label: "Shape",
        group: "Shape",
        type: "choice",
        choices: [
          { value: "round", label: "Round" },
          { value: "hex", label: "6 sides" },
          { value: "oct", label: "8 sides" },
          { value: "square", label: "Square" },
        ],
        default: "round",
      },
      { id: "size", label: "Width", group: "Shape", type: "slider", min: 50, max: 140, step: 1, unit: "mm", default: 80 },
      { id: "height", label: "Height", group: "Shape", type: "slider", min: 40, max: 140, step: 1, unit: "mm", default: 75 },
      { id: "taper", label: "Taper", group: "Shape", type: "slider", min: 0, max: 30, step: 1, unit: "%", default: 18, hint: "Round shape only." },
      { id: "wall", label: "Wall thickness", group: "Extras", type: "slider", min: 2, max: 5, step: 0.2, unit: "mm", default: 2.4 },
      { id: "drain", label: "Drain hole", group: "Extras", type: "toggle", default: true },
      { id: "saucer", label: "Saucer underneath", group: "Extras", type: "toggle", default: true },
    ],
    build(v) {
      const s = v.size;
      const h = v.height;
      const w = v.wall;
      const parts = [];
      if (v.style === "round") {
        const bottom = r1(s * (1 - v.taper / 100));
        parts.push(o("cone", { name: "Pot", params: { d1: bottom, d2: s, h } }));
        parts.push(o("cone", { name: "Inside", hole: true, params: { d1: r1(bottom - 2 * w), d2: r1(s - 2 * w), h }, position: [0, 0, 3] }));
      } else {
        const sides = v.style === "hex" ? 6 : v.style === "oct" ? 8 : 4;
        // Prisms are measured corner to corner; make the flat-to-flat width match the slider.
        const d = r1(s / Math.cos(Math.PI / sides));
        parts.push(o("polygon", { name: "Pot", params: { sides, d, h }, rotation: [0, 0, sides === 4 ? 45 : 0] }));
        parts.push(o("polygon", { name: "Inside", hole: true, params: { sides, d: r1(d - (2 * w) / Math.cos(Math.PI / sides)), h }, position: [0, 0, 3], rotation: [0, 0, sides === 4 ? 45 : 0] }));
      }
      if (v.drain) parts.push(o("cylinder", { name: "Drain hole", hole: true, params: { d: 8, h: 10 }, position: [0, 0, -2] }));
      if (v.saucer) {
        const sd = r1(s * (v.style === "round" ? 1 - v.taper / 100 : 1.1) + 18);
        const x = r1(s / 2 + sd / 2 + 12);
        parts.push(o("cylinder", { name: "Saucer", params: { d: sd, h: 2.4 }, position: [x, 0, 0] }));
        parts.push(o("tube", { name: "Saucer rim", params: { d: sd, id: r1(sd - 4), h: 12 }, position: [x, 0, 0] }));
      }
      return parts;
    },
  },
];

export const KIT_BY_ID = Object.fromEntries(KITS.map((k) => [k.id, k]));

export function defaultValues(kit) {
  return Object.fromEntries(kit.options.map((op) => [op.id, op.default]));
}

// Fills in missing or out-of-range values so a shared link can't break a kit.
export function cleanValues(kit, values = {}) {
  const out = {};
  for (const op of kit.options) {
    let v = values[op.id];
    if (op.type === "slider") {
      v = Number(v);
      if (!Number.isFinite(v)) v = op.default;
      v = Math.min(op.max, Math.max(op.min, v));
    } else if (op.type === "choice") {
      if (!op.choices.some((c) => c.value === v)) v = op.default;
    } else if (op.type === "toggle") {
      v = typeof v === "boolean" ? v : v === "1" ? true : v === "0" ? false : op.default;
    } else if (op.type === "text") {
      v = typeof v === "string" ? v.slice(0, op.max) : op.default;
    }
    out[op.id] = v;
  }
  return out;
}

// "Surprise me": random picks for everything except the words.
export function randomValues(kit, current) {
  const out = { ...current };
  for (const op of kit.options) {
    if (op.type === "slider") {
      const steps = Math.round((op.max - op.min) / op.step);
      out[op.id] = r1(op.min + Math.round(Math.random() * steps) * op.step);
    } else if (op.type === "choice") out[op.id] = op.choices[Math.floor(Math.random() * op.choices.length)].value;
    else if (op.type === "toggle") out[op.id] = Math.random() > 0.3;
  }
  return out;
}

export function buildKit(kit, values) {
  return kit.build(cleanValues(kit, values));
}
