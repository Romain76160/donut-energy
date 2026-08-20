import { materialLabel, type Language } from "../i18n";
import type { Wall, WallType } from "../model";
import {
  resetWallTemplate,
  wallTemplateFromWall,
  wallTemplateThickness,
  type WallDefaults,
  type WallDefaultTemplate,
} from "../wallDefaults";
import "../wall-defaults.css";

type Props = {
  walls: Wall[];
  defaults: WallDefaults;
  language: Language;
  onChange: (defaults: WallDefaults) => void;
};

function DefaultCard({
  type,
  walls,
  template,
  language,
  onChange,
}: {
  type: WallType;
  walls: Wall[];
  template: WallDefaultTemplate;
  language: Language;
  onChange: (template: WallDefaultTemplate) => void;
}) {
  const candidates = walls.filter((wall) => wall.type === type);
  const labels = language === "fr" ? {
    title: type === "external" ? "Mur extérieur par défaut" : "Mur intérieur par défaut",
    help: type === "external"
      ? "Composition appliquée automatiquement à chaque nouveau mur extérieur."
      : "Composition appliquée automatiquement à chaque nouveau mur intérieur.",
    select: "Choisir un mur existant",
    standard: "Configuration standard",
    reset: "Réinitialiser",
    composition: "Composition",
    thickness: "Épaisseur totale",
    noWall: "Aucun mur de ce type dans le projet pour le moment.",
  } : {
    title: type === "external" ? "Default external wall" : "Default internal wall",
    help: type === "external"
      ? "Composition automatically applied to every new external wall."
      : "Composition automatically applied to every new internal wall.",
    select: "Choose an existing wall",
    standard: "Standard configuration",
    reset: "Reset",
    composition: "Composition",
    thickness: "Total thickness",
    noWall: "No wall of this type exists in the project yet.",
  };

  return (
    <section className={`wall-default-card ${type}`}>
      <div className="wall-default-heading">
        <div>
          <h3>{labels.title}</h3>
          <p>{labels.help}</p>
        </div>
        <span className="wall-default-type-badge">{type === "external" ? (language === "fr" ? "EXT." : "EXT.") : (language === "fr" ? "INT." : "INT.")}</span>
      </div>

      <label className="wall-default-select">
        <span>{labels.select}</span>
        <select
          value={template.sourceWallId ?? ""}
          onChange={(event) => {
            const wall = candidates.find((candidate) => candidate.id === event.target.value);
            if (wall) onChange(wallTemplateFromWall(wall));
            else onChange(resetWallTemplate(type));
          }}
        >
          <option value="">{labels.standard}</option>
          {candidates.map((wall) => <option key={wall.id} value={wall.id}>{wall.name}</option>)}
        </select>
      </label>

      {!candidates.length ? <p className="wall-default-empty">{labels.noWall}</p> : null}

      <div className="wall-default-current">
        <div className="wall-default-current-title">
          <strong>{template.sourceWallName ?? labels.standard}</strong>
          <button type="button" onClick={() => onChange(resetWallTemplate(type))}>{labels.reset}</button>
        </div>
        <div className="wall-default-layers">
          {template.layers.map((layer, index) => (
            <div className="wall-default-layer" key={`${layer.id}-${index}`}>
              <span className="wall-default-swatch" style={{ backgroundColor: layer.color }} />
              <span>{materialLabel(layer.name, language)}</span>
              <strong>{layer.thicknessMm} mm</strong>
            </div>
          ))}
        </div>
        <div className="wall-default-total">
          <span>{labels.thickness}</span>
          <strong>{wallTemplateThickness(template)} mm</strong>
        </div>
      </div>
    </section>
  );
}

export function WallDefaultsInspector({ walls, defaults, language, onChange }: Props) {
  const title = language === "fr" ? "MURS PAR DÉFAUT" : "DEFAULT WALLS";
  const intro = language === "fr"
    ? "Choisis une composition de référence pour chaque type. Le profil, la hauteur et l’inclinaison restent propres à chaque mur ; seule la composition multicouche est reprise automatiquement."
    : "Choose a reference composition for each type. Profile, height and inclination remain wall-specific; only the multilayer composition is reused automatically.";

  return (
    <aside className="inspector wall-defaults-inspector" aria-label={title}>
      <h2>{title}</h2>
      <p className="wall-defaults-intro">{intro}</p>
      <DefaultCard
        type="external"
        walls={walls}
        template={defaults.external}
        language={language}
        onChange={(external) => onChange({ ...defaults, external })}
      />
      <DefaultCard
        type="internal"
        walls={walls}
        template={defaults.internal}
        language={language}
        onChange={(internal) => onChange({ ...defaults, internal })}
      />
    </aside>
  );
}
