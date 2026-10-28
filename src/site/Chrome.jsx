import { useState } from "react";
import { SITE } from "../config.js";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/make", label: "Make your own" },
  { href: "/community", label: "Community" },
  { href: "/studio", label: "Studio" },
];

export function Logo({ size = 34 }) {
  // Three stacked print layers: the "layer" in LayerLab.
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo-mark">
      <rect x="1" y="1" width="38" height="38" rx="12" fill="var(--grape)" />
      <rect x="9" y="25" width="22" height="6" rx="3" fill="#fff8ef" />
      <rect x="11" y="17" width="18" height="6" rx="3" fill="var(--sun)" />
      <rect x="14" y="9" width="12" height="6" rx="3" fill="var(--tangerine)" />
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
        <span />
      </button>
      <nav className={open ? "open" : ""}>
        {NAV.map((n) => (
          <a key={n.href} href={n.href} className={active === n.href ? "on" : ""}>
            {n.label}
          </a>
        ))}
      </nav>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="site-foot">
      <div className="foot-brand">
        <a className="brand" href="/">
          <Logo size={30} />
          <span>{SITE.name}</span>
        </a>
        <p>{SITE.tagline}</p>
      </div>
      <nav>
        <a href="/shop">Shop</a>
        <a href="/make">Make your own</a>
        <a href="/community">Community</a>
        <a href="/studio">Studio (advanced)</a>
      </nav>
      <p className="foot-note">
        Prices on this site are estimates while the shop is being set up. A {SITE.parent} project.
      </p>
    </footer>
  );
}
