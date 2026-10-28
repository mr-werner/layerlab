import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "./base.css";
import Landing from "./site/Landing.jsx";
import Shop from "./site/Shop.jsx";
import Discover from "./site/Discover.jsx";
import { CALLBACK_PATH, finishSketchfabSignIn } from "./sketchfabAuth.js";

// The maker and the studio load the 3D engine, so they only load on their own pages.
const Maker = lazy(() => import("./maker/Maker.jsx"));
const Studio = lazy(() => import("./studio.jsx"));
const Remix = lazy(() => import("./maker/Remix.jsx"));

const path = window.location.pathname.replace(/\/+$/, "") || "/";

// Back from "Sign in with Sketchfab": keep the sign-in and carry on.
if (path === CALLBACK_PATH) {
  const done = finishSketchfabSignIn();
  if (done.error) {
    try {
      sessionStorage.setItem("layerlab:notice", done.error);
    } catch {
      /* the page just won't explain */
    }
  }
  window.location.replace(done.returnTo?.startsWith("/") ? done.returnTo : "/discover");
}

const PAGES = {
  "/": Landing,
  "/shop": Shop,
  "/discover": Discover,
  "/community": Discover,
  "/upload": Remix,
  "/remix": Remix,
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
  </StrictMode>,
);
