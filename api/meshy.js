// "Describe it and AI makes it": a thin proxy to Meshy's text-to-3D API.
// The key lives only in the MESHY_API_KEY env var on Vercel; without it the
// feature reports itself off and the site hides it.
//   GET  /api/meshy               -> { enabled }
//   POST /api/meshy { prompt }    -> { id }
//   GET  /api/meshy?id=...        -> { status, progress, thumbnail, ready }
//   GET  /api/meshy?id=...&file=1 -> the model as .glb
import { ADULT } from "../src/sketchfab.js";

const BASE = "https://api.meshy.ai/openapi/v2/text-to-3d";
const KEY = process.env.MESHY_API_KEY;
const DAILY = Number(process.env.MESHY_DAILY_LIMIT || 25);

const meshy = (path = "", init = {}) =>
  fetch(BASE + path, { ...init, headers: { Authorization: `Bearer ${KEY}`, "Content-Type": "application/json", ...init.headers } });

async function madeToday() {
  const res = await meshy(`?page_size=50&sort_by=-created_at`);
  if (!res.ok) return 0;
  const tasks = await res.json();
  const midnight = new Date().setUTCHours(0, 0, 0, 0);
  return (Array.isArray(tasks) ? tasks : tasks.result || []).filter((t) => t.created_at >= midnight).length;
}

export default async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (!KEY) return res.status(200).json({ enabled: false });
  const id = req.query.id;

  if (req.method === "GET" && !id) return res.status(200).json({ enabled: true, daily: DAILY });

  if (req.method === "POST") {
    const prompt = String(req.body?.prompt || "")
      .replace(/\s+/g, " ")
      .trim();
    if (prompt.length < 3 || prompt.length > 200) return res.status(400).json({ error: "Describe it in 3 to 200 characters." });
    if (ADULT.test(prompt)) return res.status(400).json({ error: "Let's keep it family friendly. Try describing something else." });
    if ((await madeToday()) >= DAILY) return res.status(429).json({ error: "We've hit today's limit for AI models. Try again tomorrow." });
    const r = await meshy("", {
      method: "POST",
      body: JSON.stringify({
        mode: "preview",
        prompt: `${prompt}, single solid object, 3D printable figurine`,
        ai_model: "meshy-6-lite",
        should_remesh: true,
        target_polycount: 30000,
        moderation: true,
        target_formats: ["glb"],
      }),
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(502).json({ error: data.message || "The AI service didn't take that one. Try different words." });
    return res.status(200).json({ id: data.result });
  }

  if (req.method === "GET" && /^[\w-]{8,64}$/.test(id)) {
    const r = await meshy(`/${id}`);
    if (!r.ok) return res.status(404).json({ error: "Not found" });
    const t = await r.json();
    if (req.query.file) {
      const url = t.model_urls?.glb;
      if (!url) return res.status(409).json({ error: "Not ready" });
      const file = await fetch(url);
      res.setHeader("Content-Type", "model/gltf-binary");
      res.setHeader("Content-Disposition", `attachment; filename="layerlab-ai.glb"`);
      return res.status(200).send(Buffer.from(await file.arrayBuffer()));
    }
    return res.status(200).json({
      status: t.status,
      progress: t.progress || 0,
      thumbnail: t.thumbnail_url || null,
      ready: t.status === "SUCCEEDED",
      error: t.status === "FAILED" ? t.task_error?.message || "It didn't work this time." : null,
    });
  }
  return res.status(405).json({ error: "Method not allowed" });
}
