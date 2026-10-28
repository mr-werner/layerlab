// Builds public/samples/rocket.stl, the sample file on the remix page.
import opencascade from "replicad-opencascadejs";
import Module from "manifold-3d";
import * as R from "replicad";
import fs from "fs";
import * as E from "../src/cad/engine.js";
import { makeObject as o } from "../src/objects.js";
const oc = await opencascade(); R.setOC(oc); const m = await Module(); m.setup?.(); R.setManifold(m);

const parts = [
  o("cone", { params: { d1: 15, d2: 19, h: 8 } }),
  o("cylinder", { params: { d: 22, h: 46 }, position: [0, 0, 7] }),
  o("cone", { params: { d1: 22, d2: 2, h: 24 }, position: [0, 0, 52] }),
  o("sphere", { params: { d: 3 }, position: [0, 0, 74.5] }),
  o("tube", { params: { d: 24, id: 21, h: 3 }, position: [0, 0, 44] }),
  o("cylinder", { hole: true, params: { d: 9, h: 4 }, position: [0, -9.2, 32], rotation: [90, 0, 0] }),
];
for (const a of [0, 120, 240]) {
  const r = (a * Math.PI) / 180;
  const y = -15;
  parts.push(o("box", { params: { w: 2.4, d: 14, h: 20, radius: 0 }, position: [+(-y * Math.sin(r)).toFixed(2), +(y * Math.cos(r)).toFixed(2), 0], rotation: [0, 0, a] }));
}
const { blob } = E.exportMeshSTL(parts);
fs.mkdirSync("public/samples", { recursive: true });
fs.writeFileSync("public/samples/rocket.stl", Buffer.from(await blob.arrayBuffer()));
console.log("wrote public/samples/rocket.stl", fs.statSync("public/samples/rocket.stl").size, "bytes");
