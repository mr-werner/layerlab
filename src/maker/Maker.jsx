import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Preview from "./Preview.jsx";
import { Header } from "../site/Chrome.jsx";
import { KITS, KIT_BY_ID, defaultValues, cleanValues, randomValues, buildKit } from "../kits.js";
import { PRODUCT_BY_ID } from "../catalog.js";
import { cad } from "../cad/client.js";
import { BUILD_VOLUME, COLORS, SITE, estimatePrice } from "../config.js";
import "./maker.css";

const STUDIO_KEY = "trinketforge:studio:v1";

function readStart() {
  const q = new URLSearchParams(window.location.search);
  const product = PRODUCT_BY_ID[q.get("p")];
  if (product) {
    const kit = KIT_BY_ID[product.kit];
    return { kit, values: cleanValues(kit, { ...defaultValues(kit), ...product.values }), color: product.color || COLORS[4].value };
  }
  const kit = KIT_BY_ID[q.get("kit")] || KITS[0];
  let values = defaultValues(kit);
  try {
    if (q.get("v")) values = cleanValues(kit, { ...values, ...JSON.parse(q.get("v")) });
  } catch {
    /* a broken link just starts from the defaults */
  }
  const color = COLORS.find((c) => c.value === "#" + (q.get("c") || ""))?.value || COLORS[4].value;
  return { kit, values, color };
}

const inches = (mm) => (mm / 25.4).toFixed(mm < 254 ? 1 : 0);

function download(name, bytes, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export default function Maker() {
  const start = useMemo(readStart, []);
  const [kit, setKit] = useState(start.kit);
  const [values, setValues] = useState(start.values);
  const [color, setColor] = useState(start.color);
  const [history, setHistory] = useState([]);
  const [tab, setTab] = useState(start.kit.options[0].group);
  const [mesh, setMesh] = useState(null);
  const [size, setSize] = useState(null);
  const [status, setStatus] = useState("warming"); // warming | building | ready | error
  const [error, setError] = useState("");
  const [spin, setSpin] = useState(true);
  const [panel, setPanel] = useState(null); // order | null
  const [toast, setToast] = useState("");
  const previewRef = useRef(null);
  const shot = new URLSearchParams(window.location.search).has("shot");

  const groups = useMemo(() => [...new Set(kit.options.map((o) => o.group)), "Color"], [kit]);
  const parts = useMemo(() => buildKit(kit, values), [kit, values]);

  // Build the model in the worker. Only the newest request matters, so
  // slider drags don't queue up dozens of builds.
  const job = useRef({ running: false, next: null });
  useEffect(() => {
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

  // On phones the base list scrolls sideways; keep the chosen one in view.
  useEffect(() => {
    document.querySelector(".mk-kit.on")?.scrollIntoView({ block: "nearest", inline: "center" });
  }, [kit]);

  // Keep the address shareable.
  useEffect(() => {
    if (shot) return;
    const q = new URLSearchParams({ kit: kit.id, v: JSON.stringify(values), c: color.slice(1) });
    window.history.replaceState(null, "", `/make?${q}`);
  }, [kit, values, color, shot]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const remember = useCallback(() => setHistory((h) => [...h.slice(-40), { kit, values, color }]), [kit, values, color]);

  const setValue = (id, v, { commit = true } = {}) => {
    if (commit) remember();
    setValues((cur) => ({ ...cur, [id]: v }));
  };

  const pickKit = (k) => {
    if (k.id === kit.id) return;
    remember();
    setKit(k);
    setValues(defaultValues(k));
    setTab(k.options[0].group);
    setSpin(true);
  };

  const undo = () => {
    const last = history[history.length - 1];
    if (!last) return;
    setHistory((h) => h.slice(0, -1));
    setKit(last.kit);
    setValues(last.values);
    setColor(last.color);
  };

  const surprise = () => {
    remember();
    setValues(randomValues(kit, values));
    setColor(COLORS[Math.floor(Math.random() * COLORS.length)].value);
  };

  const reset = () => {
    remember();
    setValues(defaultValues(kit));
  };

  const fits = size && size[0] <= BUILD_VOLUME.x && size[1] <= BUILD_VOLUME.y && size[2] <= BUILD_VOLUME.z;
  const price = size && fits ? estimatePrice(size) : null;
  const fileBase = `${kit.id}-${(values.text || kit.name).toString().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || kit.id}`;

  const saveFile = async (format = "stl") => {
    try {
      setToast("Getting your file ready…");
      const { bytes } = await cad("export", { objects: parts, format, fast: true });
      download(`${fileBase}.${format === "step" ? "stp" : "stl"}`, bytes, "application/octet-stream");
      setToast("Saved! Check your downloads.");
    } catch (e) {
      setToast(e.message);
    }
  };

  const openStudio = () => {
    try {
      localStorage.setItem(STUDIO_KEY, JSON.stringify({ name: `My ${kit.name.toLowerCase()}`, color, objects: parts }));
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
        <Preview ref={previewRef} mesh={mesh} color={color} spin={false} background={null} table={false} />
        {status === "ready" && <span id="shot-ready" data-size={size?.map((x) => x.toFixed(1)).join(",")} />}
      </div>
    );
  }

  const options = kit.options.filter((o) => o.group === tab);

  return (
    <div className="maker">
      <Header active="/make" />
      <div className="mk-grid">
        <aside className="mk-kits" aria-label="Pick something to make">
          <h2>1. Pick a base</h2>
          <div className="mk-kit-list">
            {KITS.map((k) => (
              <button key={k.id} className={`mk-kit ${k.id === kit.id ? "on" : ""}`} onClick={() => pickKit(k)} aria-pressed={k.id === kit.id}>
                <img src={`/shots/kit-${k.id}.png`} alt="" loading="lazy" />
                <span>{k.name}</span>
              </button>
            ))}
          </div>
        </aside>

        <section className="mk-stage">
          <div className="mk-view">
            <Preview ref={previewRef} mesh={mesh} color={color} spin={spin} onSpinStop={() => setSpin(false)} />
            {status === "warming" && (
              <div className="mk-loading">
                <div className="mk-spark" />
                <p>Warming up the workshop…</p>
                <small>The 3D engine takes a few seconds the first time.</small>
              </div>
            )}
            {status === "building" && <div className="mk-chip building">Shaping…</div>}
            {status === "error" && <div className="mk-chip bad">{error}</div>}
            <div className="mk-view-tools">
              <button onClick={() => setSpin(!spin)} aria-pressed={spin}>
                {spin ? "Stop spinning" : "Spin"}
              </button>
              <button onClick={() => previewRef.current?.reframe()}>Recenter</button>
            </div>
            <p className="mk-drag-hint">Drag to turn it. Pinch or scroll to zoom.</p>
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
            <h2>2. Make it yours</h2>
            <p>{kit.tagline}</p>
          </div>
          <div className="mk-tabs" role="tablist">
            {groups.map((g) => (
              <button key={g} role="tab" aria-selected={tab === g} className={tab === g ? "on" : ""} onClick={() => setTab(g)}>
                {g}
              </button>
            ))}
          </div>
          <div className="mk-controls" role="tabpanel">
            {tab === "Color" ? (
              <div className="mk-field">
                <span className="mk-label">
                  Color <em>{COLORS.find((c) => c.value === color)?.label}</em>
                </span>
                <div className="mk-swatches">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      className={c.value === color ? "on" : ""}
                      style={{ "--sw": c.value }}
                      onClick={() => {
                        remember();
                        setColor(c.value);
                      }}
                      aria-label={c.label}
                      title={c.label}
                    />
                  ))}
                </div>
                <p className="mk-hint">One filament color per print. Ask about two-color prints when you order.</p>
              </div>
            ) : (
              options.map((op) => <Control key={op.id} op={op} value={values[op.id]} onChange={setValue} />)
            )}
          </div>
          <div className="mk-quick">
            <button className="fun" onClick={surprise}>
              <span aria-hidden="true">✦</span> Surprise me
            </button>
            <button onClick={undo} disabled={!history.length}>
              Undo
            </button>
            <button onClick={reset}>Start over</button>
          </div>
          <div className="mk-actions">
            <h2>3. Get it printed</h2>
            <button className="primary" onClick={() => setPanel("order")} disabled={!size}>
              Order this print
            </button>
            <div className="mk-actions-row">
              <button onClick={() => saveFile("stl")} disabled={!size}>
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
        <div className="mk-modal" role="dialog" aria-modal="true" aria-labelledby="order-title" onClick={(e) => e.target === e.currentTarget && setPanel(null)}>
          <div className="mk-modal-card">
            <h2 id="order-title">Order your {kit.name.toLowerCase()}</h2>
            <dl>
              <div>
                <dt>Size</dt>
                <dd>{size && `${inches(size[0])} × ${inches(size[1])} × ${inches(size[2])} in`}</dd>
              </div>
              <div>
                <dt>Color</dt>
                <dd>
                  <i className="dot" style={{ background: color }} /> {COLORS.find((c) => c.value === color)?.label}
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
              <button className="primary" onClick={() => saveFile("stl")}>
                Save my 3D file
              </button>
              <button onClick={share}>Copy link</button>
              <button onClick={() => setPanel(null)}>Keep making</button>
            </div>
          </div>
        </div>
      )}
      {toast && <div className="mk-toast" role="status">{toast}</div>}
    </div>
  );
}

function Control({ op, value, onChange }) {
  const id = `op-${op.id}`;
  if (op.type === "slider") {
    const shown = op.unit === "mm" ? `${value} mm` : op.unit === "%" ? `${value}%` : value;
    return (
      <div className="mk-field">
        <label className="mk-label" htmlFor={id}>
          {op.label} <em>{shown}</em>
        </label>
        <div className="mk-slider">
          <button aria-label={`Less ${op.label.toLowerCase()}`} onClick={() => onChange(op.id, Math.max(op.min, +(value - op.step).toFixed(2)))}>
            −
          </button>
          <input
            id={id}
            type="range"
            min={op.min}
            max={op.max}
            step={op.step}
            value={value}
            style={{ "--pct": `${((value - op.min) / (op.max - op.min)) * 100}%` }}
            onPointerDown={() => onChange(op.id, value)}
            onChange={(e) => onChange(op.id, Number(e.target.value), { commit: false })}
          />
          <button aria-label={`More ${op.label.toLowerCase()}`} onClick={() => onChange(op.id, Math.min(op.max, +(value + op.step).toFixed(2)))}>
            +
          </button>
        </div>
        {op.hint && <p className="mk-hint">{op.hint}</p>}
      </div>
    );
  }
  if (op.type === "choice") {
    return (
      <div className="mk-field" role="radiogroup" aria-label={op.label}>
        <span className="mk-label">{op.label}</span>
        <div className="mk-choices">
          {op.choices.map((c) => (
            <button
              key={c.value}
              role="radio"
              aria-checked={value === c.value}
              className={`${value === c.value ? "on" : ""} ${op.id === "font" ? "font-" + c.value.replace(/\s+/g, "-").toLowerCase() : ""}`}
              onClick={() => onChange(op.id, c.value)}
            >
              {c.label}
            </button>
          ))}
        </div>
        {op.hint && <p className="mk-hint">{op.hint}</p>}
      </div>
    );
  }
  if (op.type === "toggle") {
    return (
      <div className="mk-field mk-toggle-row">
        <span className="mk-label">{op.label}</span>
        <button role="switch" aria-checked={!!value} className={`mk-switch ${value ? "on" : ""}`} onClick={() => onChange(op.id, !value)}>
          <span />
          {value ? "On" : "Off"}
        </button>
        {op.hint && <p className="mk-hint">{op.hint}</p>}
      </div>
    );
  }
  return (
    <div className="mk-field">
      <label className="mk-label" htmlFor={id}>
        {op.label} <em>{(value || "").length}/{op.max}</em>
      </label>
      <input
        id={id}
        className="mk-text"
        value={value}
        maxLength={op.max}
        onFocus={() => onChange(op.id, value)}
        onChange={(e) => onChange(op.id, e.target.value, { commit: false })}
        placeholder="Type here"
        autoComplete="off"
      />
    </div>
  );
}
