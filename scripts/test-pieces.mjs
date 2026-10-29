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
const check = (v, label) => {
  const parts = buildKit(k, v);
  try {
    const r = E.previewMesh(parts);
    if (r.pieces !== 1) bad.push(`${label}: ${r.pieces}`);
  } catch (e) {
    const culprit = parts.find((p) => { try { E.previewMesh([{ ...p, hole: false }]); return false; } catch { return true; } });
    bad.push(`${label}: ${e.message} in ${culprit ? culprit.name + " " + JSON.stringify(culprit.params) : "?"}`);
  }
};
check(d, "default");
const choices = k.options.filter(o=>o.type==="choice" && o.id!=="font");
const sizes = k.options.filter(o=>o.when!==undefined && o.type==="slider");
// every choice at small and big feature sizes, and at normal size in every style
const styles = k.options.find((o) => o.id === "style").choices.map((c) => c.value);
const only = process.env.STYLE;
for (const st of styles) {
  if (only && st !== only) continue;
  const base = { ...d, style: st, ...(k.options.find((o) => o.id === "style").sets?.[st] || {}) };
  for (const op of choices) for (const c of op.choices) for (const f of st === "classic" ? [50, 100, 180] : [100]) {
    if (op.id === "style") continue;
    const v = { ...base, [op.id]: c.value, name: "" };
    for (const s of sizes) v[s.id] = Math.min(s.max, Math.max(s.min, f));
    check(v, `${st} ${op.id}=${c.value} @${f}`);
  }
}
for (let i = 0; i < Number(process.argv[2] || 40); i++) { const v = randomValues(k, d); v.scale = 100; for (const s of sizes) v[s.id] = s.min + Math.round(Math.random()*(s.max-s.min)/5)*5; v.name=""; check(v, "random "+JSON.stringify(v)); }
console.log("bad", bad.length); console.log(bad.slice(0, 40).join("\n"));
if (bad.length) process.exit(1);
