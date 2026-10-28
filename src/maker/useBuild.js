import { useEffect, useRef, useState } from "react";
import { cad } from "../cad/client.js";

// Builds the parts in the CAD worker on the fast mesh path. Only the newest
// request matters, so slider drags don't queue up dozens of builds.
export function useBuild(parts) {
  const [mesh, setMesh] = useState(null);
  const [size, setSize] = useState(null);
  const [status, setStatus] = useState("warming"); // warming | building | ready | error
  const [error, setError] = useState("");
  const job = useRef({ running: false, next: null });

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
        setStatus((s) => (s === "warming" ? s : "building"));
        try {
          const res = await cad("preview", { objects: objs, fast: true });
          if (j.next) continue;
          const v = res.mesh.vertices;
          const mn = [Infinity, Infinity, Infinity];
          const mx = [-Infinity, -Infinity, -Infinity];
          for (let i = 0; i < v.length; i += 3)
            for (let k = 0; k < 3; k++) {
              if (v[i + k] < mn[k]) mn[k] = v[i + k];
              if (v[i + k] > mx[k]) mx[k] = v[i + k];
            }
          setSize(mx.map((x, k) => x - mn[k]));
          setMesh(res.mesh);
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

  return { mesh, size, status, error };
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
