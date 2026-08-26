import { useState, type PointerEvent as ReactPointerEvent } from "react";
import type { EditorMode, Point, Wall } from "../model";
import "../wall-move-overlay.css";

type Props = {
  walls: Wall[];
  mode: EditorMode;
  project: (point: Point) => Point;
  clientToWorld: (clientX: number, clientY: number) => Point;
  onMoveWall: (wallId: string, delta: Point) => void;
};

type DragState = {
  wallId: string;
  pointerId: number;
  originPointer: Point;
  delta: Point;
};

export function WallMoveOverlay({ walls, mode, project, clientToWorld, onMoveWall }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  if (mode !== "move") return null;

  const start = (event: ReactPointerEvent<SVGLineElement>, wall: Wall) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      wallId: wall.id,
      pointerId: event.pointerId,
      originPointer: clientToWorld(event.clientX, event.clientY),
      delta: { x: 0, y: 0 },
    });
  };

  const deltaFromPointer = (state: DragState, clientX: number, clientY: number) => {
    const point = clientToWorld(clientX, clientY);
    return {
      x: point.x - state.originPointer.x,
      y: point.y - state.originPointer.y,
    };
  };

  return (
    <g className="wall-move-overlay">
      {walls.map((wall) => {
        const active = drag?.wallId === wall.id;
        const delta = active ? drag.delta : { x: 0, y: 0 };
        const a = project({ x: wall.start.x + delta.x, y: wall.start.y + delta.y });
        const b = project({ x: wall.end.x + delta.x, y: wall.end.y + delta.y });
        return (
          <g key={wall.id} className={active ? "dragging" : ""}>
            {active ? <line className="wall-move-preview" x1={a.x} y1={a.y} x2={b.x} y2={b.y} /> : null}
            <line
              className="wall-move-hit"
              x1={project(wall.start).x}
              y1={project(wall.start).y}
              x2={project(wall.end).x}
              y2={project(wall.end).y}
              onPointerDown={(event) => start(event, wall)}
              onPointerMove={(event) => {
                if (!drag || drag.wallId !== wall.id || drag.pointerId !== event.pointerId) return;
                event.preventDefault();
                event.stopPropagation();
                const delta = deltaFromPointer(drag, event.clientX, event.clientY);
                setDrag((current) => current ? { ...current, delta } : current);
              }}
              onPointerUp={(event) => {
                if (!drag || drag.wallId !== wall.id || drag.pointerId !== event.pointerId) return;
                event.preventDefault();
                event.stopPropagation();
                const delta = deltaFromPointer(drag, event.clientX, event.clientY);
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                setDrag(null);
                if (Math.hypot(delta.x, delta.y) > 0.001) onMoveWall(wall.id, delta);
              }}
              onPointerCancel={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                setDrag(null);
              }}
            />
          </g>
        );
      })}
    </g>
  );
}
