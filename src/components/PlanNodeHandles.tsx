import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { pointsEqual, type EditorMode, type Point, type Wall } from "../model";
import { snapPoint } from "../geometry";
import "../node-editing.css";

type Props = {
  walls: Wall[];
  mode: EditorMode;
  project: (point: Point) => Point;
  clientToWorld: (clientX: number, clientY: number) => Point;
  onMoveNode: (from: Point, to: Point) => void;
};

type DragState = {
  origin: Point;
  current: Point;
  pointerId: number;
};

const uniqueNodes = (walls: Wall[]) => {
  const nodes: Point[] = [];
  for (const wall of walls) {
    for (const point of [wall.start, wall.end]) {
      if (!nodes.some((candidate) => pointsEqual(candidate, point, 0.02))) nodes.push({ ...point });
    }
  }
  return nodes;
};

export function PlanNodeHandles({ walls, mode, project, clientToWorld, onMoveNode }: Props) {
  const nodes = useMemo(() => uniqueNodes(walls), [walls]);
  const [drag, setDrag] = useState<DragState | null>(null);

  if (mode !== "node") return null;

  const targetFromPointer = (origin: Point, clientX: number, clientY: number) => {
    const raw = clientToWorld(clientX, clientY);
    const otherWalls = walls.filter(
      (wall) => !pointsEqual(wall.start, origin, 0.02) && !pointsEqual(wall.end, origin, 0.02),
    );
    return snapPoint(raw, otherWalls);
  };

  const startDrag = (event: ReactPointerEvent<SVGCircleElement>, origin: Point) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ origin: { ...origin }, current: { ...origin }, pointerId: event.pointerId });
  };

  const activeConnected = drag
    ? walls.filter((wall) => pointsEqual(wall.start, drag.origin, 0.02) || pointsEqual(wall.end, drag.origin, 0.02))
    : [];

  return (
    <g className="plan-node-editor" aria-label="Éditeur de nœuds du plan">
      {drag ? activeConnected.map((wall) => {
        const fixed = pointsEqual(wall.start, drag.origin, 0.02) ? wall.end : wall.start;
        const a = project(fixed);
        const b = project(drag.current);
        return <line className="plan-node-preview-line" key={`preview-${wall.id}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} />;
      }) : null}

      {nodes.map((node, index) => {
        const active = drag && pointsEqual(node, drag.origin, 0.02);
        const displayed = active ? drag.current : node;
        const point = project(displayed);
        return (
          <g key={`${Math.round(node.x * 1000)}-${Math.round(node.y * 1000)}-${index}`}>
            <circle
              className={`plan-node-handle${active ? " dragging" : ""}`}
              cx={point.x}
              cy={point.y}
              r="9"
              tabIndex={0}
              role="button"
              aria-label={`Nœud ${index + 1}`}
              onClick={(event) => event.stopPropagation()}
              onPointerDown={(event) => startDrag(event, node)}
              onPointerMove={(event) => {
                if (!drag || drag.pointerId !== event.pointerId || !pointsEqual(drag.origin, node, 0.02)) return;
                event.preventDefault();
                event.stopPropagation();
                const current = targetFromPointer(drag.origin, event.clientX, event.clientY);
                setDrag((state) => state ? { ...state, current } : state);
              }}
              onPointerUp={(event) => {
                if (!drag || drag.pointerId !== event.pointerId || !pointsEqual(drag.origin, node, 0.02)) return;
                event.preventDefault();
                event.stopPropagation();
                const target = targetFromPointer(drag.origin, event.clientX, event.clientY);
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                const origin = drag.origin;
                setDrag(null);
                onMoveNode(origin, target);
              }}
              onPointerCancel={(event) => {
                event.preventDefault();
                event.stopPropagation();
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                setDrag(null);
              }}
            />
            {active ? (
              <text className="plan-node-drag-label" x={point.x + 13} y={point.y - 13}>
                {displayed.x.toFixed(2)} ; {displayed.y.toFixed(2)} m
              </text>
            ) : null}
          </g>
        );
      })}
    </g>
  );
}
