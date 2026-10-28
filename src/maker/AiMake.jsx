// "Describe it": type an idea, Meshy's AI makes a 3D model, and it lands in
// the remixer. Hidden unless the site has a Meshy key (see api/meshy.js).
import { useEffect, useRef, useState } from "react";

const IDEAS = ["a baby dragon hugging an egg", "a cat astronaut", "a tiny castle on a hill", "a frog wearing a crown"];

export function useAiEnabled() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    fetch("/api/meshy")
      .then((r) => (r.ok ? r.json() : {}))
      .then((d) => setOn(!!d.enabled))
      .catch(() => setOn(false));
  }, []);
  return on;
}

export default function AiMake({ onModel }) {
  const [prompt, setPrompt] = useState("");
  const [job, setJob] = useState(null); // { id, progress, thumbnail }
  const [err, setErr] = useState("");
  const alive = useRef(true);
  useEffect(() => () => (alive.current = false), []);

  const wait = async (id) => {
    for (let delay = 4000; alive.current; delay = Math.min(delay * 1.3, 15000)) {
      await new Promise((r) => setTimeout(r, delay));
      const s = await fetch(`/api/meshy?id=${id}`).then((r) => r.json());
      if (s.error) throw new Error(s.error);
      setJob({ id, progress: s.progress, thumbnail: s.thumbnail });
      if (s.ready) return;
    }
  };

  const make = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      const r = await fetch("/api/meshy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      setJob({ id: d.id, progress: 0 });
      await wait(d.id);
      if (!alive.current) return;
      const file = await fetch(`/api/meshy?id=${d.id}&file=1`);
      if (!file.ok) throw new Error("Couldn't download the model.");
      const slug =
        prompt
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")
          .slice(0, 40) || "ai-model";
      await onModel(`${slug}.glb`, await file.arrayBuffer(), prompt);
      setJob(null);
    } catch (e2) {
      setJob(null);
      setErr(e2.message || "Something went wrong. Try again.");
    }
  };

  return (
    <form className="ai-make" onSubmit={make}>
      <p className="eyebrow">New · AI</p>
      <h3>Or describe it and AI makes it</h3>
      {job ? (
        <div className="ai-job">
          {job.thumbnail ? <img src={job.thumbnail} alt="" /> : <div className="mk-spark" />}
          <div>
            <strong>Making “{prompt}”…</strong>
            <div className="ai-bar">
              <i style={{ width: `${Math.max(4, job.progress)}%` }} />
            </div>
            <small>Usually a minute or two. Keep this tab open.</small>
          </div>
        </div>
      ) : (
        <>
          <div className="ai-row">
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              maxLength={200}
              placeholder={`Try "${IDEAS[0]}"`}
              aria-label="Describe a model"
            />
            <button className="btn primary" disabled={prompt.trim().length < 3}>
              Make it
            </button>
          </div>
          <div className="ai-ideas">
            {IDEAS.map((i) => (
              <button type="button" key={i} onClick={() => setPrompt(i)}>
                {i}
              </button>
            ))}
          </div>
        </>
      )}
      {err && <p className="ai-err">{err}</p>}
      <p className="fine">Made with Meshy AI. AI models sometimes need a cleanup before printing; we'll check before any order.</p>
    </form>
  );
}
