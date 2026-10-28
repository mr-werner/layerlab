// CAD engine shared by the web worker and the Node tests. It keeps a cache of
// built shapes (by geometry, not placement) and imported files (by id).
import * as R from "replicad";
import { buildShape, place, centered, textPieces } from "./shapes.js";
import { readThreeMF } from "./threemf.js";
import { writeThreeMF } from "./threemfWrite.js";

const shapeCache = new Map(); // geometry key -> local solid
const imports = new Map(); // import id -> { kind: "solid" | "mesh", shape }
const fonts = new Set();
const fontFiles = new Map(); // family -> opentype font, for letter spacing

const MESH_OPTS = { tolerance: 0.08, angularTolerance: 0.25 };

export async function loadFonts(list) {
  for (const { family, data } of list) {
    fontFiles.set(family, await R.loadFont(data, family));
    fonts.add(family);
  }
}

function geometryKey(obj) {
  return obj.type === "import" ? `import:${obj.params.importId}` : `${obj.type}:${JSON.stringify(obj.params)}`;
}

function localShape(obj) {
  if (obj.type === "import") {
    const entry = imports.get(obj.params.importId);
    if (!entry) throw new Error("This imported file is no longer loaded. Import it again.");
    return entry.shape;
  }
  const key = geometryKey(obj);
  let shape = shapeCache.get(key);
  if (!shape) {
    shape = buildShape(obj, fonts);
    shapeCache.set(key, shape);
    if (shapeCache.size > 200) {
      const oldest = shapeCache.keys().next().value;
      free(shapeCache.get(oldest));
      shapeCache.delete(oldest);
    }
  }
  return shape;
}

function isMesh(obj) {
  return obj.type === "import" && imports.get(obj.params.importId)?.kind === "mesh";
}

function toBuffers(mesh) {
  return {
    vertices: Float32Array.from(mesh.vertices),
    normals: mesh.normals ? Float32Array.from(mesh.normals) : null,
    triangles: Uint32Array.from(mesh.triangles),
  };
}

// Triangle mesh of one object in its local frame, for the viewport.
export function meshObject(obj) {
  const shape = localShape(obj);
  if (isMesh(obj)) return toBuffers(shape.mesh());
  return toBuffers(shape.mesh(MESH_OPTS));
}

// Imports an .stl, repairing it if it isn't watertight.
async function stlMesh(blob, bytes) {
  try {
    return { shape: await R.importSTLAsMesh(blob) };
  } catch {
    const { repairMesh } = await import("./repair.js");
    const m = repairMesh(bytes instanceof ArrayBuffer ? bytes : bytes.buffer, R.getManifold());
    return { shape: new R.MeshShape(m), repaired: true };
  }
}

export async function importFile(id, name, bytes) {
  const lower = name.toLowerCase();
  const blob = new Blob([bytes]);
  let entry;
  if (lower.endsWith(".step") || lower.endsWith(".stp")) {
    entry = { kind: "solid", shape: centered(await R.importSTEP(blob)) };
  } else if (lower.endsWith(".stl")) {
    const { shape, repaired } = await stlMesh(blob, bytes);
    entry = { kind: "mesh", shape: centered(shape), repaired };
  } else if (lower.endsWith(".3mf")) {
    const stl = readThreeMF(bytes);
    entry = { kind: "mesh", shape: centered(await R.importSTLAsMesh(new Blob([stl]))) };
  } else {
    throw new Error("Use a .step, .stp, .stl or .3mf file.");
  }
  if (entry.kind === "mesh" && entry.shape.isEmpty) throw new Error("That file has no printable geometry.");
  imports.set(id, entry);
  const [min, max] = entry.shape.boundingBox.bounds;
  return { kind: entry.kind, size: max.map((v, i) => v - min[i]), repaired: !!entry.repaired };
}

function free(shape) {
  try {
    shape?.delete?.();
  } catch {
    /* already freed */
  }
}

// Combines everything: solids are joined, then holes are cut out of them.
function combine(objects) {
  const solids = objects.filter((o) => !o.hole && !o.hidden);
  const holes = objects.filter((o) => o.hole && !o.hidden);
  if (!solids.length) throw new Error("Add at least one solid shape first.");
  const meshMode = objects.some((o) => !o.hidden && isMesh(o));
  const placed = (o) => {
    const s = place(localShape(o).clone(), o);
    if (!meshMode || isMesh(o)) return s;
    const m = s.meshShape(MESH_OPTS);
    free(s);
    return m;
  };
  // Booleans return new shapes and leave their inputs alone, so the inputs are
  // freed as we go. Without this the 3D engine runs out of memory after a few
  // hundred rebuilds (easy to reach by dragging a slider).
  const step = (result, o, op) => {
    const tool = placed(o);
    try {
      return result[op](tool);
    } finally {
      free(result);
      free(tool);
    }
  };
  let result = placed(solids[0]);
  for (const o of solids.slice(1)) result = step(result, o, "fuse");
  for (const o of holes) result = step(result, o, "cut");
  return { result, meshMode };
}

export function preview(objects) {
  const { result, meshMode } = combine(objects);
  const mesh = meshMode ? result.mesh() : result.mesh(MESH_OPTS);
  const volume = meshMode ? result.volume() : R.measureVolume(result);
  free(result);
  return { mesh: toBuffers(mesh), volume, meshMode };
}

export async function exportModel(objects, format) {
  const { result, meshMode } = combine(objects);
  if (format === "step") {
    if (meshMode) throw new Error("Designs with an imported .stl or .3mf can only be saved as .stl.");
    const blob = result.blobSTEP();
    free(result);
    return { blob, meshMode };
  }
  const blob = meshMode ? result.blobSTL({ binary: true }) : result.blobSTL({ ...MESH_OPTS, binary: true });
  free(result);
  return { blob, meshMode };
}

// ---- Fast mesh path (used by the maker) ----
// OpenCascade booleans on 3D letters leak memory inside the engine (about 70 MB
// per join), so a few slider drags can crash the page. Here each part is
// meshed once by OpenCascade and cached, and the joining and cutting happens
// in Manifold, which is fast and frees its memory. STEP export still uses
// the exact OpenCascade path.
const meshCache = new Map(); // geometry key -> local MeshShape

function localMesh(obj) {
  if (isMesh(obj)) return localShape(obj);
  const key = geometryKey(obj);
  let m = meshCache.get(key);
  if (!m) {
    try {
      m = localShape(obj).meshShape(MESH_OPTS);
    } catch (e) {
      if (obj.type !== "text") throw e;
      m = textMesh(obj);
    }
    meshCache.set(key, m);
    if (meshCache.size > 300) {
      const oldest = meshCache.keys().next().value;
      free(meshCache.get(oldest));
      meshCache.delete(oldest);
    }
  }
  return m;
}

function textMesh(obj) {
  const { Manifold } = R.getManifold();
  const family = fonts.has(obj.params.font) ? obj.params.font : fonts.values().next().value;
  const meshes = textPieces(obj, fonts, fontFiles.get(family)).map((solid) => {
    const mesh = solid.meshShape(MESH_OPTS);
    free(solid);
    return mesh;
  });
  try {
    const u = Manifold.union(meshes.map((m) => m.wrapped));
    u.numVert();
    return new R.MeshShape(u);
  } finally {
    meshes.forEach(free);
  }
}

// Same placement as shapes.place(), done with Manifold's own transforms
// (rotate is X, then Y, then Z, in degrees, like the builder). Each
// intermediate is freed, never the cached original. Returns a raw Manifold.
function placeMesh(mesh, obj) {
  const [rx, ry, rz] = obj.rotation;
  const [x, y, z] = obj.position;
  const original = mesh.wrapped;
  let m = original;
  const swap = (next) => {
    if (m !== original) m.delete();
    m = next;
  };
  if (obj.mirror) swap(m.mirror([1, 0, 0]));
  if (obj.scale && obj.scale !== 1) swap(m.scale(obj.scale));
  if (rx || ry || rz) swap(m.rotate([rx || 0, ry || 0, rz || 0]));
  swap(m.translate([x, y, z]));
  return m;
}

function combineMesh(objects) {
  const solids = objects.filter((o) => !o.hole && !o.hidden);
  const holes = objects.filter((o) => o.hole && !o.hidden);
  if (!solids.length) throw new Error("Add at least one solid shape first.");
  const { Manifold } = R.getManifold();
  // Batch unions are faster and more robust than joining one part at a time.
  const unionOf = (list) => {
    const placed = list.map((o) => placeMesh(localMesh(o), o));
    try {
      const u = Manifold.union(placed);
      u.numVert(); // Manifold works lazily: finish the union before its inputs are freed.
      return u;
    } finally {
      placed.forEach((p) => p.delete());
    }
  };
  const body = unionOf(solids);
  if (!holes.length) return new R.MeshShape(body);
  const cutters = unionOf(holes);
  try {
    return new R.MeshShape(body.subtract(cutters));
  } finally {
    body.delete();
    cutters.delete();
  }
}

// Mesh buffers straight from a Manifold. replicad's mesh() takes seconds on a
// 30k-triangle figure; this takes a few ms. Corners get smooth normals across
// gentle bends and sharp ones across creases.
const CREASE = Math.cos((38 * Math.PI) / 180);
export function manifoldBuffers(man) {
  const m = man.getMesh();
  const np = m.numProp;
  const vp = m.vertProperties;
  const tv = m.triVerts;
  const nt = tv.length / 3;
  const nv = vp.length / np;
  const fn = new Float32Array(nt * 3); // area-weighted face normals
  const unit = new Float32Array(nt * 3);
  for (let t = 0; t < nt; t++) {
    const a = tv[3 * t] * np, b = tv[3 * t + 1] * np, c = tv[3 * t + 2] * np;
    const ux = vp[b] - vp[a], uy = vp[b + 1] - vp[a + 1], uz = vp[b + 2] - vp[a + 2];
    const wx = vp[c] - vp[a], wy = vp[c + 1] - vp[a + 1], wz = vp[c + 2] - vp[a + 2];
    const x = uy * wz - uz * wy, y = uz * wx - ux * wz, z = ux * wy - uy * wx;
    fn[3 * t] = x; fn[3 * t + 1] = y; fn[3 * t + 2] = z;
    const l = Math.hypot(x, y, z) || 1;
    unit[3 * t] = x / l; unit[3 * t + 1] = y / l; unit[3 * t + 2] = z / l;
  }
  // Which triangles touch each vertex (compressed lists).
  const start = new Uint32Array(nv + 1);
  for (let i = 0; i < tv.length; i++) start[tv[i] + 1]++;
  for (let v = 0; v < nv; v++) start[v + 1] += start[v];
  const fill = start.slice(0, nv);
  const faces = new Uint32Array(tv.length);
  for (let i = 0; i < tv.length; i++) faces[fill[tv[i]]++] = (i / 3) | 0;

  const vertices = new Float32Array(nt * 9);
  const normals = new Float32Array(nt * 9);
  for (let t = 0; t < nt; t++) {
    for (let k = 0; k < 3; k++) {
      const v = tv[3 * t + k];
      const o = 9 * t + 3 * k;
      vertices[o] = vp[v * np]; vertices[o + 1] = vp[v * np + 1]; vertices[o + 2] = vp[v * np + 2];
      let x = 0, y = 0, z = 0;
      for (let j = start[v]; j < start[v + 1]; j++) {
        const f = faces[j];
        if (unit[3 * f] * unit[3 * t] + unit[3 * f + 1] * unit[3 * t + 1] + unit[3 * f + 2] * unit[3 * t + 2] < CREASE) continue;
        x += fn[3 * f]; y += fn[3 * f + 1]; z += fn[3 * f + 2];
      }
      const l = Math.hypot(x, y, z) || 1;
      normals[o] = x / l; normals[o + 1] = y / l; normals[o + 2] = z / l;
    }
  }
  const triangles = new Uint32Array(nt * 3);
  for (let i = 0; i < triangles.length; i++) triangles[i] = i;
  return { vertices, normals, triangles };
}

// Builds each color region on its own: its solids joined, then every hole
// cut out. Regions that didn't change are cached by the caller.
export function previewGroups(groups, holes) {
  const { Manifold } = R.getManifold();
  const place = (list) => list.map((o) => placeMesh(localMesh(o), o));
  let cutters = null;
  if (holes.length) {
    const placed = place(holes);
    cutters = Manifold.union(placed);
    cutters.numVert();
    placed.forEach((p) => p.delete());
  }
  try {
    return groups.map(({ key, objects }) => {
      const placed = place(objects);
      let body = Manifold.union(placed);
      body.numVert();
      placed.forEach((p) => p.delete());
      if (cutters) {
        const cut = body.subtract(cutters);
        cut.numVert();
        body.delete();
        body = cut;
      }
      try {
        return { key, ...manifoldBuffers(body) };
      } finally {
        body.delete();
      }
    });
  } finally {
    cutters?.delete();
  }
}

// A multi-color .3mf: groups are given in priority order (details first), and
// each one gives up the space the earlier ones already took, so no two color
// parts overlap.
export function exportColorThreeMF(groups, holes, title) {
  const { Manifold } = R.getManifold();
  const place = (list) => list.map((o) => placeMesh(localMesh(o), o));
  const unite = (list) => {
    const placed = place(list);
    const u = Manifold.union(placed);
    u.numVert();
    placed.forEach((p) => p.delete());
    return u;
  };
  let taken = holes.length ? unite(holes) : null;
  const parts = [];
  try {
    for (const g of groups) {
      if (!g.objects.length) continue;
      let body = unite(g.objects);
      if (taken) {
        const cut = body.subtract(taken);
        cut.numVert();
        const grown = Manifold.union([taken, body]);
        grown.numVert();
        body.delete();
        taken.delete();
        taken = grown;
        body = cut;
      } else {
        taken = body;
        body = Manifold.union([body]);
      }
      if (body.numTri() > 0) {
        const m = body.getMesh();
        const np = m.numProp;
        const vertices = new Float32Array((m.vertProperties.length / np) * 3);
        for (let i = 0, j = 0; i < m.vertProperties.length; i += np, j += 3) vertices.set(m.vertProperties.subarray(i, i + 3), j);
        parts.push({ name: g.name, color: g.color, vertices, triangles: m.triVerts });
      }
      body.delete();
    }
  } finally {
    taken?.delete();
  }
  if (!parts.length) throw new Error("Nothing is left to print. Try different settings.");
  return { bytes: writeThreeMF(parts, title).buffer };
}

// Gets the shapes ready ahead of time (OpenCascade meshing is the slow part),
// so picking that option later is instant.
export function warm(objects) {
  for (const o of objects) {
    try {
      localMesh(o);
    } catch {
      /* the real build will report it */
    }
  }
  return true;
}

// How many separate pieces a model prints as (1 = everything is joined).
// Slivers under 1 mm³ (left where faces meet) don't count.
function countPieces(man) {
  const list = man.decompose();
  const n = list.filter((m) => m.volume() > 1).length;
  list.forEach((m) => m.delete?.());
  return n;
}

// For tests: the bounding box of each separate piece.
export function pieceBoxes(objects) {
  const result = combineMesh(objects);
  try {
    return result.wrapped.decompose().map((m) => {
      const b = m.boundingBox();
      m.delete?.();
      return { min: [...b.min], max: [...b.max] };
    });
  } finally {
    free(result);
  }
}

export function previewMesh(objects) {
  const result = combineMesh(objects);
  try {
    if (result.wrapped.isEmpty?.()) throw new Error("Nothing is left to print. Try different settings.");
    return { mesh: manifoldBuffers(result.wrapped), volume: result.volume(), meshMode: true, pieces: countPieces(result.wrapped) };
  } finally {
    free(result);
  }
}

export function exportMeshSTL(objects) {
  const result = combineMesh(objects);
  try {
    return { blob: result.blobSTL({ binary: true }), meshMode: true };
  } finally {
    free(result);
  }
}

export function forgetImport(id) {
  imports.delete(id);
}

