// Builds the figure from its choices. Built from simple parts so it prints
// in one piece without supports in most combinations.
// The figure faces -Y and stands on z = 0.
import { makeObject as o } from "./objects.js";
import { r1, heart, star, standUp, text, textWidth } from "./kitParts.js";

// Body proportions for each style at 100% (mm). `block` draws arms and legs
// as boxes, `peg` drops the legs so the body stands on the base.
export const STYLES = {
  classic: { H: 26, bw: 22, bh: 20, ll: 7, lw: 6.5, arm: 0.72, hand: 1.25 },
  cartoon: { H: 22, bw: 19, bh: 22, ll: 17, lw: 6, arm: 0.85, hand: 1.4 },
  blocky: { H: 22, bw: 22, bh: 33, ll: 30, lw: 11, arm: 1, block: true },
  action: { H: 15, bw: 23, bh: 30, ll: 34, lw: 7, arm: 0.92, hand: 1.25 },
  mini: {
    H: 17,
    bw: 20,
    bh: 23,
    ll: 19,
    lw: 7.5,
    arm: 0.9,
    hand: 1.45,
    foot: 1.2,
  },
  toy: { H: 22, bw: 20, bh: 32, ll: 0, lw: 6, arm: 0.5, hand: 1.3, peg: true },
  bobble: { H: 36, bw: 17, bh: 17, ll: 9, lw: 6, arm: 0.8, hand: 1.25 },
  anime: { H: 18, bw: 14.5, bh: 24, ll: 34, lw: 5, arm: 1, hand: 1.15 },
  plush: { H: 25, bw: 27, bh: 21, ll: 5, lw: 9.5, arm: 0.62, hand: 1.05, foot: 1.1 },
  monster: { H: 21, bw: 32, bh: 27, ll: 10, lw: 10, arm: 1.12, hand: 1.6, foot: 1.35 },
  robot: { H: 21, bw: 24, bh: 26, ll: 18, lw: 8, arm: 0.95, hand: 1.3 },
  hero: { H: 13.5, bw: 26, bh: 32, ll: 36, lw: 7.5, arm: 0.96, hand: 1.25 },
  dwarf: { H: 19, bw: 27, bh: 22, ll: 11, lw: 8.5, arm: 0.86, hand: 1.35, foot: 1.2 },
  elf: { H: 14, bw: 14, bh: 28, ll: 42, lw: 4.6, arm: 1, hand: 1.1 },
  realistic: {
    H: 14,
    bw: 15.5,
    bh: 28,
    ll: 38,
    lw: 5.2,
    arm: 0.98,
    hand: 1.15,
  },
};

// Resizes the parts from index `from` on about an anchor point (by default
// each part's own base). An anchor inside both the feature and what it
// sits on stays inside both at any size, so the pieces stay joined.
const DIMS = ["d", "d1", "d2", "h", "w", "id", "radius", "edge", "height"];
export function grow(parts, from, f, anchor = null) {
  if (f === 1) return;
  const sz = (n) => r1(Math.max(0.6, n * f));
  for (let i = from; i < parts.length; i++) {
    const p = parts[i];
    if (p.keep) continue; // wraps something that doesn't grow, like a band around the head
    const a = anchor || p.anchor || p.position;
    const params = { ...p.params };
    for (const k of DIMS) if (typeof params[k] === "number") params[k] = sz(params[k]);
    // A rounded edge can't be more than about half the part's thinnest side.
    if (typeof params.edge === "number") {
      const thin = Math.min(...["d", "h", "w"].filter((k) => typeof params[k] === "number").map((k) => params[k]));
      params.edge = r1(Math.min(p.params.edge * f, thin * 0.4));
    }
    if (params.shapes)
      params.shapes = params.shapes.map((sh) => ({
        ...sh,
        ...(sh.pts && { pts: sh.pts.map((pt) => pt.map((n) => r1(n * f))) }),
        ...(sh.c && { c: sh.c.map((n) => r1(n * f)) }),
        ...(typeof sh.r === "number" && { r: sz(sh.r) }),
        ...(typeof sh.radius === "number" && { radius: r1(sh.radius * f) }),
      }));
    parts[i] = {
      ...p,
      params,
      position: p.position.map((n, j) => r1(a[j] + (n - a[j]) * f)),
    };
  }
}

// A cylinder or cone from one point to another (its height is the distance).
function aim(type, name, params, from, to) {
  const v = to.map((n, i) => n - from[i]);
  const len = Math.max(0.6, Math.hypot(...v));
  const deg = (r) => r1((r * 180) / Math.PI);
  return o(type, {
    name,
    params: { ...params, h: r1(len) },
    position: from.map(r1),
    rotation: [deg(-Math.asin(v[1] / len)), deg(Math.atan2(v[0], v[2])), 0],
  });
}
// A round peg between two points, for joining a resized part to its owner.
const peg = (name, from, to, d) => aim("cylinder", name, { d: r1(d) }, from, to);
// A sphere by its center.
const ball = (name, c, d) =>
  o("sphere", {
    name,
    params: { d: r1(d) },
    position: [r1(c[0]), r1(c[1]), r1(c[2] - d / 2)],
  });
// An ellipse as a closed outline, for sketches.
const ellipse = (w, h, n = 20) =>
  Array.from({ length: n }, (_, i) => {
    const a = (i * 2 * Math.PI) / n;
    return [r1((w / 2) * Math.cos(a)), r1((h / 2) * Math.sin(a))];
  });
// Turns a point by rotation angles in degrees: about X, then Y, then Z,
// the same order the engine places parts in.
function turn([x, y, z], [rx = 0, ry = 0, rz = 0]) {
  const r = Math.PI / 180;
  [y, z] = [y * Math.cos(rx * r) - z * Math.sin(rx * r), y * Math.sin(rx * r) + z * Math.cos(rx * r)];
  [x, z] = [x * Math.cos(ry * r) + z * Math.sin(ry * r), -x * Math.sin(ry * r) + z * Math.cos(ry * r)];
  [x, y] = [x * Math.cos(rz * r) - y * Math.sin(rz * r), x * Math.sin(rz * r) + y * Math.cos(rz * r)];
  return [x, y, z];
}
// An egg or pebble shape: a sphere stretched to [w, d, h] around center c,
// then turned by `rot`.
const blob = (name, c, [w, d, h], rot = [0, 0, 0]) => {
  const m = Math.max(w, d, h, 0.6);
  const off = turn([0, 0, h / 2], rot);
  return o("sphere", {
    name,
    params: { d: r1(m) },
    scale: [w / m, d / m, h / m].map((n) => Math.round(n * 1000) / 1000),
    position: c.map((n, i) => r1(n - off[i])),
    rotation: rot.map(r1),
  });
};
// A bendy tube through points, thick `d0` at the start and `d1` at the end,
// with a ball at every bend so it reads as one smooth piece.
const chain = (name, pts, d0, d1 = d0) => {
  const out = [];
  const dAt = (i) => Math.max(0.8, d0 + ((d1 - d0) * i) / Math.max(1, pts.length - 1));
  for (let i = 0; i < pts.length - 1; i++) out.push(aim("cone", name, { d1: r1(dAt(i)), d2: r1(dAt(i + 1)) }, pts[i], pts[i + 1]));
  for (let i = 1; i < pts.length - 1; i++) out.push(ball(name, pts[i], dAt(i)));
  return out;
};
// A curve from a to b that bows out by `bow` (a vector) in the middle.
const bend = (a, b, bow, n = 5) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const k = 4 * t * (1 - t);
    return a.map((v, j) => v + (b[j] - v) * t + bow[j] * k);
  });

// A flat shape stood up on the face: drawn in x/z, pushed out toward -y.
const facePlate = (name, pts, x, y, z, depth, extra = {}) =>
  o("sketch", {
    name,
    params: { shapes: [{ kind: "poly", pts }], op: "extrude", height: depth },
    position: [r1(x), r1(y), r1(z)],
    rotation: [90, 0, 0],
    ...extra,
  });

export function buildFigure(v) {
  const S = STYLES[v.style] || STYLES.classic;
  const block = !!S.block;
  const pegBody = !!S.peg;
  const k = v.scale / 100;
  const pct = (id) => (v[id] ?? 100) / 100;
  const H = r1(S.H * k * pct("headSize")); // head size
  const bw = r1(S.bw * k * pct("bodyWidth")); // body width
  const bd = r1(bw * (block ? 0.5 : 0.72)); // body depth
  const bh = r1(S.bh * k * pct("bodyHeight")); // body height
  const lw = r1(Math.max(4, S.lw * k) * pct("legThick")); // leg width
  const ll = pegBody ? 0 : r1(S.ll * k * pct("legLength")); // leg length
  const s = (k * (S.H + S.bh + S.ll)) / 53; // size of held things
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
  // Far enough out that wide or walking feet on long legs stay on the stand.
  const stepOut =
    v.stance === "wide"
      ? (block ? lw / 2 : bw * 0.22) + Math.max(lw * 1.1, ll * 0.3)
      : v.stance === "walk"
        ? Math.max(lw * 0.8, ll * 0.32)
        : 0;
  const footRoom = stepOut ? 2 * (stepOut + lw * (S.foot || 1) * 1.8 * pct("feetSize")) + 2 : 0;
  const baseD = r1(
    Math.max(
      bw * 2.1 * pct("standSize"),
      H * 1.5,
      (ll + bh) * 0.5 * pct("standSize"),
      footRoom,
      name ? textWidth(name, v.font, nameSize) + 14 : 0,
    ),
  );
  const z0 = !hasBase ? 0 : v.base === "pedestal" ? 9 : 3;
  if (hasBase) {
    if (v.base === "round")
      parts.push(
        o("cylinder", {
          name: "Stand",
          params: { d: baseD, h: 3, edge: 0.8, edgeStyle: "round" },
        }),
      );
    if (v.base === "square")
      parts.push(
        o("box", {
          name: "Stand",
          params: {
            w: baseD,
            d: r1(baseD * 0.8),
            h: 3,
            radius: 5,
            edge: 0.8,
            edgeStyle: "round",
          },
        }),
      );
    if (v.base === "hex")
      parts.push(
        o("polygon", {
          name: "Stand",
          params: { sides: 6, d: r1(baseD * 1.08), h: 3 },
          rotation: [0, 0, 30],
        }),
      );
    if (v.base === "star") parts.push(star(r1(baseD * 1.25), 0, 3, { name: "Stand" }, 3));
    if (v.base === "heart")
      parts.push(
        ...heart(r1(baseD * 1.15), 0, 3, { name: "Stand" }).map((p) => ({
          ...p,
          position: [p.position[0], r1(p.position[1] - baseD * 0.1), p.position[2]],
        })),
      );
    if (v.base === "rock") {
      parts.push(o("cylinder", { name: "Stand", params: { d: r1(baseD * 0.9), h: 2.4 } }));
      // A middle lump so feet close together still land on rock.
      parts.push(blob("Stand", [0, 0, 1.6], [baseD * 0.42, baseD * 0.38, 4.8]));
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2 + 0.3;
        const rr = baseD * (0.3 + 0.08 * Math.sin(i * 2.7));
        const w = baseD * (0.3 + 0.06 * Math.cos(i * 1.9));
        parts.push(blob("Stand", [rr * Math.cos(a), rr * Math.sin(a), 1.4], [w, w * 0.85, 4.4 + (i % 3)], [0, 0, (i * 40) % 180]));
      }
    }
    if (v.base === "pedestal") {
      parts.push(o("cylinder", { name: "Stand", params: { d: baseD, h: 3, edge: 0.8, edgeStyle: "round" } }));
      parts.push(o("cylinder", { name: "Stand", params: { d: r1(baseD * 0.84), h: 4.4 }, position: [0, 0, 2.6] }));
      parts.push(
        o("cylinder", { name: "Stand", params: { d: r1(baseD * 0.92), h: 2.4, edge: 0.6, edgeStyle: "round" }, position: [0, 0, 6.6] }),
      );
    }
    if (name) {
      const ny = { square: 0.28, star: 0.12, heart: 0.24, rock: 0.3, pedestal: 0.33 }[v.base] ?? 0.33;
      parts.push(text(name, v.font, nameSize, 1.2, [0, r1(-baseD * ny), z0 - 0.2]));
    }
  }
  mark("stand", { Words: "name" });
  // The figure stands a little behind the middle so the name has room.
  const fy = hasBase && name ? r1(baseD * 0.06) : 0;

  // ---- feet and legs ----
  const legX = r1(block ? lw / 2 - 0.3 : bw * 0.22);
  const footH = block || pegBody ? 0 : v.feet === "skates" ? 4 + Math.max(3, lw * 0.55) : v.feet === "flippers" ? 2.4 : 4;
  const zb = pegBody ? z0 : r1(z0 + footH + ll - 1); // bottom of the body
  // Where each foot stands, by stance. Legs run from the hip to the foot.
  const footAt = (sx) => {
    const spread = Math.max(lw * 1.1, ll * 0.3);
    if (v.stance === "wide") return [sx * (legX + spread), fy, z0];
    if (v.stance === "walk") return [sx * legX, fy + (sx < 0 ? -1 : 1) * Math.max(lw * 0.8, ll * 0.32), z0];
    if (v.stance === "crossed") return [-sx * legX * 0.45, fy - sx * lw * 0.45, z0];
    return [sx * legX, fy, z0];
  };
  if (!pegBody) {
    const fl = lw * (S.foot || 1);
    for (const sx of [-1, 1]) {
      const [x, yF] = footAt(sx).map(r1);
      const footStart = parts.length;
      if (block) {
        // Square legs straight down to the stand.
      } else if (v.feet === "sneakers") {
        parts.push(
          o("box", {
            name: "Sole",
            params: { w: r1(fl * 1.2), d: r1(fl * 1.9), h: 1.4, radius: r1(fl * 0.5) },
            position: [x, r1(yF - fl * 0.3), z0],
          }),
        );
        parts.push(blob("Sneaker", [x, yF - fl * 0.28, z0 + 1.2 + (footH - 1.2) * 0.45], [fl * 1.1, fl * 1.8, (footH - 0.6) * 1.25]));
        parts.push(blob("Sneaker", [x, yF + fl * 0.05, z0 + footH * 0.7], [fl * 1.05, fl * 1.1, footH * 1.1]));
      } else if (v.feet === "boots") {
        const shaft = footH + Math.min(Math.max(3, ll * 0.4), 10);
        parts.push(
          o("cylinder", { name: "Boot", params: { d: r1(fl * 1.32), h: r1(shaft), edge: 0.6, edgeStyle: "round" }, position: [x, yF, z0] }),
        );
        parts.push(
          o("tube", { name: "Boot cuff", params: { d: r1(fl * 1.5), id: r1(fl * 1.1), h: 1.6 }, position: [x, yF, r1(z0 + shaft - 1.6)] }),
        );
        parts.push(blob("Boot", [x, yF - fl * 0.55, z0 + footH * 0.42], [fl * 1.2, fl * 1.5, footH * 0.95]));
        parts.push(
          o("box", {
            name: "Sole",
            params: { w: r1(fl * 1.3), d: r1(fl * 2.1), h: 1.2, radius: r1(fl * 0.5) },
            position: [x, r1(yF - fl * 0.35), z0],
          }),
        );
      } else if (v.feet === "bare") {
        parts.push(blob("Bare foot", [x, yF - fl * 0.3, z0 + 1.5], [fl * 1.05, fl * 1.7, 3.4]));
        for (let i = -1; i <= 1; i++)
          parts.push(ball("Bare foot", [x + i * fl * 0.28, yF - fl * 1.08, z0 + 1.1], Math.max(1.4, fl * 0.32)));
      } else if (v.feet === "slippers") {
        parts.push(blob("Slipper", [x, yF - fl * 0.35, z0 + footH * 0.5], [fl * 1.35, fl * 2, footH * 1.2]));
        for (const ex of [-1, 1])
          parts.push(
            blob(
              "Slipper ear",
              [x + ex * fl * 0.3, yF - fl * 0.6, z0 + footH + fl * 0.35],
              [fl * 0.32, fl * 0.2, fl * 1.1],
              [12, ex * 20, 0],
            ),
          );
      } else if (v.feet === "clown") {
        parts.push(blob("Clown shoe", [x, yF - fl * 0.9, z0 + footH * 0.5], [fl * 1.7, fl * 3.4, footH * 1.25]));
        parts.push(ball("Clown shoe", [x, yF, z0 + footH * 0.75], fl * 1.2));
      } else if (v.feet === "flippers") {
        parts.push(o("cylinder", { name: "Flipper", params: { d: r1(fl * 1.2), h: r1(footH + 1.6) }, position: [x, yF, z0] }));
        const w = fl * 1.9;
        const L = fl * 3.4;
        const pts = [
          [-w * 0.3, 0],
          [w * 0.3, 0],
          [w * 0.55, -L * 0.85],
          [w * 0.25, -L],
          [0, -L * 0.9],
          [-w * 0.25, -L],
          [-w * 0.55, -L * 0.85],
        ].map((p) => p.map(r1));
        parts.push(
          o("sketch", {
            name: "Flipper",
            params: { shapes: [{ kind: "poly", pts, radius: 0.8 }], op: "extrude", height: 1.6 },
            position: [x, r1(yF + fl * 0.4), z0],
          }),
        );
      } else if (v.feet === "skates") {
        const wd = r1(Math.max(3, lw * 0.55));
        parts.push(
          o("box", {
            name: "Skate plate",
            params: { w: r1(fl * 0.9), d: r1(fl * 2.1), h: 1.2, radius: 0.4 },
            // Low enough to overlap the wheels even when they sink into the stand.
            position: [x, r1(yF - fl * 0.3), r1(z0 + wd - 1.1)],
          }),
        );
        for (const py of [-1, 1])
          parts.push(
            o("cylinder", {
              name: "Skate wheel",
              params: { d: wd, h: r1(fl * 1.05), edge: 0.5, edgeStyle: "round" },
              position: [r1(x - fl * 0.52), r1(yF - fl * 0.3 + py * fl * 0.65), r1(z0 + wd / 2 - (hasBase ? 0.5 : 0))],
              rotation: [0, 90, 0],
            }),
          );
        parts.push(blob("Skate", [x, yF - fl * 0.25, z0 + wd + (footH - wd) * 0.5], [fl * 1.15, fl * 1.8, (footH - wd) * 1.4 + 1]));
        parts.push(o("cylinder", { name: "Skate", params: { d: r1(fl * 1.2), h: r1(footH - wd + 3) }, position: [x, yF, r1(z0 + wd)] }));
      } else {
        const wd = r1(lw * 1.6);
        parts.push(
          o("cylinder", {
            name: "Wheel",
            params: { d: wd, h: r1(lw * 0.9), edge: 0.8, edgeStyle: "round" },
            position: [r1(x - lw * 0.45), yF, r1(z0 + wd / 2 - (hasBase ? 0.6 : 0))],
            rotation: [0, 90, 0],
          }),
        );
      }
      grow(parts, footStart, pct("feetSize"), [x, yF, z0]);
      // Legs: pants down to the feet, shorts over bare shins, or bare.
      const foot = [x, yF, block ? z0 - 0.4 : z0 + 1];
      const hip = [sx * legX, fy, zb + 1.4];
      const at = (t) => foot.map((n, j) => n + (hip[j] - n) * t);
      const leg = (nm, a, b, w, w2 = w) =>
        block
          ? aim("box", nm, { w: r1(w), d: r1(w), radius: 0 }, a, b)
          : w2 === w
            ? aim("cylinder", nm, { d: r1(w) }, a, b)
            : aim("cone", nm, { d1: r1(w), d2: r1(w2) }, a, b);
      const lean = foot[0] !== hip[0] || foot[1] !== hip[1];
      if (lean && !block) parts.push(ball("Leg", hip, lw)); // a round hip so angled legs stay joined
      if (v.legWear === "shorts") {
        parts.push(leg("Shin", foot, at(0.6), lw));
        parts.push(leg("Leg", at(0.52), hip, lw * (block ? 1 : 1.12)));
      } else if (v.legWear === "flared") {
        parts.push(leg("Leg", foot, at(0.45), lw * 1.55, lw));
        parts.push(leg("Leg", at(0.44), hip, lw));
      } else if (v.legWear === "cuffs") {
        parts.push(leg("Leg", foot, hip, lw));
        parts.push(leg("Cuff", at(block ? 0.02 : 0.06), at(0.2), lw * 1.25));
      } else parts.push(leg(v.legWear === "bare" ? "Shin" : "Leg", foot, hip, lw));
    }
  }
  mark("shoes", { Leg: "legs", Cuff: "legs", Shin: "skin", "Bare foot": "skin" });

  // ---- body ----
  // Each body knows how far its front is from the middle at a height (`front`)
  // and how wide it is (`half`), so things placed on it stay on its surface.
  const bodyH = pegBody ? r1(bh) : bh;
  let body;
  const cone = (d1, d2) => {
    const at = (z) => (d1 + (d2 - d1) * Math.min(1, Math.max(0, (z - zb) / bodyH))) / 2;
    return { round: true, front: (z) => -at(z), half: at, d: (z) => at(z) * 2 };
  };
  if (v.body === "round") {
    parts.push(
      o("cylinder", {
        name: "Body",
        params: {
          d: bw,
          h: bodyH,
          edge: r1(Math.min(bw / 2 - 0.6, bodyH / 2 - 0.6, (block ? 1 : 6) * k, pegBody ? bw * 0.2 : 99)),
          edgeStyle: "round",
        },
        position: [0, fy, zb],
      }),
    );
    const e = Math.min(bw / 2 - 0.6, bodyH / 2 - 0.6, (block ? 1 : 6) * k, pegBody ? bw * 0.2 : 99);
    body = {
      round: true,
      edge: e,
      front: () => -bw / 2,
      half: () => bw / 2,
      d: () => bw,
    };
  } else if (v.body === "boxy" || v.body === "slim") {
    const w = v.body === "slim" ? bw * 0.78 : bw;
    const d = v.body === "slim" ? bd * 0.85 : bd;
    parts.push(
      o("box", {
        name: "Body",
        params: {
          w: r1(w),
          d: r1(d),
          h: bodyH,
          radius: block ? 0.6 : r1(w * 0.18),
          edge: block ? 0.4 : r1(Math.min(2, bodyH / 4)),
          edgeStyle: "round",
        },
        position: [0, fy, zb],
      }),
    );
    body = { round: false, front: () => -d / 2, half: () => w / 2, w, dd: d };
  } else if (v.body === "chubby") {
    // A big egg, a little taller than the body so it covers the hips and neck.
    const w = bw * 1.22;
    const hh = bodyH * 0.62;
    const zc = zb + bodyH * 0.5;
    parts.push(blob("Body", [0, fy, zc], [w, w * 0.92, hh * 2]));
    const at = (z) => (w / 2) * 0.96 * Math.sqrt(Math.max(0.12, 1 - ((z - zc) / hh) ** 2));
    body = { round: true, front: (z) => -at(z) * 0.92, half: at, d: (z) => at(z) * 2 };
  } else {
    // A cone: wider at the bottom (hoodie) or at the shoulders (strong).
    const [d1, d2] = v.body === "hoodie" ? [bw * 1.15, bw * 0.8] : [bw * 0.8, bw * 1.12];
    parts.push(
      o("cone", {
        name: "Body",
        params: { d1: r1(d1), d2: r1(d2), h: bodyH },
        position: [0, fy, zb],
      }),
    );
    if (v.body === "hoodie")
      parts.push(
        o("tube", {
          name: "Hood",
          params: {
            d: r1(bw * 0.92),
            id: r1(Math.min(bw * 0.5, Math.max(4, Math.min(bw, H) * 0.45) - 0.4)),
            h: r1(Math.max(3, bodyH * 0.18)),
          },
          position: [0, r1(fy + 1), r1(zb + bodyH - 1)],
        }),
      );
    else
      parts.push(
        o("cylinder", {
          name: "Shoulders",
          params: {
            d: r1(d2),
            h: r1(bodyH * 0.14),
            edge: r1(bodyH * 0.06),
            edgeStyle: "round",
          },
          position: [0, fy, r1(zb + bodyH * 0.86)],
        }),
      );
    body = cone(d1, d2);
    if (v.body === "strong" && !block) {
      // A chest, so it reads as muscly rather than as a bucket.
      const z = zb + bodyH * 0.7;
      for (const sx of [-1, 1])
        parts.push(
          blob("Body", [sx * body.half(z) * 0.4, fy + body.front(z) + bw * 0.1, z], [body.half(z) * 0.8, bw * 0.32, bodyH * 0.24]),
        );
    }
  }
  const top = zb + bodyH;
  const frontY = (z) => r1(fy + body.front(z));
  const backAt = (z) => fy - body.front(z);
  // A ring around the body at a height, a little proud of it.
  const band = (nm, z, h, grow2 = 1.2) =>
    body.round
      ? o("cone", {
          name: nm,
          params: { d1: r1(body.d(z) + grow2), d2: r1(body.d(z + h) + grow2), h: r1(h) },
          position: [0, fy, r1(z)],
        })
      : o("box", {
          name: nm,
          params: {
            w: r1(body.w + grow2),
            d: r1(body.dd + grow2),
            h: r1(h),
            radius: block ? 0.6 : r1(body.w * 0.18 + grow2 / 2),
          },
          position: [0, fy, r1(z)],
        });
  mark("body", { Hood: "body", Shoulders: "body" });

  // ---- clothes ----
  if (v.outfit === "tie") {
    const w = Math.max(3, bw * 0.16);
    const len = bodyH * 0.6;
    const pts = [
      [-w * 0.35, 0],
      [w * 0.35, 0],
      [w * 0.22, -w * 0.5],
      [w * 0.5, -len + w * 0.6],
      [0, -len],
      [-w * 0.5, -len + w * 0.6],
      [-w * 0.22, -w * 0.5],
    ].map((p) => p.map(r1));
    const z = top - bodyH * 0.06;
    parts.push(
      standUp(
        o("sketch", {
          name: "Tie",
          params: {
            shapes: [{ kind: "poly", pts }],
            op: "extrude",
            height: 1.6,
          },
          position: [0, 0, -0.5],
        }),
        frontY(z - len / 2),
        r1(z),
      ),
    );
  } else if (v.outfit === "overalls") {
    const zTop = zb + bodyH * 0.74;
    parts.push(
      band("Overalls", zb - (pegBody ? 0 : Math.min(ll * 0.35, 4)), zb + bodyH * 0.25 - zb + (pegBody ? 0 : Math.min(ll * 0.35, 4)), 1),
    );
    const w = r1(bw * 0.5);
    const d = r1(2 + bw * 0.1 + Math.abs(body.front(zTop) - body.front(zb)));
    parts.push(
      o("box", {
        name: "Bib",
        params: { w, d, h: r1(zTop - zb - bodyH * 0.15), radius: 0.6 },
        position: [0, r1(Math.min(frontY(zTop), frontY(zb)) + d / 2 - 1.1), r1(zb + bodyH * 0.15)],
      }),
    );
    for (const sx of [-1, 1])
      parts.push(
        o("box", {
          name: "Strap",
          params: {
            w: r1(Math.max(2, bw * 0.08)),
            d: r1(d),
            h: r1(top - zTop + 0.6),
          },
          position: [r1(sx * w * 0.36), r1(frontY(top) + d / 2 - 1.1), r1(zTop - 0.6)],
        }),
      );
  } else if (v.outfit === "armor") {
    const z = zb + bodyH * 0.42;
    parts.push(band("Breastplate", z, top - z - (body.round ? bodyH * 0.02 : 0.4), 2));
    const r = Math.max(5, Math.min(bw, bodyH) * 0.3);
    for (const sx of [-1, 1]) parts.push(ball("Pauldron", [sx * body.half(top) * 0.9, fy, top - r * 0.25], r * 2));
  } else if (["jacket", "suit", "vest", "labcoat"].includes(v.outfit)) {
    // A coat over the shirt: the body color shows down the open front.
    const long = v.outfit === "labcoat";
    const z1 = v.outfit === "vest" ? zb + bodyH * 0.12 : zb - (pegBody ? 0 : Math.min(ll * 0.12, 2));
    const z2 = top - (v.outfit === "vest" ? bodyH * 0.1 : 0.4);
    parts.push(band("Jacket", z1, z2 - z1, 1.6));
    if (long) {
      const dTop = (body.round ? body.d(zb) : Math.max(body.w, body.dd)) + 1.6;
      const h = Math.min(Math.max(4, ll * 0.55), zb - z0 - 0.5);
      if (h > 1)
        parts.push(
          o("cone", { name: "Jacket", params: { d1: r1(dTop * 1.1), d2: r1(dTop), h: r1(h + 0.6) }, position: [0, fy, r1(zb - h)] }),
        );
    }
    const out = (z) => frontY(z) - 0.8 - 0.5; // just in front of the coat
    const sw = Math.max(3, bw * (v.outfit === "vest" ? 0.34 : 0.26));
    const stripLo = v.outfit === "vest" ? zb + bodyH * 0.5 : zb + bodyH * 0.02;
    parts.push(
      aim("box", "Shirt", { w: r1(sw), d: 1.4, radius: 0 }, [0, out(stripLo) + 0.7, stripLo], [0, out(top - 0.6) + 0.7, top - 0.6]),
    );
    // Lapels: two folds from the collar down to the top button.
    const lz = v.outfit === "vest" ? stripLo : zb + bodyH * 0.45;
    for (const sx of [-1, 1]) {
      const pts = [
        [sx * sw * 0.5, top - lz],
        [sx * sw * 1.5, top - lz + bodyH * 0.06],
        [sx * sw * 1.1, 0],
        [sx * sw * 0.3, 0],
      ].map(([x, z]) => [r1(x), r1(z - (top - lz))]);
      if (sx < 0) pts.reverse();
      parts.push(facePlate("Lapel", pts, 0, Math.min(out(lz), out(top)) + 0.9, top - 0.2 - 0, 1.6));
    }
    // Sunk a little into the body, which bulges past the coat on chubby bodies.
    const bd = Math.max(1.8, bw * 0.08);
    parts.push(ball("Coat button", [0, Math.max(out(lz) - 0.2, frontY(lz) - bd * 0.3), lz], bd));
    if (long) {
      const px = -bw * 0.24;
      const pz = zb + bodyH * 0.2;
      const curve = body.round ? body.half(pz) - Math.sqrt(Math.max(0, body.half(pz) ** 2 - px * px)) : 0;
      const yF = out(pz) - 0.4;
      const yB = frontY(pz) + curve + 0.6;
      parts.push(
        o("box", {
          name: "Pocket",
          params: { w: r1(bw * 0.22), d: r1(yB - yF), h: r1(bodyH * 0.16), radius: 0.5 },
          position: [r1(px), r1((yF + yB) / 2), r1(zb + bodyH * 0.12)],
        }),
      );
    }
    if (v.outfit === "suit") {
      const w = Math.max(2.6, sw * 0.55);
      const len = (top - stripLo) * 0.62;
      const pts = [
        [-w * 0.35, 0],
        [w * 0.35, 0],
        [w * 0.22, -w * 0.5],
        [w * 0.5, -len + w * 0.6],
        [0, -len],
        [-w * 0.5, -len + w * 0.6],
        [-w * 0.22, -w * 0.5],
      ].map((p) => p.map(r1));
      parts.push(facePlate("Suit tie", pts, 0, out(top - len / 2) + 0.4, top - 0.6, 1.2));
    }
  } else if (v.outfit === "dress") {
    const zt = zb + bodyH * 0.62;
    parts.push(band("Dress", zb, zt - zb, 1.4));
    const dTop = (body.round ? body.d(zb) : Math.max(body.w, body.dd)) + 1.4;
    const h = r1(Math.min(zb - z0 - 0.3, Math.max(5, ll * 0.6)) + 1);
    parts.push(
      o("cone", {
        name: "Dress",
        params: { d1: r1(Math.max(dTop * 1.45, (legX + lw) * 2 + 3)), d2: r1(dTop), h },
        position: [0, fy, r1(zb + 1 - h)],
      }),
    );
  } else if (v.outfit === "tutu") {
    const z = zb + bodyH * 0.1;
    const r = (body.round ? body.d(z) : Math.max(body.w, body.dd)) / 2;
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2;
      parts.push(
        blob(
          "Tutu",
          [Math.cos(a) * (r + bw * 0.12), fy + Math.sin(a) * (r * (body.round ? 1 : 0.8) + bw * 0.12), z],
          [bw * 0.42, bw * 0.3, Math.max(2.4, bodyH * 0.14)],
          [0, 0, (a * 180) / Math.PI],
        ),
      );
    }
    parts.push(band("Tutu", z - 1, Math.max(2, bodyH * 0.1), 1.2));
  } else if (v.outfit === "trunks") {
    const h = bodyH * 0.22 + (pegBody ? 0 : Math.min(ll * 0.15, 3));
    parts.push(band("Trunks", zb - (pegBody ? 0 : Math.min(ll * 0.15, 3)), h, 1.4));
  } else if (v.outfit === "robe") {
    const zt = zb + bodyH * 0.3;
    const dTop = (body.round ? body.d(zt) : Math.max(body.w, body.dd)) + 1.5;
    const dBot = Math.max(dTop * 1.15, (legX + lw) * 2 + 4);
    parts.push(
      o("cone", {
        name: "Robe",
        params: { d1: r1(dBot), d2: r1(dTop), h: r1(zt - z0 + 0.4) },
        position: [0, fy, r1(z0 - 0.4)],
      }),
    );
  } else if (v.outfit === "skirt") {
    const zt = zb + bodyH * 0.18;
    const dTop = (body.round ? body.d(zt) : Math.max(body.w, body.dd)) + 1.2;
    const h = r1(Math.min(zt - z0, bodyH * 0.18 + Math.max(4, ll * 0.45)));
    parts.push(
      o("cone", {
        name: "Skirt",
        params: { d1: r1(dTop * 1.4), d2: r1(dTop), h },
        position: [0, fy, r1(zt - h)],
      }),
    );
  }
  mark("clothes", { Shirt: "body", "Coat button": "details", "Suit tie": "details" });

  // ---- badge, belt and neckwear ----
  if (v.belt) {
    const zbelt = r1(zb + bodyH * 0.22);
    parts.push(band("Belt", zbelt, 2.4, v.outfit === "armor" ? 1.2 : 1.2));
    parts.push(
      o("box", {
        name: "Buckle",
        params: { w: r1(Math.max(3.5, lw * 0.9)), d: 2, h: 3.4, radius: 0.6 },
        position: [0, r1(frontY(zbelt) - 0.6), r1(zbelt - 0.5)],
      }),
    );
  }
  // Chest badge, drawn flat then stood on the body front.
  const es = r1(Math.min(bw, bodyH) * 0.34);
  const chestZ = r1(zb + bodyH * 0.6);
  let emblem = [];
  if (v.emblem === "heart") emblem = heart(es, 0, 1.4);
  if (v.emblem === "star") emblem = [star(es * 1.2, 0, 1.4)];
  if (v.emblem === "dot") emblem = [o("cylinder", { name: "Button", params: { d: r1(es * 0.7), h: 1.4 } })];
  if (v.emblem === "bolt") {
    const s2 = es / 2;
    const pts = [
      [0.2, 1],
      [-0.55, -0.1],
      [-0.05, -0.1],
      [-0.25, -1],
      [0.55, 0.15],
      [0.05, 0.15],
    ].map(([x, y]) => [r1(x * s2), r1(y * s2)]);
    emblem = [
      o("sketch", {
        name: "Bolt",
        params: { shapes: [{ kind: "poly", pts }], op: "extrude", height: 1.4 },
      }),
    ];
  }
  const flat = (nm, pts) =>
    o("sketch", { name: nm, params: { shapes: [{ kind: "poly", pts: pts.map((p) => p.map(r1)) }], op: "extrude", height: 1.4 } });
  const disc = (nm, x, y, d) => o("cylinder", { name: nm, params: { d: r1(d), h: 1.4 }, position: [r1(x), r1(y), 0] });
  if (v.emblem === "moon") {
    const r = es * 0.55;
    const pts = [];
    for (let i = 0; i <= 14; i++) {
      const a = ((56.8 + (i * (303.2 - 56.8)) / 14) * Math.PI) / 180;
      pts.push([r * Math.cos(a), r * Math.sin(a)]);
    }
    for (let i = 1; i < 10; i++) {
      const a = ((280 - (i * 200) / 10) * Math.PI) / 180;
      pts.push([0.4 * r + 0.85 * r * Math.cos(a), 0.85 * r * Math.sin(a)]);
    }
    emblem = [flat("Moon", pts)];
  }
  if (v.emblem === "gem")
    emblem = [
      flat(
        "Gem",
        [
          [-0.6, 0.5],
          [0.6, 0.5],
          [1, 0.1],
          [0, -1],
          [-1, 0.1],
        ].map(([x, y]) => [x * es * 0.5, y * es * 0.5]),
      ),
    ];
  if (v.emblem === "paw") {
    emblem = [o("cylinder", { name: "Paw", params: { d: r1(es * 0.55), h: 1.4 }, scale: [1, 0.85, 1], position: [0, r1(-es * 0.12), 0] })];
    for (const [x, y] of [
      [-0.36, 0.2],
      [-0.13, 0.36],
      [0.13, 0.36],
      [0.36, 0.2],
    ])
      emblem.push(disc("Paw", x * es, y * es, es * 0.2));
  }
  if (v.emblem === "flower") {
    emblem = [];
    for (let i = 0; i < 5; i++) {
      const a = Math.PI / 2 + (i * 2 * Math.PI) / 5;
      emblem.push(disc("Petal", Math.cos(a) * es * 0.27, Math.sin(a) * es * 0.27, es * 0.36));
    }
    emblem.push(disc("Flower middle", 0, 0, es * 0.3));
  }
  // Armor sits proud of the body, so the badge moves out with it.
  const chestFront =
    v.outfit === "overalls"
      ? Math.min(frontY(chestZ), Math.min(frontY(zb + bodyH * 0.74), frontY(zb)) - 1.1)
      : frontY(chestZ) - ({ armor: 1, jacket: 1.3, suit: 1.3, vest: 1.3, labcoat: 1.3, dress: 0.8 }[v.outfit] ?? 0);
  const badgeStart = parts.length;
  parts.push(
    // Each piece reaches back into the body far enough to stay on it where
    // a round or chubby chest curves away from the flat badge.
    ...emblem.map((p) => {
      // Through any coat to the body itself, and deeper when the badge is
      // shrunk, since shrinking it also makes it thinner.
      const reach =
        frontY(chestZ) - chestFront + Math.max(0, frontY(chestZ + p.position[1]) - frontY(chestZ)) + Math.abs(p.position[0]) * 0.35;
      const back = 0.4 + reach / Math.min(1, pct("badgeSize"));
      const params = { ...p.params };
      if (typeof params.h === "number") params.h = r1(params.h + back - 0.4);
      if (typeof params.height === "number") params.height = r1(params.height + back - 0.4);
      return standUp({ ...p, params, position: [p.position[0], p.position[1], r1(p.position[2] - back)] }, r1(chestFront), chestZ);
    }),
  );
  grow(parts, badgeStart, pct("badgeSize"), [0, r1(chestFront + 0.2), chestZ]);

  const neckD = r1(Math.max(4, Math.min(bw, H) * 0.45));
  if (v.neck === "scarf") {
    const d = Math.max(neckD + 4, body.half(top) * 1.5);
    parts.push(
      o("tube", {
        name: "Scarf",
        params: {
          d: r1(d),
          id: r1(neckD * 0.7),
          h: r1(Math.max(3, bodyH * 0.14)),
        },
        position: [0, fy, r1(top - 1)],
      }),
    );
    const tw = r1(Math.max(3, bw * 0.16));
    // The end hangs from the front of the ring down over the chest, which
    // can bulge out past the ring on round bodies.
    const zEnd = top - bodyH * 0.4;
    const yEnd = Math.min(fy - d / 2 + 1.6, frontY(zEnd) - 0.3);
    parts.push(
      aim(
        "box",
        "Scarf end",
        { w: tw, d: 2.4, radius: 0.6 },
        [r1(d * 0.18), r1(fy - d / 2 + 1.4), r1(top - 1 + Math.max(3, bodyH * 0.14) * 0.6)],
        [r1(d * 0.26), r1(yEnd), r1(zEnd)],
      ),
    );
  } else if (v.neck === "bowtie") {
    const z = top - Math.max(3, bodyH * 0.1);
    const w = Math.max(3.5, bw * 0.17);
    const y = frontY(z) + w * 0.15;
    for (const sx of [-1, 1]) parts.push(aim("cone", "Bow", { d1: 0.8, d2: r1(w * 0.9) }, [0, y, z], [sx * w, y, z]));
    parts.push(ball("Bow knot", [0, y, z], w * 0.45));
  } else if (v.neck === "necklace") {
    parts.push(
      o("tube", {
        name: "Necklace",
        params: { d: r1(neckD + 3.6), id: r1(neckD - 0.4), h: 1.6 },
        position: [0, fy, r1(top - 0.6)],
      }),
    );
    const z = top - bodyH * 0.22;
    parts.push(ball("Pendant", [0, frontY(z) + 0.4, z], Math.max(3.4, bw * 0.15)));
    parts.push(peg("Chain", [0, frontY(top - 1) + 1.4, top - 0.2], [0, frontY(z) + 0.2, z], 1.2));
  } else if (v.neck === "chain" || v.neck === "lei" || v.neck === "medal") {
    // Hangs from both sides of the neck and dips down the chest.
    const rN = neckD / 2 + 1;
    const dip = bodyH * (v.neck === "medal" ? 0.32 : v.neck === "lei" ? 0.26 : 0.22);
    const zt = top - 0.6;
    const pts = [];
    for (let i = 0; i <= 8; i++) {
      const t = i / 8;
      const x = -rN - bw * 0.06 + t * (2 * rN + bw * 0.12);
      const z = zt - dip * Math.sin(Math.PI * t);
      // A rounded top edge sits back from the front, so follow it there.
      const e = body.edge || 0;
      const dz = z - (top - e);
      const recess = e && dz > 0 ? e - Math.sqrt(Math.max(0, e * e - dz * dz)) : 0;
      pts.push([x, Math.min(frontY(z) + recess, frontY(zt) + 1.5 + recess) + 0.6, z]);
    }
    if (v.neck === "lei") {
      pts.forEach((p, i) => parts.push(ball(i % 2 ? "Lei flower" : "Lei", p, Math.max(3, bw * (i % 2 ? 0.17 : 0.14)))));
      for (const sx of [-1, 1]) parts.push(ball("Lei", [sx * rN, fy + rN * 0.3, zt + 0.4], Math.max(3, bw * 0.15)));
    } else {
      const d = v.neck === "chain" ? Math.max(1.6, bw * 0.07) : Math.max(1.4, bw * 0.06);
      if (v.neck === "medal") parts.push(...chain("Ribbon", [pts[0], pts[4], pts[8]], d * 1.6));
      else parts.push(...chain("Chain", pts, d));
      const z = zt - dip;
      const md = Math.max(4, bw * (v.neck === "medal" ? 0.24 : 0.2));
      parts.push(
        o("cylinder", {
          name: "Medallion",
          params: { d: r1(md), h: 1.6, edge: 0.4, edgeStyle: "round" },
          position: [0, r1(frontY(z - md * 0.4) + 0.6), r1(z - md * 0.4)],
          rotation: [90, 0, 0],
        }),
      );
    }
  } else if (v.neck === "collar") {
    parts.push(o("tube", { name: "Collar", params: { d: r1(neckD + 4), id: r1(neckD - 0.4), h: 3.2 }, position: [0, fy, r1(top - 0.9)] }));
    const bell = Math.max(3.6, bw * 0.2);
    // The bell hangs on the chest, out from under the chin, on a short loop.
    const bz = top - bell * 0.75;
    const bc = [0, Math.min(fy - neckD / 2 - bell * 0.35, frontY(bz) - bell * 0.3), bz];
    parts.push(peg("Bell", [0, fy - neckD / 2 - 0.6, top + 0.8], bc, Math.max(1.4, bell * 0.3)));
    parts.push(ball("Bell", bc, bell));
  }
  mark("details", { Scarf: "clothes", "Scarf end": "clothes", Ribbon: "clothes", Collar: "clothes", "Lei flower": "clothes" });

  // ---- head ----
  const neckZ = top;
  let headZ0; // bottom of the head part
  let headTop;
  let hc; // head center height
  let halfW; // half width of the head
  let halfD; // half depth of the head
  let faceY; // (x, z) -> front surface y, before the fy shift
  let roundHead = true;
  if (v.head === "round") {
    headZ0 = r1(neckZ - H * 0.12);
    hc = headZ0 + H / 2;
    headTop = headZ0 + H;
    halfW = halfD = H / 2;
    parts.push(
      o("sphere", {
        name: "Head",
        params: { d: H },
        position: [0, fy, headZ0],
      }),
    );
    faceY = (x, z) => -Math.sqrt(Math.max(0, (H / 2) ** 2 - x * x - (z - hc) ** 2));
  } else if (v.head === "oval") {
    // A capsule: a little taller than wide.
    const hh = H * 1.22;
    headZ0 = r1(neckZ - H * 0.12);
    hc = headZ0 + hh / 2;
    headTop = headZ0 + hh;
    halfW = halfD = H / 2;
    parts.push(
      o("cylinder", {
        name: "Head",
        params: { d: H, h: r1(hh), edge: r1(H / 2 - 0.4), edgeStyle: "round" },
        position: [0, fy, headZ0],
      }),
    );
    const flat = (hh - H) / 2;
    faceY = (x, z) => {
      const dz = Math.max(0, Math.abs(z - hc) - flat);
      return -Math.sqrt(Math.max(0, (H / 2) ** 2 - x * x - dz * dz));
    };
  } else {
    roundHead = false;
    const wide = v.head === "wide";
    const hw = wide ? H * 1.25 : H;
    const hd = wide ? H * 0.82 : H * 0.9;
    const hh = wide ? H * 0.8 : H * 0.9;
    headZ0 = r1(neckZ - 1);
    hc = headZ0 + hh / 2;
    headTop = headZ0 + hh;
    halfW = hw / 2;
    halfD = hd / 2;
    const rad = block ? 0.6 : wide ? hd * 0.42 : H * 0.18;
    parts.push(
      o("box", {
        name: "Head",
        params: {
          w: r1(hw),
          d: r1(hd),
          h: r1(hh),
          radius: r1(rad),
          edge: block ? 0.4 : r1(Math.min(2.5, H * 0.08)),
          edgeStyle: "round",
        },
        position: [0, fy, headZ0],
      }),
    );
    // Flat in front, curving back around the rounded corners.
    faceY = (x) => {
      const over = Math.abs(x) - (halfW - rad);
      return over <= 0 ? -halfD : -(halfD - rad) - Math.sqrt(Math.max(0, rad * rad - over * over));
    };
  }
  // A neck so the head is always joined to the body.
  parts.push(
    o("cylinder", {
      name: "Neck",
      params: { d: neckD, h: r1(Math.max(3, headZ0 - neckZ + H * 0.3)) },
      position: [0, fy, r1(neckZ - 1)],
    }),
  );
  const fyAt = (x, z) => r1(fy + faceY(x, z));
  const domeZ = v.head === "oval" ? hc + (headTop - headZ0 - H) / 2 : hc; // center of the top curve

  mark("skin");

  // ---- face ----
  const eyeX = H * 0.19;
  const eyeZ = hc + H * 0.06;
  const eyeYs = (x, z, sink) => r1(fyAt(x, z) + sink);
  const eyeStart = parts.length;
  const ef = pct("eyeSize");
  const dotEye = (x) => {
    const d = r1(H * 0.13);
    parts.push(
      o("sphere", {
        name: "Eye",
        params: { d },
        position: [r1(x), eyeYs(x, eyeZ, d * 0.35), r1(eyeZ - d / 2)],
      }),
    );
  };
  const lineEye = (x, w = 0.2) =>
    parts.push(
      o("box", {
        name: "Eye",
        params: {
          w: r1(H * w),
          d: 3,
          h: r1(Math.max(1.2, H * 0.05)),
          radius: 0,
        },
        position: [r1(x), eyeYs(x, eyeZ, 0.6), r1(eyeZ - 1)],
      }),
    );
  if (v.eyes === "dots") {
    for (const sx of [-1, 1]) dotEye(sx * eyeX);
  } else if (v.eyes === "wink") {
    dotEye(-eyeX);
    lineEye(eyeX, 0.16);
  } else if (v.eyes === "big" || v.eyes === "cyclops" || v.eyes === "anime") {
    const xs = v.eyes === "cyclops" ? [0] : [-eyeX, eyeX];
    const d = r1(v.eyes === "big" ? H * 0.27 : v.eyes === "anime" ? H * 0.22 : H * 0.36);
    const tall = v.eyes === "anime" ? 1.45 : 1;
    for (const x of xs) {
      const y = eyeYs(x, eyeZ, 1.6);
      if (tall === 1)
        parts.push(
          o("cylinder", {
            name: "Eye",
            params: { d, h: 2.4 },
            position: [r1(x), y, r1(eyeZ)],
            rotation: [90, 0, 0],
          }),
        );
      else parts.push(facePlate("Eye", ellipse(d, d * tall), x, y, eyeZ, 2.4));
      // Pupil: a small dent in the eye, a little toward the middle and up.
      const px = r1(x - Math.sign(x) * d * 0.1);
      parts.push({
        ...o("cylinder", {
          name: "Pupil",
          hole: true,
          params: { d: r1(d * 0.42 * (tall > 1 ? 1.15 : 1)), h: 3 },
          position: [px, r1(y - 2.4 + 1), r1(eyeZ + d * 0.08 * tall)],
          rotation: [90, 0, 0],
        }),
        anchor: [r1(x), y, r1(eyeZ)],
      });
    }
  } else if (v.eyes === "happy") {
    // Upside-down U's, like a big smile with the eyes.
    const r = H * 0.09;
    const t = Math.min(r * 0.5, Math.max(1.2, H * 0.045));
    const pts = [];
    const n = r < 3 ? 5 : 10; // fewer corners on tiny eyes, or rounding folds the outline
    for (let i = 0; i <= n; i++) pts.push([r * Math.cos((i * Math.PI) / n), r * Math.sin((i * Math.PI) / n)]);
    for (let i = n; i >= 0; i--) pts.push([(r - t) * Math.cos((i * Math.PI) / n), (r - t) * Math.sin((i * Math.PI) / n)]);
    for (const sx of [-1, 1])
      parts.push(
        facePlate(
          "Eye",
          pts.map((p) => p.map(r1)),
          sx * eyeX,
          eyeYs(sx * eyeX, eyeZ, 1.6),
          eyeZ - r * 0.4,
          2.4,
        ),
      );
  } else if (v.eyes === "sleepy" || v.eyes === "angry") {
    // Half-shut: the bottom of a round eye under a straight lid. Angry tilts
    // the lid down toward the nose.
    const r = H * 0.075;
    for (const sx of [-1, 1]) {
      const pts = [];
      // Lid heights at the outer and inner corners (never below the corners, or the outline would cross itself).
      const [lo, li] = v.eyes === "angry" ? [0.45, 0.06] : [0.1, 0.1];
      for (let i = 0; i <= 8; i++) {
        const a = Math.PI + (i * Math.PI) / 8;
        pts.push([r * Math.cos(a), r * Math.sin(a) * 1.1]);
      }
      pts.push([r, r * (sx > 0 ? lo : li)], [-r, r * (sx > 0 ? li : lo)]);
      const x = sx * eyeX;
      parts.push(
        facePlate(
          "Eye",
          pts.map((p) => p.map(r1)),
          x,
          eyeYs(x, eyeZ, 1.6),
          eyeZ,
          2.4,
        ),
      );
      const lidT = Math.max(1.2, H * 0.035);
      parts.push(
        o("box", {
          name: "Eyelid",
          params: { w: r1(r * 2.5), d: 3, h: r1(lidT), radius: 0.4 },
          position: [r1(x), eyeYs(x, eyeZ, 0.6), r1(eyeZ + r * 0.2)],
          rotation: [0, v.eyes === "angry" ? sx * -18 : 0, 0],
        }),
      );
    }
  } else if (v.eyes === "closed") {
    // Peaceful closed eyes: little downward curves.
    const r = H * 0.085;
    const t = Math.min(r * 0.5, Math.max(1.2, H * 0.04));
    const n = r < 3 ? 5 : 10;
    const pts = [];
    for (let i = 0; i <= n; i++) pts.push([r * Math.cos(Math.PI + (i * Math.PI) / n), r * Math.sin(Math.PI + (i * Math.PI) / n)]);
    for (let i = n; i >= 0; i--)
      pts.push([(r - t) * Math.cos(Math.PI + (i * Math.PI) / n), (r - t) * Math.sin(Math.PI + (i * Math.PI) / n)]);
    for (const sx of [-1, 1])
      parts.push(
        facePlate(
          "Eye",
          pts.map((p) => p.map(r1)),
          sx * eyeX,
          eyeYs(sx * eyeX, eyeZ, 1.6),
          eyeZ + r * 0.4,
          2.4,
        ),
      );
  } else if (v.eyes === "lashes") {
    for (const sx of [-1, 1]) {
      const x = sx * eyeX;
      const d = r1(H * 0.15);
      parts.push(blob("Eye", [x, eyeYs(x, eyeZ, d * 0.3), eyeZ], [d, d, d * 1.25]));
      for (let i = 0; i < 3; i++) {
        const a = sx * (20 + i * 25);
        const from = [
          x + sx * d * 0.2 + Math.sin((a * Math.PI) / 180) * d * 0.4,
          eyeYs(x, eyeZ, 0.4),
          eyeZ + Math.cos((a * Math.PI) / 180) * d * 0.5,
        ];
        parts.push(
          aim("cone", "Eye", { d1: r1(Math.max(1.2, H * 0.04)), d2: 0.6 }, from, [
            from[0] + Math.sin((a * Math.PI) / 180) * H * 0.08,
            from[1],
            from[2] + H * 0.06,
          ]),
        );
      }
    }
  } else if (v.eyes === "heart" || v.eyes === "star") {
    const sz = r1(H * 0.2);
    for (const sx of [-1, 1]) {
      const x = sx * eyeX;
      const flatParts = v.eyes === "heart" ? heart(sz, 0, 2.2) : [star(r1(sz * 1.15), 0, 2.2, {}, 0.6)];
      for (const p of flatParts)
        parts.push({
          ...standUp({ ...p, position: [p.position[0] + x, p.position[1], p.position[2] - 1] }, eyeYs(x, eyeZ, 0.2), r1(eyeZ - sz * 0.05)),
          name: "Eye",
        });
    }
  } else if (v.eyes === "visor") {
    const w = r1(Math.min(H * 0.8, halfW * 1.7));
    parts.push(
      o("box", {
        name: "Visor",
        params: { w, d: 4, h: r1(H * 0.2), radius: r1(H * 0.09) },
        position: [0, eyeYs(0, eyeZ, 0.8), r1(eyeZ - H * 0.1)],
      }),
    );
  } else if (v.eyes === "x") {
    for (const sx of [-1, 1])
      for (const a of [45, -45]) {
        const x = sx * eyeX;
        parts.push(
          o("box", {
            name: "Eye",
            params: { w: r1(H * 0.2), d: 3, h: r1(Math.max(1.2, H * 0.05)) },
            position: [r1(x), eyeYs(x, eyeZ, 0.6), r1(eyeZ)],
            rotation: [0, a, 0],
          }),
        );
      }
  }
  // Eyebrows sit just above the eyes.
  const eyeHalf =
    {
      dots: 0.065,
      wink: 0.065,
      big: 0.135,
      anime: 0.16,
      cyclops: 0.18,
      happy: 0.07,
      sleepy: 0.08,
      angry: 0.08,
      closed: 0.05,
      lashes: 0.16,
      heart: 0.1,
      star: 0.11,
      visor: 0.1,
      x: 0.08,
    }[v.eyes] ?? 0.07;
  if (v.brows !== "none" && v.eyes !== "visor" && v.eyes !== "cyclops") {
    const bz = eyeZ + H * (eyeHalf + 0.07);
    const tilt = { soft: 0, angry: -16, worried: 14, thick: 0 }[v.brows] ?? 0;
    const th = v.brows === "thick" ? 0.075 : 0.045;
    for (const sx of [-1, 1]) {
      const x = sx * eyeX;
      parts.push(
        o("box", {
          name: "Brow",
          params: {
            w: r1(H * 0.2),
            d: 3,
            h: r1(Math.max(1.2, H * th)),
            radius: 0.4,
          },
          position: [r1(x), eyeYs(x, bz, 0.7), r1(bz)],
          rotation: [0, sx * tilt, 0],
        }),
      );
    }
  }
  if (v.cheeks) {
    for (const sx of [-1, 1]) {
      const x = sx * H * 0.3;
      const z = hc - H * 0.1;
      parts.push(
        o("cylinder", {
          name: "Cheek",
          params: { d: r1(H * 0.12), h: 1.6 },
          position: [r1(x), eyeYs(x, z, 1.1), r1(z)],
          rotation: [90, 0, 0],
        }),
      );
    }
  }
  grow(parts, eyeStart, ef);
  // Lowest point of the eyes, so a big mouth never cuts through them.
  const eyeLow = Math.min(
    Infinity,
    ...parts
      .slice(eyeStart)
      .filter((p) => /Eye|Visor/.test(p.name))
      .map((p) => (p.type === "sphere" ? p.position[2] : p.position[2] - (p.params.d ?? p.params.h ?? H * 0.2) / 2)),
  );
  mark("face");

  // The mouth is sized here so a big nose can shrink to clear it: the mouth
  // hole would otherwise cut the nose off a small head.
  const mf = Math.max(10, H * pct("mouthSize")); // smaller mouths are too fine to print
  const mouthTop = {
    smile: mf * 0.154,
    grin: mf * 0.22,
    o: mf * 0.06,
    flat: 0.7,
    frown: mf * 0.07,
    fangs: mf * 0.154,
    tongue: mf * 0.154,
    laugh: mf * 0.06,
    buck: mf * 0.06,
    smirk: mf * 0.11,
    cat: mf * 0.04,
    none: 0,
  }[v.mouth];
  const mouthFloor = Math.max(hc - H * 0.42, headZ0 + 1.5 + mf * ({ fangs: 0.2, laugh: 0.16, buck: 0.16, tongue: 0.2 }[v.mouth] ?? 0.1));

  // ---- nose ----
  const nz = Math.min(hc - H * 0.11, eyeLow - H * 0.06);
  const noseDrop = H * ({ round: 0.1, snout: 0.15, clown: 0.15, tiny: 0.035, wide: 0.065, hook: 0.1, cat: 0.12 }[v.nose] ?? 0.08);
  const nf = v.mouth === "none" ? pct("noseSize") : Math.min(pct("noseSize"), Math.max(0.4, (nz - mouthFloor - mouthTop - 0.8) / noseDrop));
  const noseStart = parts.length;
  const noseAt = [0, fyAt(0, nz) + 0.6, nz];
  if (v.nose === "button") parts.push(ball("Nose", [0, fyAt(0, nz) + H * 0.025, nz], H * 0.12));
  else if (v.nose === "round") parts.push(ball("Nose", [0, fyAt(0, nz) + H * 0.05, nz], H * 0.2));
  else if (v.nose === "tiny") parts.push(ball("Nose", [0, fyAt(0, nz) + H * 0.02, nz], Math.max(1.6, H * 0.07)));
  else if (v.nose === "clown") parts.push(ball("Clown nose", [0, fyAt(0, nz) + H * 0.04, nz], H * 0.3));
  else if (v.nose === "wide") parts.push(blob("Nose", [0, fyAt(0, nz) + H * 0.02, nz], [H * 0.3, H * 0.14, H * 0.13]));
  else if (v.nose === "hook") {
    const y0 = fyAt(0, nz + H * 0.08);
    parts.push(
      ...chain(
        "Nose",
        bend([0, y0 + 1, nz + H * 0.1], [0, y0 - H * 0.16, nz - H * 0.08], [0, -H * 0.08, H * 0.04], 4),
        Math.max(2.4, H * 0.14),
        Math.max(1.4, H * 0.06),
      ),
    );
  } else if (v.nose === "cat") {
    const w = H * 0.1;
    parts.push(
      facePlate(
        "Cat nose",
        [
          [-w, w * 0.5],
          [w, w * 0.5],
          [0, -w * 0.5],
        ].map((p) => p.map(r1)),
        0,
        fyAt(0, nz) + 1,
        nz,
        2.2,
      ),
    );
    for (const sx of [-1, 1])
      for (const k of [-1, 1]) {
        const x0 = sx * H * 0.2;
        const z0w = nz - H * 0.04 + k * H * 0.04;
        parts.push(
          aim(
            "cylinder",
            "Whisker",
            { d: r1(Math.max(1, H * 0.03)) },
            [x0, fyAt(x0, z0w) + 0.6, z0w],
            [sx * H * 0.38, fyAt(sx * H * 0.38, z0w + k * H * 0.04) - H * 0.06, z0w + k * H * 0.04],
          ),
        );
      }
  } else if (v.nose === "pointy" || v.nose === "long" || v.nose === "beak") {
    const [d1, h, down] = {
      pointy: [0.15, 0.17, 0.15],
      long: [0.12, 0.4, 0.05],
      beak: [0.28, 0.28, 0.35],
    }[v.nose];
    parts.push(
      aim(
        "cone",
        v.nose === "beak" ? "Beak" : "Nose",
        { d1: r1(Math.max(2, H * d1)), d2: 0.6 },
        [0, fyAt(0, nz) + 1, nz],
        [0, fyAt(0, nz) - H * h, nz - H * h * down],
      ),
    );
  } else if (v.nose === "snout") {
    const d = H * 0.3;
    parts.push(
      o("cylinder", {
        name: "Snout",
        params: { d: r1(d), h: r1(H * 0.12 + 1) },
        position: [0, r1(fyAt(0, nz) + 1), r1(nz)],
        rotation: [90, 0, 0],
      }),
    );
    for (const sx of [-1, 1])
      parts.push({
        ...o("cylinder", {
          name: "Nostril",
          hole: true,
          params: { d: r1(Math.max(1.2, d * 0.18)), h: 3 },
          position: [r1(sx * d * 0.2), r1(fyAt(0, nz) - H * 0.12 + 1.2), r1(nz)],
          rotation: [90, 0, 0],
        }),
        anchor: noseAt,
      });
  }
  grow(parts, noseStart, nf, noseAt);
  const noseLow = v.nose === "none" ? Infinity : nz - noseDrop * nf;
  mark("skin", { Beak: "details", "Clown nose": "details", Whisker: "face", "Cat nose": "face" });

  // ---- mouth ----
  const mz = Math.max(mouthFloor, Math.min(hc - H * 0.2, eyeLow - mouthTop - 1, noseLow - mouthTop - 0.8));
  // Lowest point of the mouth, so a goatee starts below it.
  const mouthLow =
    mz -
    ({ smile: 0.06, fangs: 0.06, frown: 0.05, grin: 0.08, o: 0.06, laugh: 0.12, buck: 0.12, tongue: 0.15, smirk: 0.08, cat: 0.04 }[
      v.mouth
    ] ?? 0) *
      mf -
    (v.mouth === "flat" ? 0.7 : 0);
  if (v.mouth !== "none") {
    // A smile-shaped outline: an arc `outerR` wide, with a thinner inner arc
    // (or none, for an open grin). `shear` tips one corner up for a smirk.
    const arc = (outerR, innerR, flip = 1, shear = 0, dx = 0) => {
      const pts = [];
      const n = outerR < 2.5 ? 6 : 12; // fewer corners on a tiny mouth, or rounding folds it
      for (let i = 0; i <= n; i++) {
        const a = Math.PI + (i * Math.PI) / n;
        pts.push([outerR * Math.cos(a), flip * (outerR * 0.75 * Math.sin(a) + outerR * 0.35)]);
      }
      if (innerR > 0)
        for (let i = n; i >= 0; i--) {
          const a = Math.PI + (i * Math.PI) / n;
          pts.push([innerR * Math.cos(a), flip * (innerR * 0.45 * Math.sin(a) + outerR * 0.35)]);
        }
      if (flip < 0) pts.reverse();
      return { kind: "poly", pts: pts.map(([x, y]) => [r1(x + dx), r1(y + x * shear)]) };
    };
    const shapes = [];
    if (["smile", "fangs", "frown", "tongue"].includes(v.mouth))
      shapes.push(arc(mf * 0.14, mf * 0.14 * 0.62, v.mouth === "frown" ? -1 : 1));
    else if (v.mouth === "grin") shapes.push(arc(mf * 0.2, 0));
    else if (v.mouth === "smirk") shapes.push(arc(mf * 0.13, mf * 0.13 * 0.6, 1, 0.45));
    else if (v.mouth === "cat") {
      const r = Math.max(1.8, mf * 0.075);
      for (const sx of [-1, 1]) shapes.push(arc(r, r * 0.5, 1, 0, sx * r * 0.9));
    } else if (v.mouth === "laugh" || v.mouth === "buck") {
      // A wide open "D" mouth. Buck teeth are face left standing in the hole.
      const r = mf * 0.17;
      const topY = mf * 0.06;
      const pts = [[-r, topY]];
      if (v.mouth === "buck") {
        const t = r * 0.32;
        const g = Math.max(0.6, mf * 0.02) / 2;
        const th = Math.max(1.6, mf * 0.075);
        pts.push([-t, topY], [-t, topY - th], [-g, topY - th], [-g, topY], [g, topY], [g, topY - th], [t, topY - th], [t, topY]);
      }
      pts.push([r, topY]);
      for (let i = 1; i < 12; i++) {
        const a = (i * Math.PI) / 12;
        pts.push([r * Math.cos(a), topY - r * Math.sin(a) * 1.05]);
      }
      shapes.push({ kind: "poly", pts: pts.map((p) => p.map(r1)) });
    } else if (v.mouth === "o") shapes.push({ kind: "circle", c: [0, 0], r: r1(mf * 0.06) });
    else {
      const w = mf * 0.11;
      shapes.push({
        kind: "poly",
        pts: [
          [-w, -0.7],
          [w, -0.7],
          [w, 0.7],
          [-w, 0.7],
        ].map((p) => p.map(r1)),
      });
    }
    for (const shape of shapes)
      parts.push(
        o("sketch", {
          name: "Mouth",
          hole: true,
          params: { shapes: [shape], op: "extrude", height: 8 },
          position: [0, r1(fyAt(0, mz) + 1.4), r1(mz)],
          rotation: [90, 0, 0],
        }),
      );
    if (v.mouth === "tongue") {
      const z = mz - mf * 0.09;
      parts.push(blob("Tongue", [mf * 0.02, fyAt(0, z) - mf * 0.01, z], [mf * 0.12, mf * 0.08, mf * 0.11], [0, 0, 0]));
    }
    if (v.mouth === "fangs") {
      // Two little fangs on the face under the corners of the smile.
      const r = mf * 0.14;
      for (const sx of [-1, 1]) {
        const x = sx * r * 0.45;
        const zt = mz + r * 0.35 - r * 0.75 - 0.2;
        parts.push(
          aim(
            "cone",
            "Fang",
            { d1: r1(Math.max(1.6, r * 0.32)), d2: 0.4 },
            [x, fyAt(x, zt) + 0.5, zt + 0.6],
            [x, fyAt(x, zt) - 0.3, zt - Math.max(2, r * 0.45)],
          ),
        );
      }
    }
  }
  mark("face", { Fang: "skin", Tongue: "details" });

  // ---- facial hair ----
  const beardStart = parts.length;
  const chinZ = hc - (v.head === "oval" ? (headTop - headZ0) * 0.36 : H * 0.36);
  if (v.beard === "mustache" || v.beard === "handlebar") {
    const d = Math.max(2, H * 0.09);
    // Under the nose, but never low enough for the mouth to cut it apart
    // (it can overlap a big nose instead).
    const clear = mz + mouthTop + 0.3 + pct("hairSize") * (H * 0.06 + d * 0.6);
    const zm = Math.max(clear, Math.min(noseLow - 0.6, mz + mouthTop + Math.max(1.4, H * 0.05)));
    for (const sx of [-1, 1]) {
      const root = [0, fyAt(0, zm) + d * 0.25, zm];
      const mid = [sx * H * 0.1, fyAt(sx * H * 0.1, zm) - d * 0.1, zm - H * 0.015];
      parts.push({ ...blob("Mustache", mid, [H * 0.21, d * 1.1, d * 1.15], [0, sx * -14, sx * 8]), anchor: root });
      if (v.beard === "handlebar") {
        const tip = [sx * H * 0.3, fyAt(sx * H * 0.24, zm) - d * 0.2, zm + H * 0.12];
        parts.push(
          ...chain(
            "Mustache",
            bend([sx * H * 0.17, mid[1] + d * 0.2, zm - H * 0.02], tip, [sx * H * 0.05, 0, -H * 0.06], 4),
            d * 0.8,
            Math.max(1, d * 0.35),
          ).map((p) => ({ ...p, anchor: root })),
        );
      }
    }
  } else if (v.beard === "sideburns") {
    for (const sx of [-1, 1]) {
      const at = (x, z) => [x, fyAt(x, z) + H * (roundHead ? 0.03 : 0.04), z];
      const a = at(sx * halfW * 0.9, hc + H * 0.1);
      parts.push({ ...peg("Sideburn", a, at(sx * halfW * 0.8, hc - H * 0.2), Math.max(2.4, H * 0.14)), anchor: a });
    }
  } else if (v.beard === "goatee") {
    const zt = Math.min(chinZ + H * 0.04, mouthLow - 1);
    const root = [0, fyAt(0, zt) + 1.2, zt];
    parts.push({
      ...aim("cone", "Goatee", { d1: r1(Math.max(3, H * 0.22)), d2: 0.8 }, root, [0, fyAt(0, zt) - H * 0.06, zt - H * 0.24]),
      anchor: root,
    });
  } else if (v.beard === "beard" || v.beard === "long") {
    const d = H * 0.62;
    parts.push(ball("Beard", [0, fyAt(0, chinZ) + H * 0.14, chinZ], d));
    for (const sx of [-1, 1])
      parts.push(
        peg("Sideburn", [sx * halfW * 0.85, fy, hc + H * 0.05], [sx * H * 0.3, fyAt(0, chinZ) + H * 0.2, chinZ], Math.max(2.2, H * 0.14)),
      );
    if (v.beard === "long")
      parts.push(
        aim(
          "cone",
          "Beard",
          { d1: r1(d * 0.85), d2: r1(Math.max(1, H * 0.1)) },
          [0, fyAt(0, chinZ) + H * 0.12, chinZ],
          [0, fyAt(0, chinZ) - H * 0.02, chinZ - H * 0.7],
        ),
      );
  }
  for (let i = beardStart; i < parts.length; i++) parts[i].anchor ||= [0, fyAt(0, chinZ) + 1, chinZ];
  grow(parts, beardStart, pct("hairSize"));
  mark("hair");

  // ---- ears, horns and the like ----
  const topY = fy;
  const earZ = roundHead ? domeZ + H * 0.28 : headTop - H * 0.1;
  const earX = Math.min(halfW * 0.72, H * 0.38);
  const earStart = parts.length;
  if (v.ears === "cat") {
    for (const sx of [-1, 1])
      parts.push(
        o("cone", {
          name: "Ear",
          params: { d1: r1(H * 0.34), d2: 1.2, h: r1(H * 0.34) },
          position: [r1(sx * earX), topY, r1(earZ - H * 0.06)],
          rotation: [0, sx * 22, 0],
        }),
      );
  } else if (v.ears === "bear") {
    for (const sx of [-1, 1])
      parts.push(
        o("sphere", {
          name: "Ear",
          params: { d: r1(H * 0.34) },
          position: [r1(sx * earX * 1.05), topY, r1(earZ - H * 0.05)],
        }),
      );
  } else if (v.ears === "bunny") {
    for (const sx of [-1, 1])
      parts.push(
        o("cylinder", {
          name: "Ear",
          params: {
            d: r1(H * 0.18),
            h: r1(H * 0.7),
            edge: r1(H * 0.08),
            edgeStyle: "round",
          },
          position: [r1(sx * earX * 0.6), topY, r1(earZ - H * 0.12)],
          rotation: [0, sx * 10, 0],
        }),
      );
  } else if (v.ears === "human") {
    for (const sx of [-1, 1]) {
      const c = [sx * halfW * 0.95, topY + H * 0.04, hc - H * 0.02];
      parts.push({
        ...ball("Ear", c, Math.max(3, H * 0.24)),
        anchor: [sx * halfW * 0.8, topY, hc],
      });
    }
  } else if (v.ears === "elf") {
    for (const sx of [-1, 1]) {
      const from = [sx * halfW * 0.8, topY + H * 0.04, hc];
      parts.push({
        ...aim("cone", "Ear", { d1: r1(Math.max(3, H * 0.22)), d2: 0.6 }, from, [sx * (halfW + H * 0.36), topY + H * 0.14, hc + H * 0.22]),
        anchor: from,
      });
    }
  } else if (v.ears === "dog") {
    // Floppy ears hanging down the sides of the head.
    for (const sx of [-1, 1]) {
      const root = [sx * halfW * 0.82, topY, (roundHead ? domeZ : hc) + H * 0.3];
      parts.push({
        ...blob("Ear", [sx * (halfW + H * 0.04), topY + H * 0.02, hc + H * 0.02], [H * 0.17, H * 0.3, H * 0.6], [0, sx * -12, 0]),
        anchor: root,
      });
    }
  } else if (v.ears === "mouse") {
    for (const sx of [-1, 1]) {
      const root = [sx * earX * 0.75, topY, earZ - H * 0.12];
      parts.push({
        ...o("cylinder", {
          name: "Ear",
          params: { d: r1(H * 0.48), h: r1(Math.max(2, H * 0.1)), edge: r1(Math.max(0.6, H * 0.04)), edgeStyle: "round" },
          position: [r1(sx * earX * 1.1), r1(topY + H * 0.08), r1(earZ + H * 0.12)],
          rotation: [90, 0, 0],
        }),
        anchor: root,
      });
    }
  } else if (v.ears === "fox") {
    for (const sx of [-1, 1])
      parts.push(
        o("cone", {
          name: "Ear",
          params: { d1: r1(H * 0.36), d2: 1, h: r1(H * 0.52) },
          position: [r1(sx * earX * 0.92), topY, r1(earZ - H * 0.1)],
          rotation: [0, sx * 16, 0],
          scale: [1, 0.6, 1],
        }),
      );
  } else if (v.ears === "ram") {
    for (const sx of [-1, 1]) {
      const W = halfW;
      const pts = [
        [sx * W * 0.55, topY + H * 0.04, earZ - H * 0.02],
        [sx * (W + H * 0.12), topY + H * 0.22, earZ + H * 0.04],
        [sx * (W + H * 0.3), topY + H * 0.12, hc - H * 0.02],
        [sx * (W + H * 0.24), topY - H * 0.12, hc - H * 0.14],
        [sx * (W + H * 0.1), topY - H * 0.1, hc + H * 0.02],
      ];
      parts.push(...chain("Horn", pts, H * 0.2, Math.max(1.2, H * 0.07)).map((p) => ({ ...p, anchor: pts[0] })));
    }
  } else if (v.ears === "antlers") {
    for (const sx of [-1, 1]) {
      const b0 = [sx * earX * 0.7, topY, earZ - H * 0.06];
      const b1 = [sx * (earX + H * 0.14), topY, earZ + H * 0.3];
      const b2 = [sx * (earX + H * 0.36), topY + H * 0.04, earZ + H * 0.55];
      const d = Math.max(1.6, H * 0.09);
      parts.push(...chain("Antler", [b0, b1, b2], d, d * 0.6).map((p) => ({ ...p, anchor: b0 })));
      for (const [from, up] of [
        [b1, [sx * H * 0.02, 0, H * 0.26]],
        [b2, [-sx * H * 0.06, 0, H * 0.18]],
        [b2, [sx * H * 0.2, 0, H * 0.08]],
      ])
        parts.push({
          ...aim(
            "cone",
            "Antler",
            { d1: r1(d * 0.75), d2: 0.8 },
            from,
            from.map((n, i) => n + up[i]),
          ),
          anchor: b0,
        });
    }
  } else if (v.ears === "alien") {
    for (const sx of [-1, 1]) {
      const from = [sx * earX * 0.45, topY, roundHead ? domeZ + H * 0.42 : headTop - 1.5];
      const tip = [sx * (earX * 0.45 + H * 0.22), topY, from[2] + H * 0.42];
      parts.push({ ...peg("Antenna", from, tip, Math.max(1.6, H * 0.06)), anchor: from });
      parts.push({ ...ball("Antenna tip", tip, Math.max(3.4, H * 0.15)), anchor: from });
    }
  } else if (v.ears === "fins") {
    for (const sx of [-1, 1]) {
      parts.push({
        ...blob("Ear", [sx * (halfW + H * 0.02), topY + H * 0.1, hc + H * 0.04], [H * 0.08, H * 0.4, H * 0.3], [-24, 0, 0]),
        anchor: [sx * halfW * 0.96, topY + H * 0.1, hc + H * 0.04],
      });
    }
  } else if (v.ears === "horns") {
    for (const sx of [-1, 1])
      parts.push(
        o("cone", {
          name: "Horn",
          params: { d1: r1(H * 0.17), d2: 0.8, h: r1(H * 0.3) },
          position: [r1(sx * earX * 0.75), topY, r1(earZ - H * 0.04)],
          rotation: [0, sx * 28, 0],
        }),
      );
  } else if (v.ears === "antenna") {
    parts.push(
      o("cylinder", {
        name: "Antenna",
        params: { d: 1.8, h: r1(H * 0.45) },
        position: [0, topY, r1(headTop - 2)],
      }),
    );
    parts.push(
      o("sphere", {
        name: "Antenna tip",
        params: { d: r1(Math.max(4, H * 0.16)) },
        position: [0, topY, r1(headTop - 2 + H * 0.42)],
      }),
    );
  } else if (v.ears === "unicorn") {
    parts.push(
      o("cone", {
        name: "Horn",
        params: { d1: r1(H * 0.15), d2: 0.8, h: r1(H * 0.45) },
        position: [0, r1(topY - H * 0.15), r1(headTop - H * 0.14)],
        rotation: [22, 0, 0],
      }),
    );
  }
  grow(parts, earStart, pct("earSize"), v.ears === "antenna" ? [0, topY, r1(headTop - 2)] : null);
  mark("skin", {
    Horn: "accessory",
    Antler: "accessory",
    Antenna: "accessory",
    "Antenna tip": "accessory",
  });

  // ---- hair ----
  // A cap over the top and back of the head that stays clear of the face.
  const cap = (nm, f = 1, back = 0.07) => {
    if (roundHead) return ball(nm, [0, topY + H * back, domeZ + H * 0.1], H * 1.05 * f);
    const t = 0.8 * f + (f - 1) * H * 0.3;
    const z = hc + (headTop - hc) * 0.5;
    return o("box", {
      name: nm,
      params: {
        w: r1(halfW * 2 + t * 2),
        d: r1(halfD * 2 + t * 2),
        h: r1(headTop - z + t),
        radius: block ? 0.6 : r1(Math.min(halfW, halfD) * (v.head === "wide" ? 0.84 : 0.36) + t),
      },
      position: [0, r1(topY + t), r1(z)],
    });
  };
  const hairTop = roundHead ? domeZ + H * 0.6 : headTop + 0.8;
  const forehead = roundHead ? domeZ + H * 0.3 : headTop - (headTop - hc) * 0.35;
  // The cap keeps its size so it never spreads over the face; the rest grows
  // from where it meets the head.
  const capped = [
    "short",
    "spiky",
    "long",
    "ponytail",
    "pigtails",
    "curly",
    "bun",
    "bowl",
    "swoop",
    "bob",
    "braids",
    "spacebuns",
    "flattop",
    "locs",
  ];
  if (capped.includes(v.hair)) parts.push(cap("Hair"));
  if (v.hair === "buzz") {
    if (roundHead) parts.push(ball("Hair", [0, topY + H * 0.05, domeZ + H * 0.03], H * 1.04));
    else parts.push(cap("Hair", 0.9));
  }
  const hairStart = parts.length;
  const inHead = (c) => [c[0] * 0.6, topY + (c[1] - topY) * 0.6, hc + (c[2] - hc) * 0.6];
  // On the forehead, just proud of the face at height z.
  const brow = (x, z, out = 0.04) => [x, roundHead ? fyAt(x, z) + H * out : fy - halfD + H * out, z];
  if (v.hair === "short" || v.hair === "swoop") {
    // A fringe over the forehead and a tuft at each temple.
    const c = brow(v.hair === "swoop" ? halfW * 0.25 : 0, forehead, 0.07);
    const size = v.hair === "swoop" ? [halfW * 1.7, H * 0.26, H * 0.24] : [halfW * 1.35, H * 0.2, H * 0.16];
    parts.push({ ...blob("Hair", c, size, [v.hair === "swoop" ? -10 : -6, v.hair === "swoop" ? -16 : 0, 0]), anchor: inHead(c) });
    for (const sx of [-1, 1]) {
      const t = brow(sx * halfW * 0.8, hc + H * 0.16, 0.12);
      parts.push({ ...blob("Hair", t, [H * 0.14, H * 0.28, H * 0.3], [0, sx * 12, 0]), anchor: inHead(t) });
    }
  } else if (v.hair === "bowl") {
    // A straight fringe all the way round, just above the eyebrows.
    const zb2 = roundHead ? hc + H * 0.17 : hc + (headTop - hc) * 0.3;
    const d = roundHead ? H * 1.08 : Math.max(halfW, halfD) * 2 + 2;
    parts.push({
      ...o("cylinder", {
        name: "Hair",
        params: { d: r1(d), h: r1(H * 0.26), edge: r1(H * 0.05), edgeStyle: "round" },
        position: [0, r1(topY + H * 0.02), r1(zb2)],
      }),
      anchor: [0, topY, zb2 + H * 0.12],
    });
  } else if (v.hair === "flattop") {
    const d = roundHead ? H * 0.98 : Math.max(halfW, halfD) * 1.9;
    const z = roundHead ? domeZ + H * 0.18 : headTop - 1;
    parts.push({
      ...o("box", {
        name: "Hair",
        params: { w: r1(d), d: r1(d * 0.92), h: r1(H * 0.42), radius: r1(d * 0.16) },
        position: [0, r1(topY + H * 0.04), r1(z)],
      }),
      anchor: [0, topY, z + 1],
    });
  } else if (v.hair === "spiky") {
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const r = i === 0 ? 0 : halfW * 0.45;
      const base = [r * Math.cos(a), topY + H * 0.08 + r * Math.sin(a), hairTop - H * 0.12 - (r ? H * 0.06 : 0)];
      const tip = [base[0] * 1.5, topY + H * 0.08 + (base[1] - topY - H * 0.08) * 1.5 + H * 0.06, base[2] + H * 0.3];
      parts.push({ ...aim("cone", "Hair spike", { d1: r1(H * 0.22), d2: 0.8 }, base, tip), anchor: base });
    }
  } else if (v.hair === "mohawk") {
    for (let i = 0; i < 5; i++) {
      const y = topY - H * 0.32 + i * H * 0.16;
      const zTop = roundHead ? domeZ + Math.sqrt(Math.max(0, (H / 2) ** 2 - (y - topY) ** 2)) - 2 : headTop - 1.5;
      parts.push(
        o("cone", {
          name: "Mohawk spike",
          params: { d1: r1(H * 0.17), d2: 1, h: r1(H * 0.26) },
          position: [0, r1(y), r1(zTop)],
        }),
      );
    }
  } else if (v.hair === "bun") {
    const c = [0, topY + H * 0.28, hairTop - H * 0.08];
    parts.push({ ...ball("Hair bun", c, H * 0.38), anchor: inHead(c) });
  } else if (v.hair === "spacebuns") {
    for (const sx of [-1, 1]) {
      const c = [sx * halfW * 0.62, topY + H * 0.08, hairTop - H * 0.1];
      parts.push({ ...ball("Hair bun", c, H * 0.34), anchor: inHead(c) });
    }
  } else if (v.hair === "long" || v.hair === "bob") {
    const long = v.hair === "long";
    const w = halfW * 1.9;
    const zb2 = long ? hc - H * 0.75 : hc - H * 0.3;
    parts.push({
      ...o("box", {
        name: "Hair",
        params: { w: r1(w), d: r1(halfD * 0.9), h: r1(hc + H * 0.25 - zb2), radius: r1(Math.min(w, halfD * 0.9) * 0.45) },
        position: [0, r1(topY + halfD * 0.6), r1(zb2)],
      }),
      anchor: [0, topY + halfD * 0.3, hc + H * 0.2],
    });
    // Locks down each side that frame the face.
    for (const sx of [-1, 1]) {
      const top2 = [sx * halfW * 0.86, topY + halfD * 0.05, hc + H * 0.22];
      const c = [sx * halfW * (long ? 0.92 : 0.95), topY + halfD * 0.1, long ? hc - H * 0.22 : hc - H * 0.02];
      parts.push({ ...blob("Hair", c, [H * 0.24, halfD * 1.1, long ? H * 0.95 : H * 0.6], [0, sx * -4, 0]), anchor: top2 });
    }
  } else if (v.hair === "ponytail") {
    const from = [0, topY + halfD * 0.7, hc + H * 0.18];
    const end = [0, topY + halfD * 1.35, hc - H * 0.6];
    parts.push({ ...ball("Hair tie", [from[0], from[1] + H * 0.12, from[2]], H * 0.22), anchor: from });
    parts.push(
      ...chain("Ponytail", bend([0, from[1] + H * 0.18, from[2]], end, [0, H * 0.22, 0], 4), H * 0.3, H * 0.12).map((p) => ({
        ...p,
        anchor: from,
      })),
    );
  } else if (v.hair === "pigtails") {
    for (const sx of [-1, 1]) {
      const from = [sx * halfW * 0.75, topY + halfD * 0.2, hc + H * 0.12];
      const end = [sx * (halfW + H * 0.42), topY + halfD * 0.35, hc - H * 0.32];
      parts.push({ ...aim("cone", "Pigtail", { d1: r1(H * 0.24), d2: r1(H * 0.1) }, from, end), anchor: from });
      parts.push({ ...ball("Pigtail", end, H * 0.18), anchor: from });
    }
  } else if (v.hair === "braids") {
    // Two braids down the front of the shoulders: beads that zigzag a little.
    for (const sx of [-1, 1]) {
      const from = [sx * halfW * 0.9, topY + halfD * 0.05, hc + H * 0.05];
      const n = 7;
      for (let i = 0; i < n; i++) {
        const t = i / (n - 1);
        const c = [sx * (halfW * 0.98 + H * 0.05 * (i % 2 ? 1 : -1)), topY - halfD * 0.05 - t * H * 0.1, from[2] - t * H * 0.9];
        parts.push({ ...blob("Braid", c, [H * 0.2, H * 0.18, H * 0.24], [0, sx * (i % 2 ? 20 : -20), 0]), anchor: from });
      }
      parts.push({ ...ball("Hair tie", [sx * halfW * 0.98, topY - halfD * 0.05 - H * 0.1, from[2] - H * 1.02], H * 0.12), anchor: from });
    }
  } else if (v.hair === "locs") {
    for (let i = 0; i < 11; i++) {
      const a = Math.PI * (0.05 + (i / 10) * 0.9); // around the back, side to side
      const x = Math.cos(a) * halfW * 0.92;
      const y = topY + Math.sin(a) * halfD * 0.92;
      const from = [x, y, hc + H * 0.2];
      const end = [x * 1.08, y + H * 0.06, hc - H * (0.5 + 0.12 * (i % 3))];
      parts.push(
        ...chain("Loc", [from, [x * 1.06, y + H * 0.04, hc - H * 0.1], end], H * 0.15, H * 0.12).map((p) => ({
          ...p,
          anchor: inHead(from),
        })),
      );
    }
  } else if (v.hair === "curly") {
    for (let i = 0; i < 9; i++) {
      const a = (-0.3 + (i / 8) * 1.6) * Math.PI;
      const c = [halfW * 0.95 * Math.cos(a), topY + halfD * 0.95 * Math.sin(a) + H * 0.04, hc + H * 0.16];
      if (Math.sin(a) < -0.35) continue; // keep the face clear
      parts.push({ ...ball("Curl", c, H * 0.28), anchor: inHead(c) });
    }
    const c = [0, topY + H * 0.05, hairTop - H * 0.08];
    parts.push({ ...ball("Curl", c, H * 0.36), anchor: inHead(c) });
  } else if (v.hair === "afro") {
    // A big round puff, bumpy all over.
    const c = [0, topY + H * 0.25, (roundHead ? domeZ : hc) + H * 0.25];
    const R = Math.max(halfW, halfD) * 1.15;
    parts.push({ ...ball("Hair", c, R * 2.1), anchor: c });
    for (let i = 0; i < 26; i++) {
      const zf = 1 - (2 * (i + 0.5)) / 26;
      const ring = Math.sqrt(1 - zf * zf);
      const a = i * 2.39996;
      const dir = [ring * Math.cos(a), ring * Math.sin(a), zf];
      if (dir[1] < -0.45 && dir[2] < 0.35) continue; // keep the face clear
      const p = c.map((n, j) => n + dir[j] * R * 1.02);
      parts.push({ ...ball("Hair", p, H * 0.36), anchor: c });
    }
  }
  grow(parts, hairStart, pct("hairSize"));
  mark("hair");

  // ---- hats ----
  const crownZ = roundHead ? domeZ + H * 0.3 : headTop - 1;
  const crownD = roundHead ? H * 0.8 : halfW * 1.7;
  const hatLift =
    v.hair === "afro" ? H * 0.32 : v.hair === "flattop" ? H * 0.28 : v.hair === "spacebuns" ? H * 0.1 : v.hair !== "none" ? H * 0.04 : 0;
  const cz = crownZ + hatLift;
  const hatStart = parts.length;
  let hatAnchor = [0, topY, r1(cz - 0.5)];
  if (v.hat === "beanie") {
    const z = (roundHead ? domeZ + H * 0.08 : headTop - H * 0.25) + hatLift;
    const d1 = roundHead ? H * 1.02 : halfW * 2 + 1;
    parts.push(
      o("cone", {
        name: "Beanie",
        params: { d1: r1(d1), d2: r1(d1 * 0.45), h: r1(H * 0.5) },
        position: [0, topY, r1(z)],
      }),
    );
    hatAnchor = [0, topY, r1(z + 0.5)];
    parts.push(
      o("sphere", {
        name: "Pompom",
        params: { d: r1(H * 0.26) },
        position: [0, topY, r1(z + H * 0.42)],
      }),
    );
  } else if (v.hat === "cap") {
    // A dome over the top of the head and a brim out the front.
    if (roundHead) {
      const c = [0, topY + H * 0.04, domeZ + H * 0.18 + hatLift];
      parts.push(blob("Cap", c, [H * 1.08, H * 1.08, H * 0.82]));
      parts.push(
        blob("Cap brim", [0, topY - H * 0.62, domeZ + H * 0.13 + hatLift], [H * 0.72, H * 0.52, Math.max(1.6, H * 0.07)], [8, 0, 0]),
      );
      parts.push(ball("Cap button", [0, topY + H * 0.04, c[2] + H * 0.4], Math.max(2, H * 0.1)));
      hatAnchor = [0, topY, r1(domeZ + H * 0.25 + hatLift)];
    } else {
      parts.push(cap("Cap", 1.15, 0));
      const z = headTop - (headTop - hc) * 0.35 + hatLift;
      parts.push(blob("Cap brim", [0, topY - halfD - H * 0.2, z], [halfW * 1.4, H * 0.5, Math.max(1.6, H * 0.07)], [8, 0, 0]));
      hatAnchor = [0, topY, r1(headTop - 0.5 + hatLift)];
    }
  } else if (v.hat === "crown") {
    const d = crownD * 0.85;
    parts.push(
      o("tube", {
        name: "Crown",
        params: { d: r1(d), id: r1(d - 3), h: r1(H * 0.2) },
        position: [0, topY, r1(cz - 1)],
      }),
    );
    // A floor inside the ring, so a bigger crown still sits on the head.
    parts.push(
      o("cylinder", {
        name: "Crown floor",
        params: { d: r1(d - 2), h: 1.2 },
        position: [0, topY, r1(cz - 1)],
      }),
    );
    hatAnchor = [0, topY, r1(cz - 0.6)];
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3;
      parts.push(
        o("cone", {
          name: "Crown point",
          params: { d1: 3, d2: 0.6, h: r1(H * 0.18) },
          position: [r1(((d - 1.5) / 2) * Math.cos(a)), r1(topY + ((d - 1.5) / 2) * Math.sin(a)), r1(cz - 1 + H * 0.2 - 0.5)],
        }),
      );
    }
  } else if (v.hat === "tophat") {
    parts.push(
      o("cylinder", {
        name: "Brim",
        params: { d: r1(crownD * 1.25), h: 1.8 },
        position: [0, topY, r1(cz - 0.5)],
      }),
    );
    parts.push(
      o("cylinder", {
        name: "Top hat",
        params: { d: r1(crownD * 0.78), h: r1(H * 0.55) },
        position: [0, topY, r1(cz - 0.5)],
      }),
    );
  } else if (v.hat === "wizard") {
    parts.push(
      o("cylinder", {
        name: "Brim",
        params: { d: r1(crownD * 1.35), h: 1.6 },
        position: [0, topY, r1(cz - 0.5)],
      }),
    );
    parts.push(
      o("cone", {
        name: "Wizard hat",
        params: { d1: r1(crownD * 0.95), d2: 1.4, h: r1(H * 0.85) },
        position: [0, topY, r1(cz - 0.5)],
        rotation: [-8, 0, 0],
      }),
    );
  } else if (v.hat === "cowboy" || v.hat === "bucket") {
    // Drawn as one side profile and spun around: a brim and a crown.
    const rc = crownD * 0.42;
    let pts;
    if (v.hat === "cowboy") {
      const Rb = crownD * 0.9;
      const hC = H * 0.4;
      pts = [
        [0, 0],
        [Rb * 0.78, 0],
        [Rb, Rb * 0.24],
        [Rb - 1.2, Rb * 0.24 + 0.6],
        [Rb * 0.78 - 0.6, 1.8],
        [rc, 1.8],
        [rc * 0.9, hC],
        [rc * 0.45, hC * 1.05],
        [0, hC * 0.82],
      ];
    } else {
      const Rb = crownD * 0.72;
      const hC = H * 0.34;
      pts = [
        [0, -1.4],
        [rc - 0.8, -1.4],
        [Rb - 0.6, -H * 0.14 - 1.4],
        [Rb, -H * 0.14],
        [rc + 0.4, 0.4],
        [rc * 0.92, hC],
        [0, hC],
      ];
    }
    parts.push(
      o("sketch", {
        name: v.hat === "cowboy" ? "Cowboy hat" : "Bucket hat",
        params: { shapes: [{ kind: "poly", pts: pts.map((p) => p.map(r1)) }], op: "revolve", angle: 360 },
        position: [0, topY, r1(cz - 0.5)],
      }),
    );
  } else if (v.hat === "beret") {
    parts.push(blob("Beret", [H * 0.08, topY + H * 0.04, cz + H * 0.08], [crownD * 1.42, crownD * 1.36, H * 0.32], [0, -12, 0]));
    parts.push(ball("Beret", [H * 0.12, topY + H * 0.04, cz + H * 0.26], Math.max(1.8, H * 0.08)));
    hatAnchor = [0, topY, r1(cz)];
  } else if (v.hat === "chef") {
    parts.push(o("cylinder", { name: "Chef hat", params: { d: r1(crownD * 1.05), h: r1(H * 0.3) }, position: [0, topY, r1(cz - 1)] }));
    parts.push(blob("Chef hat", [0, topY, cz + H * 0.48], [crownD * 1.35, crownD * 1.3, H * 0.6]));
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      parts.push(ball("Chef hat", [Math.cos(a) * crownD * 0.36, topY + Math.sin(a) * crownD * 0.36, cz + H * 0.56], crownD * 0.62));
    }
  } else if (v.hat === "pirate") {
    // A bicorne: a dome with a tall brim turned up at the front and back, and a skull badge.
    const dz = roundHead ? domeZ + H * 0.2 : headTop - (headTop - hc) * 0.3;
    if (roundHead) parts.push(blob("Pirate hat", [0, topY + H * 0.02, dz + hatLift], [H * 1.08, H * 1.08, H * 0.8]));
    else parts.push(cap("Pirate hat", 1.12, 0));
    const w = Math.max(crownD, halfW * 2) * 0.8;
    const ht = H * 0.5;
    const arch = [];
    for (let i = 0; i <= 10; i++) {
      const t = -1 + (i * 2) / 10;
      arch.push([t * w, ht * (1 - t * t * 0.85)]);
    }
    for (let i = 10; i >= 0; i--) {
      const t = -1 + (i * 2) / 10;
      arch.push([t * w * 0.96, -ht * 0.12 * (1 - t * t)]);
    }
    const zb3 = dz - H * 0.05 + hatLift;
    for (const side of [-1, 1]) {
      const yb2 = topY + side * (roundHead ? H * 0.5 : halfD + 1);
      parts.push(
        facePlate(
          "Pirate hat",
          arch.map((p) => p.map(r1)),
          0,
          yb2 + 1.1,
          zb3,
          2.2,
          { rotation: [90 + side * 12, 0, 0] },
        ),
      );
    }
    parts.push(
      o("cylinder", {
        name: "Skull",
        params: { d: r1(H * 0.18), h: 1.4 },
        // On the front brim's outer face, which leans back at 78 degrees.
        position: [
          0,
          r1(topY - (roundHead ? H * 0.5 : halfD + 1) + 1.1 + ht * 0.4 * 0.208 - 1.6 * 0.978),
          r1(zb3 + ht * 0.4 * 0.978 + 1.6 * 0.208),
        ],
        rotation: [78, 0, 0],
      }),
    );
    hatAnchor = [0, topY, r1(zb3)];
  } else if (v.hat === "santa") {
    parts.push(
      o("cylinder", {
        name: "Hat fur",
        params: { d: r1(crownD * 1.08), h: r1(H * 0.18), edge: r1(H * 0.06), edgeStyle: "round" },
        position: [0, topY, r1(cz - 1)],
      }),
    );
    const base = [0, topY, cz - 1 + H * 0.12];
    const tip = [H * 0.42, topY + H * 0.12, cz + H * 0.3];
    parts.push(...chain("Santa hat", bend(base, tip, [-H * 0.05, 0, H * 0.32], 5), crownD * 0.95, 1.4));
    parts.push(ball("Hat fur", tip, H * 0.2));
  } else if (v.hat === "grad") {
    parts.push(o("cylinder", { name: "Grad cap", params: { d: r1(crownD * 0.95), h: r1(H * 0.22) }, position: [0, topY, r1(cz - 1)] }));
    const top3 = cz - 1 + H * 0.22;
    parts.push(
      o("box", {
        name: "Grad cap",
        params: { w: r1(H * 1.15), d: r1(H * 1.15), h: 1.6, radius: 0 },
        position: [0, topY, r1(top3 - 0.4)],
        rotation: [0, 0, 45],
      }),
    );
    parts.push(ball("Tassel", [0, topY, top3 + 1], 2.4));
    const end = [H * 0.5, topY - H * 0.25, top3 - H * 0.2];
    parts.push(...chain("Tassel", [[0, topY, top3 + 1], [H * 0.45, topY - H * 0.2, top3 + 1], end], 1.4));
    parts.push(blob("Tassel", [end[0], end[1], end[2] - H * 0.06], [2.6, 2.6, H * 0.16]));
  } else if (v.hat === "halo") {
    const z = (roundHead ? domeZ + H * 0.5 : headTop) + hatLift + H * 0.16;
    parts.push(
      o("tube", {
        name: "Halo",
        params: { d: r1(crownD * 0.95), id: r1(crownD * 0.95 - Math.max(2.6, H * 0.1)), h: 1.8 },
        position: [0, topY, r1(z)],
      }),
    );
    parts.push(peg("Halo", [0, topY + crownD * 0.2, z - H * 0.22], [0, topY + crownD * 0.43, z + 0.9], Math.max(1.8, H * 0.06)));
    hatAnchor = [0, topY + crownD * 0.2, r1(z - H * 0.22)];
  } else if (v.hat === "bow") {
    const c = [halfW * 0.42, topY - H * 0.22, cz];
    for (const sx of [-1, 1])
      parts.push(aim("cone", "Bow", { d1: 1, d2: r1(H * 0.44) }, c, [c[0] + sx * H * 0.34, c[1] - H * 0.06, c[2] + H * 0.1]));
    parts.push(ball("Bow", [c[0], c[1] - H * 0.03, c[2]], H * 0.19));
    hatAnchor = c; // the knot is sunk in the head, so the bow grows around it
  } else if (v.hat === "propeller") {
    const z = (roundHead ? domeZ + H * 0.08 : headTop - H * 0.25) + hatLift;
    if (roundHead) parts.push(blob("Propeller cap", [0, topY + H * 0.02, domeZ + H * 0.18 + hatLift], [H * 1.08, H * 1.08, H * 0.82]));
    else parts.push(cap("Propeller cap", 1.1, 0.02));
    const pz = (roundHead ? domeZ + H * 0.72 : headTop + H * 0.22) + hatLift;
    parts.push(o("cylinder", { name: "Propeller", params: { d: 1.8, h: r1(pz - z + 1 - H * 0.3) }, position: [0, topY, r1(z + H * 0.3)] }));
    for (const sx of [-1, 1])
      parts.push(
        blob(
          "Propeller",
          [sx * H * 0.28 * 0.94, topY + sx * H * 0.28 * 0.34, pz],
          [H * 0.58, H * 0.16, Math.max(1.6, H * 0.06)],
          [0, sx * 12, 20],
        ),
      );
    parts.push(ball("Propeller", [0, topY, pz], Math.max(3, H * 0.13)));
    hatAnchor = [0, topY, r1(z + H * 0.3)];
  } else if (v.hat === "bandana") {
    const z = (roundHead ? domeZ + H * 0.18 : headTop - (headTop - hc) * 0.45) + hatLift * 0.3;
    const r = roundHead ? Math.sqrt(Math.max(1, (H / 2) ** 2 - (z - domeZ) ** 2)) : Math.max(halfW, halfD);
    parts.push(cap("Bandana", 1.02, 0.05));
    parts.push({
      ...o("tube", {
        name: "Bandana",
        params: { d: r1(r * 2 + 1.6), id: r1(r * 2 - 2), h: r1(H * 0.17) },
        position: [0, topY, r1(z - H * 0.05)],
        scale: roundHead ? 1 : [halfW / r, halfD / r, 1],
      }),
      keep: true,
    });
    const k = [0, topY + (roundHead ? r : halfD) + 0.4, z + H * 0.03];
    parts.push(ball("Bandana", k, H * 0.15));
    for (const sx of [-1, 1])
      parts.push(blob("Bandana", [sx * H * 0.05, k[1] + H * 0.04, k[2] - H * 0.12], [H * 0.12, H * 0.07, H * 0.3], [20, sx * 20, 0]));
    hatAnchor = [0, k[1] - 0.8, k[2]];
  } else if (v.hat === "flowers") {
    const z = (roundHead ? domeZ + H * 0.3 : headTop - 0.6) + hatLift;
    const r = roundHead ? Math.sqrt(Math.max(1, (H / 2) ** 2 - (z - domeZ) ** 2)) : Math.max(halfW, halfD) * 0.95;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const c = [Math.cos(a) * (roundHead ? r : halfW * 0.95), topY + Math.sin(a) * (roundHead ? r : halfD * 0.95), z];
      parts.push({ ...ball(i % 2 ? "Leaf" : "Flower", c, H * (i % 2 ? 0.14 : 0.2)), anchor: [c[0] * 0.9, topY + (c[1] - topY) * 0.9, z] });
    }
    hatAnchor = null;
  } else if (v.hat === "party") {
    parts.push(
      o("cone", {
        name: "Party hat",
        params: { d1: r1(crownD * 0.62), d2: 1, h: r1(H * 0.62) },
        position: [0, topY, r1(cz - 1)],
        rotation: [0, 10, 0],
      }),
    );
    parts.push(ball("Pompom", [r1(H * 0.1), topY, cz - 1 + H * 0.62], H * 0.18));
  } else if (v.hat === "viking" || v.hat === "helmet") {
    parts.push(cap("Helmet", 1.1, 0.1));
    if (v.hat === "viking")
      for (const sx of [-1, 1]) {
        const from = [sx * halfW * 0.7, topY, (roundHead ? domeZ : hc) + H * 0.28];
        parts.push(
          aim("cone", "Helmet horn", { d1: r1(H * 0.2), d2: 0.8 }, from, [sx * (halfW + H * 0.3), topY - H * 0.05, from[2] + H * 0.4]),
        );
      }
    else {
      // A brush crest from front to back, like a Roman helmet.
      for (let i = 0; i < 9; i++) {
        const a = Math.PI * (0.15 + (i / 8) * 0.75);
        const R = (roundHead ? H * 0.58 : Math.max(halfD, (headTop - hc) * 1.1)) + H * 0.06;
        const c = [0, topY - Math.cos(a) * R, (roundHead ? domeZ + H * 0.1 : hc) + Math.sin(a) * R];
        parts.push(blob("Helmet crest", c, [H * 0.14, H * 0.2, H * 0.34], [(-Math.cos(a) * 180) / Math.PI / 2, 0, 0]));
      }
      // The cheek guards grow in place so they stay on the face.
      const a = [0, topY, r1(hc + H * 0.2)];
      for (let i = hatStart; i < parts.length; i++) parts[i].anchor = a;
      for (const sx of [-1, 1])
        parts.push({
          ...blob("Helmet", [sx * halfW * 0.92, topY - halfD * 0.25, hc - H * 0.12], [H * 0.12, halfD * 0.9, H * 0.42]),
          anchor: [sx * halfW * 0.92, topY - halfD * 0.25, hc - H * 0.12],
        });
    }
    hatAnchor = v.hat === "helmet" ? null : [0, topY, r1(hc + H * 0.2)];
  } else if (v.hat === "knight") {
    // A full helmet over the head with a slit to see out of.
    const z = headZ0 - 1;
    const h = headTop - headZ0 + 3;
    if (roundHead)
      parts.push(
        o("cylinder", {
          name: "Knight helmet",
          params: {
            d: r1(H + 3),
            h: r1(h),
            edge: r1(H * 0.3),
            edgeStyle: "round",
          },
          position: [0, topY, r1(z)],
        }),
      );
    else
      parts.push(
        o("box", {
          name: "Knight helmet",
          params: {
            w: r1(halfW * 2 + 3),
            d: r1(halfD * 2 + 3),
            h: r1(h),
            radius: r1(Math.min(halfW, halfD) * 0.4),
          },
          position: [0, topY, r1(z)],
        }),
      );
    const front = topY - (roundHead ? H / 2 : halfD) - 1.5;
    parts.push(
      o("box", {
        name: "Visor slit",
        hole: true,
        params: { w: r1(H * 0.6), d: 2.4, h: r1(Math.max(1.4, H * 0.07)) },
        position: [0, r1(front + 0.6), r1(eyeZ)],
      }),
    );
    parts.push(aim("cone", "Plume", { d1: r1(H * 0.2), d2: r1(H * 0.06) }, [0, topY, z + h - 1], [0, topY + H * 0.4, z + h + H * 0.35]));
    hatAnchor = [0, topY, r1(hc)];
  }
  grow(parts, hatStart, pct("hatSize"), hatAnchor);
  mark("hat", {
    "Helmet horn": "accessory",
    Plume: "accessory",
    "Helmet crest": "accessory",
    "Hat fur": "accessory",
    Tassel: "accessory",
    Skull: "accessory",
    "Cap button": "hat",
    Leaf: "accessory",
    Propeller: "accessory",
  });

  // ---- glasses and other things on the face ----
  const eyeD = H * Math.max(0.2, eyeHalf * 2) * ef;
  if (v.facegear === "glasses" || v.facegear === "monocle") {
    const d = Math.max(eyeD * 1.35, H * 0.28);
    const xs = v.facegear === "monocle" ? [eyeX * ef] : [-eyeX * ef, eyeX * ef];
    for (const x of xs)
      parts.push(
        o("tube", {
          name: "Glasses",
          params: { d: r1(d), id: r1(d - Math.max(1.4, H * 0.06)), h: 2.4 },
          position: [r1(x), eyeYs(x, eyeZ, 1.4), r1(eyeZ)],
          rotation: [90, 0, 0],
        }),
      );
    if (xs.length === 2)
      parts.push(
        o("box", {
          name: "Glasses",
          params: { w: r1(eyeX * ef * 2 - d + 1.6), d: 2.4, h: 1.4 },
          position: [0, eyeYs(0, eyeZ, 0.2), r1(eyeZ + d * 0.15)],
        }),
      );
  } else if (v.facegear === "shades") {
    const w = (eyeX * ef + Math.max(eyeD * 0.75, H * 0.15)) * 2;
    const rec = Math.max(0, -faceY(w / 2, eyeZ) + faceY(0, eyeZ));
    parts.push(
      o("box", {
        name: "Shades",
        params: {
          w: r1(w),
          d: r1(rec + 2.6),
          h: r1(Math.max(eyeD, H * 0.2)),
          radius: r1(H * 0.06),
        },
        position: [0, r1(fyAt(0, eyeZ) - 1.4 + (rec + 2.6) / 2), r1(eyeZ - Math.max(eyeD, H * 0.2) / 2)],
      }),
    );
  } else if (v.facegear === "eyepatch") {
    const x = eyeX * ef;
    const d = Math.max(eyeD * 1.3, H * 0.26);
    parts.push(
      o("cylinder", {
        name: "Eyepatch",
        params: { d: r1(d), h: 2.6 },
        position: [r1(x), eyeYs(x, eyeZ, 1.4), r1(eyeZ)],
        rotation: [90, 0, 0],
      }),
    );
    const r = roundHead ? H / 2 : Math.max(halfW, halfD);
    parts.push(
      o("tube", {
        name: "Eyepatch",
        params: { d: r1(r * 2 + 1.4), id: r1(r * 2 - 1.6), h: 1.4 },
        position: [0, topY, r1(eyeZ - 0.7)],
        rotation: [0, -18, 0],
      }),
    );
  } else if (v.facegear === "goggles") {
    const z = roundHead ? domeZ + H * 0.3 : headTop - H * 0.15;
    const r = roundHead ? Math.sqrt(Math.max(1, (H / 2) ** 2 - (z - domeZ) ** 2)) : Math.max(halfW, halfD);
    parts.push(
      o("tube", {
        name: "Goggles",
        params: { d: r1(r * 2 + 1.6), id: r1(r * 2 - 1.6), h: r1(H * 0.12) },
        position: [0, topY, r1(z - H * 0.06)],
      }),
    );
    for (const sx of [-1, 1]) {
      const x = sx * H * 0.17;
      parts.push(
        o("cylinder", {
          name: "Goggles",
          params: { d: r1(H * 0.26), h: r1(H * 0.12 + 1.6) },
          position: [r1(x), r1(fyAt(x, z) + 1.6), r1(z)],
          rotation: [90, 0, 0],
        }),
      );
    }
  } else if (v.facegear === "headphones") {
    // A half ring over the head, drawn in X/Z and given depth toward -Y.
    const R = halfW + 2 + (v.hair === "afro" ? H * 0.3 : 0);
    const t = Math.max(2.2, H * 0.08);
    const sq = roundHead ? 1 : 0.8;
    const pts = [];
    for (let i = 0; i <= 16; i++) pts.push([R * Math.cos((i * Math.PI) / 16), R * Math.sin((i * Math.PI) / 16) * sq]);
    for (let i = 16; i >= 0; i--) pts.push([(R - t) * Math.cos((i * Math.PI) / 16), (R - t) * Math.sin((i * Math.PI) / 16) * sq]);
    const bandZ = roundHead ? domeZ : hc + (headTop - hc) * 0.15;
    parts.push(
      o("sketch", {
        name: "Headphone band",
        params: {
          shapes: [{ kind: "poly", pts: pts.map((p) => p.map(r1)) }],
          op: "extrude",
          height: 4,
        },
        position: [0, r1(topY + 2), r1(bandZ)],
        rotation: [90, 0, 0],
      }),
    );
    for (const sx of [-1, 1])
      parts.push(
        o("cylinder", {
          name: "Ear cup",
          params: { d: r1(H * 0.38), h: 4, edge: 1, edgeStyle: "round" },
          position: [r1(sx * (R - t / 2)), topY, r1(bandZ)],
          rotation: [0, sx * 90, 0],
        }),
      );
    // Cups that don't reach the head get an arm in to it.
    if (R - t > halfW + 1)
      for (const sx of [-1, 1]) parts.push(peg("Ear cup", [sx * halfW * 0.8, topY, bandZ], [sx * (R - t / 2), topY, bandZ], H * 0.16));
  }
  if (v.facegear === "mask") {
    // A hero's mask: flat rings around the eyes with pointed corners.
    const d = Math.max(eyeD * 1.9, H * 0.34);
    for (const sx of [-1, 1]) {
      const x = sx * eyeX * ef;
      parts.push(
        o("tube", {
          name: "Mask",
          params: { d: r1(d), id: r1(Math.max(eyeD * 1.05, d * 0.5)), h: 2.2 },
          position: [r1(x), eyeYs(x, eyeZ, 1.2), r1(eyeZ)],
          rotation: [90, 0, 0],
        }),
      );
      const ym = eyeYs(x, eyeZ, 1.2) - 1.1;
      parts.push(aim("cone", "Mask", { d1: r1(d * 0.4), d2: 0.8 }, [x + sx * d * 0.38, ym, eyeZ], [x + sx * d * 0.8, ym, eyeZ + d * 0.25]));
    }
    parts.push(
      o("box", {
        name: "Mask",
        params: { w: r1(eyeX * ef * 2), d: 2.2, h: r1(d * 0.3) },
        position: [0, eyeYs(0, eyeZ, 0.4), r1(eyeZ - d * 0.05)],
      }),
    );
  } else if (v.facegear === "bandage") {
    const x = -H * 0.27;
    const z = hc - H * 0.1;
    for (const a of [40, -40])
      parts.push(
        o("box", {
          name: "Bandage",
          params: { w: r1(H * 0.24), d: 2, h: r1(Math.max(2.2, H * 0.08)), radius: 0.5 },
          position: [r1(x), eyeYs(x, z, 0.8), r1(z - H * 0.04)],
          rotation: [0, a, 0],
        }),
      );
  } else if (v.facegear === "earrings") {
    for (const sx of [-1, 1]) {
      const top1 = [sx * halfW * 0.92, topY + H * 0.04, hc - H * 0.12];
      const c = [sx * (halfW * 0.98 + 0.6), topY + H * 0.02, hc - H * 0.26];
      parts.push(peg("Earring", top1, c, 1.4));
      parts.push(ball("Earring", c, Math.max(2.6, H * 0.11)));
    }
  } else if (v.facegear === "vr") {
    const w = Math.min(H * 0.95, halfW * 1.9);
    const dd = H * 0.34;
    const y = fyAt(0, eyeZ);
    parts.push(
      o("box", {
        name: "VR headset",
        params: { w: r1(w), d: r1(dd), h: r1(H * 0.32), radius: r1(H * 0.08) },
        position: [0, r1(y - dd / 2 + 2), r1(eyeZ - H * 0.15)],
      }),
    );
    const r = roundHead ? Math.sqrt(Math.max(1, (H / 2) ** 2 - (eyeZ - domeZ) ** 2)) : Math.max(halfW, halfD);
    parts.push(
      o("tube", {
        name: "VR headset",
        params: { d: r1(r * 2 + 1.6), id: r1(r * 2 - 1.6), h: r1(H * 0.12) },
        position: [0, topY, r1(eyeZ - H * 0.05)],
        rotation: [-12, 0, 0],
      }),
    );
  }
  mark("accessory");

  // ---- arms and what they hold ----
  const armD = r1(block ? lw * pct("armThick") : (lw * 0.85 * pct("armThick")) / pct("legThick"));
  // Square arms turn about the middle of a shoulder block.
  const shoulderZ = block ? top - armD / 2 : zb + bodyH * 0.82;
  const armL = r1(bodyH * S.arm * pct("armLength") - (block ? armD / 2 : 0));
  const handD = armD * (S.hand || 1.25);
  const hands = {};
  // Each pose gives, per arm, either two directions (upper arm, forearm)
  // with x pointing away from the body, or a spot for the hand to reach
  // and a hint for which way the elbow points.
  const norm = (p) => {
    const l = Math.hypot(...p) || 1;
    return p.map((n) => n / l);
  };
  const waist = zb + bodyH * 0.32;
  const DOWN = { dirs: [block ? [0, 0, -1] : [0.26, 0, -0.97], block ? [0, 0, -1] : [0.26, 0, -0.97]] };
  const UP = { dirs: [block ? [0.5, 0, 0.87] : [0.57, 0, 0.82], block ? [0.5, 0, 0.87] : [0.57, 0, 0.82]] };
  const HIP = (sx) => ({ reach: [sx * (body.half(waist) + armD * 0.15), fy + body.front(waist) * 0.1, waist], pole: [sx, 0.35, 0] });
  const pose = (sx) => {
    const right = sx > 0;
    switch (v.pose) {
      case "up":
        return UP;
      case "wave":
        return right
          ? {
              dirs: [
                [0.85, 0, 0.35],
                [0.25, 0, 0.97],
              ],
            }
          : DOWN;
      case "hips":
        return HIP(sx);
      case "crossed": {
        const z = zb + bodyH * (right ? 0.5 : 0.44);
        return { reach: [-sx * body.half(z) * 0.5, frontY(z) - armD * 0.55, z], pole: [sx * 0.7, -0.2, -1] };
      }
      case "point":
        return right
          ? {
              dirs: [
                [0.2, -0.95, 0.15],
                [0.12, -0.98, 0.14],
              ],
            }
          : DOWN;
      case "flex":
        return {
          dirs: [
            [0.98, 0, 0.12],
            [0.08, 0, 1],
          ],
        };
      case "salute":
        return right ? { reach: [sx * halfW * 0.6, fy - halfD * 0.85 - armD * 0.3, eyeZ + H * 0.16], pole: [1, -0.4, -0.2] } : DOWN;
      case "think": {
        // Hand under the chin, clear of the mouth (the mouth is cut out, and would cut the hand too).
        if (right)
          return {
            reach: [sx * H * 0.12, fy - halfD * 0.9 - handD * 0.2, Math.min(headZ0 + H * 0.06, mouthLow - handD * 0.55 - 1)],
            pole: [0.6, -0.3, -1],
          };
        const z = zb + bodyH * 0.38;
        return { reach: [-sx * body.half(z) * 0.25, frontY(z) - armD * 0.5, z], pole: [sx * 0.7, -0.2, -1] };
      }
      case "shrug":
        return {
          dirs: [
            [0.92, 0, -0.38],
            [0.5, -0.25, 0.83],
          ],
        };
      case "reach":
        return {
          dirs: [
            [0.22, -0.97, 0.02],
            [0.12, -0.99, 0.05],
          ],
        };
      case "run":
        return right
          ? {
              dirs: [
                [0.3, -0.5, -0.81],
                [0.15, -0.65, 0.75],
              ],
            }
          : {
              dirs: [
                [0.3, 0.55, -0.78],
                [0.2, 0.2, -0.96],
              ],
            };
      default:
        return DOWN;
    }
  };
  if (v.pose !== "none") {
    for (const sx of [-1, 1]) {
      const half = body.half(shoulderZ);
      const S0 = [block ? sx * (half + armD / 2 - 0.6) : sx * (half - armD * 0.2), fy, shoulderZ];
      const Lu = armL * 0.5;
      const Ll = armL * 0.5;
      const pz = pose(sx);
      let E;
      let Hd;
      if (pz.dirs) {
        const [u, l] = pz.dirs.map(([x, y, z]) => norm([sx * x, y, z]));
        E = S0.map((n, i) => n + u[i] * Lu);
        Hd = E.map((n, i) => n + l[i] * Ll);
      } else {
        // Two-bone reach: the elbow sits where both arm parts meet, bent toward the pole.
        let T = pz.reach;
        let dv = T.map((n, i) => n - S0[i]);
        let d = Math.hypot(...dv);
        if (d > (Lu + Ll) * 0.98) {
          dv = dv.map((n) => (n / d) * (Lu + Ll) * 0.98);
          d = (Lu + Ll) * 0.98;
          T = S0.map((n, i) => n + dv[i]);
        }
        d = Math.max(d, Math.abs(Lu - Ll) + 0.5);
        const dir = norm(dv);
        const a = (Lu * Lu - Ll * Ll + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, Lu * Lu - a * a));
        const pole = [pz.pole[0] * (pz.pole[0] === sx || pz.pole[0] === -sx ? 1 : 1), pz.pole[1], pz.pole[2]];
        const along = pole.reduce((t, n, i) => t + n * dir[i], 0);
        const perp = norm(pole.map((n, i) => n - along * dir[i]));
        E = S0.map((n, i) => n + dir[i] * a + perp[i] * h);
        Hd = T;
      }
      if (block) {
        parts.push(o("box", { name: "Arm", params: { w: armD, d: armD, h: armD, radius: 0 }, position: [r1(S0[0]), fy, r1(top - armD)] }));
        parts.push(aim("box", "Arm", { w: armD, d: armD, radius: 0 }, S0, E));
        parts.push(
          o("box", {
            name: "Arm",
            params: { w: armD, d: armD, h: armD, radius: 0 },
            position: E.map((n, i) => r1(i === 2 ? n - armD / 2 : n)),
          }),
        );
        parts.push(aim("box", "Arm", { w: armD, d: armD, radius: 0 }, E, Hd));
      } else {
        parts.push(ball("Arm", S0, armD));
        parts.push(aim("cylinder", "Arm", { d: armD }, S0, E));
        parts.push(ball("Arm", E, armD));
        parts.push(aim("cylinder", "Arm", { d: armD }, E, Hd));
        parts.push(ball("Hand", Hd, handD));
      }
      hands[sx > 0 ? "right" : "left"] = Hd;
    }
  }
  // Holds something in a hand, resized around the hand, with a grip from the
  // palm into the item so they stay joined at any size.
  const hold = (hand, f, build) => {
    const start = parts.length;
    const grip = build(hand);
    grow(parts, start, f, hand);
    if (!grip) return;
    const g = grip.map((n, i) => hand[i] + (n - hand[i]) * f);
    if (Math.hypot(...g.map((n, i) => n - hand[i])) > 0.5) parts.push(peg("Grip", hand, g, Math.max(1.6, armD * 0.6)));
  };
  // Every held thing, for either hand. `out` is +1 on the right, -1 on the left.
  const item =
    (kind, out) =>
    ([hx, hy, hz]) => {
      const y = hy - 2 * s;
      const stick = (nm, d, z1, z2, x = hx, yy = y) =>
        o("cylinder", { name: nm, params: { d: r1(Math.max(1.4, d)), h: r1(z2 - z1) }, position: [r1(x), r1(yy), r1(z1)] });
      const floor = (len) => Math.max(z0 - 0.4, hz - len); // long things rest on the stand
      switch (kind) {
        case "coffee":
          parts.push(
            o("cone", {
              name: "Coffee cup",
              params: { d1: r1(6 * s), d2: r1(7.5 * s), h: r1(9 * s) },
              position: [r1(hx + 1.5 * s), r1(hy - 4.5 * s), r1(hz - 4 * s)],
            }),
          );
          parts.push(
            o("cylinder", {
              name: "Coffee lid",
              params: { d: r1(8 * s), h: r1(1.6 * s) },
              position: [r1(hx + 1.5 * s), r1(hy - 4.5 * s), r1(hz + 5 * s - 0.2)],
            }),
          );
          return [hx + 1.5 * s, hy - 4.5 * s, hz];
        case "sword":
        case "dagger": {
          const L = kind === "sword" ? 26 * s : 12 * s;
          parts.push(
            o("box", { name: "Blade", params: { w: r1(2.6 * s), d: 1.6, h: r1(L), radius: 0 }, position: [r1(hx), r1(y), r1(hz + 1)] }),
          );
          parts.push(
            o("cone", {
              name: "Blade",
              params: { d1: r1(2.6 * s * 1.1), d2: 0.6, h: r1(3 * s) },
              position: [r1(hx), r1(y), r1(hz + L + 0.6)],
              scale: [1, 0.6, 1],
            }),
          );
          parts.push(
            o("box", {
              name: "Crossguard",
              params: { w: r1((kind === "sword" ? 9 : 6) * s), d: 2.4, h: 2, radius: 0.8 },
              position: [r1(hx), r1(y), r1(hz + 1)],
            }),
          );
          parts.push(ball("Crossguard", [hx, y, hz - 3 * s], 2.6 * s));
          parts.push(stick("Crossguard", 2 * s, hz - 3 * s, hz + 1.5, hx, y));
          return [hx, y, hz + 2];
        }
        case "wand":
          parts.push(stick("Wand", 1.8, hz - 2, hz + 16 * s));
          parts.push({ ...standUp({ ...star(r1(9 * s), 0, 2), position: [0, 0, -1] }, r1(y), r1(hz + 14 * s)) });
          parts[parts.length - 1].position[0] = r1(hx);
          return [hx, y, hz];
        case "heart": {
          const hs = r1(10 * s);
          parts.push(
            ...heart(hs, 0, 2.4).map((p) =>
              standUp({ ...p, position: [p.position[0] + hx, p.position[1], p.position[2] - 1.2] }, r1(hy - 3 * s), r1(hz + hs * 0.25)),
            ),
          );
          return [hx, hy - 3 * s, hz + 2.5 * s];
        }
        case "balloon":
          parts.push(stick("Balloon string", 1.4, hz - 1, hz + 20 * s, hx, hy));
          parts.push(blob("Balloon", [hx, hy, hz + 24 * s], [12 * s, 12 * s, 14 * s]));
          parts.push(
            o("cone", {
              name: "Balloon",
              params: { d1: r1(2.4 * s), d2: r1(0.8), h: r1(1.8 * s) },
              position: [r1(hx), r1(hy), r1(hz + 16.4 * s)],
            }),
          );
          return [hx, hy, hz];
        case "staff": {
          const lo = floor(30 * s);
          parts.push(stick("Staff", 2.6 * s, lo, hz + 20 * s, hx, hy));
          parts.push(ball("Staff orb", [hx, hy, hz + 20 * s + 1.5 * s], 6 * s));
          for (const k of [-1, 1])
            parts.push(aim("cone", "Staff", { d1: r1(1.6 * s), d2: 0.6 }, [hx, hy, hz + 18 * s], [hx + k * 3 * s, hy, hz + 24 * s]));
          return [hx, hy, hz];
        }
        case "spear":
        case "trident": {
          const lo = floor(30 * s);
          const topZ = hz + 24 * s;
          parts.push(stick(kind === "spear" ? "Spear" : "Trident", 2.2 * s, lo, topZ, hx, hy));
          if (kind === "spear")
            parts.push(
              o("cone", {
                name: "Spear tip",
                params: { d1: r1(4.4 * s), d2: 0.6, h: r1(8 * s) },
                position: [r1(hx), r1(hy), r1(topZ - 0.5)],
                scale: [1, 0.45, 1],
              }),
            );
          else {
            parts.push(
              o("box", {
                name: "Spear tip",
                params: { w: r1(10 * s), d: r1(2 * s), h: r1(1.8 * s), radius: 0.4 },
                position: [r1(hx), r1(hy), r1(topZ - 0.6)],
              }),
            );
            for (const k of [-1, 0, 1])
              parts.push(
                o("cone", {
                  name: "Spear tip",
                  params: { d1: r1(2.2 * s), d2: 0.6, h: r1((k ? 6 : 8) * s) },
                  position: [r1(hx + k * 4.2 * s), r1(hy), r1(topZ + 1.2 * s - 0.6)],
                }),
              );
          }
          return [hx, hy, hz];
        }
        case "axe":
        case "hammer": {
          parts.push(stick("Axe handle", 2.2 * s, hz - 6 * s, hz + 18 * s));
          if (kind === "hammer")
            parts.push(
              o("box", {
                name: "Axe head",
                params: { w: r1(10 * s), d: r1(5 * s), h: r1(6 * s), radius: r1(0.8 * s) },
                position: [r1(hx), r1(y), r1(hz + 13 * s)],
              }),
            );
          else {
            const pts = [
              [0, -3],
              [6, -6.5],
              [8, 0],
              [6, 6.5],
              [0, 3],
            ].map(([x, z]) => [r1(out * x * s), r1(z * s)]);
            if (out < 0) pts.reverse();
            parts.push(facePlate("Axe head", pts, hx, y + 1, hz + 14 * s, 2));
          }
          return [hx, y, hz];
        }
        case "torch":
          parts.push(stick("Torch", 2.6 * s, hz - 5 * s, hz + 10 * s));
          parts.push(
            o("cone", {
              name: "Torch cup",
              params: { d1: r1(3 * s), d2: r1(6 * s), h: r1(3 * s) },
              position: [r1(hx), r1(y), r1(hz + 9.5 * s)],
            }),
          );
          parts.push(
            o("cone", { name: "Flame", params: { d1: r1(5.4 * s), d2: 0.6, h: r1(7 * s) }, position: [r1(hx), r1(y), r1(hz + 12.3 * s)] }),
          );
          return [hx, y, hz];
        case "icecream":
          parts.push(
            o("cone", { name: "Cone", params: { d1: 0.8, d2: r1(6 * s), h: r1(10 * s) }, position: [r1(hx), r1(y), r1(hz - 4 * s)] }),
          );
          parts.push(ball("Scoop", [hx, y, hz + 7.5 * s], 6.6 * s));
          parts.push(ball("Scoop", [hx, y, hz + 12.5 * s], 6 * s));
          return [hx, y, hz];
        case "lollipop":
          parts.push(stick("Lolly stick", 1.6, hz - 3 * s, hz + 12 * s));
          parts.push(
            o("cylinder", {
              name: "Lollipop",
              params: { d: r1(11 * s), h: r1(Math.max(1.6, 2.4 * s)) },
              position: [r1(hx), r1(y + 1.2 * s), r1(hz + 16 * s)],
              rotation: [90, 0, 0],
            }),
          );
          return [hx, y, hz];
        case "flower": {
          parts.push(stick("Stem", 1.6, hz - 4 * s, hz + 13 * s));
          parts.push(blob("Leaf", [hx + out * 2 * s, y, hz + 6 * s], [4 * s, 1.4, 2 * s], [0, out * -30, 0]));
          const fz = hz + 15 * s;
          for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            parts.push(ball("Petal", [hx + Math.cos(a) * 2.6 * s, y, fz + Math.sin(a) * 2.6 * s], 3.4 * s));
          }
          parts.push(ball("Flower middle", [hx, y - 0.8 * s, fz], 3 * s));
          return [hx, y, hz];
        }
        case "mic":
          parts.push(
            o("cone", {
              name: "Mic",
              params: { d1: r1(2.4 * s), d2: r1(3.6 * s), h: r1(10 * s) },
              position: [r1(hx), r1(y), r1(hz - 4 * s)],
            }),
          );
          parts.push(ball("Mic head", [hx, y, hz + 8 * s], 5.4 * s));
          return [hx, y, hz];
        case "flag":
          parts.push(stick("Flagpole", 1.8, floor(14 * s), hz + 24 * s, hx, hy));
          parts.push(ball("Flagpole", [hx, hy, hz + 24 * s], 2.8));
          parts.push(
            o("box", {
              name: "Flag",
              params: { w: r1(12 * s), d: 1.2, h: r1(8 * s), radius: 0 },
              position: [r1(hx + out * 6 * s), r1(hy), r1(hz + 15 * s)],
            }),
          );
          return [hx, hy, hz];
        case "trophy":
          parts.push(stick("Trophy", 2.4 * s, hz - 3 * s, hz + 3.5 * s));
          parts.push(
            o("cylinder", { name: "Trophy", params: { d: r1(6 * s), h: r1(1.6 * s) }, position: [r1(hx), r1(y), r1(hz - 4.4 * s)] }),
          );
          parts.push(
            o("cone", {
              name: "Trophy",
              params: { d1: r1(2.6 * s), d2: r1(8 * s), h: r1(7 * s) },
              position: [r1(hx), r1(y), r1(hz + 3 * s)],
            }),
          );
          for (const k of [-1, 1])
            parts.push(
              o("tube", {
                name: "Trophy",
                params: { d: r1(4.2 * s), id: r1(2.4 * s), h: r1(1.2 * s) },
                position: [r1(hx + k * 3.6 * s - 0.6 * s), r1(y), r1(hz + 7.2 * s)],
                rotation: [0, 90, 0],
              }),
            );
          return [hx, y, hz];
        case "bat":
          parts.push(
            o("cone", {
              name: "Bat",
              params: { d1: r1(2.2 * s), d2: r1(4.6 * s), h: r1(20 * s) },
              position: [r1(hx), r1(y), r1(hz - 4 * s)],
            }),
          );
          parts.push(ball("Bat", [hx, y, hz + 16 * s], 4.6 * s));
          parts.push(ball("Bat", [hx, y, hz - 4 * s], 3 * s));
          return [hx, y, hz];
        case "umbrella": {
          parts.push(stick("Umbrella", 1.8, hz - 4 * s, hz + 22 * s));
          parts.push(
            ...chain("Umbrella handle", bend([hx, y, hz - 3.6 * s], [hx + out * 4 * s, y, hz - 4 * s], [0, 0, -4 * s], 4), 2.2 * s),
          );
          parts.push(
            o("cone", { name: "Canopy", params: { d1: r1(22 * s), d2: 1.4, h: r1(7 * s) }, position: [r1(hx), r1(y), r1(hz + 16 * s)] }),
          );
          for (let i = 0; i < 8; i++) {
            const a = (i / 8) * Math.PI * 2;
            parts.push(ball("Canopy", [hx + Math.cos(a) * 10 * s, y + Math.sin(a) * 10 * s, hz + 16.4 * s], 2.6 * s));
          }
          return [hx, y, hz];
        }
        case "magnifier":
          parts.push(stick("Magnifier", 2.4 * s, hz - 4 * s, hz + 5 * s));
          parts.push(
            o("tube", {
              name: "Magnifier",
              params: { d: r1(10 * s), id: r1(7 * s), h: r1(1.8 * s) },
              position: [r1(hx), r1(y + 0.9 * s), r1(hz + 9.5 * s)],
              rotation: [90, 0, 0],
            }),
          );
          parts.push(
            o("cylinder", {
              name: "Lens",
              params: { d: r1(7.2 * s), h: 0.8 },
              position: [r1(hx), r1(y + 0.4), r1(hz + 9.5 * s)],
              rotation: [90, 0, 0],
            }),
          );
          return [hx, y, hz];
        case "bow": {
          // An archery bow standing upright, bowed away from the body.
          const t = [hx, hy, hz + 13 * s];
          const b = [hx, hy, hz - 13 * s];
          parts.push(...chain("Bow", bend(t, b, [out * 7 * s, 0, 0], 6), 2.2 * s, 2.2 * s));
          parts.push(aim("cylinder", "Bowstring", { d: 1 }, [t[0] - out * 0.4, t[1], t[2]], [b[0] - out * 0.4, b[1], b[2]]));
          return [hx + out * 5 * s, hy, hz];
        }
        case "potion":
          parts.push(ball("Potion", [hx, hy - 3 * s, hz + 1 * s], 7.5 * s));
          parts.push(stick("Potion neck", 2.8 * s, hz + 3.5 * s, hz + 8 * s, hx, hy - 3 * s));
          parts.push(stick("Cork", 3.2 * s, hz + 7.6 * s, hz + 9.4 * s, hx, hy - 3 * s));
          return [hx, hy - 3 * s, hz + s];
        case "orb":
          parts.push(ball("Orb", [hx, hy - 1.5 * s, hz + 5 * s], 9 * s));
          return [hx, hy - 1.5 * s, hz + 3 * s];
        case "ball":
          parts.push(ball("Ball", [hx + out * 1.5 * s, hy - 4.5 * s, hz + 1 * s], 10 * s));
          return [hx + out * 1.5 * s, hy - 4.5 * s, hz + s];
        case "gift": {
          const c = [hx + out * s, hy - 5 * s, hz - 4.5 * s];
          parts.push(o("box", { name: "Gift", params: { w: r1(9 * s), d: r1(9 * s), h: r1(9 * s), radius: 0.4 }, position: c.map(r1) }));
          parts.push(
            o("box", {
              name: "Ribbon",
              params: { w: r1(9.6 * s), d: r1(2 * s), h: r1(9.6 * s), radius: 0 },
              position: [r1(c[0]), r1(c[1]), r1(c[2] - 0.3 * s)],
            }),
          );
          parts.push(
            o("box", {
              name: "Ribbon",
              params: { w: r1(2 * s), d: r1(9.6 * s), h: r1(9.6 * s), radius: 0 },
              position: [r1(c[0]), r1(c[1]), r1(c[2] - 0.3 * s)],
            }),
          );
          for (const k of [-1, 1])
            parts.push(blob("Ribbon", [c[0] + k * 1.6 * s, c[1], c[2] + 9.8 * s], [3.4 * s, 1.6 * s, 2.6 * s], [0, k * 30, 0]));
          return [c[0], c[1], hz];
        }
        case "phone":
          parts.push(
            o("box", {
              name: "Phone",
              params: { w: r1(5.4 * s), d: r1(1.4 * s), h: r1(10 * s), radius: r1(0.8 * s) },
              position: [r1(hx), r1(hy - handD * 0.4 - 0.7 * s), r1(hz - 2 * s)],
            }),
          );
          parts.push(
            o("box", {
              name: "Screen",
              params: { w: r1(4.4 * s), d: 0.6, h: r1(8 * s), radius: r1(0.5 * s) },
              position: [r1(hx), r1(hy - handD * 0.4 - 1.5 * s), r1(hz - 1 * s)],
            }),
          );
          return [hx, hy - handD * 0.4 - 0.7 * s, hz];
        case "shield":
        case "kite": {
          const d = Math.max(14 * s, bodyH * 0.7);
          // Close enough to the hand that it still overlaps when the item grows.
          const yy = hy - handD * 0.2;
          if (kind === "shield") {
            parts.push(
              o("cylinder", { name: "Shield", params: { d: r1(d), h: 2.2 }, position: [r1(hx), r1(yy), r1(hz)], rotation: [90, 0, 0] }),
            );
            parts.push(ball("Shield boss", [hx, yy - 2, hz], d * 0.25));
          } else {
            const w = d * 0.8;
            const pts = [
              [-w / 2, d * 0.35],
              [w / 2, d * 0.35],
              [w * 0.48, 0],
              [0, -d * 0.65],
              [-w * 0.48, 0],
            ].map((p) => p.map(r1));
            parts.push(facePlate("Shield", pts, hx, yy, hz, 2.2));
            parts.push(
              o("box", {
                name: "Shield boss",
                params: { w: r1(w * 0.14), d: 1.2, h: r1(d * 0.8), radius: 0 },
                position: [r1(hx), r1(yy - 1.6), r1(hz - d * 0.5)],
              }),
            );
            parts.push(
              o("box", {
                name: "Shield boss",
                params: { w: r1(w * 0.8), d: 1.2, h: r1(w * 0.14), radius: 0 },
                position: [r1(hx), r1(yy - 1.6), r1(hz + d * 0.08)],
              }),
            );
          }
          return [hx, yy, hz];
        }
        case "book":
          parts.push(
            o("box", {
              name: "Book",
              params: { w: r1(9 * s), d: r1(3 * s), h: r1(12 * s), radius: 0.4 },
              position: [r1(hx), r1(hy - handD * 0.3 - 1.5 * s), r1(hz - 6 * s)],
            }),
          );
          parts.push(
            o("box", {
              name: "Pages",
              params: { w: r1(8.4 * s), d: r1(3.2 * s), h: r1(11 * s), radius: 0 },
              position: [r1(hx + out * 0.6), r1(hy - handD * 0.3 - 1.5 * s), r1(hz - 5.5 * s)],
            }),
          );
          return [hx, hy - handD * 0.3 - 1.5 * s, hz];
        case "lantern": {
          const top2 = hz - handD * 0.3;
          parts.push(
            o("cylinder", {
              name: "Lantern",
              params: { d: 1.6, h: r1(4 * s + 2 + handD * 0.3) },
              position: [r1(hx), r1(hy), r1(top2 - 4 * s)],
            }),
          ); // reaches up into the hand, or a blocky arm's end
          parts.push(
            o("cylinder", {
              name: "Lantern",
              params: { d: r1(6 * s), h: r1(7 * s), edge: r1(0.8 * s), edgeStyle: "round" },
              position: [r1(hx), r1(hy), r1(top2 - 11 * s)],
            }),
          );
          parts.push(
            o("cone", {
              name: "Lantern",
              params: { d1: r1(7 * s), d2: 1, h: r1(2.6 * s) },
              position: [r1(hx), r1(hy), r1(top2 - 4.6 * s)],
            }),
          );
          return null;
        }
        default:
          return null;
      }
    };
  if (hands.right && v.item !== "none") hold(hands.right, pct("itemSize"), item(v.item, 1));
  if (hands.left && v.offhand !== "none") hold(hands.left, pct("offSize"), item(v.offhand, -1));
  mark("item", { Arm: "arms", Hand: "skin", Grip: "skin" });

  const stick0 = (nm, d, z1, z2, x, y) =>
    o("cylinder", { name: nm, params: { d: r1(Math.max(1.4, d)), h: r1(z2 - z1) }, position: [r1(x), r1(y), r1(z1)] });
  // ---- back ----
  const backY = backAt(zb + bodyH * 0.5);
  const gearStart = parts.length;
  let gearAnchor = null;
  if (v.back === "backpack") {
    const pd = (block ? bd : bd) * 0.42;
    parts.push(
      o("box", {
        name: "Backpack",
        params: {
          w: r1(bw * 0.72),
          d: r1(pd),
          h: r1(bodyH * 0.62),
          radius: r1(block ? 0.6 : bw * 0.12),
          edge: 1,
          edgeStyle: "round",
        },
        position: [0, r1(backAt(zb + bodyH * 0.5) + pd / 2 - 1.4), r1(zb + bodyH * 0.22)],
      }),
    );
    gearAnchor = [0, r1(backY - 0.6), r1(zb + bodyH * 0.53)];
  } else if (v.back === "jetpack") {
    for (const sx of [-1, 1]) {
      const x = r1(sx * bw * 0.2);
      const jetAt = [x, r1(backY - bw * 0.01), r1(zb + bodyH * 0.53)];
      parts.push({
        ...peg("Jet strap", [r1(x * 0.5), fy, jetAt[2]], [x, r1(backY + bw * 0.12), jetAt[2]], Math.max(2.5, bw * 0.12)),
        anchor: jetAt,
      });
      parts.push({
        ...o("cylinder", {
          name: "Jet",
          params: {
            d: r1(bw * 0.3),
            h: r1(bodyH * 0.7),
            edge: 1,
            edgeStyle: "round",
          },
          position: [x, r1(backY + bw * 0.12), r1(zb + bodyH * 0.18)],
        }),
        anchor: jetAt,
      });
      parts.push({
        ...o("cone", {
          name: "Flame",
          params: { d1: 0.8, d2: r1(bw * 0.24), h: r1(bodyH * 0.3) },
          position: [x, r1(backY + bw * 0.12), r1(zb + bodyH * 0.18 - bodyH * 0.24)],
        }),
        anchor: jetAt,
      });
    }
  } else if (v.back === "wings" || v.back === "fairy") {
    const span = bw * 1.15;
    const z = zb + bodyH * 0.62;
    const yb = backAt(z) + 1.2;
    for (const sx of [-1, 1]) {
      const root = [sx * bw * 0.1, yb, z];
      if (v.back === "wings") {
        // Feathers fanned out from the shoulder blade, longest on top.
        [10, 26, 42, 58, 74].forEach((deg, i) => {
          const a = (deg * Math.PI) / 180;
          const len = span * [1.05, 0.95, 0.82, 0.68, 0.52][i];
          const c = [root[0] + sx * Math.cos(a) * len * 0.5, yb + i * 0.4, z + Math.sin(a) * len * 0.5 - bw * 0.04];
          parts.push(blob("Wing", c, [len, 2.2, bw * (0.2 - i * 0.015)], [0, -sx * deg, 0]));
        });
      } else {
        parts.push(blob("Wing", [sx * span * 0.36, yb + 0.4, z + span * 0.3], [span * 0.85, 1.8, span * 0.55], [0, -sx * 35, 0]));
        parts.push(blob("Wing", [sx * span * 0.32, yb + 0.4, z - span * 0.18], [span * 0.6, 1.8, span * 0.38], [0, sx * 28, 0]));
      }
    }
    gearAnchor = [0, r1(yb), r1(z)];
    parts.push(peg("Wing root", [0, fy, r1(z)], [0, r1(yb + 1), r1(z)], Math.max(4, bw * 0.22)));
  } else if (v.back === "batwings") {
    const span = bw * 1.1;
    const z = zb + bodyH * 0.62;
    const yb = backAt(z);
    for (const sx of [-1, 1]) {
      // Bones out to three finger tips, with the skin scalloped between them.
      const tips = [
        [span * 0.5, span * 0.5],
        [span * 1.15, span * 0.6],
        [span * 1, span * 0.08],
        [span * 0.62, -span * 0.18],
        [span * 0.12, -span * 0.04],
      ];
      const pts = [[-3, 0]];
      tips.forEach((t, i) => {
        pts.push(t);
        const nxt = tips[i + 1];
        if (nxt && i > 0) pts.push([((t[0] + nxt[0]) / 2) * 0.78, ((t[1] + nxt[1]) / 2) * 0.78]);
      });
      const p2 = pts.map(([x, y]) => [r1(sx * x), r1(y)]);
      if (sx < 0) p2.reverse();
      parts.push(
        o("sketch", {
          name: "Wing",
          params: { shapes: [{ kind: "poly", pts: p2, radius: 1 }], op: "extrude", height: 1.8 },
          position: [0, r1(yb + 2.4), r1(z)],
          rotation: [90, 0, 0],
        }),
      );
      for (const t of tips.slice(1, 4))
        parts.push(
          aim("cone", "Wing bone", { d1: r1(Math.max(2.2, bw * 0.1)), d2: 1.2 }, [sx * 2, yb + 2.6, z], [sx * t[0], yb + 2.6, z + t[1]]),
        );
      parts.push(
        ...chain(
          "Wing bone",
          [
            [sx * 2, yb + 2.6, z],
            [sx * tips[0][0], yb + 2.6, z + tips[0][1]],
            [sx * tips[1][0], yb + 2.6, z + tips[1][1]],
          ],
          Math.max(2.4, bw * 0.11),
          1.2,
        ),
      );
    }
    gearAnchor = [0, r1(yb + 1.4), r1(z)];
    parts.push(peg("Wing root", [0, fy, r1(z)], [0, r1(yb + 2), r1(z)], Math.max(4, bw * 0.2)));
  } else if (v.back === "cape") {
    // A curved sheet hung from the shoulders, a little wider at the hem.
    const capeH = r1(bodyH + (pegBody ? bodyH * 0.1 : Math.min(ll * 0.75, zb - z0 - 1 + bodyH * 0)));
    const Rt = (body.round ? body.half(top) : Math.max(body.w, body.dd) * 0.52) + 0.6;
    const Rb = Rt * 1.3;
    const zbot = top - capeH;
    parts.push(
      o("sketch", {
        name: "Cape",
        params: {
          shapes: [
            {
              kind: "poly",
              pts: [
                [Rb, 0],
                [Rb + 1.6, 0],
                [Rt + 1.6, capeH],
                [Rt, capeH],
              ].map((p) => p.map(r1)),
            },
          ],
          op: "revolve",
          angle: 150,
        },
        position: [0, fy, r1(zbot)],
        rotation: [0, 0, 15],
      }),
    );
    parts.push(
      o("tube", {
        name: "Cape",
        params: { d: r1(Rt * 2 + 3), id: r1(Math.max(neckD, (Rt - 2) * 2)), h: 2.4 },
        position: [0, fy, r1(top - 2.4)],
      }),
    );
    gearAnchor = [0, r1(fy + Rt), r1(top - 1)];
  } else if (v.back === "shell") {
    const zc = zb + bodyH * 0.5;
    const yc = backAt(zc) + bd * 0.12;
    parts.push(blob("Shell", [0, yc, zc], [bw * 1.08, bd * 0.85, bodyH * 1.02]));
    for (let i = 0; i < 7; i++) {
      const a = (i / 6) * Math.PI * 2;
      const c = i === 6 ? [0, yc + bd * 0.4, zc] : [Math.cos(a) * bw * 0.28, yc + bd * 0.32, zc + Math.sin(a) * bodyH * 0.3];
      parts.push(blob("Shell", c, [bw * 0.3, bd * 0.12, bodyH * 0.26]));
    }
    gearAnchor = [0, r1(backAt(zc) - 0.6), r1(zc)];
  } else if (v.back === "sword" || v.back === "guitar") {
    // Slung across the back, low on the left and over the right shoulder.
    const zA = zb + bodyH * 0.1;
    const zB = top + bodyH * 0.38;
    const yA = backAt(zA) + bw * 0.12;
    const yB = backAt(top) + bw * 0.12;
    const A = [-bw * 0.32, yA, zA];
    const B = [bw * 0.32, yB, zB];
    if (v.back === "sword") {
      parts.push(aim("cone", "Scabbard", { d1: r1(bw * 0.1), d2: r1(bw * 0.16) }, A, B));
      const ry = (Math.atan2(B[0] - A[0], B[2] - A[2]) * 180) / Math.PI;
      parts.push(blob("Hilt", B, [bw * 0.46, bw * 0.13, bw * 0.11], [0, ry, 0]));
      const L = Math.hypot(B[0] - A[0], B[2] - A[2]);
      const C = [B[0] + ((B[0] - A[0]) / L) * bw * 0.3, B[1], B[2] + ((B[2] - A[2]) / L) * bw * 0.3];
      parts.push(peg("Hilt", B, C, Math.max(2.2, bw * 0.09)));
      parts.push(ball("Hilt", C, Math.max(3, bw * 0.15)));
    } else {
      const g = (t) => A.map((n, i) => n + (B[i] - n) * t);
      // The two bulbs overlap by a set share of their size, however long the
      // back is, so they stay one body on tall, thin figures too.
      const L = Math.hypot(...B.map((n, i) => n - A[i]));
      const t2 = Math.min(0.36, 0.12 + (bw * 0.36) / L);
      parts.push(blob("Guitar", g(0.12), [bw * 0.62, bd * 0.28, bw * 0.55], [0, -38, 0]));
      parts.push(blob("Guitar", g(t2), [bw * 0.48, bd * 0.28, bw * 0.42], [0, -38, 0]));
      parts.push(aim("box", "Guitar neck", { w: r1(bw * 0.12), d: r1(bd * 0.12), radius: 0 }, g(t2 - 0.04), g(1)));
      parts.push(blob("Guitar neck", g(1), [bw * 0.18, bd * 0.14, bw * 0.24], [0, -38, 0]));
    }
    parts.push(
      ...chain(
        "Strap",
        [
          [-bw * 0.3, frontY(top - bodyH * 0.1) + 0.6, top - bodyH * 0.1],
          [0, frontY(zb + bodyH * 0.45) + 0.4, zb + bodyH * 0.45],
          [bw * 0.3, frontY(zb + bodyH * 0.2) + 0.6, zb + bodyH * 0.2],
        ],
        Math.max(1.8, bw * 0.08),
      ).map((p) => ({ ...p, keep: true })),
    );
    // A peg from the back into the middle of what's slung there.
    const M = v.back === "sword" ? A.map((n, i) => (n + B[i]) / 2) : A.map((n, i) => n + (B[i] - n) * 0.22);
    parts.push(peg("Strap", [M[0], fy, M[2]], M, Math.max(3, bw * 0.14)));
    gearAnchor = [M[0], r1(backAt(M[2]) - 0.6), r1(M[2])];
  } else if (v.back === "tank") {
    const d = bw * 0.42;
    const y = backAt(zb + bodyH * 0.5) + d * 0.42;
    parts.push(
      o("cylinder", {
        name: "Tank",
        params: { d: r1(d), h: r1(bodyH * 0.8), edge: r1(d * 0.4), edgeStyle: "round" },
        position: [0, r1(y), r1(zb + bodyH * 0.08)],
      }),
    );
    parts.push(stick0("Tank valve", d * 0.25, zb + bodyH * 0.85, zb + bodyH * 0.98, 0, y));
    parts.push(ball("Tank valve", [0, y, zb + bodyH * 1.0], d * 0.35));
    gearAnchor = [0, r1(backAt(zb + bodyH * 0.5) - 0.6), r1(zb + bodyH * 0.5)];
  } else if (v.back === "quiver") {
    const z = zb + bodyH * 0.25;
    const yb = backAt(z + bodyH * 0.3);
    const d = Math.max(5, bw * 0.3);
    const from = [-bw * 0.15, yb + d * 0.35, z];
    const to = [bw * 0.25, yb + d * 0.5, z + bodyH * 0.85];
    parts.push(aim("cylinder", "Quiver", { d: r1(d) }, from, to));
    for (let i = 0; i < 3; i++) {
      const b = [to[0] + (i - 1) * d * 0.25, to[1], to[2] - 1];
      parts.push(aim("cone", "Arrow", { d1: r1(d * 0.3), d2: 0.6 }, b, [b[0] + d * 0.25, b[1], b[2] + d * 0.9]));
    }
    parts.push(peg("Quiver strap", [0, fy, z + bodyH * 0.4], [0, yb + d * 0.4, z + bodyH * 0.4], Math.max(2.5, bw * 0.12)));
    gearAnchor = [0, r1(yb), r1(z + bodyH * 0.4)];
  }
  grow(parts, gearStart, pct("gearSize"), gearAnchor);
  mark("gear", { Strap: "details", Hilt: "details", "Tank valve": "details", "Wing bone": "gear" });

  // ---- tail ----
  const tailZ = zb + bodyH * 0.15;
  const tailStart = parts.length;
  const tailRoot = [0, backAt(tailZ) - 1, tailZ];
  const [, ty, tz] = tailRoot;
  if (v.tail === "cat") {
    // Out from the back, then curving up into a hook.
    const pts = [
      tailRoot,
      [0, ty + bodyH * 0.35, tz - bodyH * 0.05],
      [bw * 0.08, ty + bodyH * 0.62, tz + bodyH * 0.2],
      [bw * 0.14, ty + bodyH * 0.64, tz + bodyH * 0.55],
      [bw * 0.05, ty + bodyH * 0.5, tz + bodyH * 0.72],
    ];
    parts.push(...chain("Tail", pts, Math.max(2.4, lw * 0.6), Math.max(2, lw * 0.5)));
  } else if (v.tail === "fox" || v.tail === "squirrel") {
    // A fluffy tail made of overlapping puffs, biggest near the tip.
    const big = v.tail === "squirrel";
    const path = big
      ? [
          tailRoot,
          [0, ty + bodyH * 0.3, tz + bodyH * 0.05],
          [0, ty + bodyH * 0.45, tz + bodyH * 0.45],
          [0, ty + bodyH * 0.38, tz + bodyH * 0.9],
          [0, ty + bodyH * 0.15, tz + bodyH * 1.15],
        ]
      : [
          tailRoot,
          [0, ty + bodyH * 0.35, tz - bodyH * 0.1],
          [bw * 0.1, ty + bodyH * 0.65, tz],
          [bw * 0.18, ty + bodyH * 0.85, tz + bodyH * 0.2],
        ];
    path.forEach((p, i) => {
      const t = i / (path.length - 1);
      const d = bw * (big ? 0.22 + 0.3 * Math.sin(Math.PI * Math.min(1, t * 1.3)) : 0.18 + 0.28 * t);
      parts.push(blob(i === path.length - 1 && !big ? "Tail tip" : "Tail", p, [d, d * 1.1, d * 1.15]));
      if (i) parts.push(aim("cone", "Tail", { d1: r1(d * 0.7), d2: r1(d * 0.8) }, path[i - 1], p));
    });
  } else if (v.tail === "devil") {
    const tip = [bw * 0.3, ty + bodyH * 0.55, tz + bodyH * 0.25];
    parts.push(
      ...chain(
        "Tail",
        [tailRoot, [0, ty + bodyH * 0.3, tz - bodyH * 0.15], [bw * 0.15, ty + bodyH * 0.55, tz - bodyH * 0.05], tip],
        Math.max(2, lw * 0.38),
        Math.max(1.6, lw * 0.3),
      ),
    );
    parts.push(blob("Tail tip", [tip[0] + bw * 0.04, tip[1] + bw * 0.02, tip[2] + bw * 0.08], [bw * 0.22, 2.2, bw * 0.24], [0, -35, 0]));
    parts.push(
      o("cone", {
        name: "Tail tip",
        params: { d1: r1(bw * 0.22), d2: 0.6, h: r1(bw * 0.2) },
        position: [r1(tip[0] + bw * 0.06), r1(tip[1] + bw * 0.02), r1(tip[2] + bw * 0.12)],
        rotation: [0, 35, 0],
        scale: [1, 0.3, 1],
      }),
    );
  } else if (v.tail === "monkey") {
    // Down and out, then a curl at the end.
    const pts = [tailRoot, [0, ty + bodyH * 0.3, tz - bodyH * 0.1], [0, ty + bodyH * 0.55, tz + bodyH * 0.05]];
    const c = [0, ty + bodyH * 0.55, tz + bodyH * 0.28];
    const R = bodyH * 0.23;
    for (let i = 1; i <= 7; i++) {
      const a = -Math.PI / 2 + (i / 7) * Math.PI * 1.5;
      const r = R * (1 - i * 0.07);
      pts.push([0, c[1] + Math.cos(a) * r, c[2] + Math.sin(a) * r]);
    }
    parts.push(...chain("Tail", pts, Math.max(2.4, lw * 0.5), Math.max(1.6, lw * 0.32)));
  }
  if (["cat", "fox", "squirrel", "devil", "monkey"].includes(v.tail))
    for (let i = tailStart; i < parts.length; i++) parts[i].anchor = tailRoot;
  if (v.tail === "bunny") {
    parts.push({
      ...ball("Tail", [0, backAt(tailZ) + bw * 0.08, tailZ + bw * 0.05], Math.max(5, bw * 0.38)),
      anchor: [0, backAt(tailZ) - 0.5, tailZ + bw * 0.05],
    });
  } else if (v.tail === "dragon") {
    // Long enough to rest on the stand.
    const from = [0, backAt(tailZ) - 2, tailZ + bodyH * 0.05];
    parts.push(aim("cone", "Tail", { d1: r1(bw * 0.42), d2: 1 }, from, [bw * 0.35, from[1] + Math.max(bw * 1.1, tailZ - z0), z0 + 1.2]));
  } else if (v.tail === "dino") {
    for (let i = 0; i < 4; i++) {
      const z = zb + bodyH * (0.85 - i * 0.22);
      parts.push(
        o("cone", {
          name: "Spike",
          params: { d1: r1(lw * 0.8), d2: 0.8, h: r1(lw * 0.9) },
          position: [0, r1(backAt(z) - 1.5), r1(z)],
          rotation: [-90, 0, 0],
        }),
      );
    }
  }
  grow(parts, tailStart, pct("tailSize"));
  mark("tail");
  return parts.map(({ anchor, keep, ...p }) => p);
}
