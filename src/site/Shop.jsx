import { useEffect, useState } from "react";
import { Header, Footer } from "./Chrome.jsx";
import { ModelCard } from "./Gallery.jsx";
import { CATEGORIES, PRODUCTS, SEASONS } from "../catalog.js";
import { OUR_ITEMS } from "../gallery.js";
import "./site.css";

const ITEMS = OUR_ITEMS.filter((i) => i.kind !== "figure");
const BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

export default function Shop() {
  const q = new URLSearchParams(window.location.search);
  const [cat, setCat] = useState(CATEGORIES.some((c) => c.id === q.get("cat")) ? q.get("cat") : "all");
  const [season, setSeason] = useState(SEASONS.some((s) => s.id === q.get("season")) ? q.get("season") : "all");

  useEffect(() => {
    const p = new URLSearchParams();
    if (cat !== "all") p.set("cat", cat);
    if (season !== "all") p.set("season", season);
    window.history.replaceState(null, "", `/shop${p.toString() ? "?" + p : ""}`);
  }, [cat, season]);

  const list = ITEMS.filter((i) => (cat === "all" || BY_ID[i.id].category === cat) && (season === "all" || BY_ID[i.id].season === season));

  return (
    <div className="site">
      <Header active="/shop" />
      <section className="gallery-head">
        <h1>Shop</h1>
        <p className="lede">Ready-made LayerLab models. Every one opens in the maker so you can change its shape, words and colors first.</p>
        <div className="gallery-bar">
          <div className="topics">
            <button className={cat === "all" ? "on" : ""} onClick={() => setCat("all")}>
              Everything
            </button>
            {CATEGORIES.map((c) => (
              <button key={c.id} className={cat === c.id ? "on" : ""} onClick={() => setCat(c.id)}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="seg">
            <button className={season === "all" ? "on" : ""} onClick={() => setSeason("all")}>
              All year
            </button>
            {SEASONS.filter((s) => s.id !== "anytime").map((s) => (
              <button key={s.id} className={season === s.id ? "on" : ""} onClick={() => setSeason(s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="gallery">
        {list.length ? (
          <div className="mgrid">
            {list.map((i) => (
              <ModelCard key={i.id} item={i} />
            ))}
          </div>
        ) : (
          <p className="grid-note">
            Nothing here yet.{" "}
            <button className="linkish" onClick={() => (setCat("all"), setSeason("all"))}>
              Show everything
            </button>
          </p>
        )}
      </section>

      <section className="cta-band">
        <h2>Don't see it?</h2>
        <p>Search thousands more models in the gallery, or build a character from scratch.</p>
        <div className="row-ctas">
          <a className="btn primary" href="/discover">
            Explore models
          </a>
          <a className="btn" href="/make?kit=figure">
            Build a figure
          </a>
        </div>
      </section>
      <Footer />
    </div>
  );
}
