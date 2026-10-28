// Fixes models that aren't watertight (scans, game models) so they can be
// printed. First it welds near-touching corners; if that isn't enough it
// rebuilds the surface as a solid from a distance field. Loaded only when an
// import fails, since it pulls in three.js.
import { BufferGeometry, BufferAttribute, Vector3, Ray, DoubleSide } from "three";
import { MeshBVH } from "three-mesh-bvh";

function readSTL(buffer) {
  const view = new DataView(buffer);
  const n = buffer.byteLength > 84 ? view.getUint32(80, true) : 0;
  if (84 + n * 50 !== buffer.byteLength) throw new Error("Only binary .stl files can be repaired.");
  const pos = new Float32Array(n * 9);
  for (let t = 0; t < n; t++) for (let k = 0; k < 9; k++) pos[t * 9 + k] = view.getFloat32(84 + t * 50 + 12 + k * 4, true);
  return pos;
}

function weld(pos, step) {
  const key = new Map();
  const verts = [];
  const tris = [];
  const id = (i) => {
    const k = `${Math.round(pos[i] / step)}|${Math.round(pos[i + 1] / step)}|${Math.round(pos[i + 2] / step)}`;
    let v = key.get(k);
    if (v === undefined) {
      v = verts.length / 3;
      key.set(k, v);
      verts.push(pos[i], pos[i + 1], pos[i + 2]);
    }
    return v;
  };
  for (let i = 0; i < pos.length; i += 9) {
    const a = id(i);
    const b = id(i + 3);
    const c = id(i + 6);
    if (a !== b && b !== c && a !== c) tris.push(a, b, c);
  }
  return { vertProperties: new Float32Array(verts), triVerts: new Uint32Array(tris) };
}

// Returns a Manifold, or throws if even the rebuild fails.
export function repairMesh(buffer, manifold, onStep = () => {}) {
  const { Manifold, Mesh } = manifold;
  const pos = readSTL(buffer);
  for (const step of [0.005, 0.02]) {
    try {
      const m = new Manifold(new Mesh({ numProp: 3, ...weld(pos, step) }));
      if (!m.isEmpty()) return m;
    } catch {
      /* try harder below */
    }
  }

  onStep("Filling gaps so it can print…");
  const geom = new BufferGeometry();
  geom.setAttribute("position", new BufferAttribute(pos, 3));
  const bvh = new MeshBVH(geom);
  geom.computeBoundingBox();
  const { min, max } = geom.boundingBox;
  const span = Math.max(max.x - min.x, max.y - min.y, max.z - min.z);
  const edge = Math.max(0.35, span / 90);
  const shell = Math.max(0.8, edge * 0.9); // open bits become plates this thick
  const pad = edge * 2;
  const p = new Vector3();
  const hit = { point: new Vector3(), distance: 0, faceIndex: 0 };
  // Inside means most of three rays cross the surface an odd number of
  // times; holes and flipped faces only fool one of them.
  const ray = new Ray();
  const dirs = [new Vector3(1, 0.013, 0.007).normalize(), new Vector3(0.011, 1, 0.017).normalize(), new Vector3(0.009, 0.015, 1).normalize()];
  const inside = () => {
    let votes = 0;
    for (const d of dirs) {
      ray.origin.copy(p);
      ray.direction.copy(d);
      if (bvh.raycast(ray, DoubleSide).length % 2) votes++;
    }
    return votes >= 2;
  };
  const sdf = ([x, y, z]) => {
    p.set(x, y, z);
    bvh.closestPointToPoint(p, hit, 0, span);
    const d = hit.distance;
    return Math.max(inside() ? d : -d, shell / 2 - d);
  };
  const bounds = { min: [min.x - pad, min.y - pad, min.z - pad], max: [max.x + pad, max.y + pad, max.z + pad] };
  const out = Manifold.levelSet(sdf, bounds, edge);
  if (out.isEmpty()) throw new Error("This model couldn't be repaired for printing.");
  return out;
}
