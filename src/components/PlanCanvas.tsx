import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { LocateIcon, ZoomInIcon, ZoomOutIcon } from "../icons";
import { snapPoint, wallOrientationFromNorth, type Room } from "../geometry";
import { localeFor, orientationLabel, translations, type Language } from "../i18n";
import { formatNumber, wallLength, type EditorMode, type Point, type Wall } from "../model";
import "../north-control.css";
import "../virtual-walls.css";

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 680;
const BASE_SCALE = 46;
const CENTER = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };

type Props = {
  walls: Wall[];
  lowerWalls: Wall[];
  rooms: Room[];
  selectedWallId: string | null;
  mode: EditorMode;
  zoom: number;
  draftStart: Point | null;
  northAngle: number;
  language: Language;
  onSelectWall: (id: string) => void;
  onClearSelection: () => void;
  onCanvasPoint: (point: Point) => void;
  onZoomChange: (zoom: number) => void;
  onNorthAngleChange: (angle: number) => void;
};

const isDrawing = (mode: EditorMode) => mode === "draw-external" || mode === "draw-internal" || mode === "draw-virtual";
const normalizeNorthAngle = (value: number) => ((value % 360) + 360) % 360;
const previewType = (mode: EditorMode) => mode === "draw-internal" ? "internal" : mode === "draw-virtual" ? "virtual" : "external";

export function PlanCanvas({
  walls,
  lowerWalls,
  rooms,
  selectedWallId,
  mode,
  zoom,
  draftStart,
  northAngle,
  language,
  onSelectWall,
  onClearSelection,
  onCanvasPoint,
  onZoomChange,
  onNorthAngleChange,
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const northDialRef = useRef<HTMLDivElement>(null);
  const [pointer, setPointer] = useState<Point | null>(null);
  const scale = BASE_SCALE * zoom;
  const text = translations[language];
  const locale = localeFor(language);
  const northControlLabel = language === "fr" ? "Orientation du nord" : "North orientation";
  const northHint = language === "fr" ? "Glisser pour orienter le nord" : "Drag to orient north";

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
    return snapPoint({ x: (x - CENTER.x) / scale, y: (y - CENTER.y) / scale }, walls);
  };

  const setNorthFromPointer = (event: ReactPointerEvent<HTMLDivElement>) => {
    const dial = northDialRef.current;
    if (!dial) return;
    const rect = dial.getBoundingClientRect();
    const dx = event.clientX - (rect.left + rect.width / 2);
    const dy = event.clientY - (rect.top + rect.height / 2);
    const angle = Math.atan2(dx, -dy) * 180 / Math.PI;
    onNorthAngleChange(normalizeNorthAngle(Math.round(angle)));
  };

  const preview = useMemo(() => {
    if (!draftStart || !pointer || !isDrawing(mode)) return null;
    const start = project(draftStart);
    const end = project(pointer);
    return {
      start,
      end,
      length: Math.hypot(pointer.x - draftStart.x, pointer.y - draftStart.y),
      angle: Math.atan2(pointer.y - draftStart.y, pointer.x - draftStart.x) * 180 / Math.PI,
    };
  }, [draftStart, pointer, scale, mode]);

  return (
    <main className={`canvas-panel ${isDrawing(mode) ? "drawing" : ""} ${mode === "node" ? "node-mode" : ""}`}>
      <div className="canvas-heading">
        <div>
          <h1>{text.planTitle}</h1>
          {isDrawing(mode) ? <p>{mode === "draw-virtual" ? (language === "fr" ? "Tracez une limite virtuelle pour séparer les pièces sans créer de paroi physique." : "Draw a virtual boundary to separate rooms without creating a physical wall.") : text.drawHint}</p> : null}
          {mode === "node" ? <p>{text.nodeHint}</p> : null}
        </div>
        <div className="north-control">
          <div
            ref={northDialRef}
            className="north-dial"
            role="slider"
            tabIndex={0}
            aria-label={northControlLabel}
            aria-valuemin={0}
            aria-valuemax={359}
            aria-valuenow={Math.round(northAngle)}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              setNorthFromPointer(event);
            }}
            onPointerMove={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) setNorthFromPointer(event);
            }}
            onPointerUp={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onPointerCancel={(event) => {
              if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
            }}
            onKeyDown={(event) => {
              const step = event.shiftKey ? 15 : 1;
              if (["ArrowRight", "ArrowUp"].includes(event.key)) {
                event.preventDefault();
                onNorthAngleChange(normalizeNorthAngle(northAngle + step));
              }
              if (["ArrowLeft", "ArrowDown"].includes(event.key)) {
                event.preventDefault();
                onNorthAngleChange(normalizeNorthAngle(northAngle - step));
              }
            }}
          >
            <div className="north-arrow" style={{ transform: `rotate(${northAngle}deg)` }} aria-hidden="true">
              <span>N</span>
              <svg viewBox="0 0 32 32"><path d="M16 3 23 25 16 21 9 25Z" /></svg>
            </div>
          </div>
          <div className="north-angle-field">
            <input
              aria-label={northControlLabel}
              type="number"
              min="0"
              max="359"
              step="1"
              value={Math.round(northAngle)}
              onChange={(event) => onNorthAngleChange(normalizeNorthAngle(Number(event.target.value)))}
            />
            <b>°</b>
          </div>
          <small>{northHint}</small>
        </div>
      </div>
      <svg
        ref={svgRef}
        className="plan-canvas"
        viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
        role="img"
        aria-label={text.planAria}
        onPointerMove={(event) => {
          if (isDrawing(mode) || mode === "node") setPointer(eventToWorld(event.clientX, event.clientY));
        }}
        onPointerLeave={() => setPointer(null)}
        onClick={(event) => {
          if (isDrawing(mode) || mode === "node") {
            onCanvasPoint(eventToWorld(event.clientX, event.clientY));
          } else {
            onClearSelection();
          }
        }}
      >
        <defs>
          <pattern id="smallGrid" width={scale} height={scale} patternUnits="userSpaceOnUse">
            <path d={`M ${scale} 0 L 0 0 0 ${scale}`} fill="none" stroke="#dfe5eb" strokeWidth="1" strokeDasharray="4 6" />
          </pattern>
        </defs>
        <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} fill="url(#smallGrid)" />

        {lowerWalls.map((wall) => {
          const start = project(wall.start);
          const end = project(wall.end);
          return <line key={`lower-${wall.id}`} className="lower-wall-line" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
        })}

        {rooms.map((room, index) => {
          const points = room.polygon.map((point) => {
            const projected = project(point);
            return `${projected.x},${projected.y}`;
          }).join(" ");
          const center = project(room.centroid);
          return (
            <g className="room-shape" key={room.id}>
              <polygon points={points} />
              <text x={center.x} y={center.y - 3} textAnchor="middle">{language === "fr" ? `Pièce ${index + 1}` : `Room ${index + 1}`}</text>
              <text className="room-area" x={center.x} y={center.y + 16} textAnchor="middle">{formatNumber(room.area, 1, locale)} m²</text>
            </g>
          );
        })}

        {walls.map((wall) => {
          const start = project(wall.start);
          const end = project(wall.end);
          const selected = wall.id === selectedWallId;
          const midX = (start.x + end.x) / 2;
          const midY = (start.y + end.y) / 2;
          const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
          const automaticOrientation = wall.type === "external"
            ? wallOrientationFromNorth(wall, walls, northAngle, rooms)
            : null;
          return (
            <g
              key={wall.id}
              className={`wall-shape ${wall.type} ${selected ? "selected" : ""}`}
              onClick={(event) => {
                if (mode !== "select") return;
                event.stopPropagation();
                onSelectWall(wall.id);
              }}
            >
              <line className="wall-hitbox" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
              <line className="wall-line" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
              <circle className="wall-node" cx={start.x} cy={start.y} r="7" />
              <circle className="wall-node" cx={end.x} cy={end.y} r="7" />
              <text x={midX + (horizontal ? 0 : 25)} y={midY + (horizontal ? -20 : 4)} textAnchor="middle">
                {formatNumber(wallLength(wall), 2, locale)} m{automaticOrientation ? ` · ${orientationLabel(automaticOrientation, language)}` : wall.type === "virtual" ? ` · ${language === "fr" ? "virtuel" : "virtual"}` : ""}
              </text>
            </g>
          );
        })}

        {preview ? (
          <g className={`wall-preview ${previewType(mode)}`}>
            <line x1={preview.start.x} y1={preview.start.y} x2={preview.end.x} y2={preview.end.y} />
            <circle cx={preview.start.x} cy={preview.start.y} r="8" />
            <circle cx={preview.end.x} cy={preview.end.y} r="8" />
            <text x={(preview.start.x + preview.end.x) / 2} y={(preview.start.y + preview.end.y) / 2 - 18} textAnchor="middle">
              {formatNumber(preview.length, 2, locale)} m · {formatNumber(preview.angle, 0, locale)}°
            </text>
          </g>
        ) : null}

        {draftStart && !preview ? (() => {
          const point = project(draftStart);
          return <circle className="draft-point" cx={point.x} cy={point.y} r="10" />;
        })() : null}

        {pointer && mode === "node" ? (() => {
          const point = project(pointer);
          return <g className="node-preview"><circle cx={point.x} cy={point.y} r="11" /><path d={`M ${point.x - 6} ${point.y} H ${point.x + 6} M ${point.x} ${point.y - 6} V ${point.y + 6}`} /></g>;
        })() : null}
      </svg>

      <div className="scale-indicator" aria-hidden="true">
        <div><span>0</span><span>1</span><span>2</span><span>3 m</span></div>
        <i style={{ width: `${3 * scale}px`, maxWidth: "150px" }} />
      </div>
      <div className="zoom-controls" aria-label={text.zoomControls}>
        <button onClick={() => onZoomChange(Math.min(1.7, zoom + 0.1))} aria-label={text.zoomIn}><ZoomInIcon /></button>
        <button onClick={() => onZoomChange(Math.max(0.5, zoom - 0.1))} aria-label={text.zoomOut}><ZoomOutIcon /></button>
        <button onClick={() => onZoomChange(1)} aria-label={text.zoomReset}><LocateIcon /></button>
      </div>
    </main>
  );
}
