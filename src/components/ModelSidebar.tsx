import { useEffect, useRef, useState } from "react";
import { PlusIcon, PointerIcon, WallIcon } from "../icons";
import { translations, type Language } from "../i18n";
import type { EditorMode, Level, PhysicalWallType, Point, Wall } from "../model";
import {
  loadWallDefaults,
  resetWallTemplate,
  saveWallDefaults,
  wallTemplateFromWall,
  wallTemplateThickness,
} from "../wallDefaults";
import "../model-sidebar-tools.css";
import "../virtual-walls.css";

type Props = {
  mode: EditorMode;
  levels: Level[];
  activeLevelId: string;
  walls: Wall[];
  roomCount: number;
  selectedWallId: string | null;
  defaultsOpen: boolean;
  draftStart: Point | null;
  drawLength: number;
  drawAngle: number;
  language: Language;
  onModeChange: (mode: EditorMode) => void;
  onSelectWall: (id: string) => void;
  onOpenWallDefaults: () => void;
  onSelectLevel: (id: string) => void;
  onAddLevel: () => void;
  onDrawLengthChange: (value: number) => void;
  onDrawAngleChange: (value: number) => void;
  onCreateVector: () => void;
  onFinishDrawing: () => void;
};

const drawingMode = (mode: EditorMode) => mode === "draw-external" || mode === "draw-internal" || mode === "draw-virtual";

export function ModelSidebar({
  mode,
  levels,
  activeLevelId,
  walls,
  roomCount,
  selectedWallId,
  defaultsOpen,
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
  const virtualLabel = language === "fr" ? "Séparation virtuelle" : "Virtual boundary";
  const voidLabel = language === "fr" ? "vide" : "open";
  const externalDefaultLabel = language === "fr" ? "Mur extérieur par défaut" : "Default external wall";
  const internalDefaultLabel = language === "fr" ? "Mur intérieur par défaut" : "Default internal wall";
  const standardLabel = language === "fr" ? "Configuration standard" : "Standard configuration";
  const currentLabel = language === "fr" ? "Actuel" : "Current";
  const thicknessLabel = language === "fr" ? "Épaisseur" : "Thickness";
  const chooseLabel = language === "fr" ? "Choisir" : "Choose";
  const [openDefaultType, setOpenDefaultType] = useState<PhysicalWallType | null>(null);
  const [sidebarDefaults, setSidebarDefaults] = useState(loadWallDefaults);
  const toolsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openDefaultType) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) setOpenDefaultType(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenDefaultType(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openDefaultType]);

  useEffect(() => {
    if (!drawingMode(mode)) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpenDefaultType(null);
      onFinishDrawing();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [mode, onFinishDrawing]);

  const wallTypeLabel = (wall: Wall) => wall.type === "external"
    ? text.external
    : wall.type === "internal"
      ? text.internal
      : language === "fr" ? "Virtuel" : "Virtual";

  const setDefaultWall = (type: PhysicalWallType, wallId: string) => {
    const wall = walls.find((candidate) => candidate.id === wallId && candidate.type === type);
    const next = {
      ...sidebarDefaults,
      [type]: wall ? wallTemplateFromWall(wall) : resetWallTemplate(type),
    };
    setSidebarDefaults(next);
    saveWallDefaults(next);
  };

  const defaultTooltip = (type: PhysicalWallType) => {
    if (openDefaultType !== type) return null;
    const template = sidebarDefaults[type];
    const candidates = walls.filter((wall) => wall.type === type);
    const title = type === "external" ? externalDefaultLabel : internalDefaultLabel;
    return (
      <div className="wall-default-tooltip" role="dialog" aria-label={title}>
        <strong>{title}</strong>
        <div className="wall-default-tooltip-current">
          <span>{currentLabel}</span>
          <b>{template.sourceWallName ?? standardLabel}</b>
        </div>
        <label>
          <span>{chooseLabel}</span>
          <select
            value={template.sourceWallId && candidates.some((wall) => wall.id === template.sourceWallId) ? template.sourceWallId : ""}
            onChange={(event) => setDefaultWall(type, event.target.value)}
          >
            <option value="">{standardLabel}</option>
            {candidates.map((wall) => <option key={wall.id} value={wall.id}>{wall.name}</option>)}
          </select>
        </label>
        <div className="wall-default-tooltip-meta">
          <span>{thicknessLabel}</span>
          <b>{wallTemplateThickness(template)} mm</b>
        </div>
      </div>
    );
  };

  return (
    <aside className="model-sidebar" aria-label={text.buildingModel}>
      <div className="sidebar-scroll">
        <h2>{text.model}</h2>
        <div className="tools" ref={toolsRef}>
          <button className={mode === "select" ? "active" : ""} onClick={() => onModeChange("select")}>
            <PointerIcon /> {text.select}
          </button>

          <div className="tool-row">
            <button className={mode === "draw-external" ? "active" : ""} onClick={() => onModeChange("draw-external")}>
              <WallIcon /> {text.drawExternal}
            </button>
            <button
              type="button"
              className={`tool-default-action${openDefaultType === "external" ? " active" : ""}`}
              onClick={() => setOpenDefaultType((current) => current === "external" ? null : "external")}
              aria-label={externalDefaultLabel}
              title={externalDefaultLabel}
              aria-expanded={openDefaultType === "external"}
            >
              <WallIcon />
            </button>
            {defaultTooltip("external")}
          </div>

          <div className="tool-row">
            <button className={mode === "draw-internal" ? "active" : ""} onClick={() => onModeChange("draw-internal")}>
              <WallIcon /> {text.drawInternal}
            </button>
            <button
              type="button"
              className={`tool-default-action${openDefaultType === "internal" ? " active" : ""}`}
              onClick={() => setOpenDefaultType((current) => current === "internal" ? null : "internal")}
              aria-label={internalDefaultLabel}
              title={internalDefaultLabel}
              aria-expanded={openDefaultType === "internal"}
            >
              <WallIcon />
            </button>
            {defaultTooltip("internal")}
          </div>

          <button className={`virtual-tool ${mode === "draw-virtual" ? "active" : ""}`} onClick={() => onModeChange("draw-virtual")}>
            <WallIcon /> {virtualLabel}
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
              <span>{level.name}</span>
              <small>{level.elevation.toFixed(2)} → {level.ceilingElevation.toFixed(2)} m{level.openToBelow ? ` · ${voidLabel}` : ""}</small>
            </button>
          ))}
        </div>

        <div className="sidebar-divider" />
        <div className="wall-list-heading">{text.walls} ({walls.length})</div>
        <div className="wall-list">
          {walls.map((wall) => (
            <button
              key={wall.id}
              className={`${selectedWallId === wall.id && !defaultsOpen ? "selected" : ""} ${wall.type}`}
              onClick={() => onSelectWall(wall.id)}
            >
              <span className="wall-line-icon" />
              <span>{wall.name}</span>
              <small>{wallTypeLabel(wall)}</small>
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
