// Shows which parts end up loose for a figure setting: node scripts/why-pieces.mjs '{"item":"heart"}'
import opencascade from "replicad-opencascadejs";
import Module from "manifold-3d";
import * as R from "replicad";
const E = await import("../src/cad/engine.js");
const { KIT_BY_ID, defaultValues, buildKit } = await import("../src/kits.js");
const oc = await opencascade(); R.setOC(oc); const m = await Module(); m.setup?.(); R.setManifold(m);
const k = KIT_BY_ID.figure;
const v = { ...defaultValues(k), name: "", ...JSON.parse(process.argv[2] || "{}") };
const parts = buildKit(k, v);
const boxes = E.pieceBoxes(parts);
const inside = (a, b) => a.min.every((n, i) => n >= b.min[i] - 0.01) && a.max.every((n, i) => n <= b.max[i] + 0.01);
boxes.sort((a, b) => (b.max[0] - b.min[0]) * (b.max[2] - b.min[2]) - (a.max[0] - a.min[0]) * (a.max[2] - a.min[2]));
for (const [i, box] of boxes.entries()) {
  if (i === 0) continue;
  const names = parts.filter((p) => !p.hole).filter((p) => { try { const mm = E.previewMesh([p]).mesh.vertices; const mn=[1e9,1e9,1e9], mx=[-1e9,-1e9,-1e9]; for (let j=0;j<mm.length;j+=3) for (let q=0;q<3;q++){mn[q]=Math.min(mn[q],mm[j+q]);mx[q]=Math.max(mx[q],mm[j+q]);} return inside({min:mn,max:mx}, box); } catch { return false; } }).map((p) => p.name);
  console.log("loose piece", box.min.map((n) => n.toFixed(1)).join(","), "->", box.max.map((n) => n.toFixed(1)).join(","), names.join(", "));
}
