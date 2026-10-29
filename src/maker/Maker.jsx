import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Preview from "./Preview.jsx";
import ViewControls from "./ViewControls.jsx";
import { Control, RegionColors } from "./Controls.jsx";
import { useBuild, colorGroups, inches, download } from "./useBuild.js";
import { Header } from "../site/Chrome.jsx";
import { KITS, KIT_BY_ID, defaultValues, cleanValues, randomValues, buildKit, kitRegions, defaultColors } from "../kits.js";
import { FIGURE_LOOKS } from "../figure.js";
import { PRODUCT_BY_ID } from "../catalog.js";
import { cad } from "../cad/client.js";
import { BUILD_VOLUME, COLORS, SITE, estimatePrice } from "../config.js";
import "./maker.css";

const STUDIO_KEY = "layerlab:studio:v1";
const HEX = /^[0-9a-f]{6}$/i;
const geomKey = (p) => `${p.type}:${JSON.stringify(p.params)}`;

// Colors in links are region=hex pairs: cs=skin.e86aa6,hat.6c4bb4
const packColors = (colors) =>
  Object.entries(colors)
    .map(([r, c]) => `${r}.${c.slice(1)}`)
    .join(",");
function unpackColors(kit, text, base) {
  const out = defaultColors(kit, base);
  for (const pair of (text || "").split(",")) {
    const [r, c] = pair.split(".");
    if (r in out && HEX.test(c || "")) out[r] = "#" + c.toLowerCase();
  }
  return out;
}

function readStart() {
  const q = new URLSearchParams(window.location.search);
  const product = PRODUCT_BY_ID[q.get("p")];
  if (product) {
    const kit = KIT_BY_ID[product.kit];
    return {
      kit,
      values: cleanValues(kit, { ...defaultValues(kit), ...product.values }),
      colors: defaultColors(kit, product.color || COLORS[4].value),
    };
  }
  const kit = KIT_BY_ID[q.get("kit")] || KITS[0];
  let values = defaultValues(kit);
  try {
    if (q.get("v")) values = cleanValues(kit, { ...values, ...JSON.parse(q.get("v")) });
  } catch {
    /* a broken link just starts from the defaults */
  }
  const base = HEX.test(q.get("c") || "") ? "#" + q.get("c").toLowerCase() : COLORS[4].value;
  return { kit, values, colors: unpackColors(kit, q.get("cs"), base) };
}

// Thumbnail mode (?shot=1) can spin the model, zoom on some regions and
// paint the regions an option changes in the accent color.
function readShot() {
  const q = new URLSearchParams(window.location.search);
  if (!q.has("shot")) return null;
  return {
    angle: Number(q.get("angle") || 0),
    focus: q.get("focus") ? q.get("focus").split(",") : null,
    min: Number(q.get("min") || 0),
    hl: q.get("hl") ? q.get("hl").split(",") : null,
  };
}

export default function Maker() {
  const start = useMemo(readStart, []);
  const [kit, setKit] = useState(start.kit);
  const [values, setValues] = useState(start.values);
  const [colors, setColors] = useState(start.colors);
  const [history, setHistory] = useState([]);
  const [tab, setTabOnly] = useState(start.kit.options[0].group);
  const [sub, setSub] = useState(null); // sub-tab inside a tab, if it has them
  const [part, setPart] = useState(null); // the part whose color is open
  const [picked, setPicked] = useState(null); // { region } flashes in the preview
  const [spin, setSpin] = useState(true);
  const [viewMode, setViewMode] = useState("turn");
  const [compare, setCompare] = useState("none");
  const [panel, setPanel] = useState(null); // order | null
  const [toast, setToast] = useState("");
  const previewRef = useRef(null);
  const shotOpts = useMemo(readShot, []);
  const shot = !!shotOpts;
  const regions = useMemo(() => kitRegions(kit), [kit]);

  const groups = useMemo(() => [...new Set(kit.options.filter((o) => !o.top).map((o) => o.group)), "All colors"], [kit]);
  const subsOf = (g) => [...new Set(kit.options.filter((o) => o.group === g && o.sub).map((o) => o.sub))];
  const setTab = (g, s = null) => {
    setTabOnly(g);
    setSub(s || subsOf(g)[0] || null);
  };
  const parts = useMemo(() => buildKit(kit, values), [kit, values]);

  const { meshes, size, status, error } = useBuild(parts);

  // While nothing is happening, get the other choices ready in the engine so
  // clicking one shows up right away.
  const warmed = useRef(new Set());
  useEffect(() => {
    if (status !== "ready" || shot) return;
    let stop = false;
    const have = new Set(parts.map(geomKey));
    const queue = [];
    for (const op of kit.options) {
      if (op.type !== "choice") continue;
      for (const c of op.choices) {
        if (c.value === values[op.id]) continue;
        let list;
        try {
          list = buildKit(kit, { ...values, [op.id]: c.value });
        } catch {
          continue;
        }
        const fresh = list.filter((p) => !have.has(geomKey(p)) && !warmed.current.has(geomKey(p)));
        if (fresh.length) queue.push(fresh);
      }
    }
    (async () => {
      for (const objs of queue) {
        await new Promise((r) => setTimeout(r, 60));
        if (stop) return;
        objs.forEach((p) => warmed.current.add(geomKey(p)));
        await cad("warm", { objects: objs }).catch(() => {});
      }
    })();
    return () => {
      stop = true;
    };
  }, [status, kit, values, parts, shot]);

  // On phones the base list scrolls sideways; keep the chosen one in view.
  useEffect(() => {
    document.querySelector(".mk-kit.on")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [kit]);

  // Keep the address shareable.
  useEffect(() => {
    if (shot) return;
    const q = new URLSearchParams({
      kit: kit.id,
      v: JSON.stringify(values),
      cs: packColors(colors),
    });
    window.history.replaceState(null, "", `/make?${q}`);
  }, [kit, values, colors, shot]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const remember = useCallback(() => setHistory((h) => [...h.slice(-40), { kit, values, colors }]), [kit, values, colors]);

  const setValue = (id, v, { commit = true } = {}) => {
    if (commit) remember();
    // Some choices bring others with them (a style picks a head and body).
    const sets = kit.options.find((o) => o.id === id)?.sets?.[v] || {};
    setValues((cur) => ({ ...cur, ...sets, [id]: v }));
  };

  const applyLook = (look) => {
    remember();
    setValues(cleanValues(kit, { ...defaultValues(kit), ...look.values }));
    const cs = defaultColors(kit, COLORS[4].value);
    for (const [r, c] of Object.entries(look.colors || {})) if (r in cs) cs[r] = c;
    setColors(cs);
    setSpin(true);
  };

  const pickKit = (k) => {
    if (k.id === kit.id) return;
    remember();
    setKit(k);
    setValues(defaultValues(k));
    setColors(defaultColors(k, Object.values(colors)[0]));
    setTab(k.options[0].group);
    setSpin(true);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setKit(last.kit);
    setValues(last.values);
    setColors(last.colors);
  };

  const surprise = () => {
    remember();
    setValues(randomValues(kit, values));
    const pick = () => COLORS[Math.floor(Math.random() * COLORS.length)].value;
    const one = pick();
    setColors(Object.fromEntries(regions.map((r) => [r.id, regions.length > 2 ? pick() : one])));
  };

  const reset = () => {
    remember();
    setValues(defaultValues(kit));
    setColors(defaultColors(kit, COLORS[4].value));
  };

  const fits = size && size[0] <= BUILD_VOLUME.x && size[1] <= BUILD_VOLUME.y && size[2] <= BUILD_VOLUME.z;
  const price = size && fits ? estimatePrice(size) : null;
  const fileBase = `${kit.id}-${
    (values.text || kit.name)
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || kit.id
  }`;

  const colorCount = new Set(regions.map((r) => colors[r.id])).size;
  const saveFile = async (format = colorCount > 1 ? "3mf" : "stl") => {
    try {
      setToast("Getting your file ready…");
      if (format === "3mf") {
        const { groups: g, holes } = colorGroups(parts, regions, colors);
        const { bytes } = await cad("exportColor", {
          groups: g,
          holes,
          title: kit.name,
        });
        download(`${fileBase}.3mf`, bytes, "model/3mf");
      } else {
        const { bytes } = await cad("export", {
          objects: parts,
          format,
          fast: true,
        });
        download(`${fileBase}.${format === "step" ? "stp" : "stl"}`, bytes, "application/octet-stream");
      }
      setToast(format === "3mf" ? "Saved a .3mf with every color. Check your downloads." : "Saved! Check your downloads.");
    } catch (e) {
      setToast(e.message);
    }
  };

  const openStudio = () => {
    try {
      localStorage.setItem(
        STUDIO_KEY,
        JSON.stringify({
          name: `My ${kit.name.toLowerCase()}`,
          color: colors[regions[0].id],
          objects: parts,
        }),
      );
    } catch {
      /* private windows can block storage; the studio then opens empty */
    }
    window.location.href = "/studio";
  };

  const share = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setToast("Link copied. Send it to a friend!");
    } catch {
      setToast("Copy the address bar to share this design.");
    }
  };

  if (shot) {
    return (
      <div className="shot">
        <Preview
          ref={previewRef}
          meshes={meshes}
          colors={shotOpts.hl ? Object.fromEntries(regions.map((r) => [r.id, shotOpts.hl.includes(r.id) ? "#7a66ff" : "#d8d4cc"])) : colors}
          spin={false}
          angle={shotOpts.angle}
          focus={shotOpts.focus}
          focusMin={shotOpts.min}
          background={null}
          table={false}
        />
        {status === "ready" && <span id="shot-ready" data-size={size?.map((x) => x.toFixed(1)).join(",")} />}
      </div>
    );
  }

  const shown = (o) => !o.when || o.when(values);
  const subs = subsOf(tab);
  const options = kit.options.filter((o) => !o.top && o.group === tab && (!subs.length || o.sub === sub) && shown(o));
  const topOptions = kit.options.filter((o) => o.top && shown(o));
  const tabRegions = regions.filter((r) => (r.tab || groups[0]) === tab && (!subs.length || !r.sub || r.sub === sub));
  const paint = (c) => {
    remember();
    setColors(c);
  };
  // Clicking a part of the model opens the tab with its options and color.
  const pickPart = (region) => {
    const r = regions.find((x) => x.id === region);
    if (!r) return;
    setTab(r.tab || groups[0], r.sub);
    setPart(region);
    setPicked({ region });
    setSpin(false);
    document.querySelector(".mk-panel")?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <div className="maker">
      <Header active="/make" />
      <div className="mk-grid">
        <aside className="mk-kits" aria-label="Pick something to make">
          <h2>Start from</h2>
          <div className="mk-kit-list">
            {KITS.map((k) => (
              <button
                key={k.id}
                className={`mk-kit ${k.id === kit.id ? "on" : ""} ${k.featured ? "featured" : ""}`}
                onClick={() => pickKit(k)}
                aria-pressed={k.id === kit.id}
              >
                <img src={`/shots/kit-${k.id}.png`} alt="" loading="lazy" />
                <span>{k.name}</span>
                {k.featured && <b className="mk-new">New</b>}
              </button>
            ))}
            <a className="mk-kit mk-remix" href="/upload" title="Already have a model?">
              <span className="mk-plus" aria-hidden="true">
                ↑
              </span>
              <span>Upload</span>
            </a>
          </div>
        </aside>

        <section className="mk-stage">
          <div className="mk-view">
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
                <small>Takes a few seconds the first time.</small>
              </div>
            )}
            {status === "building" && <div className="mk-chip building">Shaping…</div>}
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
              {regions.length > 1 ? "Tap a part to change it. " : ""}
              {viewMode === "move" ? "Drag to move." : "Drag to turn."} Pinch or scroll to zoom.
            </p>
          </div>
          <div className="mk-facts">
            <div>
              <span className="lbl">Size</span>
              <strong>{size ? `${inches(size[0])} × ${inches(size[1])} × ${inches(size[2])} in` : "…"}</strong>
              <small>{size ? `${size.map((x) => Math.round(x)).join(" × ")} mm` : ""}</small>
            </div>
            <div>
              <span className="lbl">Printer check</span>
              <strong className={!size ? "" : fits ? "good" : "bad"}>{size ? (fits ? "Fits!" : "Too big") : "…"}</strong>
              <small>{fits === false ? `Max ${BUILD_VOLUME.x} mm each way` : "Prints in one piece"}</small>
            </div>
            <div>
              <span className="lbl">Estimate</span>
              <strong>{price ? `$${price.toFixed(2)}` : "…"}</strong>
              <small>Placeholder price</small>
            </div>
          </div>
        </section>

        <section className="mk-panel" aria-label="Change it">
          <div className="mk-panel-head">
            <h2>{kit.name}</h2>
            <p>{kit.tagline}</p>
          </div>
          {topOptions.map((op) => (
            <div className="mk-top" key={op.id}>
              <Control
                op={
                  size
                    ? {
                        ...op,
                        hint: `Now ${(size[2] / 10).toFixed(1)} cm (${inches(size[2])} in) tall. Every part grows or shrinks together.`,
                      }
                    : op
                }
                value={values[op.id]}
                onChange={setValue}
                kitId={kit.id}
              />
            </div>
          ))}
          <div className="mk-tabs" role="tablist">
            {groups.map((g) => (
              <button key={g} role="tab" aria-selected={tab === g} className={tab === g ? "on" : ""} onClick={() => setTab(g)}>
                {g}
              </button>
            ))}
          </div>
          {subs.length > 1 && (
            <div className="mk-subtabs" role="tablist" aria-label={`${tab} parts`}>
              {subs.map((x) => (
                <button key={x} role="tab" aria-selected={sub === x} className={sub === x ? "on" : ""} onClick={() => setSub(x)}>
                  {x}
                </button>
              ))}
            </div>
          )}
          <div className="mk-controls" role="tabpanel">
            {tab === "All colors" ? (
              <RegionColors
                regions={regions}
                colors={colors}
                onChange={paint}
                active={regions.some((r) => r.id === part) ? part : undefined}
                onActive={setPart}
              />
            ) : (
              <>
                {tabRegions.length > 0 && (
                  <RegionColors
                    compact
                    regions={tabRegions}
                    colors={colors}
                    onChange={paint}
                    active={tabRegions.some((r) => r.id === part) ? part : undefined}
                    onActive={setPart}
                  />
                )}
                {options.map((op) => (
                  <Control key={op.id} op={op} value={values[op.id]} onChange={setValue} kitId={kit.id} />
                ))}
                {kit.id === "figure" && tab === "Style" && (
                  <div className="mk-looks">
                    <div className="mk-label">Start from a look</div>
                    <div className="mk-looks-grid">
                      {FIGURE_LOOKS.map((l) => (
                        <button key={l.id} onClick={() => applyLook(l)}>
                          <img src={`/shots/fig-${l.id}.png`} alt="" loading="lazy" />
                          <span>{l.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <div className="mk-quick">
            <button className="fun" onClick={surprise}>
              <span aria-hidden="true">✦</span> Randomize
            </button>
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
            <div className="mk-actions-row">
              <button onClick={() => saveFile()} disabled={!size} title={colorCount > 1 ? "A .3mf file with every color" : "An .stl file"}>
                Save file
              </button>
              <button onClick={share}>Share</button>
              <button onClick={openStudio} title="Open in the advanced editor">
                More tools
              </button>
            </div>
          </div>
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
            <h2 id="order-title">Order your {kit.name.toLowerCase()}</h2>
            <dl>
              <div>
                <dt>Size</dt>
                <dd>{size && `${inches(size[0])} × ${inches(size[1])} × ${inches(size[2])} in`}</dd>
              </div>
              <div>
                <dt>{colorCount > 1 ? `Colors (${colorCount})` : "Color"}</dt>
                <dd>
                  {[...new Set(regions.map((r) => colors[r.id]))].map((c) => (
                    <i key={c} className="dot" style={{ background: c }} title={COLORS.find((x) => x.value === c)?.label} />
                  ))}{" "}
                  {colorCount === 1 && COLORS.find((c) => c.value === colors[regions[0].id])?.label}
                </dd>
              </div>
              <div>
                <dt>Estimate</dt>
                <dd>{price ? `$${price.toFixed(2)}` : "Too big to print in one piece"}</dd>
              </div>
            </dl>
            <p className="mk-note">
              Online ordering at {SITE.name} is coming soon. For now, save your 3D file and keep this page's link. The price above is a
              placeholder estimate.
            </p>
            <div className="mk-modal-actions">
              <button className="primary" onClick={() => saveFile()}>
                Save my 3D file
              </button>
              <button onClick={share}>Copy link</button>
              <button onClick={() => setPanel(null)}>Keep making</button>
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
