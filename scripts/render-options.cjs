// Renders the pictures on the maker's choice tiles into public/opts/<kit>/
// and lists them in src/optionArt.json. Run `npm run build && npx vite
// preview --port 4173` first, then: node scripts/render-options.cjs [kit]
const { chromium } = require("playwright");
const path = require("path");
const fs = require("fs");
const { execFileSync } = require("child_process");
const base = process.env.BASE || "http://localhost:4173";
const only = process.argv[2];

(async () => {
  const { KITS, defaultValues } = await import(path.resolve(__dirname, "../src/kits.js"));
  const { FIGURE_ART } = await import(path.resolve(__dirname, "../src/figure.js"));
  const manifestPath = path.resolve(__dirname, "../src/optionArt.json");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const tmp = fs.mkdtempSync(path.join(require("os").tmpdir(), "opts-"));
  const browser = await chromium.launch({ args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
  const page = await browser.newPage({ viewport: { width: 384, height: 384 }, deviceScaleFactor: 1 });
  page.on("pageerror", (e) => console.log("page error", e.message));
  for (const kit of KITS) {
    if (only && only !== kit.id) continue;
    const art = kit.id === "figure" ? FIGURE_ART : {};
    const out = path.resolve(__dirname, `../public/opts/${kit.id}`);
    fs.mkdirSync(out, { recursive: true });
    for (const op of kit.options) {
      if (op.type !== "choice" || op.id === "font") continue;
      const a = art[op.id] || {};
      for (const c of op.choices) {
        const v = { ...defaultValues(kit), ...(a.set || {}), [op.id]: c.value };
        const q = new URLSearchParams({ kit: kit.id, v: JSON.stringify(v), shot: "1" });
        if (a.angle) q.set("angle", a.angle);
        if (a.focus) q.set("focus", a.focus.join(","));
        if (a.min) q.set("min", a.min);
        if (a.hl) q.set("hl", a.hl.join(","));
        await page.goto(`${base}/make?${q}`);
        try {
          await page.waitForSelector("#shot-ready", { state: "attached", timeout: 90000 });
        } catch {
          console.log("skip", kit.id, op.id, c.value);
          continue;
        }
        await page.waitForTimeout(250);
        const png = path.join(tmp, "o.png");
        await page.locator(".shot").screenshot({ path: png, omitBackground: true });
        execFileSync("python3", ["-c", "import sys;from PIL import Image;im=Image.open(sys.argv[1]);im.resize((192,192),Image.LANCZOS).save(sys.argv[2],'WEBP',quality=82)", png, path.join(out, `${op.id}-${c.value}.webp`)]);
        manifest[`${kit.id}/${op.id}/${c.value}`] = 1;
        console.log("opt", kit.id, op.id, c.value);
      }
    }
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 0) + "\n");
  await browser.close();
})();
