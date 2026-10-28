import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/baloo-2/700.css";
import "@fontsource/baloo-2/800.css";
import "@fontsource/fredoka/400.css";
import "@fontsource/fredoka/500.css";
import "@fontsource/fredoka/600.css";
import "./base.css";
import Landing from "./site/Landing.jsx";
import Shop from "./site/Shop.jsx";
import Community from "./site/Community.jsx";

// The maker and the studio load the 3D engine, so they only load on their own pages.
const Maker = lazy(() => import("./maker/Maker.jsx"));
const Studio = lazy(() => import("./studio.jsx"));

const path = window.location.pathname.replace(/\/+$/, "") || "/";

const PAGES = {
  "/": Landing,
  "/shop": Shop,
  "/community": Community,
  "/make": Maker,
  "/studio": Studio,
  "/build": Studio,
};
const Page = PAGES[path] || Landing;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Suspense fallback={<div className="page-loading">Opening the workshop…</div>}>
      <Page />
    </Suspense>
  </StrictMode>
);
