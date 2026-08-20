import { useMemo, useState } from "react";
import type { Language } from "../i18n";
import { openingDepthModeLabel } from "../openingDepth";
import {
  createWindowType,
  normalizeWindowType,
  windowOperationLabel,
  windowTypeGlazingArea,
  type WindowOperation,
  type WindowTypeDefinition,
} from "../windowTypes";
import "../window-types.css";

const OPERATIONS: WindowOperation[] = ["fixed", "casement-1", "casement-2", "tilt-turn", "sliding"];

function WindowTypePreview({ type }: { type: WindowTypeDefinition }) {
  const frameVisual = Math.max(5, Math.min(17, type.frameWidthMm / 6));
  return (
    <div className="window-type-preview" style={{ aspectRatio: `${type.width} / ${type.height}` }} aria-hidden="true">
      <div className="window-type-frame" style={{ padding: `${frameVisual}px` }}>
        <svg className={`window-operation-preview ${type.operation}`} viewBox="0 0 100 100" preserveAspectRatio="none">
          <rect x="1" y="1" width="98" height="98" />
          {type.operation === "casement-1" || type.operation === "tilt-turn" ? <path d="M4 96 L96 50 L4 4" /> : null}
          {type.operation === "casement-2" ? <><path d="M50 2 V98" /><path d="M3 96 L48 50 L3 4 M97 96 L52 50 L97 4" /></> : null}
          {type.operation === "tilt-turn" ? <path d="M4 4 L50 96 L96 4" className="secondary" /> : null}
          {type.operation === "sliding" ? <><path d="M50 2 V98" /><path d="M12 50 H42 M58 50 H88" /><path d="m35 43 7 7-7 7 M65 43l-7 7 7 7" /></> : null}
        </svg>
      </div>
    </div>
  );
}

type LibraryProps = {
  types: WindowTypeDefinition[];
  language: Language;
  onChange: (types: WindowTypeDefinition[]) => void;
};

export function WindowTypeLibrary({ types, language, onChange }: LibraryProps) {
  const [tab, setTab] = useState<"library" | "editor">("library");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WindowTypeDefinition>(() => createWindowType(types.length));
  const customCount = types.filter((type) => !type.builtIn).length;

  const labels = language === "fr" ? {
    summary: "TYPES DE FENÊTRES",
    summaryHint: `${types.length} types · ${customCount} personnalisé${customCount > 1 ? "s" : ""}`,
    library: "Bibliothèque",
    create: "Créer un type",
    edit: "Modifier",
    duplicate: "Dupliquer",
    remove: "Supprimer",
    builtIn: "Standard",
    custom: "Personnalisé",
    name: "Nom du type",
    operation: "Ouverture",
    width: "Largeur par défaut",
    height: "Hauteur par défaut",
    sill: "Allège par défaut",
    frameWidth: "Largeur visible du cadre",
    frameDepth: "Profondeur du dormant",
    install: "Pose dans le mur",
    uValue: "Uw",
    solar: "Sw",
    glazing: "Vitrage indicatif",
    save: "Enregistrer le type",
    cancel: "Annuler",
    newName: "Nouveau type de fenêtre",
  } : {
    summary: "WINDOW TYPES",
    summaryHint: `${types.length} types · ${customCount} custom`,
    library: "Library",
    create: "Create type",
    edit: "Edit",
    duplicate: "Duplicate",
    remove: "Delete",
    builtIn: "Standard",
    custom: "Custom",
    name: "Type name",
    operation: "Operation",
    width: "Default width",
    height: "Default height",
    sill: "Default sill",
    frameWidth: "Visible frame width",
    frameDepth: "Frame depth",
    install: "Wall installation",
    uValue: "Uw",
    solar: "Sw",
    glazing: "Indicative glazing",
    save: "Save type",
    cancel: "Cancel",
    newName: "New window type",
  };

  const startNew = () => {
    setEditingId(null);
    setDraft({ ...createWindowType(customCount), name: labels.newName });
    setTab("editor");
  };

  const startEdit = (type: WindowTypeDefinition) => {
    setEditingId(type.id);
    setDraft({ ...type, builtIn: false });
    setTab("editor");
  };

  const duplicate = (type: WindowTypeDefinition) => {
    setEditingId(null);
    setDraft({ ...type, id: createWindowType().id, name: `${type.name} — copie`, builtIn: false });
    setTab("editor");
  };

  const save = () => {
    const normalized = normalizeWindowType({ ...draft, builtIn: false }, customCount);
    const next = editingId
      ? types.map((type) => type.id === editingId ? normalized : type)
      : [...types, normalized];
    onChange(next);
    setEditingId(null);
    setDraft(createWindowType(next.length));
    setTab("library");
  };

  const remove = (id: string) => onChange(types.filter((type) => type.id !== id || type.builtIn));

  const glazingArea = windowTypeGlazingArea(draft);

  return (
    <details className="window-type-library">
      <summary>
        <span>{labels.summary}</span>
        <small>{labels.summaryHint}</small>
      </summary>

      <div className="window-type-tabs" role="tablist">
        <button type="button" className={tab === "library" ? "active" : ""} onClick={() => setTab("library")}>{labels.library}</button>
        <button type="button" className={tab === "editor" ? "active" : ""} onClick={startNew}>{labels.create}</button>
      </div>

      {tab === "library" ? (
        <div className="window-type-grid">
          {types.map((type) => (
            <article className="window-type-card" key={type.id}>
              <WindowTypePreview type={type} />
              <div className="window-type-card-body">
                <div className="window-type-card-head">
                  <strong>{type.name}</strong>
                  <span>{type.builtIn ? labels.builtIn : labels.custom}</span>
                </div>
                <small>{windowOperationLabel(type.operation, language)}</small>
                <div className="window-type-card-metrics">
                  <span>{Math.round(type.width * 100)} × {Math.round(type.height * 100)} cm</span>
                  <span>Uw {type.uValue.toFixed(2)}</span>
                  <span>{Math.round(type.frameDepthMm)} mm</span>
                </div>
                <div className="window-type-card-actions">
                  {!type.builtIn ? <button type="button" onClick={() => startEdit(type)}>{labels.edit}</button> : null}
                  <button type="button" onClick={() => duplicate(type)}>{labels.duplicate}</button>
                  {!type.builtIn ? <button type="button" className="danger" onClick={() => remove(type.id)}>{labels.remove}</button> : null}
                </div>
              </div>
            </article>
          ))}
          <button type="button" className="window-type-new-card" onClick={startNew}><span>＋</span>{labels.create}</button>
        </div>
      ) : (
        <div className="window-type-editor">
          <div className="window-type-editor-preview">
            <WindowTypePreview type={draft} />
            <div>
              <strong>{draft.name}</strong>
              <small>{windowOperationLabel(draft.operation, language)}</small>
              <span>{labels.glazing} : {glazingArea.toFixed(2)} m²</span>
            </div>
          </div>

          <div className="window-type-fields">
            <label className="wide"><span>{labels.name}</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
            <label className="wide"><span>{labels.operation}</span><select value={draft.operation} onChange={(event) => setDraft((current) => ({ ...current, operation: event.target.value as WindowOperation }))}>{OPERATIONS.map((operation) => <option key={operation} value={operation}>{windowOperationLabel(operation, language)}</option>)}</select></label>
            <label><span>{labels.width}</span><div className="unit-input compact"><input type="number" min="0.2" step="0.05" value={draft.width.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, width: Math.max(0.2, Number(event.target.value)) }))} /><b>m</b></div></label>
            <label><span>{labels.height}</span><div className="unit-input compact"><input type="number" min="0.2" step="0.05" value={draft.height.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, height: Math.max(0.2, Number(event.target.value)) }))} /><b>m</b></div></label>
            <label><span>{labels.sill}</span><div className="unit-input compact"><input type="number" min="0" step="0.05" value={draft.sillHeight.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, sillHeight: Math.max(0, Number(event.target.value)) }))} /><b>m</b></div></label>
            <label><span>{labels.frameWidth}</span><div className="unit-input compact"><input type="number" min="10" step="5" value={Math.round(draft.frameWidthMm)} onChange={(event) => setDraft((current) => ({ ...current, frameWidthMm: Math.max(10, Number(event.target.value)) }))} /><b>mm</b></div></label>
            <label><span>{labels.frameDepth}</span><div className="unit-input compact"><input type="number" min="10" step="5" value={Math.round(draft.frameDepthMm)} onChange={(event) => setDraft((current) => ({ ...current, frameDepthMm: Math.max(10, Number(event.target.value)) }))} /><b>mm</b></div></label>
            <label><span>{labels.install}</span><select value={draft.depthMode} onChange={(event) => setDraft((current) => ({ ...current, depthMode: event.target.value as WindowTypeDefinition["depthMode"] }))}><option value="interior">{openingDepthModeLabel("interior", language)}</option><option value="center">{openingDepthModeLabel("center", language)}</option><option value="exterior">{openingDepthModeLabel("exterior", language)}</option></select></label>
            <label><span>{labels.uValue}</span><div className="unit-input compact"><input type="number" min="0.1" step="0.1" value={draft.uValue.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, uValue: Math.max(0.1, Number(event.target.value)) }))} /><b>W/m²K</b></div></label>
            <label><span>{labels.solar}</span><div className="unit-input compact"><input type="number" min="0" max="1" step="0.05" value={draft.solarFactor.toFixed(2)} onChange={(event) => setDraft((current) => ({ ...current, solarFactor: Math.max(0, Math.min(1, Number(event.target.value))) }))} /><b>Sw</b></div></label>
          </div>

          <div className="window-type-editor-actions">
            <button type="button" className="primary" onClick={save}>{labels.save}</button>
            <button type="button" onClick={() => setTab("library")}>{labels.cancel}</button>
          </div>
        </div>
      )}
    </details>
  );
}

type PickerProps = {
  types: WindowTypeDefinition[];
  language: Language;
  onApply: (type: WindowTypeDefinition) => void;
};

export function WindowTypePicker({ types, language, onApply }: PickerProps) {
  const [selectedId, setSelectedId] = useState("");
  const selected = useMemo(() => types.find((type) => type.id === selectedId) ?? null, [types, selectedId]);
  const labels = language === "fr" ? { label: "Type de fenêtre", placeholder: "Choisir un type…", apply: "Appliquer", glazing: "vitrage" } : { label: "Window type", placeholder: "Choose a type…", apply: "Apply", glazing: "glazing" };

  return (
    <div className="window-type-picker">
      <label>
        <span>{labels.label}</span>
        <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
          <option value="">{labels.placeholder}</option>
          {types.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
        </select>
      </label>
      {selected ? <small>{windowOperationLabel(selected.operation, language)} · {selected.width.toFixed(2)} × {selected.height.toFixed(2)} m · {windowTypeGlazingArea(selected).toFixed(2)} m² {labels.glazing}</small> : null}
      <button type="button" disabled={!selected} onClick={() => selected && onApply(selected)}>{labels.apply}</button>
    </div>
  );
}
