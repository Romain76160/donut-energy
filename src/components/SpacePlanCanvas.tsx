import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { boundarySpace, buildWallAdjacencies, wallSideAnchor, type WallBoundaryRef } from "../adjacency";
import { LocateIcon, ZoomInIcon, ZoomOutIcon } from "../icons";
import { snapPoint, wallOrientationFromNorth } from "../geometry";
import { localeFor, orientationLabel, translations, type Language } from "../i18n";
import { formatNumber, wallLength, type EditorMode, type Point, type Space, type Wall } from "../model";
import { openingCenterPoint, openingTypeLabel, wallOpenings } from "../openings";
import "../north-control.css";
import "../virtual-walls.css";
import "../spaces.css";
import "../adjacency.css";
import "../openings.css";

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 680;
const BASE_SCALE = 46;
const CENTER = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };

type Props = {
  walls: Wall[];
  lowerWalls: Wall[];
  spaces: Space[];
  selectedWallId: string | null;
  selectedSpaceId: string | null;
  mode: EditorMode;
  zoom: number;
  draftStart: Point | null;
  northAngle: number;
  language: Language;
  onSelectWall: (id: string) => void;
  onSelectSpace: (id: string) => void;
  onClearSelection: () => void;
  onCanvasPoint: (point: Point) => void;
  onZoomChange: (zoom: number) => void;
  onNorthAngleChange: (angle: number) => void;
};

const isDrawing = (mode: EditorMode) => mode === "draw-external" || mode === "draw-internal" || mode === "draw-virtual";
const normalizeNorthAngle = (value: number) => ((value % 360) + 360) % 360;
const previewType = (mode: EditorMode) => mode === "draw-internal" ? "internal" : mode === "draw-virtual" ? "virtual" : "external";

const boundaryLabel = (boundary: WallBoundaryRef, spaces: Space[], language: Language) => {
  if (boundary.kind === "outside") return language === "fr" ? "Extérieur" : "Outside";
  if (boundary.kind === "unassigned") return language === "fr" ? "Non attribué" : "Unassigned";
  return boundarySpace(boundary, spaces)?.name ?? (language === "fr" ? "Pièce inconnue" : "Unknown room");
};

export function SpacePlanCanvas({
  walls,
  lowerWalls,
  spaces,
  selectedWallId,
  selectedSpaceId,
  mode,
  zoom,
  draftStart,
  northAngle,
  language,
  onSelectWall,
  onSelectSpace,
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
  const wallAdjacencies = useMemo(() => buildWallAdjacencies(walls, spaces), [walls, spaces]);
  const selectedAdjacency = useMemo(
    () => wallAdjacencies.find((adjacency) => adjacency.wallId === selectedWallId) ?? null,
    [wallAdjacencies, selectedWallId],
  );

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

  const adjacencyNote = selectedAdjacency?.quality === "resolved"
    ? (language === "fr" ? "Adjacences reconnues automatiquement." : "Adjacencies detected automatically.")
    : selectedAdjacency?.quality === "conflict"
      ? (language === "fr" ? "Conflit de classification : vérifie le type du mur et la géométrie des pièces." : "Classification conflict: check the wall type and room geometry.")
      : (language === "fr" ? "Adjacence incomplète : la géométrie n’est pas fermée des deux côtés." : "Incomplete adjacency: geometry is not closed on both sides.");

  return (
    <main className={`canvas-panel ${isDrawing(mode) ? "drawing" : ""} ${mode === "node" ? "node-mode" : ""}`}>
      <div className="canvas-heading">
        <div>
          <h1>{text.planTitle}</h1>
          {isDrawing(mode) ? <p>{mode === "draw-virtual" ? (language === "fr" ? "Tracez une limite virtuelle pour séparer les pièces sans créer de paroi physique." : "Draw a virtual boundary to separate rooms without creating a physical wall.") : text.drawHint}</p> : null}
          {mode === "node" ? <p>{text.nodeHint}</p> : null}
          {mode === "select" ? <p>{language === "fr" ? "Cliquez dans une pièce pour modifier son nom, son usage et ses paramètres thermiques." : "Click inside a room to edit its name, use and thermal settings."}</p> : null}
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

      {selectedAdjacency ? (
        <div className={`wall-adjacency-strip ${selectedAdjacency.quality}`}>
          <div className="wall-adjacency-header">
            <strong>{language === "fr" ? "Adjacences du mur" : "Wall adjacencies"}</strong>
            <small>{language === "fr" ? "Calcul automatique" : "Automatic calculation"}</small>
          </div>
          <div className="wall-adjacency-sides">
            <span><i>A</i>{boundaryLabel(selectedAdjacency.sideA, spaces, language)}</span>
            <span><i>B</i>{boundaryLabel(selectedAdjacency.sideB, spaces, language)}</span>
          </div>
          <div className="wall-adjacency-note">{adjacencyNote}</div>
        </div>
      ) : null}

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

        {spaces.map((space) => {
          const points = space.polygon.map((point) => {
            const projected = project(point);
            return `${projected.x},${projected.y}`;
          }).join(" ");
          const center = project(space.centroid);
          const selected = space.id === selectedSpaceId;
          return (
            <g
              className={`room-shape space-shape ${selected ? "selected" : ""}`}
              key={space.id}
              onClick={(event) => {
                if (mode !== "select") return;
                event.stopPropagation();
                onSelectSpace(space.id);
              }}
            >
              <polygon points={points} />
              <text x={center.x} y={center.y - 3} textAnchor="middle">{space.name}</text>
              <text className="room-area" x={center.x} y={center.y + 16} textAnchor="middle">{formatNumber(space.area, 1, locale)} m²</text>
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
            ? wallOrientationFromNorth(wall, walls, northAngle, spaces)
            : null;
          const sideA = selected ? project(wallSideAnchor(wall, "A")) : null;
          const sideB = selected ? project(wallSideAnchor(wall, "B")) : null;
          const length = wallLength(wall);
          const tangent = length > 0
            ? { x: (wall.end.x - wall.start.x) / length, y: (wall.end.y - wall.start.y) / length }
            : { x: 1, y: 0 };
          const normalScreen = { x: -tangent.y, y: tangent.x };
          const openingMarkers = wallOpenings(wall).map((opening) => {
            const centerWorld = openingCenterPoint(wall, opening);
            const half = opening.width / 2;
            const a = project({ x: centerWorld.x - tangent.x * half, y: centerWorld.y - tangent.y * half });
            const b = project({ x: centerWorld.x + tangent.x * half, y: centerWorld.y + tangent.y * half });
            const center = project(centerWorld);
            return { opening, a, b, center };
          });
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
              {openingMarkers.map(({ opening, a, b, center }) => (
                <g className={`wall-opening-marker ${opening.type}`} key={opening.id}>
                  <line className="opening-mask" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  <line className="opening-symbol" x1={a.x} y1={a.y} x2={b.x} y2={b.y} />
                  {selected ? (
                    <text x={center.x + normalScreen.x * 14} y={center.y + normalScreen.y * 14} textAnchor="middle">
                      {openingTypeLabel(opening.type, language)}
                    </text>
                  ) : null}
                </g>
              ))}
              <circle className="wall-node" cx={start.x} cy={start.y} r="7" />
              <circle className="wall-node" cx={end.x} cy={end.y} r="7" />
              <text x={midX + (horizontal ? 0 : 25)} y={midY + (horizontal ? -20 : 4)} textAnchor="middle">
                {formatNumber(wallLength(wall), 2, locale)} m{automaticOrientation ? ` · ${orientationLabel(automaticOrientation, language)}` : wall.type === "virtual" ? ` · ${language === "fr" ? "virtuel" : "virtual"}` : ""}
              </text>
              {selected && sideA && sideB ? (
                <>
                  <g className="adjacency-side-marker">
                    <circle cx={sideA.x} cy={sideA.y} r="11" />
                    <text x={sideA.x} y={sideA.y + 4} textAnchor="middle">A</text>
                  </g>
                  <g className="adjacency-side-marker">
                    <circle cx={sideB.x} cy={sideB.y} r="11" />
                    <text x={sideB.x} y={sideB.y + 4} textAnchor="middle">B</text>
                  </g>
                </>
              ) : null}
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
