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
    const a = anchor || p.anchor || p.position;
    const params = { ...p.params };
    for (const k of DIMS) if (typeof params[k] === "number") params[k] = sz(params[k]);
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
  const baseD = r1(
    Math.max(bw * 2.1 * pct("standSize"), H * 1.5, (ll + bh) * 0.5 * pct("standSize"), name ? textWidth(name, v.font, nameSize) + 14 : 0),
  );
  const z0 = hasBase ? 3 : 0;
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
    if (name) parts.push(text(name, v.font, nameSize, 1.2, [0, r1(-baseD * (v.base === "square" ? 0.28 : 0.33)), 2.8]));
  }
  mark("stand", { Words: "name" });
  // The figure stands a little behind the middle so the name has room.
  const fy = hasBase && name ? r1(baseD * 0.06) : 0;

  // ---- feet and legs ----
  const legX = r1(block ? lw / 2 - 0.3 : bw * 0.22);
  const footH = block || pegBody ? 0 : 4;
  const zb = pegBody ? z0 : r1(z0 + footH + ll - 1); // bottom of the body
  if (!pegBody) {
    const fl = lw * (S.foot || 1);
    for (const sx of [-1, 1]) {
      const x = r1(sx * legX);
      const footStart = parts.length;
      if (block) {
        // Square legs straight down to the stand.
      } else if (v.feet === "sneakers" || v.feet === "bare") {
        const bare = v.feet === "bare";
        parts.push(
          o("box", {
            name: bare ? "Bare foot" : "Sneaker",
            params: {
              w: r1(fl * (bare ? 1 : 1.15)),
              d: r1(fl * (bare ? 1.5 : 1.8)),
              h: bare ? 3 : footH,
              radius: r1(fl * 0.48),
              edge: 1,
              edgeStyle: "round",
            },
            position: [x, r1(fy - fl * 0.3), z0],
          }),
        );
      } else if (v.feet === "boots") {
        parts.push(
          o("cylinder", {
            name: "Boot",
            params: {
              d: r1(fl * 1.35),
              h: footH + 3,
              edge: 0.8,
              edgeStyle: "round",
            },
            position: [x, fy, z0],
          }),
        );
        parts.push(
          o("box", {
            name: "Boot toe",
            params: {
              w: r1(fl * 1.2),
              d: r1(fl * 0.9),
              h: footH,
              radius: r1(fl * 0.45),
            },
            position: [x, r1(fy - fl * 0.6), z0],
          }),
        );
      } else {
        const wd = r1(lw * 1.6);
        parts.push(
          o("cylinder", {
            name: "Wheel",
            params: { d: wd, h: r1(lw * 0.9), edge: 0.8, edgeStyle: "round" },
            position: [r1(x - lw * 0.45), fy, r1(z0 + wd / 2 - (hasBase ? 0.6 : 0))],
            rotation: [0, 90, 0],
          }),
        );
      }
      grow(parts, footStart, pct("feetSize"), [x, fy, z0]);
      // Legs: pants down to the feet, shorts over bare shins, or bare.
      const legH = zb + 1.4 - (z0 + (block ? -0.4 : 1));
      const legZ = r1(block ? z0 - 0.4 : z0 + 1);
      const leg = (nm, h, z, w) =>
        block
          ? o("box", {
              name: nm,
              params: { w: r1(w), d: r1(w), h: r1(h), radius: 0 },
              position: [x, fy, r1(z)],
            })
          : o("cylinder", {
              name: nm,
              params: { d: r1(w), h: r1(h) },
              position: [x, fy, r1(z)],
            });
      if (v.legWear === "shorts") {
        const shin = legH * 0.55;
        parts.push(leg("Shin", shin + 0.6, legZ, lw));
        parts.push(leg("Leg", legH - shin, legZ + shin, lw * (block ? 1 : 1.12)));
      } else parts.push(leg(v.legWear === "bare" ? "Shin" : "Leg", legH, legZ, lw));
    }
  }
  mark("shoes", { Leg: "legs", Shin: "skin", "Bare foot": "skin" });

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
    body = {
      round: true,
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
  mark("clothes");

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
  // Armor sits proud of the body, so the badge moves out with it.
  const chestFront =
    v.outfit === "overalls"
      ? Math.min(frontY(chestZ), Math.min(frontY(zb + bodyH * 0.74), frontY(zb)) - 1.1)
      : frontY(chestZ) - (v.outfit === "armor" ? 1 : 0);
  const badgeStart = parts.length;
  parts.push(
    ...emblem.map((p) => standUp({ ...p, position: [p.position[0], p.position[1], p.position[2] - 0.4] }, r1(chestFront), chestZ)),
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
    parts.push(
      o("box", {
        name: "Scarf end",
        params: { w: tw, d: 2.4, h: r1(bodyH * 0.4), radius: 0.6 },
        position: [r1(d * 0.2), r1(fy - d / 2 + 1.6), r1(top - bodyH * 0.38)],
        rotation: [0, -8, 0],
      }),
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
  }
  mark("details", { Scarf: "clothes", "Scarf end": "clothes" });

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
    parts.push(
      o("box", {
        name: "Head",
        params: {
          w: r1(hw),
          d: r1(hd),
          h: r1(hh),
          radius: block ? 0.6 : r1(wide ? hd * 0.42 : H * 0.18),
          edge: block ? 0.4 : r1(Math.min(2.5, H * 0.08)),
          edgeStyle: "round",
        },
        position: [0, fy, headZ0],
      }),
    );
    faceY = () => -hd / 2;
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
  } else if (v.eyes === "sleepy") {
    for (const sx of [-1, 1]) lineEye(sx * eyeX);
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
      sleepy: 0.03,
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
    none: 0,
  }[v.mouth];
  const mouthFloor = Math.max(hc - H * 0.42, headZ0 + 1.5 + mf * (v.mouth === "fangs" ? 0.2 : 0.1));

  // ---- nose ----
  const nz = Math.min(hc - H * 0.11, eyeLow - H * 0.06);
  const noseDrop = H * (v.nose === "round" ? 0.1 : v.nose === "snout" ? 0.15 : 0.08);
  const nf = v.mouth === "none" ? pct("noseSize") : Math.min(pct("noseSize"), Math.max(0.4, (nz - mouthFloor - mouthTop - 0.8) / noseDrop));
  const noseStart = parts.length;
  const noseAt = [0, fyAt(0, nz) + 0.6, nz];
  if (v.nose === "button") parts.push(ball("Nose", [0, fyAt(0, nz) + H * 0.025, nz], H * 0.12));
  else if (v.nose === "round") parts.push(ball("Nose", [0, fyAt(0, nz) + H * 0.05, nz], H * 0.2));
  else if (v.nose === "pointy" || v.nose === "long" || v.nose === "beak") {
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
  mark("skin", { Beak: "details" });

  // ---- mouth ----
  const mz = Math.max(mouthFloor, Math.min(hc - H * 0.2, eyeLow - mouthTop - 1, noseLow - mouthTop - 0.8));
  // Lowest point of the mouth, so a goatee starts below it.
  const mouthLow =
    mz - ({ smile: 0.06, fangs: 0.06, frown: 0.05, grin: 0.08, o: 0.06 }[v.mouth] ?? 0) * mf - (v.mouth === "flat" ? 0.7 : 0);
  if (v.mouth !== "none") {
    let shape;
    if (v.mouth === "smile" || v.mouth === "grin" || v.mouth === "fangs" || v.mouth === "frown") {
      const outerR = mf * (v.mouth === "grin" ? 0.2 : 0.14);
      const innerR = v.mouth === "grin" ? 0 : outerR * 0.62;
      const flip = v.mouth === "frown" ? -1 : 1;
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const a = Math.PI + (i * Math.PI) / 12;
        pts.push([outerR * Math.cos(a), flip * (outerR * 0.75 * Math.sin(a) + outerR * 0.35)]);
      }
      if (innerR > 0)
        for (let i = 12; i >= 0; i--) {
          const a = Math.PI + (i * Math.PI) / 12;
          pts.push([innerR * Math.cos(a), flip * (innerR * 0.45 * Math.sin(a) + outerR * 0.35)]);
        }
      if (flip < 0) pts.reverse();
      shape = { kind: "poly", pts: pts.map((p) => p.map(r1)) };
    } else if (v.mouth === "o") {
      shape = { kind: "circle", c: [0, 0], r: r1(mf * 0.06) };
    } else {
      const w = mf * 0.11;
      shape = {
        kind: "poly",
        pts: [
          [-w, -0.7],
          [w, -0.7],
          [w, 0.7],
          [-w, 0.7],
        ].map((p) => p.map(r1)),
      };
    }
    parts.push(
      o("sketch", {
        name: "Mouth",
        hole: true,
        params: { shapes: [shape], op: "extrude", height: 8 },
        position: [0, r1(fyAt(0, mz) + 1.4), r1(mz)],
        rotation: [90, 0, 0],
      }),
    );
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
  mark("face", { Fang: "skin" });

  // ---- facial hair ----
  const beardStart = parts.length;
  const chinZ = hc - (v.head === "oval" ? (headTop - headZ0) * 0.36 : H * 0.36);
  if (v.beard === "mustache") {
    const zm = Math.min(noseLow - 0.6, mz + mouthTop + Math.max(1.4, H * 0.05));
    const d = Math.max(1.8, H * 0.09);
    for (const sx of [-1, 1]) {
      const end = [sx * H * 0.2, fyAt(sx * H * 0.2, zm) + d * 0.2, zm - H * 0.05];
      const root = [0, fyAt(0, zm) + d * 0.25, zm];
      parts.push({ ...peg("Mustache", root, end, d), anchor: root });
      parts.push({ ...ball("Mustache", end, d), anchor: root });
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
    for (const sx of [-1, 1]) {
      const from = [sx * halfW * 0.78, topY, (roundHead ? domeZ : hc) + H * 0.3];
      parts.push({
        ...aim(
          "cylinder",
          "Ear",
          {
            d: r1(Math.max(3, H * 0.24)),
            edge: r1(Math.max(1, H * 0.1)),
            edgeStyle: "round",
          },
          from,
          [sx * (halfW + H * 0.12), topY + H * 0.02, hc - H * 0.24],
        ),
        anchor: from,
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
  // The cap keeps its size so it never spreads over the face; the rest grows
  // from where it meets the head.
  if (["short", "spiky", "long", "ponytail", "pigtails", "curly", "bun"].includes(v.hair)) parts.push(cap("Hair"));
  const hairStart = parts.length;
  const inHead = (c) => [c[0] * 0.6, topY + (c[1] - topY) * 0.6, hc + (c[2] - hc) * 0.6];
  if (v.hair === "spiky") {
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
  } else if (v.hair === "long") {
    const w = halfW * 1.9;
    const zb2 = hc - H * 0.62;
    parts.push({
      ...o("box", {
        name: "Hair",
        params: {
          w: r1(w),
          d: r1(halfD * 0.9),
          h: r1(hc + H * 0.25 - zb2),
          radius: r1(Math.min(w, halfD * 0.9) * 0.45),
        },
        position: [0, r1(topY + halfD * 0.6), r1(zb2)],
      }),
      anchor: [0, topY + halfD * 0.3, hc + H * 0.2],
    });
  } else if (v.hair === "ponytail") {
    const from = [0, topY + halfD * 0.7, hc + H * 0.18];
    const end = [0, topY + halfD * 1.45, hc - H * 0.45];
    parts.push({ ...ball("Hair tie", [from[0], from[1] + H * 0.12, from[2]], H * 0.22), anchor: from });
    parts.push({ ...aim("cone", "Ponytail", { d1: r1(H * 0.26), d2: r1(H * 0.12) }, from, end), anchor: from });
  } else if (v.hair === "pigtails") {
    for (const sx of [-1, 1]) {
      const from = [sx * halfW * 0.75, topY + halfD * 0.2, hc + H * 0.12];
      const end = [sx * (halfW + H * 0.42), topY + halfD * 0.35, hc - H * 0.32];
      parts.push({ ...aim("cone", "Pigtail", { d1: r1(H * 0.24), d2: r1(H * 0.1) }, from, end), anchor: from });
      parts.push({ ...ball("Pigtail", end, H * 0.18), anchor: from });
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
    const c = [0, topY + H * 0.25, (roundHead ? domeZ : hc) + H * 0.25];
    parts.push({ ...ball("Hair", c, Math.max(halfW, halfD) * 2.7), anchor: c });
  }
  grow(parts, hairStart, pct("hairSize"));
  mark("hair");

  // ---- hats ----
  const crownZ = roundHead ? domeZ + H * 0.3 : headTop - 1;
  const crownD = roundHead ? H * 0.8 : halfW * 1.7;
  const hatLift = v.hair === "afro" ? H * 0.32 : v.hair !== "none" ? H * 0.04 : 0;
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
    parts.push(
      o("cylinder", {
        name: "Cap",
        params: {
          d: r1(crownD + 1),
          h: r1(H * 0.24),
          edge: r1(H * 0.08),
          edgeStyle: "round",
        },
        position: [0, topY, r1(cz - H * 0.1)],
      }),
    );
    parts.push(
      o("box", {
        name: "Cap brim",
        params: {
          w: r1(crownD * 0.75),
          d: r1(H * 0.5),
          h: 1.6,
          radius: r1(H * 0.2),
        },
        position: [0, r1(topY - crownD * 0.5), r1(cz - H * 0.1)],
      }),
    );
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
  } else if (v.hat === "cowboy") {
    parts.push(
      o("cylinder", {
        name: "Brim",
        params: { d: r1(crownD * 1.75), h: 1.6 },
        position: [0, topY, r1(cz - 0.5)],
      }),
    );
    parts.push(
      o("cylinder", {
        name: "Cowboy hat",
        params: {
          d: r1(crownD * 0.82),
          h: r1(H * 0.36),
          edge: r1(H * 0.1),
          edgeStyle: "round",
        },
        position: [0, topY, r1(cz - 0.5)],
      }),
    );
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
    else
      parts.push(
        aim(
          "cone",
          "Helmet crest",
          { d1: r1(H * 0.16), d2: 0.8 },
          [0, topY + H * 0.1, hairTop - H * 0.1],
          [0, topY + H * 0.5, hairTop + H * 0.2],
        ),
      );
    hatAnchor = [0, topY, r1(hc + H * 0.2)];
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
  mark("hat", { "Helmet horn": "accessory", Plume: "accessory" });

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
  mark("accessory");

  // ---- arms and what they hold ----
  const armD = r1(block ? lw * pct("armThick") : (lw * 0.85 * pct("armThick")) / pct("legThick"));
  // Square arms turn about the middle of a shoulder block.
  const shoulderZ = block ? top - armD / 2 : zb + bodyH * 0.82;
  const armL = r1(bodyH * S.arm * pct("armLength") - (block ? armD / 2 : 0));
  const handD = armD * (S.hand || 1.25);
  const hands = {};
  if (v.pose !== "none") {
    const angles = block
      ? {
          down: [-180, 180],
          up: [-150, 150].map((a) => (a < 0 ? -30 : 30)),
          wave: [-180, 30],
        }[v.pose]
      : { down: [-165, 165], up: [-35, 35], wave: [-165, 30] }[v.pose];
    [-1, 1].forEach((sx, i) => {
      const deg = angles[i];
      const half = body.half(shoulderZ);
      const sx0 = block ? sx * (half + armD / 2 - 0.6) : sx * (half - armD * 0.2);
      if (block)
        parts.push(o("box", { name: "Arm", params: { w: armD, d: armD, h: armD, radius: 0 }, position: [r1(sx0), fy, r1(top - armD)] }));
      parts.push(
        block
          ? o("box", {
              name: "Arm",
              params: { w: armD, d: armD, h: armL, radius: 0 },
              position: [r1(sx0), fy, r1(shoulderZ)],
              rotation: [0, deg, 0],
            })
          : o("cylinder", {
              name: "Arm",
              params: {
                d: armD,
                h: armL,
                edge: r1(armD * 0.45),
                edgeStyle: "round",
              },
              position: [r1(sx0), fy, r1(shoulderZ)],
              rotation: [0, deg, 0],
            }),
      );
      const rad = (deg * Math.PI) / 180;
      const hand = [sx0 + Math.sin(rad) * armL, fy, shoulderZ + Math.cos(rad) * armL];
      if (!block) parts.push(ball("Hand", [hand[0], hand[1], hand[2] - Math.cos(rad) * armD * 0.05], handD));
      hands[sx > 0 ? "right" : "left"] = hand;
    });
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
  if (hands.right && v.item !== "none")
    hold(hands.right, pct("itemSize"), ([hx, hy, hz]) => {
      if (v.item === "coffee") {
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
      }
      if (v.item === "sword") {
        parts.push(
          o("box", {
            name: "Blade",
            params: { w: r1(2.6 * s), d: 1.6, h: r1(26 * s), radius: 0 },
            position: [r1(hx), r1(hy - 2 * s), r1(hz + 1)],
          }),
        );
        parts.push(
          o("box", {
            name: "Crossguard",
            params: { w: r1(9 * s), d: 2.4, h: 2, radius: 0.8 },
            position: [r1(hx), r1(hy - 2 * s), r1(hz + 1)],
          }),
        );
        return [hx, hy - 2 * s, hz + 2];
      }
      if (v.item === "wand") {
        parts.push(
          o("cylinder", {
            name: "Wand",
            params: { d: 1.8, h: r1(16 * s) },
            position: [r1(hx), r1(hy - 2 * s), r1(hz - 2)],
          }),
        );
        parts.push(standUp({ ...star(r1(9 * s), 0, 2), position: [0, 0, -1] }, r1(hy - 2 * s), r1(hz + 14 * s)));
        parts[parts.length - 1].position[0] = r1(hx);
        return [hx, hy - 2 * s, hz];
      }
      if (v.item === "heart") {
        const hs = r1(10 * s);
        parts.push(
          ...heart(hs, 0, 2.4).map((p) =>
            standUp(
              {
                ...p,
                position: [p.position[0] + hx, p.position[1], p.position[2] - 1.2],
              },
              r1(hy - 3 * s),
              r1(hz + hs * 0.25),
            ),
          ),
        );
        return [hx, hy - 3 * s, hz + 2.5 * s];
      }
      if (v.item === "balloon") {
        parts.push(
          o("cylinder", {
            name: "Balloon string",
            params: { d: 1.4, h: r1(20 * s) },
            position: [r1(hx), r1(hy), r1(hz - 1)],
          }),
        );
        parts.push(
          o("sphere", {
            name: "Balloon",
            params: { d: r1(13 * s) },
            position: [r1(hx), r1(hy), r1(hz + 18 * s)],
          }),
        );
        return [hx, hy, hz];
      }
      if (v.item === "staff") {
        // Long enough to rest on the stand when the arm is down.
        const lo = Math.max(z0 - 0.4, hz - 30 * s);
        parts.push(
          o("cylinder", {
            name: "Staff",
            params: { d: r1(Math.max(2.2, 2.6 * s)), h: r1(hz + 20 * s - lo) },
            position: [r1(hx), r1(hy), r1(lo)],
          }),
        );
        parts.push(ball("Staff orb", [hx, hy, hz + 20 * s + 1.5 * s], 6 * s));
        return [hx, hy, hz];
      }
      if (v.item === "axe") {
        const d = Math.max(2, 2.2 * s);
        parts.push(
          o("cylinder", {
            name: "Axe handle",
            params: { d: r1(d), h: r1(24 * s) },
            position: [r1(hx), r1(hy - 2 * s), r1(hz - 6 * s)],
          }),
        );
        const pts = [
          [0, -3],
          [6, -6.5],
          [8, 0],
          [6, 6.5],
          [0, 3],
        ].map(([x, z]) => [r1(x * s), r1(z * s)]);
        parts.push(facePlate("Axe head", pts, hx, hy - 2 * s + 1, hz + 14 * s, 2));
        return [hx, hy - 2 * s, hz];
      }
      if (v.item === "torch") {
        parts.push(
          o("cylinder", {
            name: "Torch",
            params: { d: r1(Math.max(2.2, 2.6 * s)), h: r1(15 * s) },
            position: [r1(hx), r1(hy - 2 * s), r1(hz - 5 * s)],
          }),
        );
        parts.push(
          o("cone", {
            name: "Torch cup",
            params: { d1: r1(3 * s), d2: r1(6 * s), h: r1(3 * s) },
            position: [r1(hx), r1(hy - 2 * s), r1(hz + 9.5 * s)],
          }),
        );
        parts.push(
          o("cone", {
            name: "Flame",
            params: { d1: r1(5.4 * s), d2: 0.6, h: r1(7 * s) },
            position: [r1(hx), r1(hy - 2 * s), r1(hz + 12.3 * s)],
          }),
        );
        return [hx, hy - 2 * s, hz];
      }
      return null;
    });
  if (hands.left && v.offhand !== "none")
    hold(hands.left, pct("offSize"), ([hx, hy, hz]) => {
      if (v.offhand === "shield") {
        const d = Math.max(14 * s, bodyH * 0.7);
        const y = hy - handD * 0.35;
        parts.push(
          o("cylinder", {
            name: "Shield",
            params: { d: r1(d), h: 2.2 },
            position: [r1(hx), r1(y), r1(hz)],
            rotation: [90, 0, 0],
          }),
        );
        parts.push(ball("Shield boss", [hx, y - 2, hz], d * 0.25));
        return [hx, y, hz];
      }
      if (v.offhand === "book") {
        parts.push(
          o("box", {
            name: "Book",
            params: { w: r1(9 * s), d: r1(3 * s), h: r1(12 * s), radius: 0.4 },
            position: [r1(hx), r1(hy - handD * 0.3 - 1.5 * s), r1(hz - 6 * s)],
          }),
        );
        return [hx, hy - handD * 0.3 - 1.5 * s, hz];
      }
      if (v.offhand === "lantern") {
        const top2 = hz - handD * 0.3;
        parts.push(
          o("cylinder", {
            name: "Lantern",
            params: { d: r1(1.6), h: r1(4 * s + 2 + handD * 0.3) }, // reaches up into the hand, or a blocky arm's end
            position: [r1(hx), r1(hy), r1(top2 - 4 * s)],
          }),
        );
        parts.push(
          o("cylinder", {
            name: "Lantern",
            params: {
              d: r1(6 * s),
              h: r1(7 * s),
              edge: r1(0.8 * s),
              edgeStyle: "round",
            },
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
      return null;
    });
  mark("item", { Arm: "arms", Hand: "skin", Grip: "skin" });

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
  } else if (v.back === "wings" || v.back === "batwings") {
    const span = bw * 1.1;
    const z = zb + bodyH * 0.62;
    const yb = backAt(z);
    for (const sx of [-1, 1]) {
      const pts =
        v.back === "wings"
          ? [
              [-3, 0],
              [span, span * 0.55],
              [span * 0.95, span * 0.15],
              [span * 0.6, -span * 0.2],
            ]
          : [
              [-3, 0],
              [span * 0.5, span * 0.45],
              [span * 1.15, span * 0.6],
              [span * 0.95, span * 0.05],
              [span * 0.7, span * 0.15],
              [span * 0.5, -span * 0.15],
              [span * 0.3, -span * 0.02],
            ];
      const p2 = pts.map(([x, y]) => [r1(sx * x), r1(y)]);
      if (sx < 0) p2.reverse();
      parts.push(
        o("sketch", {
          name: "Wing",
          params: {
            shapes: [{ kind: "poly", pts: p2, radius: 1.5 }],
            op: "extrude",
            height: 2,
          },
          position: [0, r1(yb + 2.4), r1(z)],
          rotation: [90, 0, 0],
        }),
      );
    }
    gearAnchor = [0, r1(yb + 1.4), r1(z)];
    parts.push(peg("Wing root", [0, fy, r1(z)], [0, r1(yb + 2), r1(z)], Math.max(4, bw * 0.2)));
  } else if (v.back === "cape") {
    const capeH = r1(bodyH + (pegBody ? bodyH * 0.1 : ll * 0.6));
    const yb = backAt(top - 1);
    parts.push(
      o("box", {
        name: "Cape",
        params: { w: r1(bw * 1.05), d: 1.8, h: capeH, radius: 0 },
        position: [0, r1(yb + 0.6), r1(top - capeH)],
        rotation: [-6, 0, 0],
      }),
    );
    gearAnchor = [0, r1(yb + 0.6), r1(top - 1)];
    const tp = [0, r1(yb + 0.6 + capeH * Math.sin(Math.PI / 30) + 0.9), r1(top - 1.5)];
    parts.push(peg("Cape clasp", [0, fy, tp[2]], tp, Math.max(3, bw * 0.15)));
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
  mark("gear");

  // ---- tail ----
  const tailZ = zb + bodyH * 0.15;
  const tailStart = parts.length;
  if (v.tail === "cat") {
    parts.push(
      o("cylinder", {
        name: "Tail",
        params: {
          d: r1(lw * 0.6),
          h: r1(bodyH * 0.9),
          edge: r1(lw * 0.25),
          edgeStyle: "round",
        },
        position: [0, r1(backAt(tailZ) - 1), r1(tailZ)],
        rotation: [-55, 0, 0],
      }),
    );
  } else if (v.tail === "fox") {
    parts.push(
      o("cone", {
        name: "Tail",
        params: { d1: r1(bw * 0.45), d2: r1(lw * 0.6), h: r1(bodyH * 0.95) },
        position: [0, r1(backAt(tailZ - bodyH * 0.1) - 1), r1(tailZ - bodyH * 0.1)],
        rotation: [-70, 0, 0],
      }),
    );
  } else if (v.tail === "bunny") {
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
  return parts.map(({ anchor, ...p }) => p);
}
