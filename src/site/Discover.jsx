import { useEffect, useState } from "react";
import { Header, Footer } from "./Chrome.jsx";
import { SearchBox, TopicChips, ModelGrid, ModelModal, SourcePicker, useExplore, useSourcesOff } from "./Gallery.jsx";
import { TOPICS } from "../gallery.js";
import { STORES, FLAGS, LICENSES, storeLink, rememberTrip } from "../stores.js";
import "./site.css";

export default function Discover() {
  const start = new URLSearchParams(window.location.search).get("q") || "";
  const [q, setQ] = useState(start);
  const [term, setTerm] = useState(start);
  const [topic, setTopic] = useState(TOPICS[0]);
  const [open, setOpen] = useState(null);
  const [printOnly, setPrintOnly] = useState(true);
  const [off, setOff] = useSourcesOff();
  const explore = useExplore(term, term ? null : topic, { printOnly, off });

  useEffect(() => {
    window.history.replaceState(null, "", term ? `/discover?q=${encodeURIComponent(term)}` : "/discover");
  }, [term]);

  const label = term || (topic.id === "all" ? "" : topic.label);
  const others = STORES.filter((s) => !explore.all.includes(s.id));

  return (
    <div className="site">
      <Header active="/discover" search={false} />

      <section className="gallery-head">
        <h1>Explore</h1>
        <SearchBox big value={q} onChange={setQ} onSubmit={(v) => setTerm(v.trim())} />
        <div className="gallery-bar">
          <TopicChips
            topic={term ? { id: "" } : topic}
            onPick={(t) => {
              setTopic(t);
              setTerm("");
              setQ("");
            }}
          />
        </div>
        <SourcePicker all={explore.all} off={off} onChange={setOff} />
        <label className="print-only">
          <input type="checkbox" checked={printOnly} onChange={(e) => setPrintOnly(e.target.checked)} />
          Made for 3D printing only{" "}
          <small>Turn off to see every downloadable Sketchfab model (many more, but some need cleanup to print).</small>
        </label>
      </section>

      <section className="gallery">
        <ModelGrid
          ours={explore.ours}
          live={explore.live}
          state={explore.sources.length ? explore.state : "idle"}
          more={explore.more}
          onOpen={setOpen}
          empty="Nothing here yet. Try another word, or search the stores below."
        />
      </section>

      <section className="elsewhere">
        <div className="elsewhere-head">
          <h2 className="sec-title">{label ? `“${label}” in other stores` : "More stores"}</h2>
          <p>
            These stores don't let other sites show their models, so these open in a new tab. Download the file, then drop it in the
            remixer.
          </p>
        </div>
        <div className="store-row">
          {others.map((s) => {
            const f = FLAGS[s.flag];
            return (
              <a
                key={s.id}
                className="store"
                href={storeLink(s, label)}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => rememberTrip(s.id, label)}
              >
                <i style={{ background: s.hue }}>{s.name[0]}</i>
                <span>
                  <strong>{s.name}</strong>
                  <small>{s.good}</small>
                </span>
                <em className={`lchip ${f.tone}`} title={f.note}>
                  {f.label}
                </em>
              </a>
            );
          })}
        </div>
        <div className="upload-cta">
          <a className="btn primary big" href="/upload">
            Upload
          </a>
          <p>Already have a model?</p>
        </div>
      </section>

      <section className="licenses">
        <details>
          <summary>
            <h2>Licenses, in plain words</h2>
            <span>Every model shows one. Here's what they mean for you, and for us printing it.</span>
          </summary>
          <div className="lic-grid">
            {LICENSES.filter((l) => l.id !== "unknown").map((l) => (
              <div key={l.id} className={`lic ${l.tone}`}>
                <strong>{l.tag}</strong>
                <span>{l.name}</span>
                <p>{l.ok}</p>
              </div>
            ))}
          </div>
          <p className="fine">A quick guide, not legal advice. The license on the model's own page is the one that counts.</p>
        </details>
      </section>
      <ModelModal item={open} onClose={() => setOpen(null)} />
      <Footer />
    </div>
  );
}
