import { useEffect, useMemo, useRef, useState } from "react";
import { localeFor, materialLabel, type Language } from "../i18n";
import { createId, formatNumber, type SectionPoint, type Wall } from "../model";
import {
  clampWallInclination,
  inclinationFromTopOffset,
  normalizeWallSectionProfile,
  persistWallInclination,
  wallSectionTopOffset,
  wallSectionTrueHeight,
  wallTopOffset,
  wallTotalThickness,
} from "../wallInclination";
import "../wall-section.css";

type Props = {
  wall: Wall;
  language: Language;
  onUpdateWall: (patch: Partial<Wall>) => void;
  onHeightChange: (height: number) => void;
};

const WIDTH = 312;
const HEIGHT = 230;
const GROUND_Y = 184;
const ORIGIN_X = 156;

export function WallSectionView({ wall, language, onUpdateWall, onHeightChange }: Props) {
  const locale = localeFor(language);
  const sourceProfile = useMemo(() => normalizeWallSectionProfile(wall), [wall]);
  const [draft, setDraft] = useState<SectionPoint[]>(sourceProfile);
  const draftRef = useRef<SectionPoint[]>(sourceProfile);
  const svgRef = useRef<SVGSVGElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [addMode, setAddMode] = useState(false);

  useEffect(() => {
    if (draggingId) return;
    setDraft(sourceProfile);
    draftRef.current = sourceProfile;
  }, [sourceProfile, draggingId]);

  const thickness = wallTotalThickness(wall);
  const maxAbsOffset = Math.max(0.6, ...draft.map((point) => Math.abs(point.offset)));
  const scale = Math.min(48, 142 / Math.max(0.5, wall.height), 104 / Math.max(0.8, maxAbsOffset + thickness));

  const toCanvas = (point: SectionPoint) => ({
    ...point,
    x: ORIGIN_X + point.offset * scale,
    y: GROUND_Y - point.height * scale,
  });

  const coordinates = draft.map(toCanvas);
  const polyline = coordinates.map((point) => `${point.x},${point.y}`).join(" ");
  const trueHeight = wallSectionTrueHeight({ ...wall, sectionProfile: draft });
  const topOffset = draft.at(-1)?.offset ?? wallSectionTopOffset(wall);
  const inclination = inclinationFromTopOffset(wall.height, topOffset);

  let remainingThickness = thickness;
  const layerStrokes = wall.layers.map((layer) => {
    const current = {
      id: layer.id,
      color: layer.color,
      name: layer.name,
      thicknessMm: layer.thicknessMm,
      width: Math.max(2.4, remainingThickness * scale),
    };
    remainingThickness = Math.max(0, remainingThickness - layer.thicknessMm / 1000);
    return current;
  });

  const labels = language === "fr" ? {
    title: "COUPE / INCLINAISON",
    help: "Ajoutez et déplacez des points pour créer une coupe cassée. Le point haut règle l’inclinaison globale.",
    add: "Ajouter un point",
    adding: "Cliquez dans la coupe",
    reset: "Mur droit",
    inclination: "Inclinaison",
    vertical: "Vertical",
    realHeight: "Longueur réelle",
    verticalHeight: "Hauteur verticale",
    topOffset: "Déport en tête",
    thickness: "Épaisseur totale",
    pointHeight: "Hauteur",
    pointOffset: "Déport",
    delete: "Supprimer",
    sectionAria: "Vue en coupe éditable du mur",
  } : {
    title: "SECTION / INCLINATION",
    help: "Add and drag points to create a broken section. The top point controls the global inclination.",
    add: "Add point",
    adding: "Click in the section",
    reset: "Straight wall",
    inclination: "Inclination",
    vertical: "Vertical",
    realHeight: "True length",
    verticalHeight: "Vertical height",
    topOffset: "Top offset",
    thickness: "Total thickness",
    pointHeight: "Height",
    pointOffset: "Offset",
    delete: "Delete",
    sectionAria: "Editable inclined wall section",
  };

  const setDraftSafe = (next: SectionPoint[]) => {
    setDraft(next);
    draftRef.current = next;
  };

  const normalizeDraft = (profile: SectionPoint[]) => normalizeWallSectionProfile({ ...wall, sectionProfile: profile });

  const commitProfile = (profile: SectionPoint[]) => {
    const next = normalizeDraft(profile);
    const nextInclination = inclinationFromTopOffset(wall.height, next.at(-1)?.offset ?? 0);
    persistWallInclination(wall.id, nextInclination);
    setDraftSafe(next);
    onUpdateWall({ sectionProfile: next, inclinationDeg: nextInclination });
  };

  const pointerToSection = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return { height: wall.height / 2, offset: 0 };
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) / rect.width * WIDTH;
    const y = (clientY - rect.top) / rect.height * HEIGHT;
    return {
      height: Math.max(0.01, Math.min(wall.height - 0.01, (GROUND_Y - y) / scale)),
      offset: (x - ORIGIN_X) / scale,
    };
  };

  const updatePoint = (id: string, patch: Partial<SectionPoint>, commitNow = false) => {
    const current = draftRef.current;
    const next = current.map((point, index) => {
      if (point.id !== id) return point;
      const isBase = index === 0;
      const isTop = index === current.length - 1;
      return {
        ...point,
        height: isBase ? 0 : isTop ? wall.height : Math.max(0.01, Math.min(wall.height - 0.01, patch.height ?? point.height)),
        offset: isBase ? 0 : Number.isFinite(patch.offset) ? Number(patch.offset) : point.offset,
      };
    }).sort((a, b) => a.height - b.height);
    setDraftSafe(next);
    if (commitNow) commitProfile(next);
  };

  const addPointAt = (clientX: number, clientY: number) => {
    const value = pointerToSection(clientX, clientY);
    const point: SectionPoint = { id: createId(), ...value };
    const next = [...draftRef.current, point].sort((a, b) => a.height - b.height);
    setSelectedId(point.id);
    setAddMode(false);
    commitProfile(next);
  };

  const changeInclination = (value: number) => {
    const nextInclination = clampWallInclination(value);
    const nextTop = wallTopOffset(wall.height, nextInclination);
    const current = draftRef.current;
    const oldTop = current.at(-1)?.offset ?? 0;
    const delta = nextTop - oldTop;
    const next = current.map((point, index) => ({
      ...point,
      offset: index === 0 ? 0 : point.offset + (point.height / Math.max(0.1, wall.height)) * delta,
    }));
    persistWallInclination(wall.id, nextInclination);
    setDraftSafe(next);
    onUpdateWall({ inclinationDeg: nextInclination, sectionProfile: next });
  };

  const resetStraight = () => {
    const next = normalizeWallSectionProfile({ ...wall, inclinationDeg: 90, sectionProfile: undefined });
    persistWallInclination(wall.id, 90);
    setSelectedId(null);
    setAddMode(false);
    setDraftSafe(next);
    onUpdateWall({ sectionProfile: undefined, inclinationDeg: 90 });
  };

  const selected = draft.find((point) => point.id === selectedId) ?? null;
  const selectedCanvas = selected ? toCanvas(selected) : null;
  const selectedIndex = selected ? draft.findIndex((point) => point.id === selected.id) : -1;
  const selectedIsEndpoint = selectedIndex === 0 || selectedIndex === draft.length - 1;

  return (
    <div className="inspector-section wall-section-panel">
      <div className="section-title-row"><h3>{labels.title}</h3><span>{formatNumber(inclination, 0, locale)}°</span></div>
      <p className="section-help">{labels.help}</p>

      <div className="section-editor-toolbar">
        <button type="button" className={addMode ? "active" : ""} onClick={() => setAddMode((current) => !current)}><span aria-hidden="true">＋</span>{addMode ? labels.adding : labels.add}</button>
        <button type="button" onClick={resetStraight}>{labels.reset}</button>
      </div>

      <div className={`section-editor-stage${addMode ? " adding" : ""}`}>
        <svg
          ref={svgRef}
          className="wall-section-preview"
          viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
          role="img"
          aria-label={labels.sectionAria}
          onClick={(event) => {
            if (addMode) addPointAt(event.clientX, event.clientY);
            else setSelectedId(null);
          }}
          onPointerMove={(event) => {
            if (!draggingId) return;
            updatePoint(draggingId, pointerToSection(event.clientX, event.clientY));
          }}
          onPointerUp={(event) => {
            if (!draggingId) return;
            event.currentTarget.releasePointerCapture?.(event.pointerId);
            setDraggingId(null);
            commitProfile(draftRef.current);
          }}
          onPointerCancel={() => setDraggingId(null)}
        >
          <line className="section-ground" x1="18" y1={GROUND_Y} x2={WIDTH - 18} y2={GROUND_Y} />
          <line className="section-vertical-guide" x1={ORIGIN_X} y1={GROUND_Y} x2={ORIGIN_X} y2={GROUND_Y - wall.height * scale} />

          {layerStrokes.map((layer) => (
            <polyline key={layer.id} className="section-layer-polyline" points={polyline} stroke={layer.color} strokeWidth={layer.width}>
              <title>{materialLabel(layer.name, language)} — {layer.thicknessMm} mm</title>
            </polyline>
          ))}
          <polyline className="section-axis-polyline" points={polyline} />

          {coordinates.slice(0, -1).map((point, index) => {
            const next = coordinates[index + 1];
            const segmentLength = Math.hypot(draft[index + 1].height - draft[index].height, draft[index + 1].offset - draft[index].offset);
            return <text key={`section-dim-${point.id}`} className="section-segment-dimension" x={(point.x + next.x) / 2 + 10} y={(point.y + next.y) / 2} textAnchor="start">{formatNumber(segmentLength, 2, locale)} m</text>;
          })}

          {coordinates.map((point, index) => (
            <circle
              key={point.id}
              className={`section-control-point${selectedId === point.id ? " selected" : ""}${index === coordinates.length - 1 ? " top" : ""}`}
              cx={point.x}
              cy={point.y}
              r={index === coordinates.length - 1 ? 8 : 6.5}
              onClick={(event) => { event.stopPropagation(); setSelectedId(point.id); }}
              onPointerDown={(event) => {
                event.stopPropagation();
                setSelectedId(point.id);
                setDraggingId(point.id);
                svgRef.current?.setPointerCapture?.(event.pointerId);
              }}
            />
          ))}
        </svg>

        <div className="section-inline-height" title={labels.verticalHeight}>
          <input type="number" min="0.5" step="0.05" value={wall.height.toFixed(2)} onChange={(event) => onHeightChange(Math.max(0.5, Number(event.target.value)))} /><span>m</span>
        </div>

        <div className="section-inline-angle" title={labels.inclination}>
          <input type="number" min="30" max="150" step="1" value={Math.round(inclination)} onChange={(event) => changeInclination(Number(event.target.value))} /><span>°</span>
        </div>

        {selected && selectedCanvas ? (
          <div className="section-point-popover" style={{ left: `${selectedCanvas.x / WIDTH * 100}%`, top: `${Math.max(4, selectedCanvas.y / HEIGHT * 100)}%` }} onPointerDown={(event) => event.stopPropagation()}>
            {!selectedIsEndpoint ? <label><span>{labels.pointHeight}</span><input type="number" min="0.01" max={wall.height - 0.01} step="0.05" value={selected.height.toFixed(2)} onChange={(event) => updatePoint(selected.id, { height: Number(event.target.value) }, true)} /></label> : null}
            {selectedIndex !== 0 ? <label><span>{labels.pointOffset}</span><input type="number" step="0.05" value={selected.offset.toFixed(2)} onChange={(event) => updatePoint(selected.id, { offset: Number(event.target.value) }, true)} /></label> : null}
            {!selectedIsEndpoint && draft.length > 2 ? <button type="button" onClick={() => { setSelectedId(null); commitProfile(draftRef.current.filter((point) => point.id !== selected.id)); }}>{labels.delete}</button> : null}
          </div>
        ) : null}
      </div>

      <div className="inclination-presets">
        <button onClick={() => changeInclination(75)}>75°</button>
        <button className={Math.abs(inclination - 90) < 0.5 ? "active" : ""} onClick={() => changeInclination(90)}>90° · {labels.vertical}</button>
        <button onClick={() => changeInclination(105)}>105°</button>
      </div>

      <div className="section-metrics">
        <div><span>{labels.verticalHeight}</span><strong>{formatNumber(wall.height, 2, locale)} m</strong></div>
        <div><span>{labels.realHeight}</span><strong>{formatNumber(trueHeight, 2, locale)} m</strong></div>
        <div><span>{labels.topOffset}</span><strong>{formatNumber(topOffset, 2, locale)} m</strong></div>
        <div><span>{labels.thickness}</span><strong>{formatNumber(thickness * 1000, 0, locale)} mm</strong></div>
      </div>
    </div>
  );
}
