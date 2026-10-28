import { useState } from "react";
import { Header, Footer } from "./Chrome.jsx";
import { CATEGORIES, PRODUCTS, SEASONS, currentSeason } from "../catalog.js";
import { FIGURE, FIGURE_LOOKS } from "../figure.js";
import { STORES, AISLES, FLAGS } from "../stores.js";
import { SITE } from "../config.js";
import "./site.css";

// Every choice multiplied together, before sliders and names.
const LOOKS = FIGURE.options.reduce((n, o) => n * (o.type === "choice" ? o.choices.length : o.type === "toggle" ? 2 : 1), 1);
const looksText = LOOKS >= 1e9 ? `${Math.floor(LOOKS / 1e9)} billion` : `${Math.floor(LOOKS / 1e6)} million`;
const figureChoices = FIGURE.options.filter((o) => o.type === "choice").reduce((n, o) => n + o.choices.length, 0);

const lookUrl = (f) => `/make?kit=figure&v=${encodeURIComponent(JSON.stringify(f.values))}&c=${f.color.slice(1)}`;

export default function Landing() {
  const season = currentSeason();
  const seasonal = PRODUCTS.filter((p) => p.season === season.id).slice(0, 4);
  const [q, setQ] = useState("");
  return (
    <div className="site">
      <Header active="/" />

      <section className="hero">
        <div className="hero-copy">
          <a className="pill" href="/make?kit=figure">
            <b>New</b> The figure builder is here →
          </a>
          <h1>
            Discover it.
            <br />
            Customize it.
            <br />
            <span className="hl">Print it.</span>
          </h1>
          <p className="lede">
            Shop models from the best 3D sites or start from ours. Change the color, the size and the details until it's yours, and we
            print it.
          </p>
          <form className="hero-search" action="/discover" role="search">
            <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search 8 model sites at once…" aria-label="Search model sites" />
            <button className="btn primary">Search</button>
          </form>
          <p className="hero-note">
            Try{" "}
            {["dragon", "phone stand", "planter"].map((t, i) => (
              <span key={t}>
                {i ? ", " : ""}
                <a href={`/discover?q=${encodeURIComponent(t)}`}>{t}</a>
              </span>
            ))}
          </p>
        </div>

        <div className="hero-art" aria-hidden="true">
          <div className="ha-card">
            <img src="/shots/fig-mochi.png" alt="" />
            <div className="ha-tags">
              <span>Ears · Cat</span>
              <span>Holding · Coffee</span>
              <span>Back · Backpack</span>
            </div>
          </div>
          <div className="ha-panel">
            <div className="ha-row">
              <span>Head size</span>
              <i>
                <b style={{ left: "62%" }} />
              </i>
            </div>
            <div className="ha-row">
              <span>Legs</span>
              <i>
                <b style={{ left: "38%" }} />
              </i>
            </div>
            <div className="ha-swatches">
              {["#e86aa6", "#6c4bb4", "#1fa39a", "#f2c230", "#1b1c1e"].map((c) => (
                <em key={c} style={{ background: c }} />
              ))}
            </div>
          </div>
          <img className="ha-float" src="/shots/fig-unit-7.png" alt="" />
        </div>
      </section>

      <section className="pillars">
        <a href="/discover" className="pillar p-discover">
          <span className="p-num">01</span>
          <h2>Discover</h2>
          <p>One search across Printables, MakerWorld, Thingiverse and more. Every store shows its license up front.</p>
          <span className="p-go">Open the mall →</span>
        </a>
        <a href="/make" className="pillar p-custom">
          <span className="p-num">02</span>
          <h2>Customize</h2>
          <p>Drop in a file you found, or start from one of ours. Recolor it, resize it, add a stand with a name.</p>
          <span className="p-go">Start customizing →</span>
        </a>
        <a href="/shop" className="pillar p-print">
          <span className="p-num">03</span>
          <h2>Print</h2>
          <p>See the real size and a price as you go. Order the print, or save the file for your own printer.</p>
          <span className="p-go">Shop ready-mades →</span>
        </a>
      </section>

      <section className="fig-feature">
        <div className="ff-copy">
          <p className="eyebrow">Figure builder</p>
          <h2 className="sec-title">Make a character. Then hold it.</h2>
          <p>
            Head, face, hair, outfit, gear, pose, stand. {figureChoices} choices and a stack of sliders, like the character screen in your
            favorite game. That's over {looksText} looks before you even type a name.
          </p>
          <a className="btn lime big" href="/make?kit=figure">
            Build yours
          </a>
        </div>
        <div className="ff-looks">
          {FIGURE_LOOKS.map((f) => (
            <a key={f.id} href={lookUrl(f)} className="ff-look">
              <img src={`/shots/fig-${f.id}.png`} alt="" loading="lazy" />
              <span>{f.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="mall-teaser">
        <div className="mt-head">
          <p className="eyebrow">The model mall</p>
          <h2 className="sec-title">Millions of models. One place to tweak them.</h2>
          <p>
            Browse the aisles, jump to any store, then bring the file back to {SITE.name} to make it yours. Licenses are flagged on every
            store so you know what's okay to print.
          </p>
        </div>
        <div className="aisles">
          {AISLES.slice(0, 8).map((a) => (
            <a key={a.q} className={`aisle t-${a.tone}`} href={`/discover?q=${encodeURIComponent(a.q)}`}>
              <small>{a.tag}</small>
              <strong>{a.name}</strong>
            </a>
          ))}
        </div>
        <div className="store-strip">
          {STORES.map((s) => (
            <a key={s.id} href="/discover#stores" className="store-chip">
              <i style={{ background: s.hue }}>{s.name[0]}</i>
              {s.name}
              <span className={`flag ${FLAGS[s.flag].tone}`}>{FLAGS[s.flag].label}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="season">
        <div className="season-head">
          <div>
            <p className="eyebrow">In season</p>
            <h2 className="sec-title">{season.name}</h2>
          </div>
          <a className="more" href={`/shop?season=${season.id}`}>
            See all →
          </a>
        </div>
        <div className="grid">
          {seasonal.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
        <div className="chips">
          {CATEGORIES.map((c) => (
            <a key={c.id} href={`/shop?cat=${c.id}`} className="chip">
              {c.name}
            </a>
          ))}
          {SEASONS.filter((s) => s.id !== season.id && s.id !== "anytime").map((s) => (
            <a key={s.id} href={`/shop?season=${s.id}`} className="chip">
              {s.name}
            </a>
          ))}
        </div>
      </section>

      <section className="pro-band">
        <div>
          <h2>Need exact measurements?</h2>
          <p>
            The Studio is a full 3D editor: measure, align, mirror, round edges, sketch and extrude, and combine imported STL, 3MF or STEP
            files. Anything you make here opens there in one click.
          </p>
        </div>
        <a className="btn" href="/studio">
          Open the Studio
        </a>
      </section>

      <Footer />
    </div>
  );
}

export function ProductCard({ p }) {
  return (
    <a className="card" href={`/make?p=${p.id}`}>
      <div className="card-img" style={{ "--tint": p.color || "#f0742b" }}>
        <img src={`/shots/${p.id}.png`} alt="" loading="lazy" />
      </div>
      <div className="card-body">
        <h3>{p.name}</h3>
        <p>{p.blurb}</p>
        <span className="card-cta">Customize →</span>
      </div>
    </a>
  );
}
