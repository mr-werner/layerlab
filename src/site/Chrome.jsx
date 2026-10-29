import { useState } from "react";
import { SITE } from "../config.js";

const NAV = [
  { href: "/discover", label: "Explore" },
  { href: "/make", label: "Create" },
  { href: "/shop", label: "Shop" },
];

export function Logo({ size = 30 }) {
  // Three stacked print layers: the "layer" in LayerLab.
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo-mark">
      <rect x="0" y="0" width="40" height="40" rx="11" fill="#c6ff4a" />
      <rect x="8" y="25" width="24" height="6" rx="3" fill="#0b0b0f" />
      <rect x="10" y="17" width="20" height="6" rx="3" fill="#0b0b0f" opacity="0.7" />
      <rect x="13" y="9" width="14" height="6" rx="3" fill="#0b0b0f" opacity="0.4" />
    </svg>
  );
}

export function Header({ active, search = true }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  return (
    <header className="site-top">
      <a className="brand" href="/" aria-label={`${SITE.name} home`}>
        <Logo />
        <span>{SITE.name}</span>
      </a>
      {search && (
        <form className="top-search" action="/discover" role="search">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
            <path d="M16.5 16.5L21 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input name="q" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search models" aria-label="Search models" />
        </form>
      )}
      <button className="nav-toggle" aria-expanded={open} aria-label="Menu" onClick={() => setOpen(!open)}>
        <span />
        <span />
      </button>
      <nav className={open ? "open" : ""}>
        {NAV.map((n) => (
          <a key={n.href} href={n.href} className={active === n.href ? "on" : ""}>
            {n.label}
          </a>
        ))}
        <a className={`nav-upload ${active === "/upload" ? "on" : ""}`} href="/upload" title="Already have a model?">
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
        <a className="nav-cta" href="/make?kit=figure">
          Build a figure
        </a>
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="foot-brand">
        <a className="brand" href="/">
          <Logo size={28} />
          <span>{SITE.name}</span>
        </a>
        <p>{SITE.tagline}</p>
      </div>
      <nav>
        <a href="/discover">Explore</a>
        <a href="/make?kit=figure">Figure builder</a>
        <a href="/make">Create</a>
        <a href="/upload">Upload a model</a>
        <a href="/apps">Free editing apps</a>
        <a href="/shop">Shop</a>
        <a href="/studio">Studio</a>
      </nav>
      <p className="foot-note">
        Prices are estimates while the shop is being set up. Models from other sites belong to their designers; we show them with their
        licenses. A {SITE.parent} project.
      </p>
    </footer>
  );
}
