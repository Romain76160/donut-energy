import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import type { Language } from "../i18n";
import type { Wall, WallOpening } from "../model";
import {
  openingDepthGeometry,
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
  const geometry = openingDepthGeometry(depth, wall);

  useEffect(() => {
    if (dragging) return;
    setDepth(readOpeningDepth(wall, opening.id));
  }, [wall, opening.id, dragging]);

  const labels = language === "fr" ? {
    title: "Dormant dans l’épaisseur",
    help: "Le dormant possède maintenant une profondeur réelle. Les tableaux sont mesurés entre ses faces et les parements du mur.",
    interior: "INT.",
    exterior: "EXT.",
    axis: "Axe depuis l’intérieur",
    frameDepth: "Profondeur du dormant",
    innerReveal: "Tableau intérieur",
    outerReveal: "Tableau extérieur",
    drag: "Glissez le dormant complet dans la coupe",
  } : {
    title: "Frame through wall depth",
    help: "The frame now has a real physical depth. Reveals are measured from its faces to the wall finishes.",
    interior: "INT.",
    exterior: "EXT.",
    axis: "Axis from interior",
    frameDepth: "Frame depth",
    innerReveal: "Interior reveal",
    outerReveal: "Exterior reveal",
    drag: "Drag the complete frame through the section",
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
    return ratio * thickness;
  };

  const previewCustomOffset = (clientX: number) => {
    setDepth((current) => openingDepthGeometry({ ...current, mode: "custom", offsetMm: pointerOffset(clientX) }, wall));
  };

  const startDrag = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const layers = wall.layers.map((layer) => ({ ...layer, ratio: Math.max(0, layer.thicknessMm) / thickness }));
  const frameLeftPercent = Math.max(0, Math.min(100, geometry.frameStartMm / thickness * 100));
  const frameWidthPercent = Math.max(0.8, Math.min(100, geometry.frameDepthMm / thickness * 100));
  const halfFrame = geometry.frameDepthMm / 2;

  return (
    <div className="opening-depth-editor">
      <div className="opening-depth-heading">
        <div><strong>{labels.title}</strong><small>{labels.help}</small></div>
        <b>{Math.round(geometry.frameDepthMm)} mm</b>
      </div>

      <div className="opening-depth-presets" role="group" aria-label={labels.title}>
        {MODES.map((mode) => (
          <button
            type="button"
            key={mode}
            className={depth.mode === mode ? "active" : ""}
            onClick={() => apply({ mode })}
          >
            {openingDepthModeLabel(mode, language)}
          </button>
        ))}
        <button type="button" className={depth.mode === "custom" ? "active" : ""} onClick={() => apply({ mode: "custom" })}>
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
            apply({ mode: "custom", offsetMm: pointerOffset(event.clientX) });
          }}
        >
          <div className="opening-depth-layers">
            {layers.map((layer) => (
              <span key={layer.id} style={{ width: `${layer.ratio * 100}%`, backgroundColor: layer.color }} title={`${layer.name} — ${layer.thicknessMm} mm`} />
            ))}
          </div>
          <div className="opening-depth-reveal interior" style={{ width: `${geometry.interiorRevealMm / thickness * 100}%` }} />
          <div className="opening-depth-reveal exterior" style={{ width: `${geometry.exteriorRevealMm / thickness * 100}%` }} />
          <button
            type="button"
            className={`opening-depth-frame${dragging ? " dragging" : ""}`}
            style={{ left: `${frameLeftPercent}%`, width: `${frameWidthPercent}%` }}
            aria-label={labels.drag}
            title={`${labels.drag} · ${Math.round(geometry.frameDepthMm)} mm`}
            onPointerDown={startDrag}
            onPointerMove={(event) => {
              if (!dragging || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
              previewCustomOffset(event.clientX);
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
          >
            <span className="frame-grip left" />
            <i />
            <span className="frame-grip right" />
          </button>
        </div>
        <small className="opening-depth-total">{Math.round(thickness)} mm</small>
      </div>

      <div className="opening-depth-reveal-metrics">
        <div><span>{labels.innerReveal}</span><strong>{Math.round(geometry.interiorRevealMm)} mm</strong></div>
        <div><span>{labels.frameDepth}</span><strong>{Math.round(geometry.frameDepthMm)} mm</strong></div>
        <div><span>{labels.outerReveal}</span><strong>{Math.round(geometry.exteriorRevealMm)} mm</strong></div>
      </div>

      <div className="opening-depth-fields">
        <label className="opening-depth-exact">
          <span>{labels.frameDepth}</span>
          <div className="unit-input compact">
            <input
              type="number"
              min="10"
              max={Math.round(thickness)}
              step="1"
              value={Math.round(geometry.frameDepthMm)}
              onChange={(event) => apply({ frameDepthMm: Number(event.target.value) })}
            />
            <b>mm</b>
          </div>
        </label>

        <label className="opening-depth-exact">
          <span>{labels.axis}</span>
          <div className="unit-input compact">
            <input
              type="number"
              min={Math.round(halfFrame)}
              max={Math.round(Math.max(halfFrame, thickness - halfFrame))}
              step="1"
              value={Math.round(geometry.offsetMm)}
              onChange={(event) => apply({ mode: "custom", offsetMm: Number(event.target.value) })}
            />
            <b>mm</b>
          </div>
        </label>
      </div>
    </div>
  );
}
