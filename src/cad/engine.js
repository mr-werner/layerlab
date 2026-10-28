// CAD engine shared by the web worker and the Node tests. It keeps a cache of
// built shapes (by geometry, not placement) and imported files (by id).
import * as R from "replicad";
import { buildShape, place, centered } from "./shapes.js";
import { readThreeMF } from "./threemf.js";

const shapeCache = new Map(); // geometry key -> local solid
const imports = new Map(); // import id -> { kind: "solid" | "mesh", shape }
const fonts = new Set();

const MESH_OPTS = { tolerance: 0.08, angularTolerance: 0.25 };

export async function loadFonts(list) {
  for (const { family, data } of list) {
    await R.loadFont(data, family);
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

export async function importFile(id, name, bytes) {
  const lower = name.toLowerCase();
  const blob = new Blob([bytes]);
  let entry;
  if (lower.endsWith(".step") || lower.endsWith(".stp")) {
    entry = { kind: "solid", shape: centered(await R.importSTEP(blob)) };
  } else if (lower.endsWith(".stl")) {
    entry = { kind: "mesh", shape: centered(await R.importSTLAsMesh(blob)) };
  } else if (lower.endsWith(".3mf")) {
    const stl = readThreeMF(bytes);
    entry = { kind: "mesh", shape: centered(await R.importSTLAsMesh(new Blob([stl]))) };
  } else {
    throw new Error("Use a .step, .stp, .stl or .3mf file.");
  }
  if (entry.kind === "mesh" && entry.shape.isEmpty) throw new Error("That file has no printable geometry.");
  imports.set(id, entry);
  const [min, max] = entry.shape.boundingBox.bounds;
  return { kind: entry.kind, size: max.map((v, i) => v - min[i]) };
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
    m = localShape(obj).meshShape(MESH_OPTS);
    meshCache.set(key, m);
    if (meshCache.size > 300) {
      const oldest = meshCache.keys().next().value;
      free(meshCache.get(oldest));
      meshCache.delete(oldest);
    }
  }
  return m;
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

export function previewMesh(objects) {
  const result = combineMesh(objects);
  try {
    if (result.wrapped.isEmpty?.()) throw new Error("Nothing is left to print. Try different settings.");
    return { mesh: toBuffers(result.mesh()), volume: result.volume(), meshMode: true };
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

