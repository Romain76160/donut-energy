import { useEffect, useRef, useState } from "react";
import { PlusIcon, PointerIcon, WallIcon, WindowIcon } from "../icons";
import {
  getJoineryPlacement,
  JOINERY_PLACEMENT_CHANGE_EVENT,
  setJoineryPlacement,
  type JoineryPlacementSelection,
} from "../joineryPlacement";
import { translations, type Language } from "../i18n";
import type { EditorMode, Level, OpeningType, PhysicalWallType, Point, Wall } from "../model";
import {
  loadWallDefaults,
  resetWallTemplate,
  saveWallDefaults,
  wallTemplateFromWall,
  wallTemplateThickness,
} from "../wallDefaults";
import { loadWindowTypes, WINDOW_TYPES_CHANGE_EVENT, type WindowTypeDefinition } from "../windowTypes";
import "../left-joinery.css";
import "../model-sidebar-tools.css";
import "../virtual-walls.css";
import { WindowDesignerDialog } from "./WindowDesignerDialog";

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
  const joineryLabel = language === "fr" ? "Menuiseries" : "Joinery";
  const joineryHint = language === "fr" ? "Choisissez puis cliquez sur un mur du plan" : "Choose, then click a wall on the plan";
  const windowLabel = language === "fr" ? "Fenêtre" : "Window";
  const doorLabel = language === "fr" ? "Porte" : "Door";
  const glazedDoorLabel = language === "fr" ? "Baie vitrée" : "Glazed door";
  const windowTypeLabel = language === "fr" ? "Type de fenêtre" : "Window type";
  const standardWindowLabel = language === "fr" ? "Fenêtre standard" : "Standard window";
  const designerLabel = language === "fr" ? "Éditeur de fenêtres" : "Window designer";
  const placementActiveLabel = language === "fr" ? "Pose active · Échap pour quitter" : "Placement active · Escape to exit";
  const [openDefaultType, setOpenDefaultType] = useState<PhysicalWallType | null>(null);
  const [sidebarDefaults, setSidebarDefaults] = useState(loadWallDefaults);
  const [joineryPanelOpen, setJoineryPanelOpen] = useState(false);
  const [joinerySelection, setJoinerySelectionState] = useState<JoineryPlacementSelection | null>(getJoineryPlacement);
  const [windowTypes, setWindowTypes] = useState<WindowTypeDefinition[]>(loadWindowTypes);
  const [windowDesignerOpen, setWindowDesignerOpen] = useState(false);
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

  useEffect(() => {
    const handlePlacementChange = (event: Event) => {
      setJoinerySelectionState((event as CustomEvent<JoineryPlacementSelection | null>).detail ?? null);
    };
    const handleWindowTypesChange = (event: Event) => {
      const detail = (event as CustomEvent<{ types?: WindowTypeDefinition[] }>).detail;
      setWindowTypes(Array.isArray(detail?.types) ? detail.types : loadWindowTypes());
    };
    window.addEventListener(JOINERY_PLACEMENT_CHANGE_EVENT, handlePlacementChange);
    window.addEventListener(WINDOW_TYPES_CHANGE_EVENT, handleWindowTypesChange);
    return () => {
      window.removeEventListener(JOINERY_PLACEMENT_CHANGE_EVENT, handlePlacementChange);
      window.removeEventListener(WINDOW_TYPES_CHANGE_EVENT, handleWindowTypesChange);
    };
  }, []);

  useEffect(() => {
    if (!joinerySelection || windowDesignerOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setJoineryPlacement(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [joinerySelection, windowDesignerOpen]);

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

  const activateMode = (nextMode: EditorMode) => {
    setJoineryPlacement(null);
    setJoineryPanelOpen(false);
    onModeChange(nextMode);
  };

  const chooseJoinery = (openingType: OpeningType) => {
    onModeChange("select");
    const next: JoineryPlacementSelection = {
      openingType,
      windowTypeId: openingType === "window" ? joinerySelection?.windowTypeId : undefined,
    };
    setJoineryPlacement(next);
    setJoineryPanelOpen(true);
  };

  const updateWindowPlacementType = (windowTypeId: string) => {
    const next: JoineryPlacementSelection = { openingType: "window", windowTypeId: windowTypeId || undefined };
    onModeChange("select");
    setJoineryPlacement(next);
  };

  return (
    <>
      <aside className="model-sidebar" aria-label={text.buildingModel}>
        <div className="sidebar-scroll">
          <h2>{text.model}</h2>
          <div className="tools" ref={toolsRef}>
            <button className={mode === "select" && !joinerySelection ? "active" : ""} onClick={() => activateMode("select")}>
              <PointerIcon /> {text.select}
            </button>

            <div className="tool-row">
              <button className={mode === "draw-external" ? "active" : ""} onClick={() => activateMode("draw-external")}>
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
              <button className={mode === "draw-internal" ? "active" : ""} onClick={() => activateMode("draw-internal")}>
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

            <button className={`virtual-tool ${mode === "draw-virtual" ? "active" : ""}`} onClick={() => activateMode("draw-virtual")}>
              <WallIcon /> {virtualLabel}
            </button>
            <button className={mode === "node" ? "active" : ""} onClick={() => activateMode("node")}>
              <PlusIcon /> {text.addNode}
            </button>

            <div className="joinery-tool-block">
              <button
                type="button"
                className={`joinery-main-tool${joinerySelection ? " active" : ""}`}
                onClick={() => {
                  onModeChange("select");
                  setJoineryPanelOpen((current) => {
                    const next = !current;
                    if (!next) setJoineryPlacement(null);
                    return next;
                  });
                }}
                aria-expanded={joineryPanelOpen}
              >
                <WindowIcon /> {joineryLabel}<span className="joinery-chevron">{joineryPanelOpen ? "−" : "+"}</span>
              </button>

              {joineryPanelOpen ? (
                <div className="joinery-left-panel">
                  <strong>{joineryHint}</strong>
                  <div className="joinery-left-types">
                    <button type="button" className={joinerySelection?.openingType === "window" ? "active" : ""} onClick={() => chooseJoinery("window")}>{windowLabel}</button>
                    <button type="button" className={joinerySelection?.openingType === "door" ? "active" : ""} onClick={() => chooseJoinery("door")}>{doorLabel}</button>
                    <button type="button" className={joinerySelection?.openingType === "glazed-door" ? "active" : ""} onClick={() => chooseJoinery("glazed-door")}>{glazedDoorLabel}</button>
                  </div>
                  {joinerySelection?.openingType === "window" ? (
                    <label className="joinery-window-type-select">
                      <span>{windowTypeLabel}</span>
                      <select value={joinerySelection.windowTypeId ?? ""} onChange={(event) => updateWindowPlacementType(event.target.value)}>
                        <option value="">{standardWindowLabel}</option>
                        {windowTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
                      </select>
                    </label>
                  ) : null}
                  {joinerySelection ? <div className="joinery-left-hint">{placementActiveLabel}</div> : null}
                  <button type="button" className="joinery-designer-launch" onClick={() => setWindowDesignerOpen(true)}><WindowIcon /> {designerLabel}</button>
                </div>
              ) : null}
            </div>
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
              <button key={level.id} className={level.id === activeLevelId ? "active" : ""} onClick={() => { setJoineryPlacement(null); onSelectLevel(level.id); }}>
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
        <button className="add-wall-button" onClick={() => activateMode("draw-external")}>
          <PlusIcon /> {text.drawExternal}
        </button>
      </aside>

      <WindowDesignerDialog open={windowDesignerOpen} language={language} onClose={() => setWindowDesignerOpen(false)} />
    </>
  );
}
