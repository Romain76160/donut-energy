import { useState } from "react";
import { materialLabel, type Language } from "../i18n";
import { MATERIALS, createId, type WallLayer } from "../model";
import {
  createWallType,
  normalizeWallType,
  saveWallTypes,
  wallTypeThicknessMm,
  type WallTypeDefinition,
} from "../wallTypes";
import "../wall-create-inspector.css";

type Props = {
  types: WallTypeDefinition[];
  selectedTypeId: string;
  language: Language;
  onSelectType: (id: string) => void;
  onChange: (types: WallTypeDefinition[]) => void;
};

const cloneType = (type: WallTypeDefinition): WallTypeDefinition => ({
  ...type,
  layers: type.layers.map((layer) => ({ ...layer, id: createId() })),
  builtIn: false,
});

function ConstructionPreview({ type }: { type: WallTypeDefinition }) {
  const total = Math.max(1, wallTypeThicknessMm(type));
  return (
    <div className="create-wall-preview" aria-hidden="true">
      {type.layers.map((layer) => (
        <span
          key={layer.id}
          style={{
            width: `${Math.max(3, layer.thicknessMm / total * 100)}%`,
            backgroundColor: layer.color,
          }}
        />
      ))}
    </div>
  );
}

export function WallCreateInspector({ types, selectedTypeId, language, onSelectType, onChange }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<WallTypeDefinition>(() => createWallType(types.length));
  const [editorOpen, setEditorOpen] = useState(false);

  const labels = language === "fr" ? {
    title: "CRÉER DES MURS",
    subtitle: "Bibliothèque de murs",
    help: "Choisissez une construction puis tracez le mur dans le plan. Le logiciel détermine automatiquement si le mur est intérieur ou extérieur.",
    selected: "Construction active",
    layers: "couches",
    create: "Créer un type de mur",
    edit: "Modifier",
    duplicate: "Dupliquer",
    remove: "Supprimer",
    name: "Nom",
    composition: "Composition",
    material: "Matériau",
    thickness: "Épaisseur",
    addLayer: "Ajouter une couche",
    save: "Enregistrer",
    cancel: "Annuler",
    auto: "Classification automatique",
    autoHint: "Extérieur / intérieur est calculé d'après les pièces situées de chaque côté du mur.",
  } : {
    title: "CREATE WALLS",
    subtitle: "Wall library",
    help: "Choose a construction then draw the wall on plan. The software automatically determines whether it is interior or exterior.",
    selected: "Active construction",
    layers: "layers",
    create: "Create wall type",
    edit: "Edit",
    duplicate: "Duplicate",
    remove: "Delete",
    name: "Name",
    composition: "Composition",
    material: "Material",
    thickness: "Thickness",
    addLayer: "Add layer",
    save: "Save",
    cancel: "Cancel",
    auto: "Automatic classification",
    autoHint: "Exterior / interior is calculated from the rooms found on each side of the wall.",
  };

  const startNew = () => {
    setEditingId(null);
    setDraft(createWallType(types.filter((type) => !type.builtIn).length));
    setEditorOpen(true);
  };

  const startEdit = (type: WallTypeDefinition) => {
    setEditingId(type.id);
    setDraft(cloneType(type));
    setEditorOpen(true);
  };

  const duplicate = (type: WallTypeDefinition) => {
    setEditingId(null);
    setDraft({ ...cloneType(type), id: createId(), name: `${type.name} — copie` });
    setEditorOpen(true);
  };

  const changeTypes = (next: WallTypeDefinition[]) => {
    onChange(next);
    saveWallTypes(next);
  };

  const saveDraft = () => {
    const normalized = normalizeWallType({ ...draft, builtIn: false }, types.length);
    const next = editingId
      ? types.map((type) => type.id === editingId ? normalized : type)
      : [...types, normalized];
    changeTypes(next);
    onSelectType(normalized.id);
    setEditorOpen(false);
    setEditingId(null);
  };

  const updateLayer = (id: string, patch: Partial<WallLayer>) => {
    setDraft((current) => ({
      ...current,
      layers: current.layers.map((layer) => layer.id === id ? { ...layer, ...patch } : layer),
    }));
  };

  const active = types.find((type) => type.id === selectedTypeId) ?? types[0] ?? null;

  return (
    <aside className="inspector wall-create-inspector" aria-label={labels.title}>
      <div className="wall-create-heading">
        <div>
          <h2>{labels.title}</h2>
          <strong>{labels.subtitle}</strong>
        </div>
        <span>{types.length}</span>
      </div>

      <p className="wall-create-help">{labels.help}</p>

      <div className="wall-auto-classification-note">
        <strong>{labels.auto}</strong>
        <span>{labels.autoHint}</span>
      </div>

      {active ? (
        <div className="wall-create-active">
          <span>{labels.selected}</span>
          <strong>{active.name}</strong>
          <small>{Math.round(wallTypeThicknessMm(active))} mm · {active.layers.length} {labels.layers}</small>
        </div>
      ) : null}

      <div className="wall-create-library">
        {types.map((type) => (
          <article className={`wall-create-card${selectedTypeId === type.id ? " selected" : ""}`} key={type.id}>
            <button type="button" className="wall-create-card-main" onClick={() => onSelectType(type.id)}>
              <ConstructionPreview type={type} />
              <span>
                <strong>{type.name}</strong>
                <small>{Math.round(wallTypeThicknessMm(type))} mm · {type.layers.length} {labels.layers}</small>
              </span>
            </button>
            <div className="wall-create-card-actions">
              {!type.builtIn ? <button type="button" onClick={() => startEdit(type)}>{labels.edit}</button> : null}
              <button type="button" onClick={() => duplicate(type)}>{labels.duplicate}</button>
              {!type.builtIn ? (
                <button
                  type="button"
                  className="danger"
                  onClick={() => {
                    const next = types.filter((candidate) => candidate.id !== type.id);
                    changeTypes(next);
                    if (selectedTypeId === type.id) onSelectType(next[0]?.id ?? "");
                  }}
                >
                  {labels.remove}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      {!editorOpen ? (
        <button type="button" className="wall-create-new" onClick={startNew}>＋ {labels.create}</button>
      ) : (
        <div className="wall-create-editor">
          <label className="wall-create-wide">
            <span>{labels.name}</span>
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>

          <strong className="wall-create-editor-title">{labels.composition}</strong>
          {draft.layers.map((layer) => (
            <div className="wall-create-layer" key={layer.id}>
              <span className="material-swatch" style={{ backgroundColor: layer.color }} />
              <select value={layer.name} onChange={(event) => {
                const material = MATERIALS.find((candidate) => candidate.name === event.target.value);
                if (material) updateLayer(layer.id, material);
              }}>
                {MATERIALS.map((material) => <option key={material.name} value={material.name}>{materialLabel(material.name, language)}</option>)}
              </select>
              <div className="unit-input compact">
                <input type="number" min="1" step="1" value={Math.round(layer.thicknessMm)} onChange={(event) => updateLayer(layer.id, { thicknessMm: Math.max(1, Number(event.target.value)) })} />
                <b>mm</b>
              </div>
              <button type="button" className="icon-button" disabled={draft.layers.length <= 1} onClick={() => setDraft((current) => ({ ...current, layers: current.layers.filter((candidate) => candidate.id !== layer.id) }))}>×</button>
            </div>
          ))}

          <button type="button" className="wall-create-add-layer" onClick={() => setDraft((current) => ({
            ...current,
            layers: [...current.layers, { id: createId(), thicknessMm: 100, ...MATERIALS[5] }],
          }))}>＋ {labels.addLayer}</button>

          <div className="wall-create-editor-actions">
            <button type="button" className="primary" onClick={saveDraft}>{labels.save}</button>
            <button type="button" onClick={() => setEditorOpen(false)}>{labels.cancel}</button>
          </div>
        </div>
      )}
    </aside>
  );
}
