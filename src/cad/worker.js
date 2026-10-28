// Runs the CAD kernel off the main thread so the page stays responsive.
import opencascade from "replicad-opencascadejs";
import ocWasm from "replicad-opencascadejs/wasm?url";
import Manifold from "manifold-3d";
import manifoldWasm from "manifold-3d/manifold.wasm?url";
import { setOC, setManifold } from "replicad";
import * as engine from "./engine.js";
import { FONTS } from "../config.js";

const ready = (async () => {
  const [oc, manifold, fonts] = await Promise.all([
    opencascade({ locateFile: () => ocWasm }),
    Manifold({ locateFile: () => manifoldWasm }),
    Promise.all(FONTS.map(async (f) => ({ family: f.family, data: await (await fetch(f.file)).arrayBuffer() }))),
  ]);
  setOC(oc);
  manifold.setup?.();
  setManifold(manifold);
  await engine.loadFonts(fonts);
})();

const handlers = {
  ready: () => true,
  mesh: ({ object }) => engine.meshObject(object),
  import: ({ id, name, bytes }) => engine.importFile(id, name, bytes),
  preview: ({ objects, fast }) => (fast ? engine.previewMesh(objects) : engine.preview(objects)),
  export: async ({ objects, format, fast }) => {
    const { blob } = fast && format === "stl" ? engine.exportMeshSTL(objects) : await engine.exportModel(objects, format);
    return { bytes: await blob.arrayBuffer() };
  },
  forget: ({ id }) => engine.forgetImport(id),
  previewGroups: ({ groups, holes }) => ({ meshes: engine.previewGroups(groups, holes) }),
  warm: ({ objects }) => engine.warm(objects),
  exportColor: ({ groups, holes, title }) => engine.exportColorThreeMF(groups, holes, title),
};

self.onmessage = async ({ data }) => {
  const { reqId, kind, payload } = data;
  try {
    await ready;
    const result = await handlers[kind](payload);
    const transfer = [];
    if (result?.vertices) transfer.push(result.vertices.buffer, result.triangles.buffer);
    if (result?.mesh?.vertices) transfer.push(result.mesh.vertices.buffer, result.mesh.triangles.buffer, ...(result.mesh.normals ? [result.mesh.normals.buffer] : []));
    if (result?.bytes) transfer.push(result.bytes);
    for (const m of result?.meshes || []) transfer.push(m.vertices.buffer, m.normals.buffer, m.triangles.buffer);
    self.postMessage({ reqId, ok: true, result }, transfer);
  } catch (err) {
    self.postMessage({ reqId, ok: false, error: err?.message || String(err) });
  }
};
