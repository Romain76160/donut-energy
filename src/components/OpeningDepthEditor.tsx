import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Language } from "../i18n";
import type { Wall, WallOpening } from "../model";
import {
  depthOffsetForMode,
  openingDepthModeLabel,
  readOpeningDepth,
  wallThicknessMm,
  writeOpeningDepth,
  type OpeningDepthMode,
  type OpeningDepthState,
} from "../openingDepth";
import "../opening-depth.css";

const MODES: OpeningDepthMode[] = ["interior", "center", "exterior"];

export function OpeningDepthEditor({ wall, opening, language }: { wall: Wall; opening: WallOpening; language: Language }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [depth, setDepth] = useState<OpeningDepthState>(() => readOpeningDepth(wall, opening.id));
  const [dragging, setDragging] = useState(false);
  const thickness = Math.max(1, wallThicknessMm(wall));

  useEffect(() => {
    if (dragging) return;
    setDepth(readOpeningDepth(wall, opening.id));
  }, [wall, opening.id, dragging]);

  const labels = language === "fr" ? {
    title: "Position dans l’épaisseur",
    help: "Position du plan du dormant entre la face intérieure et la face extérieure du mur.",
    interior: "INT.",
    exterior: "EXT.",
    exact: "Cote depuis l’intérieur",
    drag: "Glissez le dormant dans la coupe",
  } : {
    title: "Position through wall depth",
    help: "Frame reference plane between the interior and exterior finished faces.",
    interior: "INT.",
    exterior: "EXT.",
    exact: "Offset from interior",
    drag: "Drag the frame in the section",
  };

  const apply = (next: Partial<OpeningDepthState>) => {
    const normalized = writeOpeningDepth(wall, opening.id, next);
    setDepth(normalized);
  };

  const pointerOffset = (clientX: number) => {
    const track = trackRef.current;
    if (!track) return depth.offsetMm;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width)));
    return Math.round(ratio * thickness);
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const layers = wall.layers.map((layer) => ({ ...layer, ratio: Math.max(0, layer.thicknessMm) / thickness }));
  const cursorPercent = Math.max(0, Math.min(100, depth.offsetMm / thickness * 100));

  return (
    <div className="opening-depth-editor">
      <div className="opening-depth-heading">
        <div><strong>{labels.title}</strong><small>{labels.help}</small></div>
        <b>{Math.round(depth.offsetMm)} mm</b>
      </div>

      <div className="opening-depth-presets" role="group" aria-label={labels.title}>
        {MODES.map((mode) => (
          <button
            type="button"
            key={mode}
            className={depth.mode === mode ? "active" : ""}
            onClick={() => apply({ mode, offsetMm: depthOffsetForMode(mode, thickness) })}
          >
            {openingDepthModeLabel(mode, language)}
          </button>
        ))}
        <button type="button" className={depth.mode === "custom" ? "active" : ""} onClick={() => apply({ mode: "custom", offsetMm: depth.offsetMm })}>
          {openingDepthModeLabel("custom", language)}
        </button>
      </div>

      <div className="opening-depth-section">
        <div className="opening-depth-face-labels"><span>{labels.interior}</span><span>{labels.exterior}</span></div>
        <div
          ref={trackRef}
          className="opening-depth-track"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest("button")) return;
            const offsetMm = pointerOffset(event.clientX);
            apply({ mode: "custom", offsetMm });
          }}
        >
          <div className="opening-depth-layers">
            {layers.map((layer) => (
              <span key={layer.id} style={{ width: `${layer.ratio * 100}%`, backgroundColor: layer.color }} title={`${layer.name} — ${layer.thicknessMm} mm`} />
            ))}
          </div>
          <button
            type="button"
            className={`opening-depth-frame${dragging ? " dragging" : ""}`}
            style={{ left: `${cursorPercent}%` }}
            aria-label={labels.drag}
            title={`${labels.drag} · ${Math.round(depth.offsetMm)} mm`}
            onPointerDown={startDrag}
            onPointerMove={(event) => {
              if (!dragging || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
              setDepth({ mode: "custom", offsetMm: pointerOffset(event.clientX) });
            }}
            onPointerUp={(event) => {
              if (!dragging) return;
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
              setDragging(false);
              apply({ mode: "custom", offsetMm: pointerOffset(event.clientX) });
            }}
            onPointerCancel={() => {
              setDragging(false);
              setDepth(readOpeningDepth(wall, opening.id));
            }}
          ><span /></button>
        </div>
        <small className="opening-depth-total">{Math.round(thickness)} mm</small>
      </div>

      <label className="opening-depth-exact">
        <span>{labels.exact}</span>
        <div className="unit-input compact">
          <input
            type="number"
            min="0"
            max={Math.round(thickness)}
            step="1"
            value={Math.round(depth.offsetMm)}
            onChange={(event) => apply({ mode: "custom", offsetMm: Number(event.target.value) })}
          />
          <b>mm</b>
        </div>
      </label>
    </div>
  );
}
