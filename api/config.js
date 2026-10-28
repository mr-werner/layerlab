// Public settings the site needs at runtime. Nothing secret goes here.
export default function handler(req, res) {
  res.setHeader("Cache-Control", "public, max-age=300");
  res.status(200).json({
    sketchfabClientId: process.env.SKETCHFAB_CLIENT_ID || null,
    meshy: !!process.env.MESHY_API_KEY,
  });
}
