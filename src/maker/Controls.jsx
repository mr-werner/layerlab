// The inputs shared by the maker and the remixer: sliders with − and +,
// choice tiles, switches, text and the color swatches.
import { COLORS } from "../config.js";

export function Swatches({ color, onPick }) {
  return (
    <div className="mk-field">
      <span className="mk-label">
        Color <em>{COLORS.find((c) => c.value === color)?.label}</em>
      </span>
      <div className="mk-swatches">
        {COLORS.map((c) => (
          <button key={c.value} className={c.value === color ? "on" : ""} style={{ "--sw": c.value }} onClick={() => onPick(c.value)} aria-label={c.label} title={c.label} />
        ))}
      </div>
      <p className="mk-hint">One filament color per print. Ask about two-color prints when you order.</p>
    </div>
  );
}

export function Control({ op, value, onChange }) {
  const id = `op-${op.id}`;
  if (op.type === "slider") {
    const shown = op.unit === "mm" ? `${value} mm` : op.unit ? `${value}${op.unit}` : value;
    return (
      <div className="mk-field">
        <label className="mk-label" htmlFor={id}>
          {op.label} <em>{shown}</em>
        </label>
        <div className="mk-slider">
          <button aria-label={`Less ${op.label.toLowerCase()}`} onClick={() => onChange(op.id, Math.max(op.min, +(value - op.step).toFixed(2)))}>
            −
          </button>
          <input
            id={id}
            type="range"
            min={op.min}
            max={op.max}
            step={op.step}
            value={value}
            style={{ "--pct": `${((value - op.min) / (op.max - op.min)) * 100}%` }}
            onPointerDown={() => onChange(op.id, value)}
            onChange={(e) => onChange(op.id, Number(e.target.value), { commit: false })}
          />
          <button aria-label={`More ${op.label.toLowerCase()}`} onClick={() => onChange(op.id, Math.min(op.max, +(value + op.step).toFixed(2)))}>
            +
          </button>
        </div>
        {op.hint && <p className="mk-hint">{op.hint}</p>}
      </div>
    );
  }
  if (op.type === "choice") {
    return (
      <div className="mk-field" role="radiogroup" aria-label={op.label}>
        <span className="mk-label">{op.label}</span>
        <div className="mk-choices">
          {op.choices.map((c) => (
            <button
              key={c.value}
              role="radio"
              aria-checked={value === c.value}
              className={`${value === c.value ? "on" : ""} ${op.id === "font" ? "font-" + c.value.replace(/\s+/g, "-").toLowerCase() : ""}`}
              onClick={() => onChange(op.id, c.value)}
            >
              {c.label}
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
        {op.label} <em>{(value || "").length}/{op.max}</em>
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
