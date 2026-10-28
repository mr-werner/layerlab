// Shop items. Every item is a maker kit with its options already picked, so
// "Make it yours" opens the same item in the maker, ready to change.
export const CATEGORIES = [
  { id: "novelty", name: "Novelty", blurb: "Fun stuff for desks, shelves and game night." },
  { id: "seasonal", name: "Seasonal", blurb: "Holidays and seasons, all year round." },
  { id: "personal", name: "Personal", blurb: "Names, rooms and gifts made for one person." },
];

export const SEASONS = [
  { id: "halloween", name: "Halloween", months: [9, 10] },
  { id: "winter", name: "Winter holidays", months: [11, 12, 1] },
  { id: "valentines", name: "Valentine's Day", months: [1, 2] },
  { id: "spring", name: "Spring", months: [3, 4, 5] },
  { id: "anytime", name: "Any time", months: [] },
];

export const PRODUCTS = [
  { id: "jack-o-lantern", kit: "pumpkin", name: "Jack-o'-lantern", category: "seasonal", season: "halloween", blurb: "A spooky grin for the porch or the mantel.", values: { face: "spooky", ribs: 8, plump: 62 } },
  { id: "happy-pumpkin", kit: "pumpkin", name: "Happy pumpkin", category: "seasonal", season: "halloween", blurb: "Friendly enough for the little ones.", values: { face: "happy", ribs: 10, plump: 70, size: 70, stem: 9 }, color: "#f0742b" },
  { id: "boo-sign", kit: "nameplate", name: "Boo! door sign", category: "seasonal", season: "halloween", blurb: "Hang it on the front door for trick-or-treaters.", values: { text: "BOO!", font: "Fredoka", letters: 26, decor: "stars" }, color: "#1b1c1e" },
  { id: "pumpkin-bot", kit: "robot", name: "Pumpkin bot", category: "seasonal", season: "halloween", blurb: "A robot in its Halloween colors.", values: { head: "bubble", eyes: "cyclops", antenna: "none", badge: "star" }, color: "#f0742b" },
  { id: "snow-buddy", kit: "snowman", name: "Snow buddy", category: "seasonal", season: "winter", blurb: "Top hat, scarf and a carrot nose.", values: {}, color: "#e9e7e1" },
  { id: "beanie-snowman", kit: "snowman", name: "Beanie snowman", category: "seasonal", season: "winter", blurb: "Bundled up for the cold.", values: { hat: "beanie", chub: 115, buttons: 2 }, color: "#e9e7e1" },
  { id: "star-ornament", kit: "ornament", name: "Star ornament", category: "seasonal", season: "winter", blurb: "Add the year or a name.", values: { shape: "star", text: "2026" }, color: "#c9a033" },
  { id: "snowflake-ornament", kit: "ornament", name: "Snowflake", category: "seasonal", season: "winter", blurb: "Hang it in a window.", values: { shape: "snowflake", text: "" }, color: "#2f5fb3" },
  { id: "tree-ornament", kit: "ornament", name: "Tree ornament", category: "seasonal", season: "winter", blurb: "A little tree for the big tree.", values: { shape: "tree", text: "NOEL", letters: 7 }, color: "#2f8f5b" },
  { id: "valentine-heart", kit: "ornament", name: "Valentine heart", category: "seasonal", season: "valentines", blurb: "Put a name in the middle.", values: { shape: "heart", text: "XOXO", letters: 11 }, color: "#c8362d" },
  { id: "heart-keychain", kit: "keychain", name: "Heart keychain", category: "seasonal", season: "valentines", blurb: "A sweet little gift.", values: { shape: "heart", text: "LOVE", letters: 9, size: 48 }, color: "#e86aa6" },
  { id: "spring-pot", kit: "planter", name: "Spring planter", category: "seasonal", season: "spring", blurb: "For a windowsill herb or succulent.", values: { style: "hex", size: 70, height: 65 }, color: "#2f8f5b" },
  { id: "robot-pal", kit: "robot", name: "Robot pal", category: "novelty", season: "anytime", blurb: "A desk buddy with a heart on its chest.", values: {}, color: "#8b8f94" },
  { id: "rover-bot", kit: "robot", name: "Rover bot", category: "novelty", season: "anytime", blurb: "Rolls on wheels, sees with a visor.", values: { feet: "wheels", eyes: "visor", head: "can", antenna: "two", badge: "dial" }, color: "#2f5fb3" },
  { id: "game-dice", kit: "dice", name: "Game night dice", category: "novelty", season: "anytime", blurb: "A pair of chunky dice.", values: {}, color: "#6c4bb4" },
  { id: "jumbo-die", kit: "dice", name: "Jumbo die", category: "novelty", season: "anytime", blurb: "One big squishy-round die.", values: { count: 1, size: 30, round: 26 }, color: "#f2c230" },
  { id: "name-keychain", kit: "keychain", name: "Name keychain", category: "personal", season: "anytime", blurb: "Their name, raised and easy to read.", values: {}, color: "#2f5fb3" },
  { id: "pet-tag", kit: "keychain", name: "Bone tag", category: "personal", season: "anytime", blurb: "For a pet's name or a dog-lover's keys.", values: { shape: "bone", text: "BISCUIT", letters: 9, size: 54 }, color: "#c8362d" },
  { id: "door-sign", kit: "nameplate", name: "Bedroom door sign", category: "personal", season: "anytime", blurb: "Hangs on a door hook or a ribbon.", values: {}, color: "#6c4bb4" },
  { id: "desk-sign", kit: "nameplate", name: "Desk name sign", category: "personal", season: "anytime", blurb: "Stands up on a desk or a shelf.", values: { style: "desk", text: "Jordan Lee", font: "Archivo Black", letters: 14, decor: "none", border: false }, color: "#1b1c1e" },
  { id: "plant-pot", kit: "planter", name: "Plant pot and saucer", category: "personal", season: "anytime", blurb: "A tapered pot with its own saucer.", values: {}, color: "#e9e7e1" },
];

export const PRODUCT_BY_ID = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

// The season to feature right now, by month (1 to 12).
export function currentSeason(date = new Date()) {
  const m = date.getMonth() + 1;
  return SEASONS.find((s) => s.months.includes(m)) || SEASONS.find((s) => s.id === "spring");
}
