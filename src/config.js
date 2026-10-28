export const SITE = {
  name: "LayerLab",
  tagline: "Discover it. Customize it. Print it.",
  parent: "Blueprint WebStudio",
};

// Placeholder settings for the test version. Change these once the real printer,
// pricing and ordering are decided (see .notes/open-items.md in the project folder).
export const BUILD_VOLUME = { x: 256, y: 256, z: 256, label: "Bambu Lab P1/X1 size (placeholder)" };

// Same formula as the Express 3D chime designer: bounding-box volume in cubic inches.
export const PRICING = { base: 16.16, multiplier: 1.185, exponent: 0.5753 };

export const MIN_FEATURE_MM = 1.2;

// Filament-style colors, in palette order. The first twelve are the
// originals (old share links use them). To match the printer later, remove
// the ones that aren't stocked.
export const COLORS = [
  { label: "Black", value: "#1b1c1e" },
  { label: "White", value: "#e9e7e1" },
  { label: "Gray", value: "#8b8f94" },
  { label: "Red", value: "#c8362d" },
  { label: "Orange", value: "#f0742b" },
  { label: "Yellow", value: "#f2c230" },
  { label: "Green", value: "#2f8f5b" },
  { label: "Blue", value: "#2f5fb3" },
  { label: "Purple", value: "#6c4bb4" },
  { label: "Pink", value: "#e86aa6" },
  { label: "Teal", value: "#1fa39a" },
  { label: "Gold", value: "#c9a033" },
  { label: "Charcoal", value: "#3d3f44" },
  { label: "Silver", value: "#b9bcc0" },
  { label: "Ivory", value: "#f3ead3" },
  { label: "Maroon", value: "#7d1f2a" },
  { label: "Coral", value: "#ff7a6b" },
  { label: "Peach", value: "#f9a77a" },
  { label: "Lemon", value: "#f6e45a" },
  { label: "Lime", value: "#8fd14f" },
  { label: "Mint", value: "#9fe3c1" },
  { label: "Forest", value: "#1f4d34" },
  { label: "Olive", value: "#6f7a35" },
  { label: "Cyan", value: "#3fb9e0" },
  { label: "Sky", value: "#9cc9f0" },
  { label: "Navy", value: "#1f2f5c" },
  { label: "Lavender", value: "#b9a5e6" },
  { label: "Grape", value: "#4a2c7a" },
  { label: "Magenta", value: "#d63c8f" },
  { label: "Blush", value: "#f6b8c9" },
  { label: "Tan", value: "#c9a77c" },
  { label: "Brown", value: "#6b4a32" },
  { label: "Terracotta", value: "#b85b3a" },
  { label: "Bronze", value: "#8c6a3f" },
];

export const FONTS = [
  { family: "Archivo Black", file: "/fonts/archivo-black.woff" },
  { family: "Space Mono", file: "/fonts/space-mono-bold.woff" },
  { family: "Courgette", file: "/fonts/courgette.woff" },
  { family: "Fredoka", file: "/fonts/fredoka-bold.woff" },
];

export function estimatePrice(sizeMm) {
  if (!sizeMm) return 0;
  const cubicIn = (sizeMm[0] / 25.4) * (sizeMm[1] / 25.4) * (sizeMm[2] / 25.4);
  return PRICING.base + PRICING.multiplier * Math.pow(cubicIn, PRICING.exponent);
}
