// Renders the product and kit pictures in public/shots from the maker itself.
// Run `npm run build && npx vite preview --port 4173` first, then: node scripts/render-shots.cjs
const { chromium } = require("playwright");
const path = require("path");
const base = process.env.BASE || "http://localhost:4173";
const only = process.argv[2];

(async () => {
  const { PRODUCTS } = await import(path.resolve(__dirname, "../src/catalog.js"));
  const { KITS } = await import(path.resolve(__dirname, "../src/kits.js"));
  const { FIGURE_LOOKS } = await import(path.resolve(__dirname, "../src/figure.js"));
  const jobs = [
    ...PRODUCTS.map((p) => ({ name: p.id, url: `/make?p=${p.id}&shot=1` })),
    ...KITS.map((k) => ({ name: `kit-${k.id}`, url: `/make?kit=${k.id}&shot=1` })),
    ...FIGURE_LOOKS.map((f) => ({
      name: `fig-${f.id}`,
      url: `/make?kit=figure&v=${encodeURIComponent(JSON.stringify(f.values))}&c=${f.color.slice(1)}&shot=1`,
    })),
  ].filter((j) => !only || j.name.includes(only));
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 640, height: 640 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.log("page error", e.message));
  for (const j of jobs) {
    await page.goto(base + j.url);
    await page.waitForSelector("#shot-ready", { state: "attached", timeout: 120000 });
    await page.waitForTimeout(400);
    await page.locator(".shot").screenshot({ path: path.resolve(__dirname, `../public/shots/${j.name}.png`), omitBackground: true });
    console.log("shot", j.name);
  }
  await browser.close();
})();
