import { useEffect, useState } from "react";
import { Header, Footer } from "./Chrome.jsx";
import { ProductCard } from "./Landing.jsx";
import { CATEGORIES, PRODUCTS, SEASONS } from "../catalog.js";
import "./site.css";

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

  const list = PRODUCTS.filter((p) => (cat === "all" || p.category === cat) && (season === "all" || p.season === season));

  return (
    <div className="site">
      <Header active="/shop" />
      <section className="page-head">
        <h1>The shop</h1>
        <p>Every item here is a starting point. Tap one to change its size, words, face or color before you order.</p>
      </section>

      <section className="filters" aria-label="Filter the shop">
        <div className="filter-row">
          <span>Kind</span>
          <button className={`chip ${cat === "all" ? "on" : ""}`} onClick={() => setCat("all")}>
            Everything
          </button>
          {CATEGORIES.map((c) => (
            <button key={c.id} className={`chip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>
              {c.name}
            </button>
          ))}
        </div>
        <div className="filter-row">
          <span>Season</span>
          <button className={`chip ${season === "all" ? "on" : ""}`} onClick={() => setSeason("all")}>
            All year
          </button>
          {SEASONS.map((s) => (
            <button key={s.id} className={`chip ${season === s.id ? "on" : ""}`} onClick={() => setSeason(s.id)}>
              {s.name}
            </button>
          ))}
        </div>
      </section>

      <section className="shop-grid">
        {list.length ? (
          <div className="grid">
            {list.map((p) => (
              <ProductCard key={p.id} p={p} />
            ))}
          </div>
        ) : (
          <p className="empty">
            Nothing here yet. <button className="linkish" onClick={() => (setCat("all"), setSeason("all"))}>Show everything</button> or{" "}
            <a href="/make">make your own</a>.
          </p>
        )}
      </section>

      <section className="make-own">
        <h2>Don't see it? Make it.</h2>
        <p>The maker has robots, pumpkins, snow buddies, ornaments, keychains, signs, dice and plant pots, each with lots of choices.</p>
        <a className="btn primary" href="/make">
          Open the maker
        </a>
      </section>
      <Footer />
    </div>
  );
}
