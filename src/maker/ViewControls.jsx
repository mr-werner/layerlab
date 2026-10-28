// Simple on-screen controls for the 3D view: turn, tilt, zoom, a Move/Turn
// switch for dragging, recenter, spin, and the size-comparison picker.
import { useEffect, useRef, useState } from "react";
import { COMPARE } from "./compare.js";

const STEP = Math.PI / 8;

function Btn({ label, onClick, children, on }) {
  // Holding a button keeps it going.
  const timer = useRef(null);
  const stop = () => clearInterval(timer.current);
  useEffect(() => stop, []);
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={on}
      className={on ? "on" : ""}
      onPointerDown={() => {
        onClick();
        stop();
        timer.current = setInterval(onClick, 180);
      }}
      onPointerUp={stop}
      onPointerLeave={stop}
      onPointerCancel={stop}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && onClick()}
    >
      {children}
    </button>
  );
}

export default function ViewControls({ view, spin, setSpin, mode, setMode, compare, setCompare }) {
  const [menu, setMenu] = useState(null); // "compare" | "help" | null
  const nudge = (n) => view.current?.nudge(n);
  const pick = COMPARE.find((c) => c.id === compare) || COMPARE[0];
  return (
    <>
      <div className="vc-top">
        <div className="vc-menu-wrap">
          <button
            className={`vc-pill ${compare !== "none" ? "on" : ""}`}
            onClick={() => setMenu(menu === "compare" ? null : "compare")}
            aria-expanded={menu === "compare"}
          >
            <span aria-hidden="true">{compare === "none" ? "📏" : pick.icon}</span> {compare === "none" ? "Size check" : pick.label}
          </button>
          {menu === "compare" && (
            <div className="vc-menu" role="menu">
              <p>Show it next to…</p>
              {COMPARE.map((c) => (
                <button
                  key={c.id}
                  role="menuitemradio"
                  aria-checked={compare === c.id}
                  className={compare === c.id ? "on" : ""}
                  onClick={() => {
                    setCompare(c.id);
                    setMenu(null);
                  }}
                >
                  <span aria-hidden="true">{c.icon}</span> {c.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="vc-right">
          <button className="vc-pill" onClick={() => setSpin(!spin)} aria-pressed={spin} aria-label={spin ? "Stop spinning" : "Spin"}>
            {spin ? "Stop" : "Spin"}
          </button>
          <button className="vc-pill" onClick={() => view.current?.reframe()}>
            Recenter
          </button>
          <button
            className="vc-pill vc-q"
            onClick={() => setMenu(menu === "help" ? null : "help")}
            aria-label="How to move the view"
            aria-expanded={menu === "help"}
          >
            ?
          </button>
          {menu === "help" && (
            <div className="vc-menu vc-help" role="dialog" aria-label="How to move the view">
              <p>
                <b>Turn it:</b> drag with one finger or the left mouse button, or use ⟲ ⟳.
              </p>
              <p>
                <b>Move it:</b> drag with two fingers or the right mouse button, or switch to Move and drag.
              </p>
              <p>
                <b>Zoom:</b> pinch, scroll the mouse wheel, or use + and −. Zoom goes toward your pointer.
              </p>
              <p>
                <b>Lost it?</b> Tap Recenter.
              </p>
              <button className="vc-pill" onClick={() => setMenu(null)}>
                Got it
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="vc-pad" aria-label="View controls">
        <div className="vc-seg" role="group" aria-label="Dragging">
          <button className={mode === "turn" ? "on" : ""} aria-pressed={mode === "turn"} onClick={() => setMode("turn")}>
            ⟳ Turn
          </button>
          <button className={mode === "move" ? "on" : ""} aria-pressed={mode === "move"} onClick={() => setMode("move")}>
            ✥ Move
          </button>
        </div>
        <div className="vc-btns">
          <Btn label="Turn left" onClick={() => nudge({ turn: -STEP })}>
            ⟲
          </Btn>
          <Btn label="Tilt up" onClick={() => nudge({ tilt: STEP / 2 })}>
            ▲
          </Btn>
          <Btn label="Turn right" onClick={() => nudge({ turn: STEP })}>
            ⟳
          </Btn>
          <Btn label="Zoom in" onClick={() => nudge({ zoom: 0.8 })}>
            +
          </Btn>
          <Btn label="Tilt down" onClick={() => nudge({ tilt: -STEP / 2 })}>
            ▼
          </Btn>
          <Btn label="Zoom out" onClick={() => nudge({ zoom: 1.25 })}>
            −
          </Btn>
        </div>
      </div>
    </>
  );
}
