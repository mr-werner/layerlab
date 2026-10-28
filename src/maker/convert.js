// Turns .glb/.gltf/.obj files (what Sketchfab and AI model makers usually
// give you) into an .stl the CAD engine can import. Loaded only when needed.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { STLExporter } from "three/examples/jsm/exporters/STLExporter.js";

export const NEEDS_CONVERT = /\.(glb|gltf|obj)$/i;

export async function toSTL(name, bytes) {
  let root;
  if (/\.obj$/i.test(name)) {
    root = new OBJLoader().parse(new TextDecoder().decode(bytes));
  } else {
    const gltf = await new GLTFLoader().parseAsync(bytes, "");
    root = gltf.scene;
    // glTF is Y-up; the printer is Z-up.
    root.rotation.x = Math.PI / 2;
  }
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
  return { name: name.replace(/\.[^.]+$/, ".stl"), bytes: stl.buffer.slice(stl.byteOffset, stl.byteOffset + stl.byteLength), resized: scale !== 1 };
}
