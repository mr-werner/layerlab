// The remixer's options: turn a downloaded model, resize it, and add a stand
// with a name. Works on any imported file, which the engine keeps centered on
// X/Y and sitting on z = 0.
import { makeObject as o } from "./objects.js";
import { r1, text, textWidth, FONT_CHOICES } from "./kitParts.js";

// Which side of the model sits on the table, as an X/Y rotation.
export const DOWN = [
  { value: "bottom", label: "Bottom", rot: [0, 0] },
  { value: "front", label: "Front", rot: [90, 0] },
  { value: "back", label: "Back", rot: [-90, 0] },
  { value: "left", label: "Left", rot: [0, -90] },
  { value: "right", label: "Right", rot: [0, 90] },
  { value: "top", label: "Top", rot: [180, 0] },
];

export const REMIX_OPTIONS = [
  { id: "size", label: "Size", group: "Size", type: "slider", min: 10, max: 400, step: 5, unit: "%", default: 100, hint: "100% is the size the designer made it." },
  { id: "down", label: "Side on the table", group: "Turn", type: "choice", choices: DOWN.map(({ value, label }) => ({ value, label })), default: "bottom", hint: "Pick the flattest side for the cleanest print." },
  { id: "turn", label: "Spin", group: "Turn", type: "slider", min: 0, max: 345, step: 15, unit: "°", default: 0 },
  { id: "mirror", label: "Mirror it", group: "Turn", type: "toggle", default: false },
  {
    id: "stand",
    label: "Stand",
    group: "Stand",
    type: "choice",
    choices: [
      { value: "none", label: "None" },
      { value: "round", label: "Round" },
      { value: "plinth", label: "Plinth" },
    ],
    default: "none",
    edit: true,
  },
  { id: "name", label: "Name on the stand", group: "Stand", type: "text", max: 14, default: "", edit: true },
  { id: "font", label: "Letter style", group: "Stand", type: "choice", choices: FONT_CHOICES, default: "Archivo Black", edit: true },
];

export const REMIX_REGIONS = [
  { id: "model", label: "Model" },
  { id: "stand", label: "Stand" },
  { id: "name", label: "Name" },
];

export const remixDefaults = () => Object.fromEntries(REMIX_OPTIONS.map((op) => [op.id, op.default]));

const rad = (d) => (d * Math.PI) / 180;
// Same order as the engine: X, then Y, then Z.
function rotate([x, y, z], [rx, ry, rz]) {
  let c = Math.cos(rad(rx)),
    s = Math.sin(rad(rx));
  [y, z] = [y * c - z * s, y * s + z * c];
  c = Math.cos(rad(ry));
  s = Math.sin(rad(ry));
  [x, z] = [x * c + z * s, -x * s + z * c];
  c = Math.cos(rad(rz));
  s = Math.sin(rad(rz));
  [x, y] = [x * c - y * s, x * s + y * c];
  return [x, y, z];
}

// `file` is { importId, size: [x, y, z] } from the engine's import.
export function remixParts(file, v, { allowEdits = true } = {}) {
  const k = v.size / 100;
  const [sx, sy, sz] = file.size.map((d) => d * k);
  const [rx, ry] = (DOWN.find((d) => d.value === v.down) || DOWN[0]).rot;
  const rot = [rx, ry, v.turn || 0];
  const corners = [];
  for (const x of [-sx / 2, sx / 2]) for (const y of [-sy / 2, sy / 2]) for (const z of [0, sz]) corners.push(rotate([x, y, z], rot));
  const lo = [0, 1, 2].map((i) => Math.min(...corners.map((c) => c[i])));
  const hi = [0, 1, 2].map((i) => Math.max(...corners.map((c) => c[i])));
  const [fx, fy] = [hi[0] - lo[0], hi[1] - lo[1]];

  const stand = allowEdits ? v.stand : "none";
  const name = stand !== "none" ? (v.name || "").trim() : "";
  const nameSize = r1(Math.min(14, Math.max(5, Math.max(fx, fy) * 0.12)));
  const strip = name ? nameSize * 1.9 : 0;
  const tw = name ? textWidth(name, v.font, nameSize) : 0;
  const parts = [];
  let shiftY = 0;
  let baseZ = 0;
  if (stand === "plinth") {
    const w = r1(Math.max(fx + 12, tw + 16, 24));
    const d = r1(fy + 12 + strip);
    parts.push(o("box", { name: "Stand", params: { w, d, h: 3, radius: r1(Math.min(6, w / 4, d / 4)), edge: 0.8, edgeStyle: "round" } }));
    shiftY = strip / 2;
    if (name) parts.push(text(name, v.font, nameSize, 1.2, [0, r1(-fy / 2 - 3), 2.8]));
    baseZ = 2.9;
  } else if (stand === "round") {
    const d = r1(Math.max(Math.hypot(fx, fy + 2 * strip) + 10, tw + 22, 24));
    parts.push(o("cylinder", { name: "Stand", params: { d, h: 3, edge: 0.8, edgeStyle: "round" } }));
    shiftY = strip / 2;
    if (name) parts.push(text(name, v.font, nameSize, 1.2, [0, r1(shiftY - fy / 2 - strip / 2 - 1), 2.8]));
    baseZ = 2.9;
  }
  const center = [(lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2];
  parts.unshift(
    o("import", {
      name: "Model",
      params: { importId: file.importId, kind: file.kind, file: file.name },
      scale: k,
      rotation: rot,
      position: [-center[0], shiftY - center[1], baseZ - lo[2]].map((n) => +n.toFixed(3)),
    })
  );
  if (v.mirror) parts[0].mirror = true;
  return parts.map((p, i) => ({ ...p, region: i === 0 ? "model" : p.name === "Words" ? "name" : "stand" }));
}
