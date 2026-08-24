import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { PlusIcon, TrashIcon } from "../icons";
import type { Language } from "../i18n";
import { openingDepthModeLabel } from "../openingDepth";
import {
  createWindowType,
  loadWindowTypes,
  normalizeWindowType,
  saveWindowTypes,
  windowOperationLabel,
  windowTypeGlazingArea,
  type WindowOperation,
  type WindowTypeDefinition,
} from "../windowTypes";
import {
  addWindowDivider,
  defaultWindowDesign,
  loadWindowDesign,
  removeWindowDesign,
  removeWindowDivider,
  saveWindowDesign,
  updateWindowDivider,
  type WindowDesign,
  type WindowDividerOrientation,
} from "../windowDesigns";
import "../window-designer.css";

const OPERATIONS: WindowOperation[] = ["fixed", "casement-1", "casement-2", "tilt-turn", "sliding"];
const WIDTH = 520;
const HEIGHT = 330;
const PAD = 32;

type Tool = "select" | WindowDividerOrientation;

type Props = {
  open: boolean;
  language: Language;
  onClose: () => void;
};

type DividerDrag = { id: string; pointerId: number };

export function WindowDesignerDialog({ open, language, onClose }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [types, setTypes] = useState<WindowTypeDefinition[]>(loadWindowTypes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WindowTypeDefinition>(() => createWindowType());
  const [design, setDesign] = useState<WindowDesign>(() => defaultWindowDesign("casement-1"));
  const [tool, setTool] = useState<Tool>("select");
  const [selectedDividerId, setSelectedDividerId] = useState<string | null>(null);
  const [drag, setDrag] = useState<DividerDrag | null>(null);

  const labels = language === "fr" ? {
    title: "Éditeur de fenêtres",
    subtitle: "Dessinez le cadre, les montants et les traverses puis enregistrez le résultat comme type réutilisable.",
    library: "Bibliothèque",
    newType: "Nouvelle fenêtre",
    editCopy: "Dupliquer pour modifier",
    standard: "Standard",
    custom: "Personnalisé",
    select: "Sélection",
    vertical: "Montant vertical",
    horizontal: "Traverse horizontale",
    removeDivider: "Supprimer l’élément",
    clear: "Effacer les divisions",
    clickHelp: "Choisissez Montant ou Traverse puis cliquez dans la fenêtre. En mode Sélection, glissez une division pour la déplacer.",
    name: "Nom",
    operation: "Ouverture",
    width: "Largeur",
    height: "Hauteur",
    sill: "Allège",
    frameWidth: "Largeur du cadre",
    frameDepth: "Profondeur dormant",
    installation: "Pose",
    uw: "Uw",
    sw: "Sw",
    glazing: "Vitrage brut indicatif",
    save: "Enregistrer",
    delete: "Supprimer ce type",
    close: "Fermer",
  } : {
    title: "Window designer",
    subtitle: "Draw the frame, mullions and transoms, then save the result as a reusable type.",
    library: "Library",
    newType: "New window",
    editCopy: "Duplicate to edit",
    standard: "Standard",
    custom: "Custom",
    select: "Select",
    vertical: "Vertical mullion",
    horizontal: "Horizontal transom",
    removeDivider: "Delete element",
    clear: "Clear divisions",
    clickHelp: "Choose Mullion or Transom, then click inside the window. In Select mode, drag a division to move it.",
    name: "Name",
    operation: "Operation",
    width: "Width",
    height: "Height",
    sill: "Sill",
    frameWidth: "Frame face width",
    frameDepth: "Frame depth",
    installation: "Installation",
    uw: "Uw",
    sw: "Sw",
    glazing: "Indicative gross glazing",
    save: "Save",
    delete: "Delete type",
    close: "Close",
  };

  const customCount = types.filter((type) => !type.builtIn).length;
  const glazingArea = windowTypeGlazingArea(draft);

  const drawingBox = useMemo(() => {
    const availableWidth = WIDTH - PAD * 2;
    const availableHeight = HEIGHT - PAD * 2;
    const scale = Math.min(availableWidth / Math.max(0.2, draft.width), availableHeight / Math.max(0.2, draft.height));
    const width = draft.width * scale;
    const height = draft.height * scale;
    return {
      x: (WIDTH - width) / 2,
      y: (HEIGHT - height) / 2,
      width,
      height,
    };
  }, [draft.width, draft.height]);

  const framePx = Math.max(7, Math.min(Math.min(drawingBox.width, drawingBox.height) * 0.22, draft.frameWidthMm / 1000 * drawingBox.width / Math.max(0.2, draft.width)));
  const inner = {
    x: drawingBox.x + framePx,
    y: drawingBox.y + framePx,
    width: Math.max(8, drawingBox.width - framePx * 2),
    height: Math.max(8, drawingBox.height - framePx * 2),
  };

  const startNew = () => {
    const next = createWindowType(customCount);
    setEditingId(null);
    setDraft(next);
    setDesign(defaultWindowDesign(next.operation));
    setSelectedDividerId(null);
    setTool("select");
  };

  const startType = (type: WindowTypeDefinition) => {
    if (type.builtIn) {
      const copy = { ...type, id: createWindowType().id, name: `${type.name} — copie`, builtIn: false };
      setEditingId(null);
      setDraft(copy);
      setDesign(loadWindowDesign(type.id, type.operation));
    } else {
      setEditingId(type.id);
      setDraft({ ...type, builtIn: false });
      setDesign(loadWindowDesign(type.id, type.operation));
    }
    setSelectedDividerId(null);
    setTool("select");
  };

  useEffect(() => {
    if (!open) return;
    setTypes(loadWindowTypes());
    if (!editingId) startNew();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if ((event.key === "Delete" || event.key === "Backspace") && selectedDividerId) {
        const target = event.target as HTMLElement | null;
        if (target?.tagName === "INPUT" || target?.tagName === "SELECT" || target?.tagName === "TEXTAREA") return;
        event.preventDefault();
        setDesign((current) => removeWindowDivider(current, selectedDividerId));
        setSelectedDividerId(null);
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, selectedDividerId]);

  const pointerRatio = (clientX: number, clientY: number, orientation: WindowDividerOrientation) => {
    const svg = svgRef.current;
    if (!svg) return 0.5;
    const rect = svg.getBoundingClientRect();
    const x = (clientX - rect.left) / Math.max(1, rect.width) * WIDTH;
    const y = (clientY - rect.top) / Math.max(1, rect.height) * HEIGHT;
    if (orientation === "vertical") return (x - inner.x) / Math.max(1, inner.width);
    return (y - inner.y) / Math.max(1, inner.height);
  };

  const addDividerAtPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (tool !== "vertical" && tool !== "horizontal") return;
    const position = pointerRatio(event.clientX, event.clientY, tool);
    const next = addWindowDivider(design, tool, position);
    const created = next.dividers.at(-1);
    setDesign(next);
    setSelectedDividerId(created?.id ?? null);
    setTool("select");
  };

  const save = () => {
    const normalized = normalizeWindowType({ ...draft, builtIn: false }, customCount);
    const next = editingId
      ? types.map((type) => type.id === editingId ? normalized : type)
      : [...types, normalized];
    if (editingId && editingId !== normalized.id) removeWindowDesign(editingId);
    saveWindowTypes(next);
    saveWindowDesign(normalized.id, design);
    setTypes(next);
    setEditingId(normalized.id);
    setDraft(normalized);
  };

  const removeCurrent = () => {
    if (!editingId) return;
    const current = types.find((type) => type.id === editingId);
    if (!current || current.builtIn) return;
    const next = types.filter((type) => type.id !== editingId);
    saveWindowTypes(next);
    removeWindowDesign(editingId);
    setTypes(next);
    startNew();
  };

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="window-designer-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="window-designer-dialog" role="dialog" aria-modal="true" aria-label={labels.title}>
        <header className="window-designer-header">
          <div>
            <h2>{labels.title}</h2>
            <p>{labels.subtitle}</p>
          </div>
          <button type="button" className="window-designer-close" onClick={onClose} aria-label={labels.close}>×</button>
        </header>

        <div className="window-designer-layout">
          <aside className="window-designer-library">
            <div className="window-designer-library-head">
              <strong>{labels.library}</strong>
              <button type="button" onClick={startNew}><PlusIcon /> {labels.newType}</button>
            </div>
            <div className="window-designer-type-list">
              {types.map((type) => (
                <button
                  type="button"
                  key={type.id}
                  className={editingId === type.id ? "active" : ""}
                  onClick={() => startType(type)}
                >
                  <span>{type.name}</span>
                  <small>{type.builtIn ? labels.standard : labels.custom} · {Math.round(type.width * 100)} × {Math.round(type.height * 100)} cm</small>
                  {type.builtIn ? <em>{labels.editCopy}</em> : null}
                </button>
              ))}
            </div>
          </aside>

          <div className="window-designer-main">
            <div className="window-designer-drawing-panel">
              <div className="window-designer-tools">
                <button type="button" className={tool === "select" ? "active" : ""} onClick={() => setTool("select")}>{labels.select}</button>
                <button type="button" className={tool === "vertical" ? "active" : ""} onClick={() => setTool("vertical")}>│ {labels.vertical}</button>
                <button type="button" className={tool === "horizontal" ? "active" : ""} onClick={() => setTool("horizontal")}>─ {labels.horizontal}</button>
                <button type="button" disabled={!selectedDividerId} onClick={() => {
                  if (!selectedDividerId) return;
                  setDesign((current) => removeWindowDivider(current, selectedDividerId));
                  setSelectedDividerId(null);
                }}><TrashIcon /> {labels.removeDivider}</button>
                <button type="button" onClick={() => { setDesign({ dividers: [] }); setSelectedDividerId(null); }}>{labels.clear}</button>
              </div>

              <svg
                ref={svgRef}
                className={`window-designer-canvas tool-${tool}`}
                viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
                onPointerDown={(event) => {
                  if (tool === "vertical" || tool === "horizontal") addDividerAtPointer(event);
                  else setSelectedDividerId(null);
                }}
              >
                <rect className="window-designer-frame" x={drawingBox.x} y={drawingBox.y} width={drawingBox.width} height={drawingBox.height} rx="3" />
                <rect className="window-designer-glass" x={inner.x} y={inner.y} width={inner.width} height={inner.height} />
                {design.dividers.map((divider) => {
                  const selected = divider.id === selectedDividerId;
                  const x = inner.x + inner.width * divider.position;
                  const y = inner.y + inner.height * divider.position;
                  const visible = divider.orientation === "vertical"
                    ? { x1: x, y1: inner.y, x2: x, y2: inner.y + inner.height }
                    : { x1: inner.x, y1: y, x2: inner.x + inner.width, y2: y };
                  return (
                    <g
                      key={divider.id}
                      className={`window-designer-divider ${selected ? "selected" : ""}`}
                      onPointerDown={(event) => {
                        if (tool !== "select") return;
                        event.stopPropagation();
                        event.currentTarget.setPointerCapture(event.pointerId);
                        setSelectedDividerId(divider.id);
                        setDrag({ id: divider.id, pointerId: event.pointerId });
                      }}
                      onPointerMove={(event) => {
                        if (!drag || drag.id !== divider.id || drag.pointerId !== event.pointerId) return;
                        event.stopPropagation();
                        const position = pointerRatio(event.clientX, event.clientY, divider.orientation);
                        setDesign((current) => updateWindowDivider(current, divider.id, position));
                      }}
                      onPointerUp={(event) => {
                        if (!drag || drag.id !== divider.id || drag.pointerId !== event.pointerId) return;
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                        setDrag(null);
                      }}
                      onPointerCancel={(event) => {
                        if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
                        setDrag(null);
                      }}
                    >
                      <line className="window-designer-divider-hit" {...visible} />
                      <line className="window-designer-divider-line" {...visible} />
                    </g>
                  );
                })}
              </svg>
              <small className="window-designer-help">{labels.clickHelp}</small>
            </div>

            <div className="window-designer-properties">
              <label className="wide"><span>{labels.name}</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
              <label className="wide"><span>{labels.operation}</span><select value={draft.operation} onChange={(event) => {
                const operation = event.target.value as WindowOperation;
                setDraft((current) => ({ ...current, operation }));
                if (!design.dividers.length) setDesign(defaultWindowDesign(operation));
              }}>{OPERATIONS.map((operation) => <option key={operation} value={operation}>{windowOperationLabel(operation, language)}</option>)}</select></label>
              <label><span>{labels.width}</span><div className="unit-input compact"><input type="number" min="0.2" step="0.05" value={draft.width.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, width: Math.max(0.2, Number(event.target.value)) }))} /><b>m</b></div></label>
              <label><span>{labels.height}</span><div className="unit-input compact"><input type="number" min="0.2" step="0.05" value={draft.height.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, height: Math.max(0.2, Number(event.target.value)) }))} /><b>m</b></div></label>
              <label><span>{labels.sill}</span><div className="unit-input compact"><input type="number" min="0" step="0.05" value={draft.sillHeight.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, sillHeight: Math.max(0, Number(event.target.value)) }))} /><b>m</b></div></label>
              <label><span>{labels.frameWidth}</span><div className="unit-input compact"><input type="number" min="10" step="5" value={Math.round(draft.frameWidthMm)} onChange={(event) => setDraft((current) => ({ ...current, frameWidthMm: Math.max(10, Number(event.target.value)) }))} /><b>mm</b></div></label>
              <label><span>{labels.frameDepth}</span><div className="unit-input compact"><input type="number" min="10" step="5" value={Math.round(draft.frameDepthMm)} onChange={(event) => setDraft((current) => ({ ...current, frameDepthMm: Math.max(10, Number(event.target.value)) }))} /><b>mm</b></div></label>
              <label><span>{labels.installation}</span><select value={draft.depthMode} onChange={(event) => setDraft((current) => ({ ...current, depthMode: event.target.value as WindowTypeDefinition["depthMode"] }))}><option value="interior">{openingDepthModeLabel("interior", language)}</option><option value="center">{openingDepthModeLabel("center", language)}</option><option value="exterior">{openingDepthModeLabel("exterior", language)}</option></select></label>
              <label><span>{labels.uw}</span><div className="unit-input compact"><input type="number" min="0.1" step="0.1" value={draft.uValue.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, uValue: Math.max(0.1, Number(event.target.value)) }))} /><b>W/m²K</b></div></label>
              <label><span>{labels.sw}</span><div className="unit-input compact"><input type="number" min="0" max="1" step="0.05" value={draft.solarFactor.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, solarFactor: Math.max(0, Math.min(1, Number(event.target.value))) }))} /><b>Sw</b></div></label>
              <div className="window-designer-metric"><span>{labels.glazing}</span><strong>{glazingArea.toFixed(2)} m²</strong></div>
            </div>

            <div className="window-designer-actions">
              <button type="button" className="primary" onClick={save}>{labels.save}</button>
              {editingId && !types.find((type) => type.id === editingId)?.builtIn ? <button type="button" className="danger" onClick={removeCurrent}>{labels.delete}</button> : null}
            </div>
          </div>
        </div>
      </section>
    </div>,
    document.body,
  );
}
