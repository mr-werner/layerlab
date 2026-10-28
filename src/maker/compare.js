// Everyday things to stand next to a model so its real size is easy to
// picture, plus a tape measure and dimension lines. All sizes are in mm.
import * as THREE from "three";

export const COMPARE = [
  { id: "none", label: "Nothing", icon: "∅" },
  { id: "tape", label: "Tape measure", icon: "📏" },
  { id: "dims", label: "Dimensions", icon: "↔" },
  { id: "ruler", label: "Ruler (12 in)", icon: "📐" },
  { id: "yardstick", label: "Yardstick", icon: "🪵" },
  { id: "banana", label: "Banana", icon: "🍌" },
  { id: "apple", label: "Apple", icon: "🍎" },
  { id: "phone", label: "Phone", icon: "📱" },
  { id: "can", label: "Soda can", icon: "🥫" },
  { id: "card", label: "Credit card", icon: "💳" },
  { id: "quarter", label: "Quarter", icon: "🪙" },
  { id: "pencil", label: "Pencil", icon: "✏️" },
];

const IN = 25.4;
export const fmt = (mm) => `${(mm / IN).toFixed(mm < 254 ? 1 : 0)} in · ${(mm / 10).toFixed(1)} cm`;

const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.6, ...extra });

// A ruler face: inch marks on one edge, cm marks on the other.
function rulerTexture(lengthMm, widthMm, bg, ink) {
  const pxPerMm = 6;
  const c = document.createElement("canvas");
  c.width = Math.min(8192, Math.round(lengthMm * pxPerMm));
  c.height = Math.round(widthMm * pxPerMm);
  const k = c.width / lengthMm;
  const g = c.getContext("2d");
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = ink;
  g.font = `bold ${Math.round(c.height * 0.22)}px sans-serif`;
  g.textBaseline = "top";
  for (let i = 0; (i * IN) / 8 <= lengthMm; i++) {
    const x = i * (IN / 8) * k;
    const len = i % 8 === 0 ? 0.36 : i % 4 === 0 ? 0.26 : i % 2 === 0 ? 0.18 : 0.1;
    g.fillRect(x - 1, 0, 2, c.height * len);
    if (i % 8 === 0 && i) g.fillText(String(i / 8), x + 4, c.height * 0.3);
  }
  g.textBaseline = "bottom";
  g.font = `${Math.round(c.height * 0.16)}px sans-serif`;
  for (let i = 0; i <= lengthMm; i++) {
    const x = i * k;
    const len = i % 10 === 0 ? 0.26 : i % 5 === 0 ? 0.18 : 0.1;
    g.fillRect(x - 0.5, c.height * (1 - len), 1, c.height * len);
    if (i % 10 === 0 && i) g.fillText(String(i / 10), x + 3, c.height * 0.72);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

// A flat strip standing up (long side along Z) with marks on the front.
function stick(lengthMm, widthMm, thick, bg, ink) {
  const front = new THREE.MeshStandardMaterial({ map: rulerTexture(lengthMm, widthMm, bg, ink), roughness: 0.7 });
  const side = mat(bg);
  const geo = new THREE.BoxGeometry(widthMm, thick, lengthMm);
  // Box faces: +x, -x, +y, -y, +z, -z. The front (-y) gets the marks,
  // turned so they run up the stick.
  const uv = geo.attributes.uv;
  for (let i = 12; i < 16; i++) uv.setXY(i, uv.getY(i), uv.getX(i));
  const m = new THREE.Mesh(geo, [side, side, side, front, side, side]);
  m.position.z = lengthMm / 2;
  return m;
}

export function label(text, sizeMm) {
  const c = document.createElement("canvas");
  const g = c.getContext("2d");
  const fs = 64;
  g.font = `600 ${fs}px Inter, sans-serif`;
  c.width = Math.ceil(g.measureText(text).width + fs);
  c.height = fs * 1.6;
  g.font = `600 ${fs}px Inter, sans-serif`;
  g.fillStyle = "rgba(11,11,15,0.82)";
  g.beginPath();
  g.roundRect(0, 0, c.width, c.height, c.height / 2);
  g.fill();
  g.fillStyle = "#c6ff4a";
  g.textBaseline = "middle";
  g.fillText(text, fs / 2, c.height / 2);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true }));
  s.renderOrder = 10;
  s.scale.set((sizeMm * c.width) / c.height, sizeMm, 1);
  return s;
}

function banana() {
  const pts = [];
  for (let i = 0; i <= 20; i++) {
    const a = -0.75 + (1.5 * i) / 20;
    pts.push(new THREE.Vector3(Math.sin(a) * 75, 0, 75 - Math.cos(a) * 75 + 16));
  }
  const path = new THREE.CatmullRomCurve3(pts);
  const geo = new THREE.TubeGeometry(path, 48, 1, 12, false);
  // Taper the ends by squeezing the tube toward its centerline.
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const seg = Math.floor(i / 13) / 48;
    const r = 16 * Math.sin(Math.PI * Math.min(1, Math.max(0, seg))) ** 0.6 + 2;
    const c = path.getPointAt(seg);
    v.fromBufferAttribute(pos, i).sub(c).multiplyScalar(r).add(c);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  geo.computeVertexNormals();
  const g = new THREE.Group();
  const body = new THREE.Mesh(geo, mat("#f3d34a"));
  body.rotation.x = Math.PI / 2; // the curve lies flat on the table
  g.add(body);
  const box = new THREE.Box3().setFromObject(g);
  body.position.z -= box.min.z;
  return g;
}

function build(id, model) {
  const g = new THREE.Group();
  const H = model.z;
  if (id === "ruler") g.add(stick(12 * IN, 32, 3, "#e8c27a", "#2b1d0e"));
  if (id === "yardstick") g.add(stick(36 * IN, 32, 5, "#d9b06a", "#2b1d0e"));
  if (id === "tape") {
    const len = Math.max(30, Math.ceil((H * 1.15) / 10) * 10);
    // A small case at the foot so the blade reads as a tape measure.
    const cs = Math.min(40, Math.max(18, H * 0.3));
    const box = new THREE.Mesh(new THREE.BoxGeometry(cs, cs * 0.45, cs), mat("#f2c230"));
    box.position.set(0, cs * 0.25, cs / 2);
    g.add(box);
    const tape = stick(len, 19, 0.4, "#f6d64a", "#1b1c1e");
    g.add(tape);
    // A marker line at the model's height.
    const line = new THREE.Mesh(new THREE.BoxGeometry(model.x + 26, 0.6, 0.6), mat("#c6ff4a", { emissive: "#7aa02a" }));
    line.position.set(-(model.x / 2 + 12), 0, H);
    g.add(line);
    const l = label(`${fmt(H)} tall`, Math.max(6, H * 0.08));
    l.position.set(0, -10, H + Math.max(6, H * 0.08));
    g.add(l);
  }
  if (id === "banana") g.add(banana());
  if (id === "apple") {
    const a = new THREE.Mesh(new THREE.SphereGeometry(40, 32, 24), mat("#c8362d", { roughness: 0.35 }));
    a.scale.z = 0.9;
    a.position.z = 36;
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 2, 14), mat("#5a3d22"));
    stem.rotation.x = Math.PI / 2;
    stem.position.z = 76;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(8, 12, 8), mat("#2f8f5b"));
    leaf.scale.set(1, 0.3, 0.5);
    leaf.position.set(7, 0, 78);
    g.add(a, stem, leaf);
  }
  if (id === "phone") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(71, 8, 147), mat("#1b1c1e", { roughness: 0.3 }));
    body.position.z = 73.5;
    const screen = new THREE.Mesh(
      new THREE.PlaneGeometry(65, 140),
      new THREE.MeshStandardMaterial({ color: "#2b3a6b", emissive: "#1d2a55", roughness: 0.2 }),
    );
    screen.rotation.x = Math.PI / 2;
    screen.position.set(0, -4.05, 73.5);
    g.add(body, screen);
  }
  if (id === "can") {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(33, 33, 122, 40), [
      mat("#c8362d", { roughness: 0.3, metalness: 0.3 }),
      mat("#c9ccd1", { metalness: 0.8, roughness: 0.3 }),
      mat("#c9ccd1", { metalness: 0.8, roughness: 0.3 }),
    ]);
    c.rotation.x = Math.PI / 2;
    c.position.z = 61;
    g.add(c);
  }
  if (id === "card") {
    const c = new THREE.Mesh(new THREE.BoxGeometry(85.6, 0.8, 54), mat("#2f5fb3", { roughness: 0.3 }));
    c.position.z = 27;
    g.add(c);
  }
  if (id === "quarter") {
    const q = new THREE.Mesh(new THREE.CylinderGeometry(12.13, 12.13, 1.75, 40), mat("#b9bcc0", { metalness: 0.9, roughness: 0.35 }));
    q.position.z = 12.13;
    g.add(q);
  }
  if (id === "pencil") {
    const body = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 170, 6), mat("#f2c230"));
    const tip = new THREE.Mesh(new THREE.ConeGeometry(3.7, 18, 6), mat("#e8c9a0"));
    tip.position.y = 94;
    const eraser = new THREE.Mesh(new THREE.CylinderGeometry(3.7, 3.7, 10, 16), mat("#e86aa6"));
    eraser.position.y = -90;
    const p = new THREE.Group();
    p.add(body, tip, eraser);
    p.rotation.z = Math.PI / 2;
    p.position.z = 3.7;
    g.add(p);
  }
  return g;
}

// Dimension lines around the model's box, with sizes.
function dims(model, center) {
  const g = new THREE.Group();
  const { x, y, z } = model;
  const m = new THREE.LineBasicMaterial({ color: "#c6ff4a", depthTest: false, transparent: true });
  const line = (a, b) => {
    const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([a, b]), m);
    l.renderOrder = 9;
    g.add(l);
  };
  const off = Math.max(x, y, z) * 0.08 + 3;
  const V = (a, b, c) => new THREE.Vector3(a, b, c);
  line(V(-x / 2, -y / 2 - off, 0), V(x / 2, -y / 2 - off, 0));
  line(V(x / 2 + off, -y / 2, 0), V(x / 2 + off, y / 2, 0));
  line(V(x / 2 + off, -y / 2 - off, 0), V(x / 2 + off, -y / 2 - off, z));
  const s = Math.max(4, Math.max(x, y, z) * 0.06);
  const lw = label(`W ${fmt(x)}`, s);
  lw.position.set(0, -y / 2 - off - s, 0);
  const ld = label(`D ${fmt(y)}`, s);
  ld.position.set(x / 2 + off + s * 2.5, 0, 0);
  const lh = label(`H ${fmt(z)}`, s);
  lh.position.set(x / 2 + off, -y / 2 - off, z + s);
  g.add(lw, ld, lh);
  g.position.set(center.x, center.y, 0);
  return g;
}

// Returns a group to add next to the model (model box size in mm), or null.
export function compareObject(id, model) {
  if (!id || id === "none") return null;
  if (id === "dims") return dims(model, new THREE.Vector3());
  const g = build(id, model);
  const box = new THREE.Box3().setFromObject(g);
  // Clear of the circle the model sweeps as it turns.
  const gap = Math.max(6, model.x * 0.08);
  g.position.x = Math.hypot(model.x, model.y) / 2 + gap - box.min.x;
  g.position.y = -(box.min.y + box.max.y) / 2;
  return g;
}
