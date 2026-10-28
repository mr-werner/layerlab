// The remixer: bring in a model from another site, then resize it, turn it,
// recolor it and add a name stand before ordering a print.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Preview from "./Preview.jsx";
import ViewControls from "./ViewControls.jsx";
import { Control, RegionColors } from "./Controls.jsx";
import { useBuild, colorGroups, inches, download } from "./useBuild.js";
import { saveRemix, loadRemix, clearRemix } from "./fileStore.js";
import { Header } from "../site/Chrome.jsx";
import { REMIX_OPTIONS, REMIX_REGIONS, remixDefaults, remixParts } from "../remix.js";
import { STORES, STORE_BY_ID, FLAGS, LICENSES, LICENSE_BY_ID, lastTrip } from "../stores.js";
import { cad } from "../cad/client.js";
import AiMake, { useAiEnabled } from "./AiMake.jsx";
import { BUILD_VOLUME, COLORS, SITE, estimatePrice } from "../config.js";
import "./maker.css";

const SETTINGS_KEY = "layerlab:remix:v1";
const GROUPS = ["Size", "Turn", "Stand", "Colors", "License"];
const TYPES = /\.(stl|3mf|step|stp|glb|gltf|obj)$/i;

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY) || "null");
  } catch {
    return null;
  }
}

const blankCredit = () => ({
  store: "",
  license: "unknown",
  designer: "",
  link: "",
});

export default function Remix() {
  const saved = useMemo(readSettings, []);
  const [file, setFile] = useState(null); // { name, importId, kind, size }
  const [loading, setLoading] = useState("");
  const [values, setValues] = useState(saved?.values || remixDefaults());
  const [colors, setColors] = useState(
    saved?.colors || {
      model: COLORS[8].value,
      stand: COLORS[0].value,
      name: COLORS[1].value,
    },
  );
  const [credit, setCredit] = useState(saved?.credit || blankCredit());
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState("Size");
  const [part, setPart] = useState(undefined);
  const [picked, setPicked] = useState(null);
  const [spin, setSpin] = useState(true);
  const [viewMode, setViewMode] = useState("turn");
  const [compare, setCompare] = useState("none");
  const [over, setOver] = useState(false);
  const [panel, setPanel] = useState(null);
  const [toast, setToast] = useState("");
  const aiOn = useAiEnabled();
  const previewRef = useRef(null);
  const picker = useRef(null);

  const license = LICENSE_BY_ID[credit.license] || LICENSE_BY_ID.unknown;
  const parts = useMemo(() => (file ? remixParts(file, values, { allowEdits: license.canEdit }) : null), [file, values, license.canEdit]);
  const { meshes, size, status, error } = useBuild(parts);
  const regions = useMemo(() => REMIX_REGIONS.filter((r) => (parts || []).some((p) => p.region === r.id)), [parts]);
  const colorCount = new Set(regions.map((r) => colors[r.id])).size;

  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({ values, colors, credit }));
    } catch {
      /* settings just won't be remembered */
    }
  }, [values, colors, credit]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2800);
    return () => clearTimeout(t);
  }, [toast]);

  const bring = useCallback(async (name, bytes, { fresh = true, newCredit } = {}) => {
    setLoading(`Opening ${name}…`);
    try {
      const importId = `rx${Date.now().toString(36)}`;
      const info = await cad("import", {
        id: importId,
        name,
        bytes: bytes.slice(0),
      });
      setFile({ name, importId, kind: info.kind, size: info.size });
      if (info.repaired) setToast("This model had gaps, so we filled them in to make it printable. Check the details look right.");
      if (fresh) {
        setValues(remixDefaults());
        setHistory([]);
        setSpin(true);
        setCredit(newCredit || tripCredit());
        setTab("Size");
        saveRemix({ name, bytes });
      }
    } catch (e) {
      setToast(
        /manifold/i.test(e.message)
          ? `${name} has gaps or overlapping pieces, so it can't be printed as is. Models made for 3D printing work best.`
          : `Couldn't open ${name}: ${e.message}`,
      );
    } finally {
      setLoading("");
    }
  }, []);

  // A model picked in the gallery (?sf= Sketchfab, ?si= a free file link) loads
  // straight in; otherwise pick up where the last visit left off.
  const [signIn, setSignIn] = useState(null);
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const sf = q.get("sf");
    const si = q.get("si");
    window.history.replaceState(null, "", "/upload");
    try {
      const notice = sessionStorage.getItem("layerlab:notice");
      if (notice) {
        sessionStorage.removeItem("layerlab:notice");
        setToast(notice);
      }
    } catch {
      /* no notice */
    }
    if (!sf && !si) {
      loadRemix().then((entry) => entry && bring(entry.name, entry.bytes, { fresh: false }));
      return;
    }
    (async () => {
      try {
        let got;
        if (sf) {
          const { downloadSketchfab } = await import("../sketchfabAuth.js");
          got = await downloadSketchfab(sf, setLoading);
        } else {
          const { directSource } = await import("../sources.js");
          const from = directSource(si);
          if (!from) throw new Error("That link isn't from a store we can load directly.");
          setLoading(`Downloading from ${from}…`);
          const r = await fetch(si);
          if (!r.ok) throw new Error("The download didn't finish.");
          got = { name: decodeURIComponent(si.split("/").pop()), bytes: await r.arrayBuffer() };
        }
        setLoading("Getting it ready to print…");
        const conv = await import("./convert.js");
        if (got.gltfFiles) got = await conv.gltfFilesToSTL(got.gltfFiles);
        else if (conv.NEEDS_CONVERT.test(got.name)) got = await conv.toSTL(got.name, got.bytes);
        bring(got.name, got.bytes);
      } catch (e) {
        setLoading("");
        if (e.signIn) setSignIn(sf);
        setToast(e.message);
      }
    })();
  }, [bring]);

  const sketchfabAgain = async (uid) => {
    const { siteConfig, signInSketchfab } = await import("../sketchfabAuth.js");
    const cfg = await siteConfig();
    if (cfg.sketchfabClientId) signInSketchfab(cfg.sketchfabClientId, `/upload?sf=${encodeURIComponent(uid)}`);
  };

  const openFiles = async (list, credit) => {
    const f = [...list].find((x) => TYPES.test(x.name));
    if (!f) return setToast("Use a .stl, .3mf, .step, .glb or .obj file.");
    let name = f.name;
    let bytes = await f.arrayBuffer();
    if (/\.(glb|gltf|obj)$/i.test(name)) {
      setLoading(`Converting ${name}…`);
      try {
        const { toSTL } = await import("./convert.js");
        ({ name, bytes } = await toSTL(name, bytes));
      } catch (e) {
        setLoading("");
        return setToast(`Couldn't read ${f.name}: ${e.message}`);
      }
    }
    bring(name, bytes, credit && { newCredit: credit });
  };

  const fromAi = (name, bytes, prompt) =>
    openFiles([new File([bytes], name)], {
      store: "",
      license: "store",
      designer: `Meshy AI: “${prompt}”`,
      link: "https://www.meshy.ai/",
    });

  const trySample = async () => {
    const res = await fetch("/samples/rocket.stl");
    bring("rocket.stl", await res.arrayBuffer(), {
      newCredit: { store: "", license: "cc0", designer: SITE.name, link: "" },
    });
  };

  const closeFile = () => {
    setFile(null);
    clearRemix();
  };

  const remember = () => setHistory((h) => [...h.slice(-40), { values, colors }]);
  const setValue = (id, v, { commit = true } = {}) => {
    if (commit) remember();
    setValues((cur) => ({ ...cur, [id]: v }));
  };
  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setValues(last.values);
    setColors(last.colors);
  };
  const reset = () => {
    remember();
    setValues(remixDefaults());
  };
  const fitPrinter = () => {
    if (!file) return;
    remember();
    const big = Math.max(...file.size);
    const pct = Math.floor((((Math.min(BUILD_VOLUME.x, BUILD_VOLUME.z) * 0.9) / big) * 100) / 5) * 5;
    setValues((v) => ({ ...v, size: Math.max(10, Math.min(400, pct)) }));
  };

  const fits = size && size[0] <= BUILD_VOLUME.x && size[1] <= BUILD_VOLUME.y && size[2] <= BUILD_VOLUME.z;
  const price = size && fits ? estimatePrice(size) : null;
  const store = STORE_BY_ID[credit.store];
  const baseName = (file?.name || "remix").replace(/\.[^.]+$/, "");

  const saveFile = async () => {
    try {
      setToast("Getting your file ready…");
      if (colorCount > 1) {
        const { groups, holes } = colorGroups(parts, REMIX_REGIONS, colors);
        const { bytes } = await cad("exportColor", {
          groups,
          holes,
          title: baseName,
        });
        download(`${baseName}-remix.3mf`, bytes, "model/3mf");
      } else {
        const { bytes } = await cad("export", {
          objects: parts,
          format: "stl",
          fast: true,
        });
        download(`${baseName}-remix.stl`, bytes, "application/octet-stream");
      }
      setToast("Saved! Check your downloads.");
    } catch (e) {
      setToast(e.message);
    }
  };

  const options = REMIX_OPTIONS.filter((op) => op.group === tab);
  const paint = (c) => {
    remember();
    setColors(c);
  };
  const pickPart = (region) => {
    setTab(region === "model" ? "Size" : "Stand");
    setPart(region);
    setPicked({ region });
    setSpin(false);
  };

  return (
    <div
      className="maker"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e) => e.currentTarget === e.target && setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        openFiles(e.dataTransfer.files);
      }}
    >
      <Header active="/upload" />
      <input
        ref={picker}
        type="file"
        accept=".stl,.3mf,.step,.stp,.glb,.gltf,.obj"
        hidden
        onChange={(e) => e.target.files.length && openFiles(e.target.files)}
      />
      <div className="mk-grid rx-grid">
        <section className="mk-stage">
          <div className={`mk-view ${file ? "" : "empty"}`}>
            {file ? (
              <>
                <Preview
                  ref={previewRef}
                  meshes={meshes}
                  colors={colors}
                  spin={spin}
                  onSpinStop={() => setSpin(false)}
                  onPick={regions.length > 1 ? pickPart : null}
                  selected={picked}
                  compare={compare}
                  mode={viewMode}
                />
                {status === "warming" && (
                  <div className="mk-loading">
                    <div className="mk-spark" />
                    <p>Warming up the 3D engine…</p>
                  </div>
                )}
                {status === "building" && <div className="mk-chip building">Updating…</div>}
                {status === "error" && <div className="mk-chip bad">{error}</div>}
                <ViewControls
                  view={previewRef}
                  spin={spin}
                  setSpin={setSpin}
                  mode={viewMode}
                  setMode={setViewMode}
                  compare={compare}
                  setCompare={setCompare}
                />
                <p className="mk-drag-hint">
                  {viewMode === "move" ? "Drag to move." : "Drag to turn."} Pinch or scroll to zoom. Drop another file to swap.
                </p>
              </>
            ) : (
              <div className={`rx-drop ${over ? "over" : ""}`}>
                {loading ? (
                  <>
                    <div className="mk-spark" />
                    <h2>{loading}</h2>
                  </>
                ) : (
                  <>
                    <button className="rx-upload" onClick={() => picker.current?.click()}>
                      <svg viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          d="M12 16V4m0 0l-5 5m5-5l5 5M5 20h14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                      Upload
                    </button>
                    <h2 className="rx-question">Already have a model?</h2>
                    <p>
                      Drop it here or tap Upload. A .stl, .3mf, .step, .glb or .obj from Sketchfab, Printables, MakerWorld, Thingiverse or
                      anywhere else.
                    </p>
                    <div className="row-ctas">
                      {signIn && (
                        <button className="btn primary" onClick={() => sketchfabAgain(signIn)}>
                          Sign in with Sketchfab
                        </button>
                      )}
                      <button className="btn" onClick={trySample}>
                        Try a sample rocket
                      </button>
                    </div>
                  </>
                )}
                <p className="fine">
                  Need a model? <a href="/discover">Search the mall</a>. Files stay on your device until you order.
                </p>
                {aiOn && !loading && <AiMake onModel={fromAi} />}
              </div>
            )}
            {file && loading && <div className="mk-chip building">{loading}</div>}
          </div>
          {file && (
            <div className="mk-facts">
              <div>
                <span className="lbl">Size</span>
                <strong>{size ? `${inches(size[0])} × ${inches(size[1])} × ${inches(size[2])} in` : "…"}</strong>
                <small>{size ? `${size.map((x) => Math.round(x)).join(" × ")} mm` : ""}</small>
              </div>
              <div>
                <span className="lbl">Printer check</span>
                <strong className={!size ? "" : fits ? "good" : "bad"}>{size ? (fits ? "Fits" : "Too big") : "…"}</strong>
                <small>
                  {fits === false ? (
                    <button className="linkish" onClick={fitPrinter}>
                      Shrink to fit
                    </button>
                  ) : (
                    "Prints in one piece"
                  )}
                </small>
              </div>
              <div>
                <span className="lbl">Estimate</span>
                <strong>{price ? `$${price.toFixed(2)}` : "…"}</strong>
                <small>Placeholder price</small>
              </div>
            </div>
          )}
        </section>

        <section className="mk-panel" aria-label="Change your model">
          <div className="mk-panel-head">
            <h2>Your model</h2>
            <p>Make a model from any site your own: size, turn, color and a name stand.</p>
          </div>
          {file ? (
            <>
              <div className="rx-file">
                <strong title={file.name}>{file.name}</strong>
                <button onClick={() => picker.current?.click()}>Change</button>
                <button onClick={closeFile}>Close</button>
              </div>
              <div className="mk-tabs" role="tablist">
                {GROUPS.map((g) => (
                  <button key={g} role="tab" aria-selected={tab === g} className={tab === g ? "on" : ""} onClick={() => setTab(g)}>
                    {g}
                  </button>
                ))}
              </div>
              <div className="mk-controls" role="tabpanel">
                {tab === "Colors" && <RegionColors regions={regions} colors={colors} onChange={paint} active={part} onActive={setPart} />}
                {tab === "Stand" && regions.some((r) => r.id !== "model") && (
                  <RegionColors
                    compact
                    regions={regions.filter((r) => r.id !== "model")}
                    colors={colors}
                    onChange={paint}
                    active={part}
                    onActive={setPart}
                  />
                )}
                {tab === "Size" && (
                  <RegionColors compact regions={regions.filter((r) => r.id === "model")} colors={colors} onChange={paint} />
                )}
                {tab === "License" && <CreditForm credit={credit} setCredit={setCredit} />}
                {tab === "Stand" && !license.canEdit && (
                  <p className="rx-locked">
                    This model's license ({license.tag}) says no changes, so the stand is off. Size and color still work.
                  </p>
                )}
                {tab === "Size" && file.size && (
                  <p className="mk-hint">
                    Original: {file.size.map((x) => Math.round(x)).join(" × ")} mm.{" "}
                    <button className="linkish" onClick={fitPrinter}>
                      Make it as big as fits
                    </button>
                  </p>
                )}
                {options.map((op) => (
                  <Control key={op.id} op={op} value={values[op.id]} onChange={setValue} />
                ))}
              </div>
              <div
                className={`rx-license ${license.tone === "good" ? "lic-flag good" : license.tone === "warn" ? "lic-flag warn" : "lic-flag bad"}`}
              >
                <strong>
                  License: {license.tag === "?" ? "not set" : `${license.tag} · ${license.name}`}
                  {credit.designer ? ` · by ${credit.designer}` : ""}
                </strong>
                {license.id === "unknown" ? (
                  <span>
                    Tell us the license in the{" "}
                    <button className="linkish" onClick={() => setTab("License")}>
                      License tab
                    </button>{" "}
                    so we know it's okay to print.
                  </span>
                ) : (
                  <span>{license.ok}</span>
                )}
              </div>
              <div className="mk-quick">
                <button onClick={undo} disabled={!history.length}>
                  Undo
                </button>
                <button onClick={reset}>Start over</button>
              </div>
              <div className="mk-actions">
                <h2>Print it</h2>
                <button className="primary" onClick={() => setPanel("order")} disabled={!size}>
                  Order this print
                </button>
                <div className="mk-actions-row rx-actions">
                  <button onClick={saveFile} disabled={!size}>
                    {colorCount > 1 ? "Save .3mf" : "Save .stl"}
                  </button>
                  <a className="btn" href="/discover">
                    Find another
                  </a>
                </div>
              </div>
            </>
          ) : (
            <div className="mk-controls">
              <p className="mk-hint">Open a model to see its options. Here's how it works:</p>
              <ol className="rx-how">
                <li>Find a model in the mall and check its license.</li>
                <li>Download the .stl or .3mf file.</li>
                <li>Tap Upload (or drop it in), then change the size, turn it flat, pick a color and add a name stand.</li>
              </ol>
              <a className="btn lime" href="/discover">
                Search the mall
              </a>
            </div>
          )}
        </section>
      </div>

      {panel === "order" && (
        <div
          className="mk-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-title"
          onClick={(e) => e.target === e.currentTarget && setPanel(null)}
        >
          <div className="mk-modal-card">
            <h2 id="order-title">Order your remix</h2>
            <dl>
              <div>
                <dt>Model</dt>
                <dd>{file?.name}</dd>
              </div>
              <div>
                <dt>From</dt>
                <dd>
                  {store ? store.name : credit.link ? "Link below" : "Not set"}
                  {credit.designer ? `, by ${credit.designer}` : ""}
                </dd>
              </div>
              <div>
                <dt>License</dt>
                <dd>{license.id === "unknown" ? "Not set" : license.tag}</dd>
              </div>
              <div>
                <dt>Size</dt>
                <dd>{size && `${inches(size[0])} × ${inches(size[1])} × ${inches(size[2])} in`}</dd>
              </div>
              <div>
                <dt>Color</dt>
                <dd>
                  {[...new Set(regions.map((r) => colors[r.id]))].map((c) => (
                    <i key={c} className="dot" style={{ background: c }} />
                  ))}
                </dd>
              </div>
              <div>
                <dt>Estimate</dt>
                <dd>{price ? `$${price.toFixed(2)}` : "Too big to print in one piece"}</dd>
              </div>
            </dl>
            {!license.canOrder && (
              <p className="mk-note">
                {license.id === "unknown"
                  ? "We'll ask about the license before printing, since we don't know it yet."
                  : `${license.tag} models need the designer's okay before we print one for you. We'll check it with you first.`}
              </p>
            )}
            <p className="mk-note">
              Online ordering at {SITE.name} is coming soon. For now, save your remixed file. The price above is a placeholder estimate.
            </p>
            <div className="mk-modal-actions">
              <button className="primary" onClick={saveFile}>
                Save my remixed file
              </button>
              <button onClick={() => setPanel(null)}>Keep remixing</button>
            </div>
          </div>
        </div>
      )}
      {toast && (
        <div className="mk-toast" role="status">
          {toast}
        </div>
      )}
    </div>
  );
}

// If they just came from a model page, fill in where it's from, its license
// and who made it.
function tripCredit() {
  const t = lastTrip();
  if (!t || Date.now() - t.at > 3 * 3600 * 1000) return blankCredit();
  return {
    ...blankCredit(),
    store: t.store,
    ...(t.model
      ? {
          license: t.model.license,
          designer: t.model.designer,
          link: t.model.link,
        }
      : {}),
  };
}

function CreditForm({ credit, setCredit }) {
  const set = (k, v) => setCredit((c) => ({ ...c, [k]: v }));
  const store = STORE_BY_ID[credit.store];
  const flag = store && FLAGS[store.flag];
  return (
    <>
      <div className="mk-field" role="radiogroup" aria-label="Where is it from?">
        <span className="mk-label">Where's it from?</span>
        <div className="mk-choices">
          {STORES.map((s) => (
            <button
              key={s.id}
              role="radio"
              aria-checked={credit.store === s.id}
              className={credit.store === s.id ? "on" : ""}
              onClick={() => set("store", s.id)}
            >
              {s.name}
            </button>
          ))}
          <button role="radio" aria-checked={!credit.store} className={!credit.store ? "on" : ""} onClick={() => set("store", "")}>
            Somewhere else
          </button>
        </div>
        {flag && <p className="mk-hint">{`${store.name}: ${flag.note}`}</p>}
      </div>
      <div className="mk-field" role="radiogroup" aria-label="License">
        <span className="mk-label">License on the model's page</span>
        <div className="mk-choices">
          {LICENSES.map((l) => (
            <button
              key={l.id}
              role="radio"
              aria-checked={credit.license === l.id}
              className={credit.license === l.id ? "on" : ""}
              onClick={() => set("license", l.id)}
              title={l.name}
            >
              {l.tag === "?" ? "Not sure" : l.tag}
            </button>
          ))}
        </div>
        <p className="mk-hint">{(LICENSE_BY_ID[credit.license] || LICENSE_BY_ID.unknown).ok}</p>
      </div>
      <div className="mk-field">
        <label className="mk-label" htmlFor="rx-designer">
          Designer
        </label>
        <input
          id="rx-designer"
          className="mk-text small"
          value={credit.designer}
          maxLength={60}
          onChange={(e) => set("designer", e.target.value)}
          placeholder="Who made it?"
          autoComplete="off"
        />
      </div>
      <div className="mk-field">
        <label className="mk-label" htmlFor="rx-link">
          Link to the model
        </label>
        <input
          id="rx-link"
          className="mk-text small"
          value={credit.link}
          maxLength={300}
          onChange={(e) => set("link", e.target.value)}
          placeholder="https://…"
          autoComplete="off"
          inputMode="url"
        />
      </div>
    </>
  );
}
