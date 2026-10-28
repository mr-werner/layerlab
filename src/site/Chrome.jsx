import { useState } from "react";
import { SITE } from "../config.js";

const NAV = [
  { href: "/discover", label: "Discover" },
  { href: "/make", label: "Customize" },
  { href: "/shop", label: "Shop" },
  { href: "/studio", label: "Studio" },
];

export function Logo({ size = 32 }) {
  // Three stacked print layers: the "layer" in LayerLab.
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo-mark">
      <rect x="0" y="0" width="40" height="40" rx="11" fill="#16141c" />
      <rect x="8" y="25" width="24" height="6" rx="3" fill="#ffffff" />
      <rect x="10" y="17" width="20" height="6" rx="3" fill="#d4f84a" />
      <rect x="13" y="9" width="14" height="6" rx="3" fill="#7a66ff" />
    </svg>
  );
}

export function Header({ active }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-top">
      <a className="brand" href="/" aria-label={`${SITE.name} home`}>
        <Logo />
        <span>{SITE.name}</span>
      </a>
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
        <a href="/discover">Discover</a>
        <a href="/remix">Remix a file</a>
        <a href="/make">Customize</a>
        <a href="/shop">Shop</a>
        <a href="/studio">Studio</a>
      </nav>
      <p className="foot-note">
        Prices are estimates while the shop is being set up. Models from other sites belong to their designers; we link to them and show
        their licenses. A {SITE.parent} project.
      </p>
    </footer>
  );
}
