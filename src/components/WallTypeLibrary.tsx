import { useState } from "react";
import { materialLabel, type Language } from "../i18n";
import { MATERIALS, createId, type Wall, type WallLayer } from "../model";
import {
  createWallType,
  normalizeWallType,
  wallTypeFromWall,
  wallTypeThicknessMm,
  type WallTypeDefinition,
} from "../wallTypes";
import "../wall-types.css";

type Props = {
  wall: Wall;
  types: WallTypeDefinition[];
  currentTypeId: string | null;
  language: Language;
  onChange: (types: WallTypeDefinition[]) => void;
  onApply: (type: WallTypeDefinition) => void;
  onDetach: () => void;
};

const cloneForEdit = (type: WallTypeDefinition): WallTypeDefinition => ({
  ...type,
  layers: type.layers.map((layer) => ({ ...layer, id: layer.id || createId() })),
});

function WallTypePreview({ type, language }: { type: WallTypeDefinition; language: Language }) {
  const total = Math.max(1, wallTypeThicknessMm(type));
  return (
    <div className="wall-type-preview" aria-label={`${Math.round(total)} mm`}>
      {type.layers.map((layer) => (
        <span
          key={layer.id}
          style={{ width: `${Math.max(2, layer.thicknessMm / total * 100)}%`, backgroundColor: layer.color }}
          title={`${materialLabel(layer.name, language)} — ${Math.round(layer.thicknessMm)} mm`}
        />
      ))}
    </div>
  );
}

export function WallTypeLibrary({ wall, types, currentTypeId, language, onChange, onApply, onDetach }: Props) {
  const [tab, setTab] = useState<"library" | "editor">("library");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WallTypeDefinition>(() => wallTypeFromWall(wall, types.length));
  const customCount = types.filter((type) => !type.builtIn).length;
  const linkedType = currentTypeId ? types.find((type) => type.id === currentTypeId) ?? null : null;

  const labels = language === "fr" ? {
    summary: "TYPES DE MURS",
    hint: `${types.length} types · ${customCount} personnalisé${customCount > 1 ? "s" : ""}`,
    library: "Bibliothèque",
    create: "Créer un type",
    fromWall: "Créer depuis ce mur",
    name: "Nom du type",
    composition: "Composition",
    material: "Matériau",
    thickness: "Épaisseur",
    addLayer: "Ajouter une couche",
    save: "Enregistrer le type",
    cancel: "Annuler",
    edit: "Modifier",
    duplicate: "Dupliquer",
    remove: "Supprimer",
    apply: "Appliquer et lier",
    linked: "Lié au type",
    detach: "Dissocier",
    builtIn: "Standard",
    custom: "Personnalisé",
    total: "Épaisseur totale",
  } : {
    summary: "WALL TYPES",
    hint: `${types.length} types · ${customCount} custom`,
    library: "Library",
    create: "Create type",
    fromWall: "Create from this wall",
    name: "Type name",
    composition: "Composition",
    material: "Material",
    thickness: "Thickness",
    addLayer: "Add layer",
    save: "Save type",
    cancel: "Cancel",
    edit: "Edit",
    duplicate: "Duplicate",
    remove: "Delete",
    apply: "Apply and link",
    linked: "Linked type",
    detach: "Detach",
    builtIn: "Standard",
    custom: "Custom",
    total: "Total thickness",
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(createWallType(customCount));
    setTab("editor");
  };

  const startFromWall = () => {
    setEditingId(null);
    setDraft(wallTypeFromWall(wall, customCount));
    setTab("editor");
  };

  const startEdit = (type: WallTypeDefinition) => {
    setEditingId(type.id);
    setDraft({ ...cloneForEdit(type), builtIn: false });
    setTab("editor");
  };

  const duplicate = (type: WallTypeDefinition) => {
    setEditingId(null);
    setDraft({ ...cloneForEdit(type), id: createId(), name: `${type.name} — copie`, builtIn: false });
    setTab("editor");
  };

  const save = () => {
    const normalized = normalizeWallType({ ...draft, builtIn: false }, customCount);
    const next = editingId
      ? types.map((type) => type.id === editingId ? normalized : type)
      : [...types, normalized];
    onChange(next);
    setEditingId(null);
    setDraft(createWallType(next.length));
    setTab("library");
  };

  const updateLayer = (id: string, patch: Partial<WallLayer>) => {
    setDraft((current) => ({
      ...current,
      layers: current.layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer),
    }));
  };

  return (
    <details className="wall-type-library">
      <summary>
        <span>{labels.summary}</span>
        <small>{labels.hint}</small>
      </summary>

      {linkedType ? (
        <div className="wall-type-linked-state">
          <div><span>{labels.linked}</span><strong>{linkedType.name}</strong></div>
          <button type="button" onClick={onDetach}>{labels.detach}</button>
        </div>
      ) : null}

      <div className="wall-type-tabs" role="tablist">
        <button type="button" className={tab === "library" ? "active" : ""} onClick={() => setTab("library")}>{labels.library}</button>
        <button type="button" className={tab === "editor" ? "active" : ""} onClick={() => startNew()}>{labels.create}</button>
      </div>

      {tab === "library" ? (
        <div className="wall-type-library-body">
          <button type="button" className="wall-type-from-current" onClick={startFromWall}>＋ {labels.fromWall}</button>
          <div className="wall-type-grid">
            {types.map((type) => (
              <article className={`wall-type-card${currentTypeId === type.id ? " linked" : ""}`} key={type.id}>
                <WallTypePreview type={type} language={language} />
                <div className="wall-type-card-head">
                  <div><strong>{type.name}</strong><small>{Math.round(wallTypeThicknessMm(type))} mm</small></div>
                  <span>{type.builtIn ? labels.builtIn : labels.custom}</span>
                </div>
                <div className="wall-type-metrics">
                  <span>{type.layers.length} {labels.composition.toLowerCase()}</span>
                  <span>{Math.round(wallTypeThicknessMm(type))} mm</span>
                </div>
                <div className="wall-type-card-actions">
                  <button type="button" className="primary" onClick={() => onApply(type)}>{labels.apply}</button>
                  {!type.builtIn ? <button type="button" onClick={() => startEdit(type)}>{labels.edit}</button> : null}
                  <button type="button" onClick={() => duplicate(type)}>{labels.duplicate}</button>
                  {!type.builtIn ? <button type="button" className="danger" onClick={() => onChange(types.filter((item) => item.id !== type.id))}>{labels.remove}</button> : null}
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : (
        <div className="wall-type-editor">
          <div className="wall-type-editor-top">
            <div>
              <strong>{draft.name}</strong>
              <small>{labels.total} · {Math.round(wallTypeThicknessMm(draft))} mm</small>
            </div>
            <WallTypePreview type={draft} language={language} />
          </div>

          <div className="wall-type-fields">
            <label className="wide"><span>{labels.name}</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} /></label>
          </div>

          <div className="wall-type-layer-editor">
            <div className="wall-type-layer-header"><span>{labels.material}</span><span>{labels.thickness}</span><span /></div>
            {draft.layers.map((layer) => (
              <div className="wall-type-layer-row" key={layer.id}>
                <span className="material-swatch" style={{ backgroundColor: layer.color }} />
                <select value={layer.name} onChange={(event) => {
                  const material = MATERIALS.find((item) => item.name === event.target.value);
                  if (material) updateLayer(layer.id, material);
                }}>
                  {MATERIALS.map((material) => <option key={material.name} value={material.name}>{materialLabel(material.name, language)}</option>)}
                </select>
                <div className="unit-input compact"><input type="number" min="1" step="1" value={Math.round(layer.thicknessMm)} onChange={(event) => updateLayer(layer.id, { thicknessMm: Math.max(1, Number(event.target.value)) })} /><b>mm</b></div>
                <button type="button" className="icon-button" disabled={draft.layers.length <= 1} onClick={() => setDraft((current) => ({ ...current, layers: current.layers.filter((item) => item.id !== layer.id) }))}>×</button>
              </div>
            ))}
            <button type="button" className="wall-type-add-layer" onClick={() => setDraft((current) => ({ ...current, layers: [...current.layers, { id: createId(), thicknessMm: 100, ...MATERIALS[5] }] }))}>＋ {labels.addLayer}</button>
          </div>

          <div className="wall-type-editor-actions">
            <button type="button" className="primary" onClick={save}>{labels.save}</button>
            <button type="button" onClick={() => setTab("library")}>{labels.cancel}</button>
          </div>
        </div>
      )}
    </details>
  );
}
