// "Sign in with Sketchfab" so a model can come straight into the builder.
// Uses Sketchfab's browser sign-in (OAuth2 implicit grant). The app's client
// id comes from /api/config, so the button only shows once it's set up.
import { unzipSync } from "fflate";

const TOKEN_KEY = "layerlab:sketchfab:token";
const STATE_KEY = "layerlab:sketchfab:state";
export const CALLBACK_PATH = "/auth/sketchfab";

let config;
export function siteConfig() {
  config ||= fetch("/api/config")
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
  return config;
}

export function sketchfabToken() {
  try {
    const t = JSON.parse(localStorage.getItem(TOKEN_KEY) || "null");
    return t && t.expires > Date.now() + 60_000 ? t.token : null;
  } catch {
    return null;
  }
}

export function signOutSketchfab() {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* nothing stored */
  }
}

export function signInSketchfab(clientId, returnTo) {
  const state = Math.random().toString(36).slice(2) + Date.now().toString(36);
  sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, returnTo }));
  const q = new URLSearchParams({
    response_type: "token",
    client_id: clientId,
    redirect_uri: window.location.origin + CALLBACK_PATH,
    state,
  });
  window.location.href = `https://sketchfab.com/oauth2/authorize/?${q}`;
}

// Runs on the callback page: keep the token and say where to go next.
export function finishSketchfabSignIn() {
  const hash = new URLSearchParams(window.location.hash.slice(1));
  let saved = null;
  try {
    saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || "null");
    sessionStorage.removeItem(STATE_KEY);
  } catch {
    /* fall through to the error below */
  }
  if (hash.get("error")) return { error: "Sketchfab sign-in was cancelled.", returnTo: saved?.returnTo || "/discover" };
  if (!saved || hash.get("state") !== saved.state || !hash.get("access_token")) {
    return { error: "That sign-in link didn't match. Please try again.", returnTo: saved?.returnTo || "/discover" };
  }
  const expires = Date.now() + Number(hash.get("expires_in") || 3600) * 1000;
  try {
    localStorage.setItem(TOKEN_KEY, JSON.stringify({ token: hash.get("access_token"), expires }));
  } catch {
    return { error: "Your browser blocked the sign-in from being saved.", returnTo: saved.returnTo };
  }
  return { returnTo: saved.returnTo };
}

export class SignInNeeded extends Error {
  signIn = true;
}

const PRINT_FILES = [/\.stl$/i, /\.3mf$/i, /\.obj$/i, /\.glb$/i];

// Gets a model's files from Sketchfab. Prefers the designer's original upload
// when it holds a print file (.stl/.3mf), then the .glb Sketchfab makes.
// Returns { name, bytes } for a file, or { gltfFiles } for an unzipped glTF.
export async function downloadSketchfab(uid, onStep = () => {}) {
  const token = sketchfabToken();
  if (!token) throw new SignInNeeded("Sign in with Sketchfab first.");
  onStep("Asking Sketchfab for the file…");
  const res = await fetch(`https://api.sketchfab.com/v3/models/${encodeURIComponent(uid)}/download`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    signOutSketchfab();
    throw new SignInNeeded("Your Sketchfab sign-in ran out. Sign in again.");
  }
  if (!res.ok)
    throw new Error(
      res.status === 403 || res.status === 404 ? "The designer doesn't allow downloads of this model." : "Sketchfab didn't send the file.",
    );
  const links = await res.json();
  const get = async (link, what) => {
    onStep(`Downloading ${what}${link.size ? ` (${(link.size / 1e6).toFixed(1)} MB)` : ""}…`);
    const r = await fetch(link.url);
    if (!r.ok) throw new Error("The download didn't finish.");
    return new Uint8Array(await r.arrayBuffer());
  };

  if (links.source?.url && (links.source.size || 0) < 80e6) {
    try {
      const data = await get(links.source, "the original file");
      if (looksLikeSTL(data)) return { name: `${uid}.stl`, bytes: data.buffer };
      const files = unzipSync(data);
      for (const pattern of PRINT_FILES) {
        const hit = Object.keys(files).find((f) => pattern.test(f) && !f.startsWith("__MACOSX"));
        if (hit) return { name: hit.split("/").pop(), bytes: files[hit].slice().buffer };
      }
    } catch {
      /* not a zip, or nothing printable inside; try the glb */
    }
  }
  if (links.glb?.url) return { name: `${uid}.glb`, bytes: (await get(links.glb, "the model")).buffer };
  if (links.gltf?.url) return { gltfFiles: unzipSync(await get(links.gltf, "the model")) };
  throw new Error("Sketchfab has no downloadable file for this model.");
}

// The original upload can be a bare .stl instead of a zip.
function looksLikeSTL(b) {
  if (b[0] === 0x50 && b[1] === 0x4b) return false; // "PK": a zip
  if (b.length > 84 && 84 + 50 * new DataView(b.buffer, b.byteOffset).getUint32(80, true) === b.length) return true;
  return /^\s*solid\b/.test(new TextDecoder().decode(b.subarray(0, 200))) && /facet/.test(new TextDecoder().decode(b.subarray(0, 2000)));
}
