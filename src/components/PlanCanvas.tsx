import { useMemo, useRef, useState } from "react";
import { LocateIcon, ZoomInIcon, ZoomOutIcon } from "../icons";
import type { EditorMode, Point, Wall } from "../model";
import { formatNumber, wallLength } from "../model";

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 680;
const BASE_SCALE = 46;
const CENTER = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };

type Props = {
  walls: Wall[];
  selectedWallId: string | null;
  mode: EditorMode;
  zoom: number;
  draftStart: Point | null;
  onSelectWall: (id: string) => void;
  onCanvasPoint: (point: Point) => void;
  onZoomChange: (zoom: number) => void;
};

const snap = (value: number) => Math.round(value * 2) / 2;

export function PlanCanvas({
  walls,
  selectedWallId,
  mode,
  zoom,
  draftStart,
  onSelectWall,
  onCanvasPoint,
  onZoomChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const scale = BASE_SCALE * zoom;

  const project = (point: Point) => ({
    x: CENTER.x + point.x * scale,
    y: CENTER.y + point.y * scale,
  });

  const eventToWorld = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * VIEW_WIDTH;
    const y = ((clientY - rect.top) / rect.height) * VIEW_HEIGHT;
    return { x: snap((x - CENTER.x) / scale), y: snap((y - CENTER.y) / scale) };
  };

  const preview = useMemo(() => {
    if (!draftStart || !pointer) return null;
    const start = project(draftStart);
    const end = project(pointer);
    return { start, end, length: Math.hypot(pointer.x - draftStart.x, pointer.y - draftStart.y) };
  }, [draftStart, pointer, scale]);

  return (
    <main className={`canvas-panel ${mode === "draw" ? "drawing" : ""}`}>
      <div className="canvas-heading">
        <div>
          <h1>Plan du bâtiment</h1>
          {mode === "draw" ? <p>Cliquez sur le départ puis l’arrivée du mur</p> : null}
        </div>
        <div className="north-indicator" aria-label="Nord">
          <span>N</span>
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 4 23 25 16 21 9 25Z" /></svg>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="plan-canvas"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label="Plan des murs du bâtiment"
        onPointerMove={(event) => mode === "draw" && setPointer(eventToWorld(event.clientX, event.clientY))}
        onPointerLeave={() => setPointer(null)}
        onClick={(event) => mode === "draw" && onCanvasPoint(eventToWorld(event.clientX, event.clientY))}
      >
        <defs>
          <pattern id="smallGrid" width={scale} height={scale} patternUnits="userSpaceOnUse">
            <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#dfe5eb" strokeWidth="1" strokeDasharray="4 6" />
          </pattern>
        </defs>
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#smallGrid)" />
        {walls.map((wall) => {
          const start = project(wall.start);
          const end = project(wall.end);
          const selected = wall.id === selectedWallId;
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
          return (
            <g
              key={wall.id}
              className={`wall-shape ${selected ? "selected" : ""}`}
              onClick={(event) => {
                if (mode !== "select") return;
                event.stopPropagation();
                onSelectWall(wall.id);
              }}
            >
              <line className="wall-hitbox" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
              <line className="wall-line" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
              <circle cx={start.x} cy={start.y} r="9" />
              <circle cx={end.x} cy={end.y} r="9" />
              <text x={midX + (horizontal ? 0 : 27)} y={midY + (horizontal ? -24 : 5)} textAnchor="middle">
                {formatNumber(wallLength(wall))} m
              </text>
            </g>
          );
        })}
        {preview ? (
          <g className="wall-preview">
            <line x1={preview.start.x} y1={preview.start.y} x2={preview.end.x} y2={preview.end.y} />
            <circle cx={preview.start.x} cy={preview.start.y} r="8" />
            <circle cx={preview.end.x} cy={preview.end.y} r="8" />
            <text x={(preview.start.x + preview.end.x) / 2} y={(preview.start.y + preview.end.y) / 2 - 18} textAnchor="middle">
              {formatNumber(preview.length)} m
            </text>
          </g>
        ) : null}
        {draftStart && !preview ? (() => {
          const point = project(draftStart);
          return <circle className="draft-point" cx={point.x} cy={point.y} r="10" />;
        })() : null}
      </svg>
      <div className="scale-indicator" aria-hidden="true">
        <div><span>0</span><span>1</span><span>2</span><span>3 m</span></div>
        <i style={{ width: `${3 * scale}px`, maxWidth: "150px" }} />
      </div>
      <div className="zoom-controls" aria-label="Contrôles du zoom">
        <button onClick={() => onZoomChange(Math.min(1.5, zoom + 0.1))} aria-label="Agrandir"><ZoomInIcon /></button>
        <button onClick={() => onZoomChange(Math.max(0.6, zoom - 0.1))} aria-label="Réduire"><ZoomOutIcon /></button>
        <button onClick={() => onZoomChange(1)} aria-label="Réinitialiser le zoom"><LocateIcon /></button>
      </div>
    </main>
  );
}
