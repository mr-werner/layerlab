// Every figure choice, at small, normal and big feature sizes, plus random
// mixes, must print as one joined piece. Usage: node scripts/test-pieces.mjs [randoms]
import opencascade from "replicad-opencascadejs";
import Module from "manifold-3d";
import * as R from "replicad";
import fs from "fs";
const E = await import("../src/cad/engine.js");
const { KIT_BY_ID, defaultValues, buildKit, randomValues } = await import("../src/kits.js");
const oc = await opencascade(); R.setOC(oc); const m = await Module(); m.setup?.(); R.setManifold(m);
const buf = (f) => { const b = fs.readFileSync(f); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
await E.loadFonts([["Fredoka","fredoka-bold"],["Archivo Black","archivo-black"],["Courgette","courgette"],["Space Mono","space-mono-bold"]].map(([family,f])=>({family,data:buf(`public/fonts/${f}.woff`)})));
const k = KIT_BY_ID.figure; const d = defaultValues(k);
const bad = [];
const check = (v, label) => { const parts = buildKit(k, v); const r = E.previewMesh(parts); if (r.pieces !== 1) bad.push(`${label}: ${r.pieces}`); };
check(d, "default");
const choices = k.options.filter(o=>o.type==="choice" && o.id!=="font");
const sizes = k.options.filter(o=>o.when!==undefined && o.type==="slider");
// every choice at small and big feature sizes
for (const op of choices) for (const c of op.choices) for (const f of [50, 100, 180]) {
  const v = { ...d, [op.id]: c.value, name: "" };
  for (const s of sizes) v[s.id] = Math.min(s.max, Math.max(s.min, f));
  check(v, `${op.id}=${c.value} @${f}`);
}
for (let i = 0; i < Number(process.argv[2] || 40); i++) { const v = randomValues(k, d); for (const s of sizes) v[s.id] = s.min + Math.round(Math.random()*(s.max-s.min)/5)*5; v.name=""; check(v, "random "+JSON.stringify(v)); }
console.log("bad", bad.length); console.log(bad.slice(0, 40).join("\n"));
if (bad.length) process.exit(1);
