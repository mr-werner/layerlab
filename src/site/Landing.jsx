import { useState } from "react";
import { Header, Footer } from "./Chrome.jsx";
import { SearchBox, TopicChips, ModelGrid, ModelModal, useExplore } from "./Gallery.jsx";
import { FIGURE, FIGURE_LOOKS, lookUrl } from "../figure.js";
import { TOPICS } from "../gallery.js";
import "./site.css";

const HERO_SHOTS = ["/shots/jack-o-lantern.png", "/shots/fig-mochi.png", "/shots/robot-pal.png", "/shots/fig-merlin.png", "/shots/game-dice.png", "/shots/fig-sparkle.png", "/shots/star-ornament.png"];
const figureChoices = FIGURE.options.filter((o) => o.type === "choice").reduce((n, o) => n + o.choices.length, 0);

export default function Landing() {
  const [q, setQ] = useState("");
  const [topic, setTopic] = useState(TOPICS[0]);
  const [open, setOpen] = useState(null);
  const explore = useExplore("", topic);
  return (
    <div className="site">
      <Header active="/" search={false} />

      <section className="hero">
        <div className="hero-glow" aria-hidden="true" />
        <a className="pill" href="/make?kit=figure">
          <b>New</b> Paint every part of your figure →
        </a>
        <h1>
          Discover it. Customize it. <span className="grad">Print it.</span>
        </h1>
        <p className="lede">Find a model from across the web or build your own character, make it yours, and we print it.</p>
        <SearchBox big value={q} onChange={setQ} onSubmit={(v) => (window.location.href = `/discover?q=${encodeURIComponent(v)}`)} />
        <div className="hero-row" aria-hidden="true">
          {HERO_SHOTS.map((src, i) => (
            <img key={src} src={src} alt="" style={{ "--i": i }} />
          ))}
        </div>
      </section>

      <section className="creator">
        <div className="creator-copy">
          <p className="eyebrow">Figure builder</p>
          <h2 className="sec-title">Make a character like you would in a game.</h2>
          <p>
            Head, face, hair, outfit, gear, pose and stand. {figureChoices} picks with pictures, sliders for every size, and a color for each
            part. Then hold it in your hand.
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

      <section className="explore">
        <div className="explore-head">
          <h2 className="sec-title">Explore</h2>
          <a className="more" href="/discover">
            Open the full gallery →
          </a>
        </div>
        <TopicChips topic={topic} onPick={setTopic} />
        <ModelGrid ours={explore.ours} live={explore.live.slice(0, 16)} state={explore.state} onOpen={setOpen} />
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
