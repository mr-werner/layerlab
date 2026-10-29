import { Header, Footer } from "./Chrome.jsx";
import { APP_GROUPS } from "../apps.js";
import "./site.css";

// Free apps for bigger changes than LayerLab's own tools make, and how to
// bring the result back.
export default function Apps() {
  return (
    <div className="site">
      <Header active="/apps" />
      <section className="gallery-head">
        <h1>Free apps for editing models</h1>
        <p className="lede">
          LayerLab's makers handle sizes, colors, names and quick remixes. For bigger changes, these free apps are the ones people use most.
          When you're done, save an .stl or .3mf and upload it here to print.
        </p>
        <div className="apps-steps">
          <span>
            <b>1</b> Download a model, or save yours from LayerLab
          </span>
          <span>
            <b>2</b> Change it in one of these apps
          </span>
          <span>
            <b>3</b> Save as .stl or .3mf and{" "}
            <a href="/upload" className="linkish">
              upload it
            </a>
          </span>
        </div>
      </section>
      {APP_GROUPS.map((g) => (
        <section key={g.id} className="apps-group">
          <h2 className="sec-title">{g.name}</h2>
          <p className="apps-note">{g.note}</p>
          <div className="apps-grid">
            {g.apps.map((a) => (
              <a key={a.name} className="app-card" href={a.url} target="_blank" rel="noopener noreferrer">
                <div className="app-top">
                  <i style={{ background: a.hue }}>{a.name[0]}</i>
                  <span>
                    <strong>{a.name}</strong>
                    <small>by {a.by}</small>
                  </span>
                  <em className={`lchip ${a.level === "Beginner" ? "good" : a.level === "Intermediate" ? "warn" : "bad"}`}>{a.level}</em>
                </div>
                <p>{a.good}</p>
                <dl>
                  <dt>Cost</dt>
                  <dd>{a.cost}</dd>
                  <dt>Runs on</dt>
                  <dd>{a.runs}</dd>
                </dl>
              </a>
            ))}
          </div>
        </section>
      ))}
      <section className="apps-group">
        <p className="fine">
          LayerLab isn't connected with these companies. Check each app's own site for its current license. Changing someone else's model?
          Its license still applies to your version.
        </p>
      </section>
      <Footer />
    </div>
  );
}
