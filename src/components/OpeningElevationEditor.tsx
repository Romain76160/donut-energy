import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { localeFor, type Language } from "../i18n";
import { formatNumber, normalizeProfile, wallLength, type Wall, type WallOpening } from "../model";
import { normalizeOpening, openingTypeLabel } from "../openings";
import "../openings.css";

type Props = {
  wall: Wall;
  openings: WallOpening[];
  language: Language;
  onChange: (openings: WallOpening[]) => void;
};

type DragState = {
  id: string;
  pointerId: number;
  draft: WallOpening[];
};

const WIDTH = 312;
const HEIGHT = 190;
const PADDING_X = 22;
const PADDING_TOP = 18;
const GROUND_Y = 156;

export function OpeningElevationEditor({ wall, openings, language, onChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const length = Math.max(0.2, wallLength(wall));
  const profile = useMemo(() => normalizeProfile(wall), [wall]);
  const displayed = drag?.draft ?? openings;
  const maxHeight = Math.max(3.2, wall.height * 1.25, ...profile.map((point) => point.height * 1.12));
  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = GROUND_Y - PADDING_TOP;
  const locale = localeFor(language);

  const xFor = (position: number) => PADDING_X + position / length * plotWidth;
  const yFor = (height: number) => GROUND_Y - height / maxHeight * plotHeight;

  const pointerToOpening = (event: ReactPointerEvent<SVGGElement>, opening: WallOpening) => {
    const svg = svgRef.current;
    if (!svg) return opening;
    const rect = svg.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width * WIDTH;
    const y = (event.clientY - rect.top) / rect.height * HEIGHT;
    const rawPosition = (x - PADDING_X) / plotWidth * length;
    const half = opening.width / 2;
    const position = Math.max(half, Math.min(length - half, rawPosition));

    if (opening.type !== "window") return normalizeOpening({ ...opening, position, sillHeight: 0 }, wall);

    const centerHeight = Math.max(0, Math.min(maxHeight, (GROUND_Y - y) / plotHeight * maxHeight));
    const sillHeight = Math.max(0, Math.min(wall.height - opening.height, centerHeight - opening.height / 2));
    return normalizeOpening({ ...opening, position, sillHeight }, wall);
  };

  const wallPolygon = [
    `${PADDING_X},${GROUND_Y}`,
    ...profile.map((point) => `${xFor(point.position)},${yFor(point.height)}`),
    `${WIDTH - PADDING_X},${GROUND_Y}`,
  ].join(" ");

  const labels = language === "fr" ? {
    title: "Élévation interactive",
    help: "Glissez une ouverture horizontalement. Pour une fenêtre, glissez aussi verticalement pour régler l’allège.",
    position: "Position",
    sill: "Allège",
  } : {
    title: "Interactive elevation",
    help: "Drag an opening horizontally. For a window, drag vertically to adjust the sill height too.",
    position: "Position",
    sill: "Sill",
  };

  return (
    <div className="opening-elevation-editor">
      <div className="opening-elevation-head">
        <strong>{labels.title}</strong>
        <small>{labels.help}</small>
      </div>
      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="opening-elevation-svg"
        role="img"
        aria-label={labels.title}
        onClick={() => setSelectedId(null)}
      >
        <line className="opening-elevation-ground" x1={PADDING_X} y1={GROUND_Y} x2={WIDTH - PADDING_X} y2={GROUND_Y} />
        <polygon className="opening-elevation-wall" points={wallPolygon} />
        <polyline className="opening-elevation-profile" points={profile.map((point) => `${xFor(point.position)},${yFor(point.height)}`).join(" ")} />

        {displayed.map((opening) => {
          const normalized = normalizeOpening(opening, wall);
          const x = xFor(normalized.position - normalized.width / 2);
          const width = normalized.width / length * plotWidth;
          const top = yFor(normalized.sillHeight + normalized.height);
          const bottom = yFor(normalized.sillHeight);
          const height = Math.max(4, bottom - top);
          const selected = selectedId === normalized.id;
          return (
            <g
              key={normalized.id}
              className={`opening-elevation-item ${normalized.type}${selected ? " selected" : ""}${drag?.id === normalized.id ? " dragging" : ""}`}
              onClick={(event) => {
                event.stopPropagation();
                setSelectedId(normalized.id);
              }}
              onPointerDown={(event) => {
                event.stopPropagation();
                event.currentTarget.setPointerCapture(event.pointerId);
                setSelectedId(normalized.id);
                setDrag({ id: normalized.id, pointerId: event.pointerId, draft: openings.map((item) => ({ ...item })) });
              }}
              onPointerMove={(event) => {
                if (!drag || drag.id !== normalized.id || drag.pointerId !== event.pointerId) return;
                const source = drag.draft.find((item) => item.id === normalized.id) ?? normalized;
                const nextOpening = pointerToOpening(event, source);
                setDrag((current) => current ? {
                  ...current,
                  draft: current.draft.map((item) => item.id === normalized.id ? nextOpening : item),
                } : current);
              }}
              onPointerUp={(event) => {
                if (!drag || drag.id !== normalized.id || drag.pointerId !== event.pointerId) return;
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                const next = drag.draft.map((item) => item.id === normalized.id ? pointerToOpening(event, item) : item);
                setDrag(null);
                onChange(next.map((item) => normalizeOpening(item, wall)));
              }}
              onPointerCancel={(event) => {
                if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                setDrag(null);
              }}
            >
              <rect x={x} y={top} width={Math.max(5, width)} height={height} rx="2" />
              <line x1={x + 3} y1={top + 3} x2={x + Math.max(5, width) - 3} y2={top + height - 3} />
              <line x1={x + Math.max(5, width) - 3} y1={top + 3} x2={x + 3} y2={top + height - 3} />
              {selected ? (
                <>
                  <text x={x + Math.max(5, width) / 2} y={Math.max(12, top - 8)} textAnchor="middle">{openingTypeLabel(normalized.type, language)}</text>
                  <text x={x + Math.max(5, width) / 2} y={Math.min(HEIGHT - 8, bottom + 15)} textAnchor="middle">
                    {labels.position} {formatNumber(normalized.position, 2, locale)} m{normalized.type === "window" ? ` · ${labels.sill} ${formatNumber(normalized.sillHeight, 2, locale)} m` : ""}
                  </text>
                </>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
