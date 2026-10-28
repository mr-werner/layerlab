// Turns .glb/.gltf/.obj files (what Sketchfab and AI model makers usually
// give you) into an .stl the CAD engine can import. Loaded only when needed.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

export const NEEDS_CONVERT = /\.(glb|gltf|obj)$/i;

// Museum scans and many web models are Draco-compressed.
let draco;
function gltfLoader(manager) {
  draco ||= new DRACOLoader().setDecoderPath("/draco/");
  return new GLTFLoader(manager).setDRACOLoader(draco);
}

export async function toSTL(name, bytes) {
  let root;
  if (/\.obj$/i.test(name)) {
    root = new OBJLoader().parse(new TextDecoder().decode(bytes));
  } else {
    root = (await gltfLoader().parseAsync(bytes, "")).scene;
  }
  return finish(name, root, !/\.obj$/i.test(name));
}

// A .gltf with its .bin and textures, as unzipped files { path: Uint8Array }.
export async function gltfFilesToSTL(files) {
  const main = Object.keys(files).find((f) => /\.gltf$/i.test(f));
  if (!main) throw new Error("No model found in that download.");
  const dir = main.includes("/") ? main.slice(0, main.lastIndexOf("/") + 1) : "";
  const urls = [];
  const manager = new THREE.LoadingManager();
  manager.setURLModifier((url) => {
    const want = dir + decodeURIComponent(url).replace(/^\.\//, "");
    if (!files[want]) return url;
    const u = URL.createObjectURL(new Blob([files[want]]));
    urls.push(u);
    return u;
  });
  try {
    const gltf = await gltfLoader(manager).parseAsync(new TextDecoder().decode(files[main]), "");
    return finish(main.split("/").pop(), gltf.scene, true);
  } finally {
    urls.forEach((u) => URL.revokeObjectURL(u));
  }
}

function finish(name, root, yUp) {
  // glTF is Y-up; the printer is Z-up.
  if (yUp) root.rotation.x = Math.PI / 2;
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  let biggest = Math.max(size.x, size.y, size.z);
  if (!(biggest > 0)) throw new Error("That file has no shapes in it.");
  // Most of these files are in meters or arbitrary units. Make them a
  // sensible desk size; the Size slider can change it after.
  let scale = biggest < 2 ? 1000 : 1;
  if (biggest * scale > 250 || biggest * scale < 8) scale = 100 / biggest;
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const stl = new STLExporter().parse(root, { binary: true });
  return {
    name: name.replace(/\.[^.]+$/, ".stl"),
    bytes: stl.buffer.slice(stl.byteOffset, stl.byteOffset + stl.byteLength),
    resized: scale !== 1,
  };
}
