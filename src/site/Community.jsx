import { Header, Footer } from "./Chrome.jsx";
import { SITE } from "../config.js";
import "./site.css";

// License levels shown on each site card.
const FLAGS = {
  varies: { label: "License varies by model", tone: "warn", note: "Many free models here are for personal use only (non-commercial). Check each model's license." },
  cc0: { label: "Lots of public domain", tone: "good", note: "Much of the collection is CC0, which means anyone can print and change it. Check each model's page." },
  nasa: { label: "Free to use, with rules", tone: "good", note: "NASA models are generally free to use, but you can't use NASA logos or suggest NASA endorses you." },
};

const SITES = [
  { name: "Printables", url: "https://www.printables.com/", by: "Prusa Research", flag: "varies", about: "A huge, friendly library with lots of toys, holiday decorations and household helpers." },
  { name: "Thingiverse", url: "https://www.thingiverse.com/", by: "UltiMaker", flag: "varies", about: "One of the oldest model sites, with millions of designs to search." },
  { name: "MakerWorld", url: "https://makerworld.com/", by: "Bambu Lab", flag: "varies", about: "Lots of new, well-tested models, many with print settings included." },
  { name: "Thangs", url: "https://thangs.com/", by: "Thangs", flag: "varies", about: "A search engine that looks across many model sites at once." },
  { name: "Cults", url: "https://cults3d.com/", by: "Cults", flag: "varies", about: "Free and paid models. Paid ones sometimes include a license to sell prints." },
  { name: "MyMiniFactory", url: "https://www.myminifactory.com/", by: "MyMiniFactory", flag: "varies", about: "Great for figures, tabletop game pieces and collectibles." },
  { name: "Smithsonian 3D", url: "https://3d.si.edu/", by: "Smithsonian Institution", flag: "cc0", about: "Dinosaur fossils, famous objects and artifacts scanned from the museums." },
  { name: "NASA 3D Resources", url: "https://science.nasa.gov/3d-resources/", by: "NASA", flag: "nasa", about: "Rockets, rovers, spacecraft and planets, straight from NASA." },
];

const LICENSES = [
  { tag: "CC0", name: "Public domain", ok: "Print it, change it, and we can print it for you.", tone: "good" },
  { tag: "CC BY", name: "Attribution", ok: "Print it and change it. Keep the designer's name with it.", tone: "good" },
  { tag: "CC BY-SA", name: "Share alike", ok: "Like CC BY, and anything you change shares the same license.", tone: "good" },
  { tag: "NC", name: "Non-commercial", ok: "Fine to print at home. We check with you before printing it as an order.", tone: "warn" },
  { tag: "ND", name: "No changes", ok: "Print it as it is. Don't change it in the Studio.", tone: "warn" },
  { tag: "©", name: "All rights reserved or site license", ok: "Personal download only. Ask the designer first.", tone: "bad" },
];

export default function Community() {
  return (
    <div className="site">
      <Header active="/community" />
      <section className="page-head">
        <h1>Community</h1>
        <p>
          There are millions of free 3D models out there. Find one you love, download it, then open it in the {SITE.name} Studio to add a
          name, change the size or combine it with something else.
        </p>
      </section>

      <section className="steps-strip" aria-label="How to bring a model in">
        <div>
          <span className="num">1</span>
          <h3>Find a model</h3>
          <p>Search one of the sites below. Check its license first.</p>
        </div>
        <div>
          <span className="num">2</span>
          <h3>Download the file</h3>
          <p>Pick the .stl, .3mf or .step file. Those all open here.</p>
        </div>
        <div>
          <span className="num">3</span>
          <h3>Open the Studio</h3>
          <p>Press Import, choose your file, and make it yours.</p>
        </div>
        <a className="btn primary" href="/studio">
          Open the Studio
        </a>
      </section>

      <section className="sites">
        <h2 className="sec-title">Where to find models</h2>
        <p className="grown">Grown-ups: these sites are run by other companies. Some need a free account to download, and accounts usually require age 13 or older.</p>
        <div className="site-grid">
          {SITES.map((s) => {
            const f = FLAGS[s.flag];
            return (
              <a key={s.name} className="site-card" href={s.url} target="_blank" rel="noopener noreferrer">
                <div className="sc-top">
                  <h3>{s.name}</h3>
                  <span className={`flag ${f.tone}`}>{f.label}</span>
                </div>
                <p>{s.about}</p>
                <p className="sc-note">{f.note}</p>
                <span className="sc-by">
                  By {s.by} · {new URL(s.url).hostname.replace(/^www\./, "")} ↗
                </span>
              </a>
            );
          })}
        </div>
      </section>

      <section className="licenses">
        <h2 className="sec-title">Reading a license</h2>
        <p>Every model page shows a license. Here's what the common ones mean for you.</p>
        <div className="lic-grid">
          {LICENSES.map((l) => (
            <div key={l.tag} className={`lic ${l.tone}`}>
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
