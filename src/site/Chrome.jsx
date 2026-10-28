import { useState } from "react";
import { SITE } from "../config.js";

const NAV = [
  { href: "/shop", label: "Shop" },
  { href: "/make", label: "Make your own" },
  { href: "/community", label: "Community" },
  { href: "/studio", label: "Studio" },
];

export function Logo({ size = 34 }) {
  // A little anvil with a spark: the "forge" in the name.
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" className="logo-mark">
      <rect x="1" y="1" width="38" height="38" rx="12" fill="var(--grape)" />
      <path d="M9 15h18c2.5 0 4.5-1.5 5-3.5l1 0c0 4-2.8 7.5-7 8.3V23h-3l2 6H15l2-6h-3v-4H9z" fill="#fff8ef" />
      <path d="M30 5l1.2 3 3 1.2-3 1.2L30 13.4l-1.2-3-3-1.2 3-1.2z" fill="var(--sun)" />
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
