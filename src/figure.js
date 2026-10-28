// The figure creator: one model with lots of choices, like a character
// screen in a game. Built from simple parts, so it prints without supports
// in most combinations and opens in the Studio like anything else.
// The figure faces -Y and stands on z = 0.
import { makeObject as o } from "./objects.js";
import { r1, heart, star, standUp, text, textWidth, FONT_CHOICES } from "./kitParts.js";

const choice = (id, label, group, choices, def, hint) => ({
  id,
  label,
  group,
  type: "choice",
  choices: choices.map(([value, l]) => ({ value, label: l })),
  default: def,
  hint,
});
const slider = (id, label, group, min, max, step, unit, def, hint) => ({ id, label, group, type: "slider", min, max, step, unit, default: def, hint });
const toggle = (id, label, group, def, hint) => ({ id, label, group, type: "toggle", default: def, hint });

export const FIGURE = {
  id: "figure",
  name: "Figure",
  tagline: "Build a character. Head to toe, every piece is yours.",
  category: "novelty",
  featured: true,
  options: [
    choice("head", "Head shape", "Head", [["round", "Round"], ["square", "Square"], ["wide", "Wide"]], "round"),
    slider("headSize", "Head size", "Head", 70, 140, 1, "%", 100),
    choice("ears", "Ears and horns", "Head", [["none", "None"], ["cat", "Cat"], ["bear", "Bear"], ["bunny", "Bunny"], ["horns", "Horns"], ["antenna", "Antenna"], ["unicorn", "Unicorn"]], "cat"),

    choice("eyes", "Eyes", "Face", [["dots", "Dots"], ["big", "Big"], ["sleepy", "Sleepy"], ["visor", "Visor"], ["cyclops", "One eye"], ["x", "X X"]], "big"),
    choice("mouth", "Mouth", "Face", [["smile", "Smile"], ["grin", "Grin"], ["o", "Surprised"], ["flat", "Unbothered"], ["none", "None"]], "smile"),
    toggle("cheeks", "Cheeks", "Face", true),

    choice("hat", "Hat or hair", "Hair & hats", [["none", "None"], ["beanie", "Beanie"], ["cap", "Cap"], ["crown", "Crown"], ["tophat", "Top hat"], ["wizard", "Wizard"], ["mohawk", "Mohawk"], ["bun", "Bun"], ["headphones", "Headphones"]], "headphones"),

    choice("body", "Body shape", "Body", [["round", "Round"], ["boxy", "Boxy"], ["hoodie", "Hoodie"], ["slim", "Slim"]], "round"),
    slider("bodyHeight", "Body height", "Body", 70, 150, 1, "%", 100),
    slider("bodyWidth", "Body width", "Body", 75, 135, 1, "%", 100),
    choice("emblem", "Chest badge", "Body", [["none", "None"], ["heart", "Heart"], ["star", "Star"], ["bolt", "Bolt"], ["dot", "Button"]], "bolt"),
    toggle("belt", "Belt", "Body", false),

    choice("pose", "Arm pose", "Arms", [["down", "Relaxed"], ["up", "Cheer"], ["wave", "Wave"], ["none", "No arms"]], "wave"),
    slider("armLength", "Arm length", "Arms", 70, 130, 1, "%", 100),
    choice("item", "Holding", "Arms", [["none", "Nothing"], ["coffee", "Coffee"], ["sword", "Sword"], ["wand", "Wand"], ["heart", "Heart"], ["balloon", "Balloon"]], "coffee", "Held in the right hand."),

    slider("legLength", "Leg length", "Legs", 40, 200, 1, "%", 100),
    choice("feet", "Feet", "Legs", [["sneakers", "Sneakers"], ["boots", "Boots"], ["wheels", "Wheels"]], "sneakers"),
    choice("tail", "Tail", "Legs", [["none", "None"], ["cat", "Cat"], ["dino", "Dino spikes"], ["fox", "Fox"]], "none"),

    choice("back", "On the back", "Gear", [["none", "Nothing"], ["backpack", "Backpack"], ["jetpack", "Jetpack"], ["wings", "Wings"], ["cape", "Cape"]], "backpack"),

    choice("base", "Stand", "Stand", [["round", "Round"], ["square", "Square"], ["hex", "Hexagon"], ["none", "No stand"]], "round"),
    { id: "name", label: "Name on the stand", group: "Stand", type: "text", max: 12, default: "NOVA" },
    { id: "font", label: "Letter style", group: "Stand", type: "choice", choices: FONT_CHOICES, default: "Archivo Black" },
    slider("scale", "Overall size", "Stand", 60, 160, 5, "%", 100, "100% is about 8 cm tall."),
  ],
  build: buildFigure,
  regions: [
    { id: "skin", label: "Skin", color: "#e9e7e1" },
    { id: "face", label: "Eyes & cheeks", color: "#1b1c1e" },
    { id: "hat", label: "Hat & hair", color: "#6c4bb4" },
    { id: "body", label: "Outfit", color: "#6c4bb4" },
    { id: "details", label: "Badge, belt & horns", color: "#f2c230" },
    { id: "arms", label: "Sleeves", color: "#6c4bb4" },
    { id: "legs", label: "Legs", color: "#1b1c1e" },
    { id: "shoes", label: "Shoes", color: "#e9e7e1" },
    { id: "item", label: "What it holds", color: "#f0742b" },
    { id: "gear", label: "Back gear", color: "#1fa39a" },
    { id: "tail", label: "Tail", color: "#e9e7e1" },
    { id: "stand", label: "Stand", color: "#1b1c1e" },
    { id: "name", label: "Name", color: "#e9e7e1" },
  ],
};

function buildFigure(v) {
  const k = v.scale / 100;
  const H = r1(26 * k * (v.headSize / 100)); // head size
  const bw = r1(22 * k * (v.bodyWidth / 100)); // body width
  const bd = r1(bw * 0.72); // body depth
  const bh = r1(20 * k * (v.bodyHeight / 100)); // body height
  const lw = r1(Math.max(4, 6.5 * k)); // leg width
  const ll = r1(7 * k * (v.legLength / 100)); // leg length
  const parts = [];
  // Each part gets a color region. `mark` tags everything added since the
  // last call; `by` overrides the region for some part names.
  let tagged = 0;
  const mark = (region, by = {}) => {
    for (let i = tagged; i < parts.length; i++) parts[i].region = by[parts[i].name] || region;
    tagged = parts.length;
  };

  // ---- stand ----
  const hasBase = v.base !== "none";
  const name = (v.name || "").trim();
  const nameSize = r1(Math.max(4.5, 6 * k));
  const baseD = r1(Math.max(bw * 2.1, H * 1.5, name ? textWidth(name, v.font, nameSize) + 14 : 0));
  const z0 = hasBase ? 3 : 0;
  if (hasBase) {
    if (v.base === "round") parts.push(o("cylinder", { name: "Stand", params: { d: baseD, h: 3, edge: 0.8, edgeStyle: "round" } }));
    if (v.base === "square") parts.push(o("box", { name: "Stand", params: { w: baseD, d: r1(baseD * 0.8), h: 3, radius: 5, edge: 0.8, edgeStyle: "round" } }));
    if (v.base === "hex") parts.push(o("polygon", { name: "Stand", params: { sides: 6, d: r1(baseD * 1.08), h: 3 }, rotation: [0, 0, 30] }));
    if (name) parts.push(text(name, v.font, nameSize, 1.2, [0, r1(-baseD * (v.base === "square" ? 0.28 : 0.33)), 2.8]));
  }
  mark("stand", { Words: "name" });
  // The figure stands a little behind the middle so the name has room.
  const fy = hasBase && name ? r1(baseD * 0.06) : 0;

  // ---- feet and legs ----
  const legX = r1(bw * 0.22);
  const footH = 4;
  for (const sx of [-1, 1]) {
    const x = r1(sx * legX);
    if (v.feet === "sneakers") {
      parts.push(o("box", { name: "Sneaker", params: { w: r1(lw * 1.15), d: r1(lw * 1.8), h: footH, radius: r1(lw * 0.5), edge: 1, edgeStyle: "round" }, position: [x, r1(fy - lw * 0.3), z0] }));
    } else if (v.feet === "boots") {
      parts.push(o("cylinder", { name: "Boot", params: { d: r1(lw * 1.35), h: footH + 3, edge: 0.8, edgeStyle: "round" }, position: [x, fy, z0] }));
      parts.push(o("box", { name: "Boot toe", params: { w: r1(lw * 1.2), d: r1(lw * 0.9), h: footH, radius: r1(lw * 0.45) }, position: [x, r1(fy - lw * 0.6), z0] }));
    } else {
      const wd = r1(lw * 1.6);
      parts.push(o("cylinder", { name: "Wheel", params: { d: wd, h: r1(lw * 0.9), edge: 0.8, edgeStyle: "round" }, position: [r1(x - (lw * 0.45)), fy, r1(z0 + wd / 2)], rotation: [0, 90, 0] }));
    }
    parts.push(o("cylinder", { name: "Leg", params: { d: lw, h: r1(ll + footH) }, position: [x, fy, r1(z0 + 1)] }));
  }

  mark("shoes", { Leg: "legs" });

  // ---- body ----
  const zb = r1(z0 + footH + ll - 1);
  let bodyFront = -bd / 2;
  let bodyHalfW = bw / 2;
  if (v.body === "round") {
    parts.push(o("cylinder", { name: "Body", params: { d: bw, h: bh, edge: r1(Math.min(bw / 2 - 0.6, bh / 2 - 0.6, 6 * k)), edgeStyle: "round" }, position: [0, fy, zb] }));
    bodyFront = -bw / 2;
  } else if (v.body === "boxy") {
    parts.push(o("box", { name: "Body", params: { w: bw, d: bd, h: bh, radius: r1(bw * 0.18), edge: r1(Math.min(2, bh / 4)), edgeStyle: "round" }, position: [0, fy, zb] }));
  } else if (v.body === "hoodie") {
    parts.push(o("cone", { name: "Body", params: { d1: r1(bw * 1.15), d2: r1(bw * 0.8), h: bh }, position: [0, fy, zb] }));
    parts.push(o("tube", { name: "Hood", params: { d: r1(bw * 0.92), id: r1(bw * 0.5), h: r1(Math.max(3, bh * 0.18)) }, position: [0, r1(fy + 1), r1(zb + bh - 1)] }));
    bodyFront = -bw * 0.5;
    bodyHalfW = bw * 0.5;
  } else {
    const sw = r1(bw * 0.78);
    parts.push(o("box", { name: "Body", params: { w: sw, d: r1(bd * 0.85), h: bh, radius: r1(sw * 0.2), edge: 1, edgeStyle: "round" }, position: [0, fy, zb] }));
    bodyFront = -bd * 0.425;
    bodyHalfW = sw / 2;
  }
  if (v.belt) {
    const zbelt = r1(zb + bh * 0.22);
    if (v.body === "boxy" || v.body === "slim") {
      const w = v.body === "slim" ? bw * 0.78 : bw;
      const d = v.body === "slim" ? bd * 0.85 : bd;
      parts.push(o("box", { name: "Belt", params: { w: r1(w + 1.2), d: r1(d + 1.2), h: 2.4, radius: r1(w * 0.2 + 0.6) }, position: [0, fy, zbelt] }));
    } else {
      const d = v.body === "hoodie" ? bw * (1.15 - 0.35 * 0.22) : bw;
      parts.push(o("cylinder", { name: "Belt", params: { d: r1(d + 1.2), h: 2.4 }, position: [0, fy, zbelt] }));
    }
    parts.push(o("box", { name: "Buckle", params: { w: r1(lw * 0.9), d: 2, h: 3.4, radius: 0.6 }, position: [0, r1(fy + bodyFront - 0.6), r1(zbelt - 0.5)] }));
  }
  mark("body", { Belt: "details", Buckle: "details" });
  // Chest badge, drawn flat then stood on the body front.
  const es = r1(Math.min(bw, bh) * 0.34);
  const chestZ = r1(zb + bh * 0.58);
  let emblem = [];
  if (v.emblem === "heart") emblem = heart(es, 0, 1.4);
  if (v.emblem === "star") emblem = [star(es * 1.2, 0, 1.4)];
  if (v.emblem === "dot") emblem = [o("cylinder", { name: "Button", params: { d: r1(es * 0.7), h: 1.4 } })];
  if (v.emblem === "bolt") {
    const s = es / 2;
    const pts = [[0.2, 1], [-0.55, -0.1], [-0.05, -0.1], [-0.25, -1], [0.55, 0.15], [0.05, 0.15]].map(([x, y]) => [r1(x * s), r1(y * s)]);
    emblem = [o("sketch", { name: "Bolt", params: { shapes: [{ kind: "poly", pts }], op: "extrude", height: 1.4 } })];
  }
  const frontAtChest = v.body === "hoodie" ? -(bw * 1.15 - (bw * 0.35 * 0.58)) / 2 : bodyFront;
  parts.push(...emblem.map((p) => standUp({ ...p, position: [p.position[0], p.position[1], p.position[2] - 0.4] }, r1(fy + frontAtChest), chestZ)));

  mark("details");

  // ---- head ----
  const neckZ = zb + bh;
  let headZ0; // bottom of the head part
  let headTop;
  let hc; // head center height
  let halfW; // half width of the head
  let faceY; // (x, z) -> front surface y, before the fy shift
  if (v.head === "round") {
    headZ0 = r1(neckZ - H * 0.12);
    hc = headZ0 + H / 2;
    headTop = headZ0 + H;
    halfW = H / 2;
    parts.push(o("sphere", { name: "Head", params: { d: H }, position: [0, fy, headZ0] }));
    faceY = (x, z) => -Math.sqrt(Math.max(0, (H / 2) ** 2 - x * x - (z - hc) ** 2));
  } else if (v.head === "square") {
    const hd = H * 0.9;
    headZ0 = r1(neckZ - 1);
    hc = headZ0 + hd / 2;
    headTop = headZ0 + hd;
    halfW = H / 2;
    parts.push(o("box", { name: "Head", params: { w: H, d: r1(hd), h: r1(hd), radius: r1(H * 0.18), edge: r1(Math.min(2.5, H * 0.08)), edgeStyle: "round" }, position: [0, fy, headZ0] }));
    faceY = () => -hd / 2;
  } else {
    const hw = H * 1.25;
    const hd = H * 0.82;
    const hh = H * 0.8;
    headZ0 = r1(neckZ - 1);
    hc = headZ0 + hh / 2;
    headTop = headZ0 + hh;
    halfW = hw / 2;
    parts.push(o("box", { name: "Head", params: { w: r1(hw), d: r1(hd), h: r1(hh), radius: r1(hd * 0.42), edge: r1(Math.min(2.5, H * 0.08)), edgeStyle: "round" }, position: [0, fy, headZ0] }));
    faceY = () => -hd / 2;
  }
  // A neck so the head is always joined to the body.
  parts.push(o("cylinder", { name: "Neck", params: { d: r1(Math.min(bw, H) * 0.45), h: r1(Math.max(3, headZ0 - neckZ + H * 0.3)) }, position: [0, fy, r1(neckZ - 1)] }));
  const fyAt = (x, z) => r1(fy + faceY(x, z));

  mark("skin");

  // ---- face ----
  const eyeX = H * 0.19;
  const eyeZ = hc + H * 0.06;
  const eyeYs = (x, z, sink) => r1(fyAt(x, z) + sink);
  if (v.eyes === "dots") {
    const d = r1(H * 0.13);
    for (const sx of [-1, 1]) parts.push(o("sphere", { name: "Eye", params: { d }, position: [r1(sx * eyeX), eyeYs(sx * eyeX, eyeZ, d * 0.35), r1(eyeZ - d / 2)] }));
  } else if (v.eyes === "big" || v.eyes === "cyclops") {
    const xs = v.eyes === "big" ? [-eyeX, eyeX] : [0];
    const d = r1(v.eyes === "big" ? H * 0.27 : H * 0.36);
    for (const x of xs) {
      const y = eyeYs(x, eyeZ, 1.6);
      parts.push(o("cylinder", { name: "Eye", params: { d, h: 2.4 }, position: [r1(x), y, r1(eyeZ)], rotation: [90, 0, 0] }));
      // Pupil: a small dent in the eye, a little toward the middle and up.
      const px = r1(x - Math.sign(x) * d * 0.1);
      parts.push(o("cylinder", { name: "Pupil", hole: true, params: { d: r1(d * 0.42), h: 3 }, position: [px, r1(y - 2.4 + 1), r1(eyeZ + d * 0.08)], rotation: [90, 0, 0] }));
    }
  } else if (v.eyes === "sleepy") {
    for (const sx of [-1, 1]) {
      const x = sx * eyeX;
      parts.push(o("box", { name: "Eye", params: { w: r1(H * 0.2), d: 3, h: r1(Math.max(1.2, H * 0.05)), radius: 0 }, position: [r1(x), eyeYs(x, eyeZ, 0.6), r1(eyeZ - 1)] }));
    }
  } else if (v.eyes === "visor") {
    const w = r1(Math.min(H * 0.8, halfW * 1.7));
    parts.push(o("box", { name: "Visor", params: { w, d: 4, h: r1(H * 0.2), radius: r1(H * 0.09) }, position: [0, eyeYs(0, eyeZ, 0.8), r1(eyeZ - H * 0.1)] }));
  } else if (v.eyes === "x") {
    for (const sx of [-1, 1])
      for (const a of [45, -45]) {
        const x = sx * eyeX;
        parts.push(o("box", { name: "Eye", params: { w: r1(H * 0.2), d: 3, h: r1(Math.max(1.2, H * 0.05)) }, position: [r1(x), eyeYs(x, eyeZ, 0.6), r1(eyeZ)], rotation: [0, a, 0] }));
      }
  }
  if (v.cheeks) {
    for (const sx of [-1, 1]) {
      const x = sx * H * 0.3;
      const z = hc - H * 0.1;
      parts.push(o("cylinder", { name: "Cheek", params: { d: r1(H * 0.12), h: 1.6 }, position: [r1(x), eyeYs(x, z, 1.1), r1(z)], rotation: [90, 0, 0] }));
    }
  }
  if (v.mouth !== "none") {
    const f = H;
    const mz = hc - H * 0.2;
    let shape;
    if (v.mouth === "smile" || v.mouth === "grin") {
      const outerR = f * (v.mouth === "grin" ? 0.2 : 0.14);
      const innerR = v.mouth === "grin" ? 0 : outerR * 0.62;
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (i * Math.PI) / 12;
        pts.push([outerR * Math.cos(a), outerR * 0.75 * Math.sin(a) + outerR * 0.35]);
      }
      if (innerR > 0)
        for (let i = 12; i >= 0; i--) {
          const a = Math.PI + (i * Math.PI) / 12;
          pts.push([innerR * Math.cos(a), innerR * 0.45 * Math.sin(a) + outerR * 0.35]);
        }
      shape = { kind: "poly", pts: pts.map((p) => p.map(r1)) };
    } else if (v.mouth === "o") {
      shape = { kind: "circle", c: [0, 0], r: r1(f * 0.06) };
    } else {
      const w = f * 0.11;
      shape = { kind: "poly", pts: [[-w, -0.7], [w, -0.7], [w, 0.7], [-w, 0.7]].map((p) => p.map(r1)) };
    }
    const depth = 1.4;
    parts.push(o("sketch", { name: "Mouth", hole: true, params: { shapes: [shape], op: "extrude", height: 8 }, position: [0, r1(fyAt(0, mz) + depth), r1(mz)], rotation: [90, 0, 0] }));
  }

  mark("face");

  // ---- ears, horns and the like ----
  const topY = fy;
  const earZ = v.head === "round" ? hc + H * 0.28 : headTop - H * 0.1;
  const earX = Math.min(halfW * 0.72, H * 0.38);
  if (v.ears === "cat") {
    for (const sx of [-1, 1])
      parts.push(o("cone", { name: "Ear", params: { d1: r1(H * 0.34), d2: 1.2, h: r1(H * 0.34) }, position: [r1(sx * earX), topY, r1(earZ - H * 0.06)], rotation: [0, sx * 22, 0] }));
  } else if (v.ears === "bear") {
    for (const sx of [-1, 1]) parts.push(o("sphere", { name: "Ear", params: { d: r1(H * 0.34) }, position: [r1(sx * earX * 1.05), topY, r1(earZ - H * 0.05)] }));
  } else if (v.ears === "bunny") {
    for (const sx of [-1, 1])
      parts.push(o("cylinder", { name: "Ear", params: { d: r1(H * 0.18), h: r1(H * 0.7), edge: r1(H * 0.08), edgeStyle: "round" }, position: [r1(sx * earX * 0.6), topY, r1(earZ - H * 0.12)], rotation: [0, sx * 10, 0] }));
  } else if (v.ears === "horns") {
    for (const sx of [-1, 1])
      parts.push(o("cone", { name: "Horn", params: { d1: r1(H * 0.17), d2: 0.8, h: r1(H * 0.3) }, position: [r1(sx * earX * 0.75), topY, r1(earZ - H * 0.04)], rotation: [0, sx * 28, 0] }));
  } else if (v.ears === "antenna") {
    parts.push(o("cylinder", { name: "Antenna", params: { d: 1.8, h: r1(H * 0.45) }, position: [0, topY, r1(headTop - 2)] }));
    parts.push(o("sphere", { name: "Antenna tip", params: { d: r1(Math.max(4, H * 0.16)) }, position: [0, topY, r1(headTop - 2 + H * 0.42)] }));
  } else if (v.ears === "unicorn") {
    parts.push(o("cone", { name: "Horn", params: { d1: r1(H * 0.15), d2: 0.8, h: r1(H * 0.45) }, position: [0, r1(topY - H * 0.15), r1(headTop - H * 0.14)], rotation: [22, 0, 0] }));
  }

  mark("skin", { Horn: "details", Antenna: "details", "Antenna tip": "details" });

  // ---- hats and hair ----
  const crownZ = v.head === "round" ? hc + H * 0.3 : headTop - 1;
  const crownD = v.head === "round" ? H * 0.8 : halfW * 1.7;
  if (v.hat === "beanie") {
    const z = v.head === "round" ? hc + H * 0.08 : headTop - H * 0.25;
    const d1 = v.head === "round" ? H * 1.02 : halfW * 2 + 1;
    parts.push(o("cone", { name: "Beanie", params: { d1: r1(d1), d2: r1(d1 * 0.45), h: r1(H * 0.5) }, position: [0, topY, r1(z)] }));
    parts.push(o("sphere", { name: "Pompom", params: { d: r1(H * 0.26) }, position: [0, topY, r1(z + H * 0.42)] }));
  } else if (v.hat === "cap") {
    parts.push(o("cylinder", { name: "Cap", params: { d: r1(crownD + 1), h: r1(H * 0.24), edge: r1(H * 0.08), edgeStyle: "round" }, position: [0, topY, r1(crownZ - H * 0.1)] }));
    parts.push(o("box", { name: "Cap brim", params: { w: r1(crownD * 0.75), d: r1(H * 0.5), h: 1.6, radius: r1(H * 0.2) }, position: [0, r1(topY - crownD * 0.5), r1(crownZ - H * 0.1)] }));
  } else if (v.hat === "crown") {
    const d = crownD * 0.85;
    parts.push(o("tube", { name: "Crown", params: { d: r1(d), id: r1(d - 3), h: r1(H * 0.2) }, position: [0, topY, r1(crownZ - 1)] }));
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      parts.push(o("cone", { name: "Crown point", params: { d1: 3, d2: 0.6, h: r1(H * 0.18) }, position: [r1(((d - 1.5) / 2) * Math.cos(a)), r1(topY + ((d - 1.5) / 2) * Math.sin(a)), r1(crownZ - 1 + H * 0.2 - 0.5)] }));
    }
  } else if (v.hat === "tophat") {
    parts.push(o("cylinder", { name: "Brim", params: { d: r1(crownD * 1.25), h: 1.8 }, position: [0, topY, r1(crownZ - 0.5)] }));
    parts.push(o("cylinder", { name: "Top hat", params: { d: r1(crownD * 0.78), h: r1(H * 0.55) }, position: [0, topY, r1(crownZ - 0.5)] }));
  } else if (v.hat === "wizard") {
    parts.push(o("cylinder", { name: "Brim", params: { d: r1(crownD * 1.35), h: 1.6 }, position: [0, topY, r1(crownZ - 0.5)] }));
    parts.push(o("cone", { name: "Wizard hat", params: { d1: r1(crownD * 0.95), d2: 1.4, h: r1(H * 0.85) }, position: [0, topY, r1(crownZ - 0.5)], rotation: [-8, 0, 0] }));
  } else if (v.hat === "mohawk") {
    for (let i = 0; i < 5; i++) {
      const y = topY - H * 0.32 + i * H * 0.16;
      const zTop = v.head === "round" ? hc + Math.sqrt(Math.max(0, (H / 2) ** 2 - (y - topY) ** 2)) - 2 : headTop - 1.5;
      parts.push(o("cone", { name: "Mohawk spike", params: { d1: r1(H * 0.17), d2: 1, h: r1(H * 0.26) }, position: [0, r1(y), r1(zTop)] }));
    }
  } else if (v.hat === "bun") {
    parts.push(o("sphere", { name: "Hair bun", params: { d: r1(H * 0.38) }, position: [0, r1(topY + H * 0.12), r1(headTop - H * 0.16)] }));
  } else if (v.hat === "headphones") {
    // A half ring over the head, drawn in X/Z and given depth toward -Y.
    const R = halfW + 2;
    const t = Math.max(2.2, H * 0.08);
    const pts = [];
    for (let i = 0; i <= 16; i++) {
      const a = (i * Math.PI) / 16;
      pts.push([R * Math.cos(a), R * Math.sin(a) * (v.head === "round" ? 1 : 0.8)]);
    }
    for (let i = 16; i >= 0; i--) {
      const a = (i * Math.PI) / 16;
      pts.push([(R - t) * Math.cos(a), (R - t) * Math.sin(a) * (v.head === "round" ? 1 : 0.8)]);
    }
    const bandZ = v.head === "round" ? hc : hc + (headTop - hc) * 0.15;
    parts.push(o("sketch", { name: "Headphone band", params: { shapes: [{ kind: "poly", pts: pts.map((p) => p.map(r1)) }], op: "extrude", height: 4 }, position: [0, r1(topY + 2), r1(bandZ)], rotation: [90, 0, 0] }));
    for (const sx of [-1, 1])
      parts.push(o("cylinder", { name: "Ear cup", params: { d: r1(H * 0.38), h: 4, edge: 1, edgeStyle: "round" }, position: [r1(sx * (R - t / 2) - (sx > 0 ? 0 : 0)), topY, r1(bandZ)], rotation: [0, sx * 90, 0] }));
  }

  mark("hat");

  // ---- arms and what they hold ----
  const shoulderZ = zb + bh * 0.82;
  const armL = r1(bh * 0.72 * (v.armLength / 100));
  const armD = r1(lw * 0.85);
  let rightHand = null;
  if (v.pose !== "none") {
    const angles = { down: [-165, 165], up: [-35, 35], wave: [-165, 30] }[v.pose];
    [-1, 1].forEach((sx, i) => {
      const deg = angles[i];
      const sx0 = sx * (bodyHalfW - armD * 0.2);
      parts.push(o("cylinder", { name: "Arm", params: { d: armD, h: armL, edge: r1(armD * 0.45), edgeStyle: "round" }, position: [r1(sx0), fy, r1(shoulderZ)], rotation: [0, deg, 0] }));
      const rad = (deg * Math.PI) / 180;
      const hand = [sx0 + Math.sin(rad) * armL, fy, shoulderZ + Math.cos(rad) * armL];
      parts.push(o("sphere", { name: "Hand", params: { d: r1(armD * 1.25) }, position: [r1(hand[0]), r1(hand[1]), r1(hand[2] - armD * 0.62)] }));
      if (sx > 0) rightHand = hand;
    });
  }
  if (rightHand && v.item !== "none") {
    const [hx, hy, hz] = rightHand;
    const s = H / 26;
    if (v.item === "coffee") {
      parts.push(o("cone", { name: "Coffee cup", params: { d1: r1(6 * s), d2: r1(7.5 * s), h: r1(9 * s) }, position: [r1(hx + 1.5 * s), r1(hy - 4.5 * s), r1(hz - 4 * s)] }));
      parts.push(o("cylinder", { name: "Coffee lid", params: { d: r1(8 * s), h: r1(1.6 * s) }, position: [r1(hx + 1.5 * s), r1(hy - 4.5 * s), r1(hz + 5 * s - 0.2)] }));
    } else if (v.item === "sword") {
      parts.push(o("box", { name: "Blade", params: { w: r1(2.6 * s), d: 1.6, h: r1(26 * s), radius: 0 }, position: [r1(hx), r1(hy - 2 * s), r1(hz + 1)] }));
      parts.push(o("box", { name: "Crossguard", params: { w: r1(9 * s), d: 2.4, h: 2, radius: 0.8 }, position: [r1(hx), r1(hy - 2 * s), r1(hz + 1)] }));
    } else if (v.item === "wand") {
      parts.push(o("cylinder", { name: "Wand", params: { d: 1.8, h: r1(16 * s) }, position: [r1(hx), r1(hy - 2 * s), r1(hz - 2)] }));
      parts.push(standUp({ ...star(r1(9 * s), 0, 2), position: [0, 0, -1] }, r1(hy - 2 * s), r1(hz + 14 * s)));
      parts[parts.length - 1].position[0] = r1(hx);
    } else if (v.item === "heart") {
      const hs = r1(10 * s);
      parts.push(...heart(hs, 0, 2.4).map((p) => standUp({ ...p, position: [p.position[0] + hx, p.position[1], p.position[2] - 1.2] }, r1(hy - 3 * s), r1(hz + hs * 0.25))));
    } else if (v.item === "balloon") {
      parts.push(o("cylinder", { name: "Balloon string", params: { d: 1.4, h: r1(20 * s) }, position: [r1(hx), r1(hy), r1(hz - 1)] }));
      parts.push(o("sphere", { name: "Balloon", params: { d: r1(13 * s) }, position: [r1(hx), r1(hy), r1(hz + 18 * s)] }));
    }
  }

  mark("item", { Arm: "arms", Hand: "skin" });

  // ---- back ----
  const backY = fy - bodyFront; // body back surface (body is symmetric front to back)
  if (v.back === "backpack") {
    parts.push(o("box", { name: "Backpack", params: { w: r1(bw * 0.72), d: r1(bd * 0.42), h: r1(bh * 0.62), radius: r1(bw * 0.12), edge: 1, edgeStyle: "round" }, position: [0, r1(backY + bd * 0.14), r1(zb + bh * 0.22)] }));
  } else if (v.back === "jetpack") {
    for (const sx of [-1, 1]) {
      const x = r1(sx * bw * 0.2);
      parts.push(o("cylinder", { name: "Jet", params: { d: r1(bw * 0.3), h: r1(bh * 0.7), edge: 1, edgeStyle: "round" }, position: [x, r1(backY + bw * 0.12), r1(zb + bh * 0.18)] }));
      parts.push(o("cone", { name: "Flame", params: { d1: 0.8, d2: r1(bw * 0.24), h: r1(bh * 0.3) }, position: [x, r1(backY + bw * 0.12), r1(zb + bh * 0.18 - bh * 0.28)] }));
    }
  } else if (v.back === "wings") {
    const span = bw * 1.1;
    for (const sx of [-1, 1]) {
      const pts = [[0, 0], [span, span * 0.55], [span * 0.95, span * 0.15], [span * 0.6, -span * 0.2]].map(([x, y]) => [r1(sx * x), r1(y)]);
      if (sx < 0) pts.reverse();
      parts.push(o("sketch", { name: "Wing", params: { shapes: [{ kind: "poly", pts, radius: 1.5 }], op: "extrude", height: 2 }, position: [0, r1(backY + 2.4), r1(zb + bh * 0.62)], rotation: [90, 0, 0] }));
    }
  } else if (v.back === "cape") {
    const capeH = r1(bh + ll * 0.6);
    parts.push(o("box", { name: "Cape", params: { w: r1(bw * 1.05), d: 1.8, h: capeH, radius: 0 }, position: [0, r1(backY + 0.6), r1(zb + bh - capeH)], rotation: [-6, 0, 0] }));
  }

  mark("gear");

  // ---- tail ----
  const tailZ = zb + bh * 0.15;
  if (v.tail === "cat") {
    parts.push(o("cylinder", { name: "Tail", params: { d: r1(lw * 0.6), h: r1(bh * 0.9), edge: r1(lw * 0.25), edgeStyle: "round" }, position: [0, r1(backY - 1), r1(tailZ)], rotation: [-55, 0, 0] }));
  } else if (v.tail === "fox") {
    parts.push(o("cone", { name: "Tail", params: { d1: r1(bw * 0.45), d2: r1(lw * 0.6), h: r1(bh * 0.95) }, position: [0, r1(backY - 1), r1(tailZ - bh * 0.1)], rotation: [-70, 0, 0] }));
  } else if (v.tail === "dino") {
    for (let i = 0; i < 4; i++) {
      const z = zb + bh * (0.85 - i * 0.22);
      parts.push(o("cone", { name: "Spike", params: { d1: r1(lw * 0.8), d2: 0.8, h: r1(lw * 0.9) }, position: [0, r1(backY - 1.5), r1(z)], rotation: [-90, 0, 0] }));
    }
  }
  mark("tail");
  return parts;
}

// How each option's picture is shot: which regions to zoom on (`focus`,
// with a smallest view size `min` in mm), which to paint in the accent
// color (`hl`) and which way the figure faces (`angle`).
export const FIGURE_ART = {
  head: { focus: ["face"], min: 36, hl: ["skin"] },
  ears: { focus: ["face"], min: 44, hl: ["skin", "details"], set: { hat: "none" } },
  eyes: { focus: ["face"], min: 24, hl: ["face"] },
  mouth: { focus: ["face"], min: 24, hl: ["face"] },
  hat: { focus: ["hat", "face"], min: 40, hl: ["hat"], set: { ears: "none" } },
  body: { focus: ["body"], min: 34, hl: ["body", "details"] },
  emblem: { focus: ["body"], min: 30, hl: ["details"] },
  pose: { hl: ["arms"] },
  item: { focus: ["item"], min: 34, hl: ["item"] },
  feet: { focus: ["shoes"], min: 26, hl: ["shoes"] },
  tail: { angle: 140, hl: ["tail"], set: { back: "none" } },
  back: { angle: 165, hl: ["gear"] },
  base: { hl: ["stand", "name"] },
};

// Starter looks shown on the home page. Each opens in the figure builder.
export const FIGURE_LOOKS = [
  { id: "nova", name: "Nova", color: "#6c4bb4", values: {} },
  { id: "mochi", name: "Mochi", color: "#e86aa6", colors: { skin: "#e86aa6", body: "#8b8f94", arms: "#8b8f94", details: "#e86aa6", legs: "#8b8f94", item: "#e9e7e1", gear: "#1fa39a", tail: "#e86aa6", stand: "#e86aa6" }, values: { ears: "cat", eyes: "big", hat: "none", body: "hoodie", pose: "wave", item: "coffee", tail: "cat", back: "backpack", emblem: "heart", name: "MOCHI" } },
  { id: "sir-bolt", name: "Sir Bolt", color: "#8b8f94", colors: { skin: "#8b8f94", hat: "#c9a033", body: "#8b8f94", details: "#c8362d", arms: "#8b8f94", shoes: "#1b1c1e", item: "#8b8f94", gear: "#c8362d", name: "#c9a033" }, values: { head: "square", ears: "horns", eyes: "visor", hat: "crown", body: "boxy", pose: "up", item: "sword", feet: "boots", back: "cape", belt: true, name: "SIR BOLT" } },
  { id: "merlin", name: "Merlin", color: "#1fa39a", colors: { hat: "#2f5fb3", body: "#2f5fb3", arms: "#2f5fb3", gear: "#e9e7e1", item: "#c9a033", tail: "#f0742b", details: "#c9a033", name: "#c9a033" }, values: { head: "wide", ears: "none", eyes: "sleepy", hat: "wizard", body: "slim", pose: "wave", item: "wand", back: "wings", tail: "fox", base: "hex", name: "MERLIN" } },
  { id: "unit-7", name: "Unit 7", color: "#1b1c1e", colors: { skin: "#8b8f94", face: "#1fa39a", hat: "#1b1c1e", body: "#8b8f94", arms: "#8b8f94", shoes: "#1b1c1e", item: "#c8362d", gear: "#1b1c1e", name: "#f2c230" }, values: { head: "square", ears: "antenna", eyes: "cyclops", hat: "headphones", body: "boxy", pose: "down", item: "balloon", feet: "wheels", back: "jetpack", emblem: "bolt", name: "UNIT 7", font: "Space Mono" } },
  { id: "sparkle", name: "Sparkle", color: "#f2c230", colors: { details: "#c9a033", hat: "#e86aa6", body: "#f2c230", arms: "#f2c230", item: "#c8362d", tail: "#6c4bb4", shoes: "#e86aa6", stand: "#6c4bb4" }, values: { ears: "unicorn", eyes: "big", mouth: "grin", cheeks: true, hat: "bun", body: "round", item: "heart", tail: "dino", base: "square", emblem: "star", name: "SPARKLE", font: "Courgette" } },
];

// A link that opens a starter look in the figure builder.
export function lookUrl(look, extra = "") {
  const cs = Object.entries(look.colors || {})
    .map(([r, c]) => `${r}.${c.slice(1)}`)
    .join(",");
  return `/make?kit=figure&v=${encodeURIComponent(JSON.stringify(look.values))}&cs=${cs}${extra}`;
}
