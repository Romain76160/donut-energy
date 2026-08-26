import { useEffect } from "react";
import { MoveIcon, PlusIcon, PointerIcon, TrashIcon, WallIcon } from "../icons";
import { translations, type Language } from "../i18n";
import type { EditorMode, Level, Point } from "../model";
import "../core-wall-tools.css";

type Props = {
  mode: EditorMode;
  levels: Level[];
  activeLevelId: string;
  roomCount: number;
  draftStart: Point | null;
  drawLength: number;
  drawAngle: number;
  language: Language;
  onModeChange: (mode: EditorMode) => void;
  onSelectLevel: (id: string) => void;
  onAddLevel: () => void;
  onDrawLengthChange: (value: number) => void;
  onDrawAngleChange: (value: number) => void;
  onCreateVector: () => void;
  onFinishDrawing: () => void;
};

export function ModelSidebar({
  mode,
  levels,
  activeLevelId,
  roomCount,
  draftStart,
  drawLength,
  drawAngle,
  language,
  onModeChange,
  onSelectLevel,
  onAddLevel,
  onDrawLengthChange,
  onDrawAngleChange,
  onCreateVector,
  onFinishDrawing,
}: Props) {
  const text = translations[language];
  const labels = language === "fr" ? {
    select: "Sélection",
    create: "Créer",
    move: "Déplacer",
    erase: "Effacer",
    walls: "Murs",
    libraryRight: "Choisissez le type de mur dans la bibliothèque à droite, puis tracez-le dans le plan.",
    moveHint: "Glissez un mur pour le déplacer, ou un point pour modifier sa géométrie.",
    eraseHint: "Cliquez sur un mur pour le supprimer.",
    selectHint: "Cliquez sur un mur pour afficher ses propriétés. Vous pourrez aussi le passer en virtuel.",
    void: "vide",
  } : {
    select: "Select",
    create: "Create",
    move: "Move",
    erase: "Erase",
    walls: "Walls",
    libraryRight: "Choose the wall type from the library on the right, then draw it on plan.",
    moveHint: "Drag a wall to move it, or a point to edit its geometry.",
    eraseHint: "Click a wall to delete it.",
    selectHint: "Click a wall to show its properties. You can also make it virtual.",
    void: "open",
  };

  useEffect(() => {
    if (mode !== "create") return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onFinishDrawing();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mode, onFinishDrawing]);

  const activate = (next: EditorMode) => {
    onModeChange(next);
  };

  return (
    <aside className="model-sidebar core-model-sidebar" aria-label={text.buildingModel}>
      <div className="sidebar-scroll">
        <h2>{text.model}</h2>

        <div className="core-wall-tools" role="toolbar" aria-label={language === "fr" ? "Outils de murs" : "Wall tools"}>
          <button className={mode === "select" ? "active" : ""} onClick={() => activate("select")}>
            <PointerIcon />
            <span>{labels.select}</span>
          </button>
          <button className={mode === "create" ? "active" : ""} onClick={() => activate("create")}>
            <PlusIcon />
            <span>{labels.create}</span>
          </button>
          <button className={mode === "move" ? "active" : ""} onClick={() => activate("move")}>
            <MoveIcon />
            <span>{labels.move}</span>
          </button>
          <button className={mode === "erase" ? "active erase" : "erase"} onClick={() => activate("erase")}>
            <TrashIcon />
            <span>{labels.erase}</span>
          </button>
        </div>

        <div className={`core-tool-context ${mode}`}>
          {mode === "create" ? (
            <>
              <div className="core-tool-object active">
                <WallIcon />
                <div>
                  <strong>{labels.walls}</strong>
                  <small>{labels.libraryRight}</small>
                </div>
              </div>

              <div className="precise-draw-panel compact-create-panel">
                <div className="mini-heading">{text.vectorDrawing}</div>
                <div className="vector-fields">
                  <label>
                    <span>{text.distance}</span>
                    <div className="unit-input compact">
                      <input type="number" min="0.1" step="0.1" value={drawLength} onChange={(event) => onDrawLengthChange(Math.max(0.1, Number(event.target.value)))} />
                      <b>m</b>
                    </div>
                  </label>
                  <label>
                    <span>{text.angle}</span>
                    <div className="unit-input compact">
                      <input type="number" step="1" value={drawAngle} onChange={(event) => onDrawAngleChange(Number(event.target.value))} />
                      <b>°</b>
                    </div>
                  </label>
                </div>
                <button className="vector-create" onClick={onCreateVector} disabled={!draftStart}>{text.createSegment}</button>
                {!draftStart ? <p>{text.clickStartFirst}</p> : null}
              </div>
            </>
          ) : (
            <p className="core-tool-hint">
              {mode === "select" ? labels.selectHint : mode === "move" ? labels.moveHint : labels.eraseHint}
            </p>
          )}
        </div>

        <div className="sidebar-divider" />
        <div className="sidebar-section-heading">
          <span>{text.levels}</span>
          <button className="tiny-add" onClick={onAddLevel} aria-label={text.addLevel}><PlusIcon /></button>
        </div>
        <div className="level-list">
          {levels.map((level) => (
            <button key={level.id} className={level.id === activeLevelId ? "active" : ""} onClick={() => onSelectLevel(level.id)}>
              <span>{level.name}</span>
              <small>{level.elevation.toFixed(2)} → {level.ceilingElevation.toFixed(2)} m{level.openToBelow ? ` · ${labels.void}` : ""}</small>
            </button>
          ))}
        </div>

        <div className="room-summary">
          <strong>{text.rooms}</strong>
          <span>{text.roomCount(roomCount)}</span>
        </div>
      </div>
    </aside>
  );
}
