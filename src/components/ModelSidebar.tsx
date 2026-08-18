import { PlusIcon, PointerIcon, WallIcon } from "../icons";
import { translations, type Language } from "../i18n";
import type { EditorMode, Level, Point, Wall } from "../model";

type Props = {
  mode: EditorMode;
  levels: Level[];
  activeLevelId: string;
  walls: Wall[];
  roomCount: number;
  selectedWallId: string | null;
  draftStart: Point | null;
  drawLength: number;
  drawAngle: number;
  language: Language;
  onModeChange: (mode: EditorMode) => void;
  onSelectWall: (id: string) => void;
  onSelectLevel: (id: string) => void;
  onAddLevel: () => void;
  onDrawLengthChange: (value: number) => void;
  onDrawAngleChange: (value: number) => void;
  onCreateVector: () => void;
  onFinishDrawing: () => void;
};

const drawingMode = (mode: EditorMode) => mode === "draw-external" || mode === "draw-internal";

export function ModelSidebar({
  mode,
  levels,
  activeLevelId,
  walls,
  roomCount,
  selectedWallId,
  draftStart,
  drawLength,
  drawAngle,
  language,
  onModeChange,
  onSelectWall,
  onSelectLevel,
  onAddLevel,
  onDrawLengthChange,
  onDrawAngleChange,
  onCreateVector,
  onFinishDrawing,
}: Props) {
  const text = translations[language];

  return (
    <aside className="model-sidebar" aria-label={text.buildingModel}>
      <div className="sidebar-scroll">
        <h2>{text.model}</h2>
        <div className="tools">
          <button className={mode === "select" ? "active" : ""} onClick={() => onModeChange("select")}>
            <PointerIcon /> {text.select}
          </button>
          <button className={mode === "draw-external" ? "active" : ""} onClick={() => onModeChange("draw-external")}>
            <WallIcon /> {text.drawExternal}
          </button>
          <button className={mode === "draw-internal" ? "active" : ""} onClick={() => onModeChange("draw-internal")}>
            <WallIcon /> {text.drawInternal}
          </button>
          <button className={mode === "node" ? "active" : ""} onClick={() => onModeChange("node")}>
            <PlusIcon /> {text.addNode}
          </button>
        </div>

        {drawingMode(mode) ? (
          <div className="precise-draw-panel">
            <div className="mini-heading">{text.vectorDrawing}</div>
            <div className="vector-fields">
              <label>
                <span>{text.distance}</span>
                <div className="unit-input compact"><input type="number" min="0.1" step="0.1" value={drawLength} onChange={(event) => onDrawLengthChange(Math.max(0.1, Number(event.target.value)))} /><b>m</b></div>
              </label>
              <label>
                <span>{text.angle}</span>
                <div className="unit-input compact"><input type="number" step="1" value={drawAngle} onChange={(event) => onDrawAngleChange(Number(event.target.value))} /><b>°</b></div>
              </label>
            </div>
            <button className="vector-create" onClick={onCreateVector} disabled={!draftStart}>{text.createSegment}</button>
            {!draftStart ? <p>{text.clickStartFirst}</p> : null}
            <button className="finish-draw" onClick={onFinishDrawing}>{text.finishDrawing}</button>
          </div>
        ) : null}

        <div className="sidebar-divider" />
        <div className="sidebar-section-heading"><span>{text.levels}</span><button className="tiny-add" onClick={onAddLevel} aria-label={text.addLevel}><PlusIcon /></button></div>
        <div className="level-list">
          {levels.map((level) => (
            <button key={level.id} className={level.id === activeLevelId ? "active" : ""} onClick={() => onSelectLevel(level.id)}>
              <span>{level.name}</span><small>{level.elevation.toFixed(2)} m</small>
            </button>
          ))}
        </div>

        <div className="sidebar-divider" />
        <div className="wall-list-heading">{text.walls} ({walls.length})</div>
        <div className="wall-list">
          {walls.map((wall) => (
            <button
              key={wall.id}
              className={`${selectedWallId === wall.id ? "selected" : ""} ${wall.type}`}
              onClick={() => onSelectWall(wall.id)}
            >
              <span className="wall-line-icon" />
              <span>{wall.name}</span>
              <small>{wall.type === "external" ? text.external : text.internal}</small>
            </button>
          ))}
        </div>

        <div className="room-summary">
          <strong>{text.rooms}</strong>
          <span>{text.roomCount(roomCount)}</span>
        </div>
      </div>
      <button className="add-wall-button" onClick={() => onModeChange("draw-external")}>
        <PlusIcon /> {text.drawExternal}
      </button>
    </aside>
  );
}
