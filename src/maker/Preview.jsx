import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { geometryFromData } from "../builder/Viewport.jsx";

// A friendly turntable view of one finished model. The parent passes the
// combined mesh from the CAD worker; this only draws it.
// `meshes` is [{ region, mesh }] and `colors` maps region -> color; a single
// `mesh` with one `color` works too.
const Preview = forwardRef(function Preview({ mesh, meshes, color, colors, spin = true, angle = 0, focus = null, focusMin = 0, background = 0x15151c, table: showTable = true, onSpinStop }, ref) {
  const hostRef = useRef(null);
  const st = useRef(null);
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const stopRef = useRef(onSpinStop);
  stopRef.current = onSpinStop;

  useEffect(() => {
    const host = hostRef.current;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: background === null, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    host.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    if (background !== null) scene.background = new THREE.Color(background);
    const camera = new THREE.PerspectiveCamera(32, 1, 1, 4000);
    camera.up.set(0, 0, 1);
    camera.position.set(120, -200, 140);

    scene.add(new THREE.HemisphereLight(0xffffff, 0x3a3a48, 1.7));
    const sun = new THREE.DirectionalLight(0xffffff, 2.1);
    sun.position.set(120, -160, 300);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.radius = 4;
    Object.assign(sun.shadow.camera, { left: -200, right: 200, top: 200, bottom: -200, near: 10, far: 1000 });
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xe6e0ff, 0.9);
    rim.position.set(-200, 220, 160);
    scene.add(rim);

    // A round "turntable" the model sits on.
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 96),
      new THREE.MeshStandardMaterial({ color: 0x262632, roughness: 0.9 })
    );
    table.rotation.x = Math.PI / 2;
    table.receiveShadow = true;
    table.visible = showTable;
    scene.add(table);

    const turn = new THREE.Group();
    turn.rotation.z = (angle * Math.PI) / 180;
    scene.add(turn);

    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.1;
    orbit.enablePan = false;
    orbit.addEventListener("start", () => stopRef.current?.());

    const resize = () => {
      const w = host.clientWidth || 1;
      const h = host.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    let raf;
    let last = performance.now();
    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (spinRef.current) turn.rotation.z += dt * 0.5;
      orbit.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    st.current = { renderer, scene, camera, orbit, turn, table, sun, parts: new Map(), holder: null, framedFor: null };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      orbit.dispose();
      renderer.dispose();
      host.removeChild(renderer.domElement);
    };
  }, [background, showTable]);

  const list = useMemo(() => meshes || (mesh ? [{ region: "main", mesh }] : null), [meshes, mesh]);
  const colorOf = (region) => colors?.[region] || color || "#f0742b";

  // Swap in new region meshes. Unchanged regions keep their geometry.
  useEffect(() => {
    const s = st.current;
    if (!s || !list) return;
    const box = new THREE.Box3();
    const next = new Map();
    for (const { region, mesh: data } of list) {
      let entry = s.parts.get(region);
      if (!entry || entry.data !== data) {
        if (entry) entry.obj.geometry.dispose();
        const geom = geometryFromData(data);
        const mat = entry?.obj.material || new THREE.MeshStandardMaterial({ roughness: 0.55, metalness: 0.02 });
        const obj = entry?.obj || new THREE.Mesh(geom, mat);
        obj.geometry = geom;
        obj.castShadow = true;
        obj.receiveShadow = true;
        entry = { data, obj };
      }
      entry.obj.material.color.set(colorOf(region));
      next.set(region, entry);
      box.union(entry.obj.geometry.boundingBox);
    }
    for (const [region, entry] of s.parts) {
      if (!next.has(region)) {
        entry.obj.geometry.dispose();
        entry.obj.material.dispose();
      }
    }
    if (!s.holder) {
      s.holder = new THREE.Group();
      s.turn.add(s.holder);
    }
    s.holder.clear();
    for (const { obj } of next.values()) s.holder.add(obj);
    s.parts = next;
    // Center the whole model on the turntable.
    s.holder.position.set(-(box.min.x + box.max.x) / 2, -(box.min.y + box.max.y) / 2, -box.min.z);
    s.box = box;
    const size = new THREE.Vector3().subVectors(box.max, box.min);
    const radius = Math.max(size.x, size.y) * 0.62 + 8;
    s.table.scale.set(radius, 2, radius);
    s.table.position.z = -1;
    frame(s, size, false);
    // Thumbnails can zoom in on a few regions (a hat, a face).
    const fb = new THREE.Box3();
    for (const r of focus || []) if (next.has(r)) fb.union(next.get(r).obj.geometry.boundingBox);
    if (!fb.isEmpty()) {
      fb.translate(s.holder.position);
      const c = fb.getCenter(new THREE.Vector3()).applyAxisAngle(new THREE.Vector3(0, 0, 1), s.turn.rotation.z);
      const span = Math.max(...fb.getSize(new THREE.Vector3()).toArray(), focusMin, 6) * 1.25;
      const dir = new THREE.Vector3(0.3, -0.85, 0.38).normalize();
      s.orbit.target.copy(c);
      s.camera.position.copy(c).addScaledVector(dir, span * 2.4);
      s.orbit.update();
    }
  }, [list]);

  useEffect(() => {
    const s = st.current;
    if (!s) return;
    for (const [region, entry] of s.parts) entry.obj.material.color.set(colorOf(region));
  }, [color, colors]);

  useImperativeHandle(ref, () => ({
    reframe: () => {
      const s = st.current;
      if (!s?.box) return;
      frame(s, new THREE.Vector3().subVectors(s.box.max, s.box.min), true);
    },
    snapshot: () => st.current?.renderer.domElement.toDataURL("image/png"),
  }));

  return <div className="pv" ref={hostRef} />;
});

// Points the camera at the model. Small changes keep the current view so
// slider tweaks don't make the camera jump around.
function frame(s, size, force) {
  const span = Math.max(size.x, size.y, size.z * 1.2, 20);
  if (!force && s.framedFor && span < s.framedFor * 1.25 && span > s.framedFor * 0.6) return;
  const first = !s.framedFor;
  s.framedFor = span;
  const dist = span * 2.2;
  // Flat things (tags, signs, ornaments) read best from higher up.
  const flat = size.z < Math.max(size.x, size.y) * 0.2;
  const home = flat ? new THREE.Vector3(0.12, -0.5, 0.86) : new THREE.Vector3(0.45, -0.78, 0.48);
  const dir = force || first ? home : s.camera.position.clone().sub(s.orbit.target);
  dir.normalize();
  s.orbit.target.set(0, 0, size.z * 0.42);
  s.camera.position.copy(s.orbit.target).addScaledVector(dir, dist);
  s.camera.near = Math.max(0.5, dist / 100);
  s.camera.far = dist * 20;
  s.camera.updateProjectionMatrix();
  const sh = s.sun.shadow.camera;
  const r = span * 1.2;
  Object.assign(sh, { left: -r, right: r, top: r, bottom: -r });
  sh.updateProjectionMatrix();
}

export default Preview;
