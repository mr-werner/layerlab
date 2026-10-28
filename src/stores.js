// The model mall: other sites where people share 3D models, how to search
// each one, and what their licenses usually allow. LayerLab links out to
// these sites; it doesn't copy their models.

// License level shown on every store.
export const FLAGS = {
  varies: {
    label: "License varies",
    tone: "warn",
    note: "Each model has its own license. Many free ones are personal use only.",
  },
  cc0: {
    label: "Lots of public domain",
    tone: "good",
    note: "Much of it is CC0: free to print, change and sell. Still check each model.",
  },
  nasa: {
    label: "Free, with rules",
    tone: "good",
    note: "Free to use. Don't use NASA logos or suggest NASA endorses you.",
  },
  paid: {
    label: "Free and paid",
    tone: "warn",
    note: "Paid models often include a license to sell prints. Free ones vary.",
  },
};

// `search` builds a link to the store's own search page. Stores without one
// open their browse page instead.
export const STORES = [
  {
    id: "printables",
    name: "Printables",
    by: "Prusa Research",
    url: "https://www.printables.com/",
    search: (q) => `https://www.printables.com/search/models?q=${encodeURIComponent(q)}`,
    flag: "varies",
    good: "Toys, holiday decor, home helpers",
    hue: "#ff7a45",
  },
  {
    id: "makerworld",
    name: "MakerWorld",
    by: "Bambu Lab",
    url: "https://makerworld.com/",
    search: (q) => `https://makerworld.com/en/search/models?keyword=${encodeURIComponent(q)}`,
    flag: "varies",
    good: "New, well-tested models with print settings",
    hue: "#21b36b",
  },
  {
    id: "thingiverse",
    name: "Thingiverse",
    by: "UltiMaker",
    url: "https://www.thingiverse.com/",
    search: (q) => `https://www.thingiverse.com/search?q=${encodeURIComponent(q)}&type=things`,
    flag: "varies",
    good: "The biggest back catalog, millions of designs",
    hue: "#2a7fff",
  },
  {
    id: "thangs",
    name: "Thangs",
    by: "Thangs",
    url: "https://thangs.com/",
    search: (q) => `https://thangs.com/search/${encodeURIComponent(q)}?scope=all`,
    flag: "varies",
    good: "Searches across lots of sites at once",
    hue: "#7a5cff",
  },
  {
    id: "cults",
    name: "Cults",
    by: "Cults",
    url: "https://cults3d.com/",
    search: (q) => `https://cults3d.com/en/search?q=${encodeURIComponent(q)}`,
    flag: "paid",
    good: "Designer models, cosplay, decor",
    hue: "#e8457c",
  },
  {
    id: "myminifactory",
    name: "MyMiniFactory",
    by: "MyMiniFactory",
    url: "https://www.myminifactory.com/",
    search: (q) => `https://www.myminifactory.com/search?query=${encodeURIComponent(q)}`,
    flag: "paid",
    good: "Figures, minis and collectibles",
    hue: "#f2a516",
  },
  {
    id: "smithsonian",
    name: "Smithsonian 3D",
    by: "Smithsonian Institution",
    url: "https://3d.si.edu/explore",
    flag: "cc0",
    good: "Fossils, artifacts and famous objects",
    hue: "#3c4a5c",
  },
  {
    id: "nasa",
    name: "NASA 3D",
    by: "NASA",
    url: "https://science.nasa.gov/3d-resources/",
    flag: "nasa",
    good: "Rockets, rovers, planets",
    hue: "#1b3f8f",
  },
];

export const STORE_BY_ID = Object.fromEntries(STORES.map((s) => [s.id, s]));

export const storeLink = (store, q) => (q && store.search ? store.search(q) : store.url);

// Aisles: ready-made searches that fill the search box.
export const AISLES = [
  { q: "articulated dragon", name: "Flexi dragons", tag: "Fidget", tone: "lilac" },
  { q: "fidget toy", name: "Fidgets", tag: "Desk", tone: "lime" },
  { q: "desk organizer", name: "Desk setup", tag: "Home", tone: "sky" },
  { q: "phone stand", name: "Phone stands", tag: "Desk", tone: "peach" },
  { q: "planter", name: "Planters", tag: "Home", tone: "mint" },
  { q: "dinosaur", name: "Dinosaurs", tag: "Kids", tone: "lime" },
  { q: "rocket", name: "Space", tag: "Kids", tone: "sky" },
  { q: "halloween", name: "Halloween", tag: "Seasonal", tone: "peach" },
  { q: "christmas ornament", name: "Ornaments", tag: "Seasonal", tone: "mint" },
  { q: "keychain", name: "Keychains", tag: "Gifts", tone: "lilac" },
  { q: "cosplay prop", name: "Cosplay", tag: "Props", tone: "peach" },
  { q: "miniature", name: "Tabletop minis", tag: "Games", tone: "sky" },
];

// The common licenses, in plain words, and what each means for ordering a print.
export const LICENSES = [
  { id: "cc0", tag: "CC0", name: "Public domain", ok: "Change it however you like, and we can print it for you.", tone: "good", canEdit: true, canOrder: true },
  { id: "by", tag: "CC BY", name: "Attribution", ok: "Change it and print it. Keep the designer's name with it.", tone: "good", canEdit: true, canOrder: true },
  { id: "by-sa", tag: "CC BY-SA", name: "Share alike", ok: "Like CC BY, and your changed version shares the same license.", tone: "good", canEdit: true, canOrder: true },
  { id: "nc", tag: "NC", name: "Non-commercial", ok: "Fine to change and print at home. We check with you before printing it as an order.", tone: "warn", canEdit: true, canOrder: false },
  { id: "nd", tag: "ND", name: "No derivatives", ok: "Print it as it is. Size and color are usually fine. Don't add a stand or reshape it.", tone: "warn", canEdit: false, canOrder: true },
  { id: "store", tag: "Store", name: "Site or store license", ok: "Read the license on the model's page. Paid models often include print rights.", tone: "warn", canEdit: true, canOrder: false },
  { id: "unknown", tag: "?", name: "Not sure", ok: "Fine for a look around. We'll ask about the license before printing an order.", tone: "bad", canEdit: true, canOrder: false },
];

export const LICENSE_BY_ID = Object.fromEntries(LICENSES.map((l) => [l.id, l]));

// Remembers which store someone went to, so the remix page can ask about
// that store's license when they come back with a file.
const TRIP_KEY = "layerlab:trip:v1";
export function rememberTrip(storeId, q) {
  try {
    sessionStorage.setItem(TRIP_KEY, JSON.stringify({ store: storeId, q, at: Date.now() }));
  } catch {
    /* storage can be blocked; the remix page then just asks */
  }
}
export function lastTrip() {
  try {
    return JSON.parse(sessionStorage.getItem(TRIP_KEY) || "null");
  } catch {
    return null;
  }
}
