import { useEffect, useState, type ComponentProps } from "react";
import { createPortal } from "react-dom";
import type { Point } from "../model";
import { JoineryPlacementOverlay } from "./JoineryPlacementOverlay";
import { PlanNodeHandles } from "./PlanNodeHandles";
import { SpacePlanCanvas } from "./SpacePlanCanvas";

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 680;
const BASE_SCALE = 46;
const CENTER = { x: VIEW_WIDTH / 2, y: VIEW_HEIGHT / 2 };

type Props = ComponentProps<typeof SpacePlanCanvas> & {
  onMoveNode: (from: Point, to: Point) => void;
};

export function EditableSpacePlanCanvas({ onMoveNode, ...props }: Props) {
  const [svg, setSvg] = useState<SVGSVGElement | null>(null);
  const scale = BASE_SCALE * props.zoom;

  useEffect(() => {
    const canvases = document.querySelectorAll<SVGSVGElement>("svg.plan-canvas");
    setSvg(canvases.item(canvases.length - 1));
  }, [props.mode, props.zoom, props.walls.length]);

  const project = (point: Point): Point => ({
    x: CENTER.x + point.x * scale,
    y: CENTER.y + point.y * scale,
  });

  const clientToWorld = (clientX: number, clientY: number): Point => {
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * VIEW_WIDTH;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * VIEW_HEIGHT;
    return { x: (x - CENTER.x) / scale, y: (y - CENTER.y) / scale };
  };

  return (
    <>
      <SpacePlanCanvas {...props} />
      {svg ? createPortal(
        <>
          <PlanNodeHandles
            walls={props.walls}
            mode={props.mode}
            project={project}
            clientToWorld={clientToWorld}
            onMoveNode={onMoveNode}
          />
          <JoineryPlacementOverlay
            walls={props.walls}
            project={project}
            clientToWorld={clientToWorld}
            onSelectWall={props.onSelectWall}
          />
        </>,
        svg,
      ) : null}
    </>
  );
}
