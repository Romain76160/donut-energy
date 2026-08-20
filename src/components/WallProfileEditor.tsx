import { useEffect, useMemo, useRef, useState } from "react";
import { localeFor, type Language } from "../i18n";
import { createId, formatNumber, normalizeProfile, wallLength, type ProfilePoint, type Wall } from "../model";
import "../wall-profile-editor.css";

type Props = {
  wall: Wall;
  language: Language;
  onProfileChange: (profile: ProfilePoint[]) => void;
  onLengthChange: (length: number) => void;
};

const WIDTH = 312;
const HEIGHT = 190;
const PADDING_X = 22;
const PADDING_TOP = 18;
const GROUND_Y = 150;

export function WallProfileEditor({ wall, language, onProfileChange, onLengthChange }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const length = Math.max(0.2, wallLength(wall));
  const sourceProfile = useMemo(() => normalizeProfile(wall), [wall]);
  const [draft, setDraft] = useState<ProfilePoint[]>(sourceProfile);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);
  const locale = localeFor(language);

  useEffect(() => {
    if (draggingId) return;
    setDraft(sourceProfile);
  }, [sourceProfile, draggingId]);

  const maxHeight = Math.max(3.4, wall.height * 1.75, ...draft.map((point) => point.height * 1.18));
  const plotWidth = WIDTH - PADDING_X * 2;
  const plotHeight = GROUND_Y - PADDING_TOP;

  const toCanvas = (point: ProfilePoint) => ({
    ...point,
    x: PADDING_X + point.position / length * plotWidth,
    y: GROUND_Y - point.height / maxHeight * plotHeight,
  });

  const coordinates = draft.map(toCanvas);
  const polygon = [
    `${PADDING_X},${GROUND_Y}`,
    ...coordinates.map((point) => `${point.x},${point.y}`),
    `${WIDTH - PADDING_X},${GROUND_Y}`,
  ].join(" ");

  const pointerToProfile = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { position: length / 2, height: wall.height };
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * WIDTH;
    const y = (clientY - rect.top) / rect.height * HEIGHT;
    return {
      position: Math.max(0.01, Math.min(length - 0.01, (x - PADDING_X) / plotWidth * length)),
      height: Math.max(0.1, Math.min(maxHeight, (GROUND_Y - y) / plotHeight * maxHeight)),
    };
  };

  const commit = (next: ProfilePoint[]) => {
    const normalized = normalizeProfile({ ...wall, profile: next });
    setDraft(normalized);
    onProfileChange(normalized);
  };

  const updatePoint = (id: string, patch: Partial<ProfilePoint>, commitNow = false) => {
    setDraft((current) => {
      const next = current.map((point, index) => {
        if (point.id !== id) return point;
        const endpoint = index === 0 || index === current.length - 1;
        return {
          ...point,
          position: endpoint ? point.position : Math.max(0.01, Math.min(length - 0.01, patch.position ?? point.position)),
          height: Math.max(0.1, patch.height ?? point.height),
        };
      }).sort((a, b) => a.position - b.position);
      if (commitNow) onProfileChange(normalizeProfile({ ...wall, profile: next }));
      return next;
    });
  };

  const addPointAt = (clientX: number, clientY: number) => {
    const value = pointerToProfile(clientX, clientY);
    const next = [...draft, { id: createId(), ...value }].sort((a, b) => a.position - b.position);
    const added = next.find((point) => point.position === value.position && point.height === value.height);
    setSelectedId(added?.id ?? null);
    setAddMode(false);
    commit(next);
  };

  const selected = draft.find((point) => point.id === selectedId) ?? null;
  const selectedCanvas = selected ? toCanvas(selected) : null;
  const selectedIndex = selected ? draft.findIndex((point) => point.id === selected.id) : -1;
  const selectedIsEndpoint = selectedIndex === 0 || selectedIndex === draft.length - 1;

  const labels = language === "fr" ? {
    add: "Ajouter un point",
    adding: "Cliquez dans le dessin",
    help: "Glissez les points. Double-cliquez dans le dessin pour en ajouter un. Les cotes sont modifiables directement.",
    position: "Position",
    height: "Hauteur",
    delete: "Supprimer",
    length: "Longueur du mur",
  } : {
    add: "Add point",
    adding: "Click in the drawing",
    help: "Drag points. Double-click the drawing to add one. Dimensions can be edited directly.",
    position: "Position",
    height: "Height",
    delete: "Delete",
    length: "Wall length",
  };

  return (
    <div className="profile-editor">
      <div className="profile-editor-toolbar">
        <button type="button" className={addMode ? "active" : ""} onClick={() => setAddMode((current) => !current)}>
          <span aria-hidden="true">＋</span>{addMode ? labels.adding : labels.add}
        </button>
        <small>{labels.help}</small>
      </div>

      <div className={`profile-editor-stage${addMode ? " adding" : ""}`}>
        <svg
          ref={svgRef}
          className="profile-editor-svg"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={language === "fr" ? "Profil de mur éditable" : "Editable wall elevation"}
          onDoubleClick={(event) => addPointAt(event.clientX, event.clientY)}
          onClick={(event) => {
            if (addMode) addPointAt(event.clientX, event.clientY);
            else setSelectedId(null);
          }}
          onPointerMove={(event) => {
            if (!draggingId) return;
            const value = pointerToProfile(event.clientX, event.clientY);
            updatePoint(draggingId, value);
          }}
          onPointerUp={(event) => {
            if (!draggingId) return;
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            setDraggingId(null);
            commit(draft);
          }}
          onPointerCancel={() => setDraggingId(null)}
        >
          <line className="profile-ground" x1={PADDING_X} y1={GROUND_Y} x2={WIDTH - PADDING_X} y2={GROUND_Y} />
          <polygon className="profile-fill" points={polygon} />
          <polyline className="profile-line" points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")} />

          {coordinates.slice(0, -1).map((point, index) => {
            const next = coordinates[index + 1];
            const span = draft[index + 1].position - draft[index].position;
            if (span < 0.08) return null;
            return (
              <text key={`dimension-${point.id}`} className="profile-segment-dimension" x={(point.x + next.x) / 2} y={Math.min(GROUND_Y - 6, (point.y + next.y) / 2 + 18)} textAnchor="middle">
                {formatNumber(span, 2, locale)} m
              </text>
            );
          })}

          {coordinates.map((point) => (
            <g key={point.id}>
              <circle
                className={`profile-handle${selectedId === point.id ? " selected" : ""}`}
                cx={point.x}
                cy={point.y}
                r="7"
                onClick={(event) => { event.stopPropagation(); setSelectedId(point.id); }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  setSelectedId(point.id);
                  setDraggingId(point.id);
                  svgRef.current?.setPointerCapture?.(event.pointerId);
                }}
              />
            </g>
          ))}
        </svg>

        <div className="profile-total-length" title={labels.length}>
          <input type="number" min="0.2" step="0.1" value={length.toFixed(2)} onChange={(event) => onLengthChange(Math.max(0.2, Number(event.target.value)))} />
          <span>m</span>
        </div>

        {selected && selectedCanvas ? (
          <div
            className="profile-point-popover"
            style={{ left: `${selectedCanvas.x / WIDTH * 100}%`, top: `${Math.max(4, selectedCanvas.y / HEIGHT * 100)}%` }}
            onPointerDown={(event) => event.stopPropagation()}
          >
            {!selectedIsEndpoint ? (
              <label><span>{labels.position}</span><input type="number" min="0.01" max={length - 0.01} step="0.05" value={selected.position.toFixed(2)} onChange={(event) => updatePoint(selected.id, { position: Number(event.target.value) }, true)} /></label>
            ) : null}
            <label><span>{labels.height}</span><input type="number" min="0.1" step="0.05" value={selected.height.toFixed(2)} onChange={(event) => updatePoint(selected.id, { height: Number(event.target.value) }, true)} /></label>
            {!selectedIsEndpoint && draft.length > 2 ? (
              <button type="button" onClick={() => { setSelectedId(null); commit(draft.filter((point) => point.id !== selected.id)); }}>{labels.delete}</button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
