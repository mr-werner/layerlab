import { useEffect, useRef, useState } from "react";
import { cad } from "../cad/client.js";

const strip = ({ id, ...rest }) => rest;
const CACHE_MAX = 120;

// Splits parts into color regions; each region's key covers its own parts
// and the holes (which cut every region).
export function regionGroups(parts) {
  const holes = parts.filter((p) => p.hole && !p.hidden);
  const holeKey = JSON.stringify(holes.map(strip));
  const byRegion = new Map();
  for (const p of parts) {
    if (p.hole || p.hidden) continue;
    const r = p.region || "main";
    if (!byRegion.has(r)) byRegion.set(r, []);
    byRegion.get(r).push(p);
  }
  const groups = [...byRegion].map(([region, objects]) => ({ region, objects, key: region + "|" + JSON.stringify(objects.map(strip)) + "|" + holeKey }));
  return { groups, holes };
}

// Builds the parts in the CAD worker, one mesh per color region. Regions that
// didn't change come from the cache, so most clicks only rebuild one region.
// Only the newest request matters, so slider drags don't queue up builds.
export function useBuild(parts) {
  const [meshes, setMeshes] = useState(null); // [{ region, mesh }]
  const [size, setSize] = useState(null);
  const [status, setStatus] = useState("warming"); // warming | building | ready | error
  const [error, setError] = useState("");
  const job = useRef({ running: false, next: null });
  const cache = useRef(new Map());

  useEffect(() => {
    if (!parts) return;
    const j = job.current;
    j.next = parts;
    if (j.running) return;
    const run = async () => {
      j.running = true;
      while (j.next) {
        const objs = j.next;
        j.next = null;
        const c = cache.current;
        try {
          const { groups, holes } = regionGroups(objs);
          if (!groups.length) throw new Error("Nothing is left to print. Try different settings.");
          const missing = groups.filter((g) => !c.has(g.key));
          if (missing.length) {
            setStatus((s) => (s === "warming" ? s : "building"));
            const res = await cad("previewGroups", { groups: missing.map((g) => ({ key: g.key, objects: g.objects })), holes });
            for (const m of res.meshes) c.set(m.key, { vertices: m.vertices, normals: m.normals, triangles: m.triangles });
            while (c.size > CACHE_MAX) c.delete(c.keys().next().value);
          }
          if (j.next) continue;
          const list = groups.map((g) => ({ region: g.region, mesh: c.get(g.key) }));
          const mn = [Infinity, Infinity, Infinity];
          const mx = [-Infinity, -Infinity, -Infinity];
          for (const { mesh } of list) {
            const v = mesh.vertices;
            for (let i = 0; i < v.length; i += 3)
              for (let k = 0; k < 3; k++) {
                if (v[i + k] < mn[k]) mn[k] = v[i + k];
                if (v[i + k] > mx[k]) mx[k] = v[i + k];
              }
          }
          if (!(mx[0] > mn[0])) throw new Error("Nothing is left to print. Try different settings.");
          setSize(mx.map((x, k) => x - mn[k]));
          setMeshes(list);
          setError("");
          setStatus("ready");
        } catch (e) {
          if (j.next) continue;
          setError(e.message || "That combination didn't work. Try a different setting.");
          setStatus("error");
        }
      }
      j.running = false;
    };
    run();
  }, [parts]);

  return { meshes, size, status, error };
}

// Region groups in print priority (small details first), with their colors,
// for the multi-color .3mf.
export function colorGroups(parts, regions, colors) {
  const { groups, holes } = regionGroups(parts);
  const order = regions.map((r) => r.id).reverse();
  const label = Object.fromEntries(regions.map((r) => [r.id, r.label]));
  const sorted = [...groups].sort((a, b) => order.indexOf(a.region) - order.indexOf(b.region));
  return {
    groups: sorted.map((g) => ({ name: label[g.region] || g.region, color: colors[g.region] || "#888888", objects: g.objects })),
    holes,
  };
}

export const inches = (mm) => (mm / 25.4).toFixed(mm < 254 ? 1 : 0);

export function download(name, bytes, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
