// The inputs shared by the maker and the remixer: sliders with − and +,
// picture tiles for choices, switches, text and the color pickers.
import { useState } from "react";
import { COLORS } from "../config.js";
import ART from "../optionArt.json";

const colorName = (v) => COLORS.find((c) => c.value === v)?.label || "Custom";

export function Swatches({ color, onPick, label = "Color" }) {
  return (
    <div className="mk-field">
      <span className="mk-label">
        {label} <em>{colorName(color)}</em>
      </span>
      <div className="mk-swatches">
        {COLORS.map((c) => (
          <button
            key={c.value}
            className={c.value === color ? "on" : ""}
            style={{ "--sw": c.value }}
            onClick={() => onPick(c.value)}
            aria-label={c.label}
            title={c.label}
          />
        ))}
      </div>
    </div>
  );
}

// One color per part: pick a part, then its color. "Everything" paints all.
export function RegionColors({ regions, colors, onChange, active, onActive, compact = false }) {
  const [own, setOwn] = useState(null);
  const valid = (id) => (id === "*" && !compact) || regions.some((r) => r.id === id);
  const current = valid(active) ? active : valid(own) ? own : regions[0].id;
  const setCurrent = onActive || setOwn;
  const paint = (region, value) =>
    onChange(region === "*" ? Object.fromEntries(regions.map((r) => [r.id, value])) : { ...colors, [region]: value });
  const used = new Set(Object.values(colors)).size;
  return (
    <div className={compact ? "mk-tabcolor" : "mk-allcolors"}>
      {regions.length > 1 && (
        <div className="mk-field">
          <span className="mk-label">
            Part <em>{used === 1 ? "1 color" : `${used} colors`}</em>
          </span>
          <div className="mk-regions">
            {regions.map((r) => (
              <button key={r.id} className={current === r.id ? "on" : ""} onClick={() => setCurrent(r.id)}>
                <i style={{ background: colors[r.id] }} />
                {r.label}
              </button>
            ))}
            {!compact && (
              <button className={current === "*" ? "on" : ""} onClick={() => setCurrent("*")}>
                <i className="all" />
                Everything
              </button>
            )}
          </div>
        </div>
      )}
      <Swatches
        label={
          current === "*" ? "Color for everything" : `${regions.find((r) => r.id === current)?.label || "Color"}${compact ? " color" : ""}`
        }
        color={current === "*" ? (used === 1 ? Object.values(colors)[0] : null) : colors[current]}
        onPick={(v) => paint(current, v)}
      />
      {!compact && (
        <p className="mk-hint">
          {used > 1
            ? `This prints in ${used} colors on a multi-color printer. "Save file" gives you a .3mf with every color.`
            : "Pick a part above to give it its own color."}
        </p>
      )}
    </div>
  );
}

export function Control({ op, value, onChange, kitId }) {
  const id = `op-${op.id}`;
  if (op.type === "slider") {
    const shown = op.unit === "mm" ? `${value} mm` : op.unit ? `${value}${op.unit}` : value;
    return (
      <div className="mk-field">
        <label className="mk-label" htmlFor={id}>
          {op.label} <em>{shown}</em>
        </label>
        <div className="mk-slider">
          <button
            aria-label={`Less ${op.label.toLowerCase()}`}
            onClick={() => onChange(op.id, Math.max(op.min, +(value - op.step).toFixed(2)))}
          >
            −
          </button>
          <input
            id={id}
            type="range"
            min={op.min}
            max={op.max}
            step={op.step}
            value={value}
            style={{
              "--pct": `${((value - op.min) / (op.max - op.min)) * 100}%`,
            }}
            onPointerDown={() => onChange(op.id, value)}
            onChange={(e) => onChange(op.id, Number(e.target.value), { commit: false })}
          />
          <button
            aria-label={`More ${op.label.toLowerCase()}`}
            onClick={() => onChange(op.id, Math.min(op.max, +(value + op.step).toFixed(2)))}
          >
            +
          </button>
        </div>
        {op.hint && <p className="mk-hint">{op.hint}</p>}
      </div>
    );
  }
  if (op.type === "choice") {
    const pics = op.choices.filter((c) => ART[`${kitId}/${op.id}/${c.value}`]).length === op.choices.length;
    return (
      <div className="mk-field" role="radiogroup" aria-label={op.label}>
        <span className="mk-label">
          {op.label} <em>{op.choices.find((c) => c.value === value)?.label}</em>
        </span>
        <div className={`mk-choices ${pics ? "pics" : ""}`}>
          {op.choices.map((c) => (
            <button
              key={c.value}
              role="radio"
              aria-checked={value === c.value}
              className={`${value === c.value ? "on" : ""} ${op.id === "font" ? "font-" + c.value.replace(/\s+/g, "-").toLowerCase() : ""}`}
              onClick={() => onChange(op.id, c.value)}
            >
              {pics && <img src={`/opts/${kitId}/${op.id}-${c.value}.webp`} alt="" loading="lazy" />}
              <span>{c.label}</span>
            </button>
          ))}
        </div>
        {op.hint && <p className="mk-hint">{op.hint}</p>}
      </div>
    );
  }
  if (op.type === "toggle") {
    return (
      <div className="mk-field mk-toggle-row">
        <span className="mk-label">{op.label}</span>
        <button role="switch" aria-checked={!!value} className={`mk-switch ${value ? "on" : ""}`} onClick={() => onChange(op.id, !value)}>
          <span />
          {value ? "On" : "Off"}
        </button>
        {op.hint && <p className="mk-hint">{op.hint}</p>}
      </div>
    );
  }
  return (
    <div className="mk-field">
      <label className="mk-label" htmlFor={id}>
        {op.label}{" "}
        <em>
          {(value || "").length}/{op.max}
        </em>
      </label>
      <input
        id={id}
        className="mk-text"
        value={value}
        maxLength={op.max}
        onFocus={() => onChange(op.id, value)}
        onChange={(e) => onChange(op.id, e.target.value, { commit: false })}
        placeholder="Type here"
        autoComplete="off"
      />
    </div>
  );
}
