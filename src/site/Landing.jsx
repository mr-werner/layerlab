import { Header, Footer } from "./Chrome.jsx";
import { CATEGORIES, PRODUCTS, SEASONS, currentSeason } from "../catalog.js";
import { KITS } from "../kits.js";
import { SITE } from "../config.js";
import "./site.css";

const CAT_PICKS = { novelty: "robot-pal", seasonal: "jack-o-lantern", personal: "name-keychain" };

export default function Landing() {
  const season = currentSeason();
  const seasonal = PRODUCTS.filter((p) => p.season === season.id).slice(0, 4);
  return (
    <div className="site">
      <Header active="/" />

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">{SITE.tagline}</p>
          <h1>
            Dream it up. <span className="hl">Slide it, spin it,</span> make it yours.
          </h1>
          <p className="lede">
            Pick a robot, a pumpkin, a keychain or a sign, then change it like you're making a video game character. Bigger head? Spookier
            face? Your name in bubbly letters? Go for it. When it looks right, we print it.
          </p>
          <div className="hero-ctas">
            <a className="btn big primary" href="/make">
              Start making
            </a>
            <a className="btn big" href="/shop">
              Browse the shop
            </a>
          </div>
          <p className="hero-note">Free to try. No account needed. Easy enough for kids, deep enough for grown-ups.</p>
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="hero-blob" />
          <img className="ha ha-1" src="/shots/robot-pal.png" alt="" />
          <img className="ha ha-2" src="/shots/jack-o-lantern.png" alt="" />
          <img className="ha ha-3" src="/shots/name-keychain.png" alt="" />
          <img className="ha ha-4" src="/shots/star-ornament.png" alt="" />
          <div className="hero-slider">
            <span>Head</span>
            <i>
              <b />
            </i>
            <span className="tag">Bubble</span>
          </div>
        </div>
      </section>

      <section className="cats">
        {CATEGORIES.map((c) => (
          <a key={c.id} className={`cat cat-${c.id}`} href={`/shop?cat=${c.id}`}>
            <img src={`/shots/${CAT_PICKS[c.id]}.png`} alt="" loading="lazy" />
            <div>
              <h2>{c.name}</h2>
              <p>{c.blurb}</p>
              <span className="arrow">Shop {c.name.toLowerCase()} →</span>
            </div>
          </a>
        ))}
      </section>

      <section className="how">
        <h2 className="sec-title">Make your own in three steps</h2>
        <ol>
          <li>
            <span className="num">1</span>
            <h3>Pick a base</h3>
            <p>Start from one of {KITS.length} ready-made bases: robots, pumpkins, snow buddies, keychains, signs, dice and more.</p>
          </li>
          <li>
            <span className="num">2</span>
            <h3>Slide and tap</h3>
            <p>Big sliders and buttons change the shape, the face, the words and the color. Hit "Surprise me" for something random.</p>
          </li>
          <li>
            <span className="num">3</span>
            <h3>Get it printed</h3>
            <p>See the size and an estimate right away. Order the print, or save the 3D file to keep.</p>
          </li>
        </ol>
        <a className="btn primary" href="/make">
          Open the maker
        </a>
      </section>

      <section className="season">
        <div className="season-head">
          <p className="eyebrow">In season now</p>
          <h2 className="sec-title">{season.name}</h2>
          <a href={`/shop?season=${season.id}`}>See everything for {season.name} →</a>
        </div>
        <div className="grid">
          {seasonal.map((p) => (
            <ProductCard key={p.id} p={p} />
          ))}
        </div>
        <div className="season-chips">
          {SEASONS.filter((s) => s.id !== season.id && s.id !== "anytime").map((s) => (
            <a key={s.id} href={`/shop?season=${s.id}`} className="chip">
              {s.name}
            </a>
          ))}
        </div>
      </section>

      <section className="community-teaser">
        <div>
          <p className="eyebrow">Community</p>
          <h2 className="sec-title">Millions of models, one click from our Studio</h2>
          <p>
            Found something great on Printables, Thingiverse or MakerWorld? Download it, bring it into the {SITE.name} Studio, add your
            name or change the size, and we'll print it. We show the license for every site so you know what's okay to print.
          </p>
          <a className="btn" href="/community">
            Visit the community page
          </a>
        </div>
        <ul className="ct-sites" aria-hidden="true">
          <li>Printables</li>
          <li>Thingiverse</li>
          <li>MakerWorld</li>
          <li>Thangs</li>
          <li>Smithsonian 3D</li>
          <li>NASA 3D</li>
        </ul>
      </section>

      <section className="grownups">
        <div>
          <h2>For grown-ups</h2>
          <p>
            Need exact sizes, holes, sketches or your own files? The Studio is a full 3D editor with real CAD tools: measure, align, mirror,
            round edges, sketch and extrude, and import STL, 3MF or STEP files. Anything made in the maker opens there with one click.
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
        <span className="card-cta">Make it yours →</span>
      </div>
    </a>
  );
}
