import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import {
  emitJoineryPlanPlace,
  getJoineryPlacement,
  JOINERY_PLACEMENT_CHANGE_EVENT,
  type JoineryPlacementSelection,
} from "../joineryPlacement";
import type { Point, Wall, WallOpening } from "../model";
import { defaultOpening } from "../openings";
import { applyWindowTypeToOpening, loadWindowTypes } from "../windowTypes";
import "../left-joinery.css";

type Props = {
  walls: Wall[];
  project: (point: Point) => Point;
  clientToWorld: (clientX: number, clientY: number) => Point;
  onSelectWall: (id: string) => void;
};

type Preview = {
  wallId: string;
  position: number;
  opening: WallOpening;
};

export function JoineryPlacementOverlay({ walls, project, clientToWorld, onSelectWall }: Props) {
  const [selection, setSelection] = useState<JoineryPlacementSelection | null>(getJoineryPlacement);
  const [preview, setPreview] = useState<Preview | null>(null);
  const windowTypes = useMemo(() => loadWindowTypes(), [selection?.windowTypeId]);

  useEffect(() => {
    const handleChange = (event: Event) => {
      const next = (event as CustomEvent<JoineryPlacementSelection | null>).detail ?? null;
      setSelection(next);
      setPreview(null);
    };
    window.addEventListener(JOINERY_PLACEMENT_CHANGE_EVENT, handleChange);
    return () => window.removeEventListener(JOINERY_PLACEMENT_CHANGE_EVENT, handleChange);
  }, []);

  if (!selection) return null;

  const openingForWall = (wall: Wall) => {
    let opening = defaultOpening(selection.openingType, wall, wall.openings?.length ?? 0);
    if (selection.openingType === "window" && selection.windowTypeId) {
      const type = windowTypes.find((candidate) => candidate.id === selection.windowTypeId);
      if (type) opening = applyWindowTypeToOpening(opening, type);
    }
    return opening;
  };

  const positionForPointer = (wall: Wall, opening: WallOpening, clientX: number, clientY: number) => {
    const point = clientToWorld(clientX, clientY);
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const length = Math.hypot(dx, dy);
    if (length <= 0.001) return 0;
    const raw = ((point.x - wall.start.x) * dx + (point.y - wall.start.y) * dy) / length;
    const half = Math.min(length, opening.width) / 2;
    return Math.max(half, Math.min(length - half, raw));
  };

  const updatePreview = (event: ReactPointerEvent<SVGGElement>, wall: Wall) => {
    const opening = openingForWall(wall);
    const position = positionForPointer(wall, opening, event.clientX, event.clientY);
    setPreview({ wallId: wall.id, position, opening: { ...opening, position } });
  };

  return (
    <g className="joinery-placement-overlay">
      {walls.filter((wall) => wall.type !== "virtual").map((wall) => {
        const start = project(wall.start);
        const end = project(wall.end);
        const length = Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);
        const tangent = length > 0
          ? { x: (wall.end.x - wall.start.x) / length, y: (wall.end.y - wall.start.y) / length }
          : { x: 1, y: 0 };
        const activePreview = preview?.wallId === wall.id ? preview : null;
        const previewCenter = activePreview
          ? {
            x: wall.start.x + tangent.x * activePreview.position,
            y: wall.start.y + tangent.y * activePreview.position,
          }
          : null;
        const half = activePreview ? activePreview.opening.width / 2 : 0;
        const previewA = previewCenter ? project({ x: previewCenter.x - tangent.x * half, y: previewCenter.y - tangent.y * half }) : null;
        const previewB = previewCenter ? project({ x: previewCenter.x + tangent.x * half, y: previewCenter.y + tangent.y * half }) : null;

        return (
          <g
            key={wall.id}
            className={`joinery-placement-target ${activePreview ? "active" : ""}`}
            onPointerEnter={(event) => updatePreview(event, wall)}
            onPointerMove={(event) => updatePreview(event, wall)}
            onPointerLeave={() => setPreview((current) => current?.wallId === wall.id ? null : current)}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const opening = openingForWall(wall);
              const position = positionForPointer(wall, opening, event.clientX, event.clientY);
              const currentSelection = { ...selection };
              onSelectWall(wall.id);
              requestAnimationFrame(() => emitJoineryPlanPlace({ wallId: wall.id, position, selection: currentSelection }));
            }}
          >
            <line className="joinery-placement-hit" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
            <line className="joinery-placement-guide" x1={start.x} y1={start.y} x2={end.x} y2={end.y} />
            {previewA && previewB ? (
              <>
                <line className="joinery-placement-opening-mask" x1={previewA.x} y1={previewA.y} x2={previewB.x} y2={previewB.y} />
                <line className="joinery-placement-opening" x1={previewA.x} y1={previewA.y} x2={previewB.x} y2={previewB.y} />
              </>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
