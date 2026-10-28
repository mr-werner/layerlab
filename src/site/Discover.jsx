import { useEffect, useRef, useState } from "react";
import { Header, Footer } from "./Chrome.jsx";
import { STORES, AISLES, FLAGS, LICENSES, storeLink, rememberTrip } from "../stores.js";
import { SITE } from "../config.js";
import "./site.css";

export default function Discover() {
  const start = new URLSearchParams(window.location.search).get("q") || "";
  const [q, setQ] = useState(start);
  const [term, setTerm] = useState(start);
  const results = useRef(null);

  useEffect(() => {
    window.history.replaceState(null, "", term ? `/discover?q=${encodeURIComponent(term)}` : "/discover");
  }, [term]);

  const go = (t) => {
    setQ(t);
    setTerm(t.trim());
    setTimeout(() => results.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 30);
  };

  return (
    <div className="site">
      <Header active="/discover" />

      <section className="mall-hero">
        <p className="eyebrow">The model mall</p>
        <h1>Find it anywhere. Finish it here.</h1>
        <p className="lede">
          Search the big 3D model sites in one go. Download the file you like, drop it into {SITE.name}, and change its color and size or
          add a name stand before we print it.
        </p>
        <form
          className="mall-search"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            go(q);
          }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Try “articulated dragon” or “headphone stand”" aria-label="What are you looking for?" />
          <button className="btn primary">Search all stores</button>
        </form>
        <div className="aisles compact">
          {AISLES.map((a) => (
            <button key={a.q} className={`aisle t-${a.tone} ${term === a.q ? "on" : ""}`} onClick={() => go(a.q)}>
              <small>{a.tag}</small>
              <strong>{a.name}</strong>
            </button>
          ))}
        </div>
      </section>

      <section className="results" ref={results} id="stores">
        <div className="results-head">
          <h2 className="sec-title">{term ? `“${term}” in every store` : "Stores in the mall"}</h2>
          <a className="btn dark" href="/remix">
            Got a file? Remix it →
          </a>
        </div>
        <div className="store-grid">
          {STORES.map((s) => {
            const f = FLAGS[s.flag];
            const href = storeLink(s, term);
            return (
              <a key={s.id} className="store" href={href} target="_blank" rel="noopener noreferrer" onClick={() => rememberTrip(s.id, term)}>
                <div className="store-top">
                  <i style={{ background: s.hue }}>{s.name[0]}</i>
                  <div>
                    <h3>{s.name}</h3>
                    <small>by {s.by}</small>
                  </div>
                </div>
                <p>{s.good}</p>
                <div className={`lic-flag ${f.tone}`}>
                  <strong>{f.label}</strong>
                  <span>{f.note}</span>
                </div>
                <span className="store-go">
                  {term && s.search ? `See “${term}” on ${s.name}` : `Browse ${s.name}`} ↗
                </span>
              </a>
            );
          })}
        </div>
        <p className="fine">
          These stores are run by other companies. Some need a free account to download, and accounts usually require age 13 or older.
        </p>
      </section>

      <section className="bring-home">
        <div className="bh-steps">
          <div>
            <span className="p-num">01</span>
            <h3>Pick a model</h3>
            <p>Open it on the store's page and check the license.</p>
          </div>
          <div>
            <span className="p-num">02</span>
            <h3>Download the file</h3>
            <p>Grab the .stl or .3mf (or .step). One part works best.</p>
          </div>
          <div>
            <span className="p-num">03</span>
            <h3>Drop it here</h3>
            <p>Recolor, resize, turn it, add a name stand. Then order it.</p>
          </div>
        </div>
        <a className="btn lime big" href="/remix">
          Open the remixer
        </a>
      </section>

      <section className="licenses">
        <h2 className="sec-title">Licenses, in plain words</h2>
        <p>Every model page lists a license. Here's what the common ones mean for you, and for us printing it.</p>
        <div className="lic-grid">
          {LICENSES.filter((l) => l.id !== "unknown").map((l) => (
            <div key={l.id} className={`lic ${l.tone}`}>
              <strong>{l.tag}</strong>
              <span>{l.name}</span>
              <p>{l.ok}</p>
            </div>
          ))}
        </div>
        <p className="fine">This is a quick guide, not legal advice. The license on the model's own page is the one that counts.</p>
      </section>
      <Footer />
    </div>
  );
}
