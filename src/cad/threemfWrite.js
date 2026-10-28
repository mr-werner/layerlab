// Minimal .3mf writer for multi-color prints: one part per color, joined
// as components of a single object so slicers load it as one model.
import { zipSync, strToU8 } from "fflate";

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>`;
const RELS = `<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Target="/3D/3dmodel.model" Id="rel0" Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>`;

const esc = (t) => String(t).replace(/[<>&"]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;" })[c]);

// parts: [{ name, color: "#rrggbb", vertices: Float32Array (xyz), triangles: Uint32Array }]
export function writeThreeMF(parts, title = "LayerLab model") {
  const out = [];
  out.push(`<?xml version="1.0" encoding="UTF-8"?>
<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">
<metadata name="Title">${esc(title)}</metadata>
<metadata name="Application">LayerLab</metadata>
<resources>
<basematerials id="1">${parts.map((p) => `<base name="${esc(p.name)}" displaycolor="${p.color.toUpperCase()}FF"/>`).join("")}</basematerials>`);
  parts.forEach((p, i) => {
    const v = p.vertices;
    const t = p.triangles;
    const verts = [];
    for (let k = 0; k < v.length; k += 3) verts.push(`<vertex x="${v[k].toFixed(4)}" y="${v[k + 1].toFixed(4)}" z="${v[k + 2].toFixed(4)}"/>`);
    const tris = [];
    for (let k = 0; k < t.length; k += 3) tris.push(`<triangle v1="${t[k]}" v2="${t[k + 1]}" v3="${t[k + 2]}"/>`);
    out.push(`<object id="${i + 2}" name="${esc(p.name)}" type="model" pid="1" pindex="${i}"><mesh><vertices>${verts.join("")}</vertices><triangles>${tris.join("")}</triangles></mesh></object>`);
  });
  const whole = parts.length + 2;
  out.push(`<object id="${whole}" name="${esc(title)}" type="model"><components>${parts.map((_, i) => `<component objectid="${i + 2}"/>`).join("")}</components></object>
</resources>
<build><item objectid="${whole}"/></build>
</model>`);
  return zipSync({
    "[Content_Types].xml": strToU8(CONTENT_TYPES),
    "_rels/.rels": strToU8(RELS),
    "3D/3dmodel.model": strToU8(out.join("\n")),
  });
}
