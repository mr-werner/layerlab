import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { geometryFromData } from "../builder/Viewport.jsx";
import { compareObject } from "./compare.js";

// A friendly turntable view of one finished model. The parent passes the
// combined mesh from the CAD worker; this only draws it.
// `meshes` is [{ region, mesh }] and `colors` maps region -> color; a single
// `mesh` with one `color` works too.
const Preview = forwardRef(function Preview(
  {
    mesh,
    meshes,
    color,
    colors,
    spin = true,
    angle = 0,
    focus = null,
    focusMin = 0,
    background = 0x15151c,
    table: showTable = true,
    onSpinStop,
    onPick,
    selected,
    compare = "none",
    mode = "turn",
    // A key (the kit id) that keeps the view still while the model is edited:
    // the model stays where it is and the camera only refits when the key
    // changes, on Recenter, or when the model no longer fits in view.
    steady = null,
  },
  ref,
) {
  const hostRef = useRef(null);
  const st = useRef(null);
  const spinRef = useRef(spin);
  spinRef.current = spin;
  const stopRef = useRef(onSpinStop);
  stopRef.current = onSpinStop;
  const pickRef = useRef(onPick);
  pickRef.current = onPick;

  useEffect(() => {
    const host = hostRef.current;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: background === null,
      preserveDrawingBuffer: true,
    });
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
    Object.assign(sun.shadow.camera, {
      left: -200,
      right: 200,
      top: 200,
      bottom: -200,
      near: 10,
      far: 1000,
    });
    scene.add(sun);
    const rim = new THREE.DirectionalLight(0xe6e0ff, 0.9);
    rim.position.set(-200, 220, 160);
    scene.add(rim);

    // A round "turntable" the model sits on.
    const table = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 1, 96),
      new THREE.MeshStandardMaterial({ color: 0x262632, roughness: 0.9 }),
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
    orbit.enablePan = true;
    orbit.screenSpacePanning = true;
    orbit.zoomToCursor = true;
    orbit.addEventListener("start", () => {
      stopRef.current?.();
      if (st.current) st.current.userMoved = true;
    });

    // Click a part to pick it; hovering a part lights it up a little.
    const ray = new THREE.Raycaster();
    const hitRegion = (e) => {
      const s = st.current;
      if (!s?.parts.size) return null;
      const r = renderer.domElement.getBoundingClientRect();
      ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
      const objs = [...s.parts.values()].map((p) => p.obj);
      const hit = ray.intersectObjects(objs, false)[0];
      return hit ? ([...s.parts].find(([, p]) => p.obj === hit.object)?.[0] ?? null) : null;
    };
    let down = null;
    const onDown = (e) => (down = { x: e.clientX, y: e.clientY, t: performance.now() });
    const onUp = (e) => {
      if (!down || !pickRef.current) return;
      const still = Math.hypot(e.clientX - down.x, e.clientY - down.y) < 6 && performance.now() - down.t < 500;
      down = null;
      if (!still) return;
      const region = hitRegion(e);
      if (region) pickRef.current(region);
    };
    let hoverAt = 0;
    const onMove = (e) => {
      if (!pickRef.current || e.buttons || e.pointerType === "touch") return;
      const now = performance.now();
      if (now - hoverAt < 50) return;
      hoverAt = now;
      const region = hitRegion(e);
      st.current.hover = region;
      renderer.domElement.style.cursor = region ? "pointer" : "";
    };
    const onLeave = () => st.current && (st.current.hover = null);
    renderer.domElement.addEventListener("pointerdown", onDown);
    renderer.domElement.addEventListener("pointerup", onUp);
    renderer.domElement.addEventListener("pointermove", onMove);
    renderer.domElement.addEventListener("pointerleave", onLeave);

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
      const s = st.current;
      if (s?.move) easeView(s);
      if (s) {
        const fl = s.flash && Math.max(0, 1 - (now - s.flash.t0) / 900);
        for (const [region, p] of s.parts) {
          const glow = fl && s.flash.region === region ? 0.45 * fl : s.hover === region ? 0.14 : 0;
          if (p.obj.material.emissive.r !== glow) p.obj.material.emissive.setScalar(glow);
        }
      }
      orbit.update();
      renderer.render(scene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    st.current = {
      renderer,
      scene,
      camera,
      orbit,
      turn,
      table,
      sun,
      parts: new Map(),
      holder: null,
      framedFor: null,
    };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      orbit.dispose();
      renderer.dispose();
      renderer.domElement.removeEventListener("pointerdown", onDown);
      renderer.domElement.removeEventListener("pointerup", onUp);
      renderer.domElement.removeEventListener("pointermove", onMove);
      renderer.domElement.removeEventListener("pointerleave", onLeave);
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
    // Center the whole model on the turntable. A steady view keeps the first
    // center, so adding a sword or wings doesn't slide the model sideways.
    if (!steady || s.steadyKey !== steady) {
      s.center = [(box.min.x + box.max.x) / 2, (box.min.y + box.max.y) / 2];
      if (steady) {
        s.steadyKey = steady;
        s.framedFor = null;
        s.userMoved = false;
      }
    }
    s.steady = !!steady;
    s.holder.position.set(-s.center[0], -s.center[1], -box.min.z);
    s.box = box;
    const size = new THREE.Vector3().subVectors(box.max, box.min);
    const radius = Math.max(size.x, size.y) * 0.62 + 8;
    s.table.scale.set(radius, 2, radius);
    s.table.position.z = -1;
    s.modelSize = size;
    placeCompare(s, s.compareId, false);
    if (!s.compareObj) frame(s, size, false);
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

  useEffect(() => {
    const s = st.current;
    if (!s) return;
    s.compareId = compare;
    if (s.modelSize) placeCompare(s, compare, true);
  }, [compare]);

  // Left drag (or one finger) turns the model, or moves it in "move" mode.
  useEffect(() => {
    const s = st.current;
    if (!s) return;
    s.orbit.mouseButtons.LEFT = mode === "move" ? THREE.MOUSE.PAN : THREE.MOUSE.ROTATE;
    s.orbit.mouseButtons.RIGHT = mode === "move" ? THREE.MOUSE.ROTATE : THREE.MOUSE.PAN;
    s.orbit.touches.ONE = mode === "move" ? THREE.TOUCH.PAN : THREE.TOUCH.ROTATE;
  }, [mode]);

  // Flash the part that was just picked so it's clear what changed.
  useEffect(() => {
    if (st.current && selected) st.current.flash = { region: selected.region, t0: performance.now() };
  }, [selected]);

  useImperativeHandle(ref, () => ({
    reframe: () => {
      const s = st.current;
      if (!s?.box) return;
      s.userMoved = false;
      s.center = [(s.box.min.x + s.box.max.x) / 2, (s.box.min.y + s.box.max.y) / 2];
      s.holder.position.x = -s.center[0];
      s.holder.position.y = -s.center[1];
      if (s.compareObj) placeCompare(s, s.compareId, true);
      else frame(s, new THREE.Vector3().subVectors(s.box.max, s.box.min), true);
    },
    snapshot: () => st.current?.renderer.domElement.toDataURL("image/png"),
    // Buttons: turn and tilt in radians, zoom as a factor (<1 is closer),
    // pan as a share of the view.
    nudge: ({ turn = 0, tilt = 0, zoom = 1, panX = 0, panY = 0 }) => {
      const s = st.current;
      if (!s) return;
      s.userMoved = true;
      stopRef.current?.();
      const m = (s.move ||= { turn: 0, tilt: 0, zoom: 0, panX: 0, panY: 0 });
      m.turn += turn;
      m.tilt += tilt;
      m.zoom += Math.log(zoom);
      m.panX += panX;
      m.panY += panY;
    },
  }));

  return <div className="pv" ref={hostRef} />;
});

// Moves the camera a bit each frame toward what the view buttons asked for.
function easeView(s) {
  const m = s.move;
  const k = 0.2;
  const cam = s.camera;
  const target = s.orbit.target;
  const off = cam.position.clone().sub(target);
  const up = new THREE.Vector3(0, 0, 1);
  if (m.turn) off.applyAxisAngle(up, m.turn * k);
  if (m.tilt) {
    const axis = new THREE.Vector3().crossVectors(off, up).normalize();
    const angle = off.angleTo(up);
    const want = Math.min(Math.PI * 0.49, Math.max(0.08, angle - m.tilt * k));
    if (axis.lengthSq() > 0) off.applyAxisAngle(axis, angle - want);
  }
  if (m.zoom) {
    const d = off.length() * Math.exp(m.zoom * k);
    off.setLength(Math.min(s.orbit.maxDistance, Math.max(s.orbit.minDistance, d)));
  }
  if (m.panX || m.panY) {
    const span = off.length() * 0.6;
    const right = new THREE.Vector3()
      .crossVectors(off, up)
      .normalize()
      .multiplyScalar(-m.panX * k * span);
    const lift = up.clone().multiplyScalar(m.panY * k * span);
    target.add(right).add(lift);
  }
  cam.position.copy(target).add(off);
  for (const key of ["turn", "tilt", "zoom", "panX", "panY"]) m[key] = Math.abs(m[key] * (1 - k)) < 0.001 ? 0 : m[key] * (1 - k);
  if (!m.turn && !m.tilt && !m.zoom && !m.panX && !m.panY) s.move = null;
}

// Puts the size-comparison object (if any) next to the model and frames both.
// Dimension lines turn with the model; everyday objects stand still beside
// the circle the model sweeps, so spinning never runs them into each other.
function placeCompare(s, id, refit) {
  if (s.compareObj) {
    s.compareObj.parent?.remove(s.compareObj);
    s.compareObj.traverse((o) => {
      o.geometry?.dispose();
      [].concat(o.material || []).forEach((mt) => {
        mt.map?.dispose();
        mt.dispose();
      });
    });
    s.compareObj = null;
  }
  const size = s.modelSize;
  const obj = compareObject(id, size);
  if (!obj) {
    s.table.scale.set(Math.max(size.x, size.y) * 0.62 + 8, 2, Math.max(size.x, size.y) * 0.62 + 8);
    if (refit) frame(s, size, true);
    return;
  }
  const r = Math.hypot(size.x, size.y) / 2;
  const box = new THREE.Box3(new THREE.Vector3(-r, -r, 0), new THREE.Vector3(r, r, size.z));
  obj.updateMatrixWorld(true);
  box.union(new THREE.Box3().setFromObject(obj));
  s.compareObj = obj;
  (id === "dims" ? s.turn : s.scene).add(obj);
  const reach = Math.max(Math.abs(box.min.x), Math.abs(box.max.x), Math.abs(box.min.y), Math.abs(box.max.y));
  s.table.scale.set(reach * 1.08 + 6, 2, reach * 1.08 + 6);
  fitBox(s, box, refit);
}

// Frames a box so all of it shows from any angle.
function fitBox(s, box, force) {
  const cam = s.camera;
  const center = box.getCenter(new THREE.Vector3());
  const R = box.getSize(new THREE.Vector3()).length() / 2;
  const vf = THREE.MathUtils.degToRad(cam.fov) / 2;
  const hf = Math.atan(Math.tan(vf) * cam.aspect);
  const dist = (R / Math.sin(Math.min(vf, hf))) * 1.02;
  const home = new THREE.Vector3(0.45, -0.78, 0.48);
  const dir = force || !s.framedFor ? home : cam.position.clone().sub(s.orbit.target);
  dir.normalize();
  s.framedFor = Math.max(box.max.x - box.min.x, box.max.y - box.min.y, box.max.z * 1.2);
  s.orbit.target.copy(center);
  s.orbit.minDistance = R * 0.3;
  s.orbit.maxDistance = R * 8;
  cam.position.copy(center).addScaledVector(dir, dist);
  cam.near = Math.max(0.5, dist / 100);
  cam.far = dist * 20;
  cam.updateProjectionMatrix();
  const sh = s.sun.shadow.camera;
  Object.assign(sh, { left: -R * 1.3, right: R * 1.3, top: R * 1.3, bottom: -R * 1.3 });
  sh.updateProjectionMatrix();
}

// Points the camera at the model. Small changes keep the current view so
// slider tweaks don't make the camera jump around.
function frame(s, size, force) {
  const span = Math.max(size.x, size.y, size.z * 1.2, 20);
  if (!force && s.framedFor && span < s.framedFor * 1.25 && span > s.framedFor * 0.6) return;
  // Once someone has turned or zoomed a steady view, leave their view alone
  // unless the model has grown well past it.
  if (!force && s.steady && s.userMoved && s.framedFor && span < s.framedFor * 2) return;
  // A steady view grows to fit but keeps its angle and doesn't jump on small shrinks.
  if (!force && s.steady && s.framedFor && span < s.framedFor && span > s.framedFor * 0.4) return;
  const first = !s.framedFor;
  s.framedFor = span;
  const dist = span * 2.2;
  // Flat things (tags, signs, ornaments) read best from higher up.
  const flat = size.z < Math.max(size.x, size.y) * 0.2;
  const home = flat ? new THREE.Vector3(0.12, -0.5, 0.86) : new THREE.Vector3(0.45, -0.78, 0.48);
  const dir = force || first ? home : s.camera.position.clone().sub(s.orbit.target);
  dir.normalize();
  s.orbit.target.set(0, 0, size.z * 0.42);
  s.orbit.minDistance = span * 0.25;
  s.orbit.maxDistance = span * 8;
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
