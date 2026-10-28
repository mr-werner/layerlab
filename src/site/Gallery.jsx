// The model gallery: LayerLab's own models and live Sketchfab models in one
// grid, with a viewer that opens right on the page.
import { useEffect, useMemo, useRef, useState } from "react";
import { embedSrc } from "../sketchfab.js";
import { liveSources, searchSource, SOURCE_INFO } from "../sources.js";
import { siteConfig, sketchfabToken, signInSketchfab } from "../sketchfabAuth.js";
import { ourMatches, TOPICS } from "../gallery.js";
import { LICENSE_BY_ID, rememberTrip } from "../stores.js";

// Our items first, then live results from every source; "more" loads the
// next page from each source that has one.
export function useExplore(q, topic) {
  const [bySource, setBySource] = useState({}); // id -> { items, next, state }
  const [sources, setSources] = useState(["sketchfab", "smithsonian"]);
  const query = (q || topic?.q || "").trim();
  useEffect(() => {
    let alive = true;
    liveSources().then((s) => alive && setSources(s));
    return () => {
      alive = false;
    };
  }, []);
  useEffect(() => {
    const ctl = new AbortController();
    setBySource(Object.fromEntries(sources.map((id) => [id, { items: [], next: null, state: "loading" }])));
    for (const id of sources) {
      searchSource(id, query, { signal: ctl.signal })
        .then((r) => setBySource((b) => ({ ...b, [id]: { items: r.items, next: r.next, state: "idle" } })))
        .catch((e) => e.name !== "AbortError" && setBySource((b) => ({ ...b, [id]: { items: [], next: null, state: "error" } })));
    }
    return () => ctl.abort();
  }, [query, sources]);
  const ours = useMemo(() => ourMatches(q, topic), [q, topic]);
  const more = async (only) => {
    const ids = sources.filter((id) => bySource[id]?.next && (!only || only === id));
    for (const id of ids) {
      setBySource((b) => ({ ...b, [id]: { ...b[id], state: "loading" } }));
      searchSource(id, query, { next: bySource[id].next })
        .then((r) => setBySource((b) => ({ ...b, [id]: { items: [...b[id].items, ...r.items], next: r.next, state: "idle" } })))
        .catch(() => setBySource((b) => ({ ...b, [id]: { ...b[id], next: null, state: "idle" } })));
    }
  };
  // Take turns between sources so one store doesn't fill the whole page.
  const pick = (only) => {
    const lists = sources.filter((id) => !only || only === id).map((id) => bySource[id]?.items || []);
    const out = [];
    for (let i = 0; lists.some((l) => i < l.length); i++) for (const l of lists) if (i < l.length) out.push(l[i]);
    return out;
  };
  const states = sources.map((id) => bySource[id]?.state);
  const state = states.every((x) => x === "error") ? "error" : states.includes("loading") ? "loading" : "idle";
  const hasMore = sources.some((id) => bySource[id]?.next);
  return { ours, live: pick(), pick, sources, bySource, more: hasMore ? more : null, state };
}

export function SearchBox({ value, onChange, onSubmit, big, placeholder = "Search dragons, planters, phone stands…" }) {
  return (
    <form
      className={`searchbox ${big ? "big" : ""}`}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(value);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label="Search models" />
      <button className="btn primary">Search</button>
    </form>
  );
}

export function TopicChips({ topic, onPick }) {
  return (
    <div className="topics" role="tablist">
      {TOPICS.map((t) => (
        <button key={t.id} role="tab" aria-selected={topic.id === t.id} className={topic.id === t.id ? "on" : ""} onClick={() => onPick(t)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function LicenseChip({ id }) {
  const l = LICENSE_BY_ID[id] || LICENSE_BY_ID.unknown;
  return (
    <span className={`lchip ${l.tone}`} title={l.ok}>
      {l.tag === "?" ? "License?" : l.tag}
    </span>
  );
}

export function ModelCard({ item, onOpen }) {
  const ours = item.source === "layerlab";
  const inner = (
    <>
      <div className="mcard-img">
        {item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="noimg" />}
        <span className={`src ${item.source}`}>{SOURCE_INFO[item.source]?.name || item.source}</span>
        {ours ? <span className="lchip good">Customize</span> : <LicenseChip id={item.license} />}
      </div>
      <div className="mcard-body">
        <strong>{item.title}</strong>
        <small>{ours ? item.by : `by ${item.by}`}</small>
      </div>
    </>
  );
  // Our own models go straight to the maker; live ones open the viewer.
  return ours ? (
    <a className="mcard ours" href={item.href} style={{ "--tint": item.tint }}>
      {inner}
    </a>
  ) : (
    <button className="mcard live" onClick={() => onOpen(item)}>
      {inner}
    </button>
  );
}

// Mixes our models in with the live ones (one of ours, then two live).
function mix(ours, live) {
  const out = [];
  let i = 0;
  let j = 0;
  while (i < ours.length || j < live.length) {
    if (i < ours.length) out.push(ours[i++]);
    for (let k = 0; k < 2 && j < live.length; k++) out.push(live[j++]);
  }
  return out;
}

export function ModelGrid({ ours, live, state, more, onOpen, empty }) {
  const items = mix(ours, live);
  return (
    <>
      <div className="mgrid">
        {items.map((i) => (
          <ModelCard key={i.id} item={i} onOpen={onOpen} />
        ))}
        {state === "loading" && Array.from({ length: items.length ? 4 : 12 }, (_, i) => <div key={`sk${i}`} className="mcard skeleton" />)}
      </div>
      {state === "error" && <p className="grid-note">Couldn't reach the other stores right now. Our own models still work.</p>}
      {state === "idle" && !items.length && <p className="grid-note">{empty || "Nothing found. Try another word."}</p>}
      {more && state !== "loading" && (
        <div className="grid-more">
          <button className="btn" onClick={() => more()}>
            Show more
          </button>
        </div>
      )}
    </>
  );
}

// The viewer: Sketchfab's own 3D player for live models, a picture and a
// "customize" button for ours.
export function ModelModal({ item, onClose }) {
  const ref = useRef(null);
  useEffect(() => {
    if (!item) return;
    const esc = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    ref.current?.focus();
    return () => window.removeEventListener("keydown", esc);
  }, [item, onClose]);
  const [cfg, setCfg] = useState({});
  useEffect(() => {
    siteConfig().then(setCfg);
  }, []);
  if (!item) return null;
  const ours = item.source === "layerlab";
  const info = SOURCE_INFO[item.source] || { name: item.source };
  const credit = { license: item.license, designer: item.by, link: item.url, title: item.title };
  const direct = item.source === "smithsonian" && !!item.download;
  const sfReady = item.source === "sketchfab" && !!cfg.sketchfabClientId;
  const openHere = () => {
    rememberTrip(item.source, "", credit);
    if (direct) window.location.href = `/upload?si=${encodeURIComponent(item.download)}`;
    else if (sketchfabToken()) window.location.href = `/upload?sf=${encodeURIComponent(item.uid)}`;
    else signInSketchfab(cfg.sketchfabClientId, `/upload?sf=${encodeURIComponent(item.uid)}`);
  };
  const lic = LICENSE_BY_ID[item.license] || LICENSE_BY_ID.unknown;
  return (
    <div
      className="mmodal"
      role="dialog"
      aria-modal="true"
      aria-label={item.title}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="mmodal-card" tabIndex={-1} ref={ref}>
        <button className="mmodal-x" onClick={onClose} aria-label="Close">
          ×
        </button>
        <div className="mmodal-view">
          {ours ? (
            <div className="mmodal-pic" style={{ "--tint": item.tint }}>
              <img src={item.image} alt="" />
            </div>
          ) : item.embedUrl ? (
            <iframe
              title={item.title}
              src={item.source === "sketchfab" ? embedSrc(item) : item.embedUrl}
              allow="autoplay; fullscreen; xr-spatial-tracking"
              allowFullScreen
            />
          ) : (
            <div className="mmodal-pic">
              <img src={item.image} alt="" />
            </div>
          )}
        </div>
        <div className="mmodal-info">
          <span className={`src ${item.source}`}>{ours ? "LayerLab original" : `From ${info.name}`}</span>
          <h2>{item.title}</h2>
          <p className="by">
            {ours ? (
              item.blurb || "Made in the LayerLab maker. Every part can be changed."
            ) : (
              <>
                by{" "}
                <a href={item.byUrl} target="_blank" rel="noopener noreferrer">
                  {item.by}
                </a>
              </>
            )}
          </p>
          {ours ? (
            <>
              <a className="btn primary big" href={item.href}>
                Customize it
              </a>
              <p className="fine">Change the shape, the colors of each part and the name, then order the print.</p>
            </>
          ) : (
            <>
              <div className={`lic-box ${lic.tone}`}>
                <strong>
                  {lic.tag} · {item.licenseLabel}
                </strong>
                <span>{lic.ok}</span>
              </div>
              {direct || sfReady ? (
                <div className="open-here">
                  <button className="btn primary big" onClick={openHere}>
                    Open it in LayerLab
                  </button>
                  <span>
                    {direct
                      ? "Free to use. It loads right into the builder to resize, recolor and print."
                      : sketchfabToken()
                        ? "Loads right into the builder from your Sketchfab account."
                        : "You'll sign in with Sketchfab once (free account), then it loads right into the builder."}
                  </span>
                  <a className="linkish" href={item.url} target="_blank" rel="noopener noreferrer">
                    View on {info.name} ↗
                  </a>
                </div>
              ) : (
                <ol className="steps">
                  <li>
                    <a
                      className="btn primary"
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => rememberTrip(item.source, "", credit)}
                    >
                      Download on {info.name} ↗
                    </a>
                    <span>Free account needed. Pick the .stl, .3mf or .glb file if offered.</span>
                  </li>
                  <li>
                    <a className="btn" href="/upload">
                      Upload
                    </a>
                    <span>
                      Already have it? Upload the file to resize it, recolor it and add a name stand. We fill in the license for you.
                    </span>
                  </li>
                </ol>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
