import opencascade from "replicad-opencascadejs";
import Module from "manifold-3d";
import * as R from "replicad";
import fs from "fs";
import * as E from "../src/cad/engine.js";
import { KITS, defaultValues, randomValues } from "../src/kits.js";
const oc = await opencascade(); R.setOC(oc); const m = await Module(); m.setup?.(); R.setManifold(m);
const buf = (f) => { const b = fs.readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
await E.loadFonts([["Fredoka","fredoka-bold"],["Archivo Black","archivo-black"],["Courgette","courgette"],["Space Mono","space-mono-bold"]].map(([family,f])=>({family,data:buf(`public/fonts/${f}.woff`)})));
const quiet = (fn) => (...a) => { const w = process.stdout.write; process.stdout.write = () => true; try { return fn(...a); } finally { process.stdout.write = w; } };
const only = process.argv[2];
const randoms = Number(process.argv[3] || 0);
let fails = 0;
// The maker uses the fast mesh path; defaults are also checked against the exact path.
function run(kit, v, label) {
  const t0 = Date.now();
  try {
    const p = E.previewMesh(kit.build(v));
    if (label === "default") {
      const exact = quiet(E.preview)(kit.build(v)).volume;
      if (Math.abs(exact - p.volume) > exact * 0.02) throw new Error(`fast volume ${p.volume.toFixed(0)} vs exact ${exact.toFixed(0)}`);
    }
    const vv = p.mesh.vertices; let mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9];
    for (let i=0;i<vv.length;i+=3) for (let k=0;k<3;k++){ mn[k]=Math.min(mn[k],vv[i+k]); mx[k]=Math.max(mx[k],vv[i+k]); }
    console.log(kit.id, label, "size", mx.map((x,k)=>(x-mn[k]).toFixed(1)).join(" x "), "minZ", mn[2].toFixed(2), "vol", p.volume.toFixed(0), Date.now()-t0, "ms", "mem", (oc.wasmMemory.buffer.byteLength / 1e6).toFixed(0), "MB");
  } catch (e) { fails++; console.log("FAIL", kit.id, label, e.message, JSON.stringify(v)); }
}
for (const kit of KITS) {
  if (only && only !== kit.id) continue;
  const d = defaultValues(kit);
  run(kit, d, "default");
  for (const op of kit.options) if (op.type === "choice") for (const c of op.choices) if (c.value !== d[op.id]) run(kit, { ...d, [op.id]: c.value }, `${op.id}=${c.value}`);
  for (const op of kit.options) if (op.type === "slider") for (const val of [op.min, op.max]) run(kit, { ...d, [op.id]: val }, `${op.id}=${val}`);
  for (let i = 0; i < randoms; i++) run(kit, randomValues(kit, d), `random${i}`);
}
// The remixer, on the sample file: every side down, both stands, a script name.
if (!only || only === "remix") {
  const { remixParts, remixDefaults, DOWN } = await import("../src/remix.js");
  const info = await E.importFile("sample", "rocket.stl", buf("public/samples/rocket.stl"));
  const file = { importId: "sample", kind: info.kind, size: info.size, name: "rocket.stl" };
  for (const d of DOWN)
    for (const stand of ["none", "round", "plinth"]) {
      const v = { ...remixDefaults(), down: d.value, stand, turn: 30, name: stand === "round" ? "Kylie" : "LIFTOFF", font: "Courgette", size: 80 };
      run({ id: "remix", build: (x) => remixParts(file, x) }, v, `${d.value}/${stand}`);
    }
}
console.log(fails ? `${fails} failures` : "all kits built");
process.exit(fails ? 1 : 0);
