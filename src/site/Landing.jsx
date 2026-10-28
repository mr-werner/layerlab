import { useEffect, useState } from "react";
import { Header, Footer } from "./Chrome.jsx";
import { SearchBox, TopicChips, ModelGrid, ModelModal, useExplore } from "./Gallery.jsx";
import { FIGURE, FIGURE_LOOKS, lookUrl } from "../figure.js";
import { TOPICS } from "../gallery.js";
import "./site.css";

const figureChoices = FIGURE.options.filter((o) => o.type === "choice").reduce((n, o) => n + o.choices.length, 0);

export default function Landing() {
  const [q, setQ] = useState("");
  const [term, setTerm] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [open, setOpen] = useState(null);
  // Results follow what's typed, after a short pause.
  useEffect(() => {
    const t = setTimeout(() => setTerm(q.trim()), 350);
    return () => clearTimeout(t);
  }, [q]);
  const explore = useExplore(term, term ? null : topic);
  return (
    <div className="site">
      <Header active="/" search={false} />

      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <h1>
          Discover it. Customize it. <span className="grad">Print it.</span>
        </h1>
        <p className="lede">Find a model from across the web or build your own character, make it yours, and we print it.</p>
        <SearchBox big value={q} onChange={setQ} onSubmit={(v) => setTerm(v.trim())} />
        <div className="hero-upload">
          <span>or upload your own model to print</span>
          <a className="btn" href="/upload">
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
          </a>
        </div>
      </section>

      <section className="explore">
        <div className="explore-head">
          <h2 className="sec-title">{term ? `Results for “${term}”` : "Explore"}</h2>
          <a className="more" href={term ? `/discover?q=${encodeURIComponent(term)}` : "/discover"}>
            Open the full gallery →
          </a>
        </div>
        {!term && <TopicChips topic={topic} onPick={setTopic} />}
        <ModelGrid
          ours={explore.ours}
          live={explore.live.slice(0, 16)}
          state={explore.state}
          onOpen={setOpen}
          empty="Nothing found. Try another word, or upload your own model."
        />
      </section>

      <section className="creator">
        <div className="creator-copy">
          <p className="eyebrow">Figure builder</p>
          <h2 className="sec-title">Make a character like you would in a game.</h2>
          <p>
            Head, face, hair, outfit, gear, pose and stand. {figureChoices} picks with pictures, sliders for every size, and a color for
            each part. Then hold it in your hand.
          </p>
          <a className="btn primary big" href="/make?kit=figure">
            Start building
          </a>
        </div>
        <div className="creator-looks">
          {FIGURE_LOOKS.map((f) => (
            <a key={f.id} href={lookUrl(f)} className="look">
              <img src={`/shots/fig-${f.id}.png`} alt="" loading="lazy" />
              <span>{f.name}</span>
            </a>
          ))}
        </div>
      </section>

      <section className="flow">
        <a href="/discover" className="flow-step">
          <span>01</span>
          <h3>Discover</h3>
          <p>Search our models and thousands from Sketchfab in one gallery. Spin them in 3D right here.</p>
        </a>
        <a href="/upload" className="flow-step">
          <span>02</span>
          <h3>Customize</h3>
          <p>Resize, turn, recolor each part and add a name stand. Works on our models and files you bring.</p>
        </a>
        <a href="/shop" className="flow-step">
          <span>03</span>
          <h3>Print</h3>
          <p>See the real size and a price as you go, then order it or save the file for your own printer.</p>
        </a>
      </section>

      <ModelModal item={open} onClose={() => setOpen(null)} />
      <Footer />
    </div>
  );
}
