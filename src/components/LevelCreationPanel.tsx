import { useMemo, useState } from "react";
import type { Language } from "../i18n";
import type { Level } from "../model";
import "../level-creation.css";

export type NewLevelDefinition = {
  name: string;
  elevation: number;
  ceilingElevation: number;
  openToBelow: boolean;
};

type Props = {
  levels: Level[];
  language: Language;
  onCreate: (definition: NewLevelDefinition) => void;
  onCancel: () => void;
};

const highestReference = (levels: Level[]) =>
  [...levels].sort((a, b) => b.ceilingElevation - a.ceilingElevation)[0];

export function LevelCreationPanel({ levels, language, onCreate, onCancel }: Props) {
  const previous = useMemo(() => highestReference(levels), [levels]);
  const suggestedFloor = previous ? previous.ceilingElevation + 0.2 : 0;
  const [name, setName] = useState(language === "fr" ? `Niveau ${levels.length + 1}` : `Level ${levels.length + 1}`);
  const [elevation, setElevation] = useState(suggestedFloor);
  const [ceilingElevation, setCeilingElevation] = useState(suggestedFloor + 2.8);
  const [openToBelow, setOpenToBelow] = useState(false);

  const clearHeight = Math.max(0, ceilingElevation - elevation);
  const valid = name.trim().length > 0 && Number.isFinite(elevation) && Number.isFinite(ceilingElevation) && clearHeight >= 0.5;
  const labels = language === "fr" ? {
    title: "CRÉER UN NIVEAU",
    intro: "Positionne précisément les deux plans horizontaux du niveau. La hauteur libre est calculée automatiquement.",
    name: "Nom du niveau",
    floor: "Altitude du plancher",
    ceiling: "Altitude du plafond / plancher haut",
    height: "Hauteur libre",
    open: "Ouvert sur le niveau inférieur",
    openHelp: "Aucun plancher ne ferme ce niveau : le volume reste continu avec l’étage inférieur.",
    closedHelp: "Un plancher horizontal sépare ce niveau du niveau inférieur.",
    previous: "Niveau inférieur de référence",
    cancel: "Annuler",
    create: "Créer le niveau",
    invalid: "Le plafond doit être au moins 0,50 m au-dessus du plancher.",
    floorPlane: "PLANCHER",
    ceilingPlane: "PLAFOND",
    void: "VIDE SUR NIVEAU INFÉRIEUR",
  } : {
    title: "CREATE LEVEL",
    intro: "Position the two horizontal reference planes precisely. Clear height is calculated automatically.",
    name: "Level name",
    floor: "Floor elevation",
    ceiling: "Ceiling / upper floor elevation",
    height: "Clear height",
    open: "Open to level below",
    openHelp: "No floor closes this level: the volume remains continuous with the level below.",
    closedHelp: "A horizontal floor separates this level from the level below.",
    previous: "Reference lower level",
    cancel: "Cancel",
    create: "Create level",
    invalid: "The ceiling must be at least 0.50 m above the floor.",
    floorPlane: "FLOOR",
    ceilingPlane: "CEILING",
    void: "OPEN TO LEVEL BELOW",
  };

  return (
    <aside className="inspector level-creation-panel" aria-label={labels.title}>
      <h2>{labels.title}</h2>
      <p className="level-creation-intro">{labels.intro}</p>

      <div className="level-section-preview" aria-hidden="true">
        <div className="level-preview-plane ceiling"><span>{labels.ceilingPlane}</span><strong>+{ceilingElevation.toFixed(2)} m</strong></div>
        <div className={`level-preview-volume${openToBelow ? " open" : ""}`}>
          <strong>{clearHeight.toFixed(2)} m</strong>
          {openToBelow ? <span>{labels.void}</span> : null}
        </div>
        <div className={`level-preview-plane floor${openToBelow ? " open" : ""}`}><span>{labels.floorPlane}</span><strong>+{elevation.toFixed(2)} m</strong></div>
        {previous ? <div className="level-preview-previous"><span>{previous.name}</span><small>{previous.elevation.toFixed(2)} → {previous.ceilingElevation.toFixed(2)} m</small></div> : null}
      </div>

      <div className="property-fields level-creation-fields">
        <label>
          <span>{labels.name}</span>
          <input value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <label>
          <span>{labels.floor}</span>
          <div className="unit-input"><input type="number" step="0.05" value={elevation} onChange={(event) => setElevation(Number(event.target.value))} /><b>m</b></div>
        </label>
        <label>
          <span>{labels.ceiling}</span>
          <div className="unit-input"><input type="number" step="0.05" value={ceilingElevation} onChange={(event) => setCeilingElevation(Number(event.target.value))} /><b>m</b></div>
        </label>
        <div className="level-clear-height">
          <span>{labels.height}</span><strong>{clearHeight.toFixed(2)} m</strong>
        </div>
        <label className="level-open-toggle">
          <input type="checkbox" checked={openToBelow} onChange={(event) => setOpenToBelow(event.target.checked)} />
          <span><strong>{labels.open}</strong><small>{openToBelow ? labels.openHelp : labels.closedHelp}</small></span>
        </label>
      </div>

      {!valid ? <p className="level-creation-error">{labels.invalid}</p> : null}
      {previous ? <p className="level-previous-reference">{labels.previous} : <strong>{previous.name}</strong></p> : null}

      <div className="level-creation-actions">
        <button type="button" className="secondary" onClick={onCancel}>{labels.cancel}</button>
        <button
          type="button"
          className="primary"
          disabled={!valid}
          onClick={() => onCreate({ name: name.trim(), elevation, ceilingElevation, openToBelow })}
        >{labels.create}</button>
      </div>
    </aside>
  );
}
