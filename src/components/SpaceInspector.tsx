import { localeFor, type Language } from "../i18n";
import { formatNumber, levelClearHeight, type Level, type Space, type SpaceUsage } from "../model";
import { spaceVolume } from "../spaces";
import "../spaces.css";

type Props = {
  space: Space;
  level: Level;
  language: Language;
  onUpdateSpace: (patch: Partial<Space>) => void;
};

const usageOptions: Array<{ value: SpaceUsage; fr: string; en: string }> = [
  { value: "unspecified", fr: "Non défini", en: "Unspecified" },
  { value: "living", fr: "Séjour", en: "Living room" },
  { value: "bedroom", fr: "Chambre", en: "Bedroom" },
  { value: "kitchen", fr: "Cuisine", en: "Kitchen" },
  { value: "bathroom", fr: "Salle de bain", en: "Bathroom" },
  { value: "office", fr: "Bureau", en: "Office" },
  { value: "circulation", fr: "Circulation", en: "Circulation" },
  { value: "technical", fr: "Local technique", en: "Technical room" },
  { value: "storage", fr: "Stockage", en: "Storage" },
  { value: "other", fr: "Autre", en: "Other" },
];

export function SpaceInspector({ space, level, language, onUpdateSpace }: Props) {
  const locale = localeFor(language);
  const height = levelClearHeight(level);
  const volume = spaceVolume(space, level);
  const labels = language === "fr" ? {
    title: "PROPRIÉTÉS DE LA PIÈCE",
    identity: "Identité",
    name: "Nom",
    usage: "Usage",
    thermal: "Paramètres thermiques",
    setpoint: "Température de consigne",
    zone: "Zone thermique",
    unassigned: "Non affectée",
    geometry: "Géométrie calculée",
    area: "Surface",
    perimeter: "Périmètre",
    height: "Hauteur libre",
    volume: "Volume",
    level: "Niveau",
    help: "Le contour est recalculé automatiquement à partir des murs. Le nom, l’usage et la consigne restent attachés à cette pièce quand la géométrie évolue.",
  } : {
    title: "ROOM PROPERTIES",
    identity: "Identity",
    name: "Name",
    usage: "Usage",
    thermal: "Thermal settings",
    setpoint: "Temperature setpoint",
    zone: "Thermal zone",
    unassigned: "Unassigned",
    geometry: "Calculated geometry",
    area: "Area",
    perimeter: "Perimeter",
    height: "Clear height",
    volume: "Volume",
    level: "Level",
    help: "The boundary is recalculated automatically from walls. Name, usage and setpoint remain attached to this room when geometry changes.",
  };

  return (
    <aside className="inspector space-inspector" aria-label={labels.title}>
      <h2>{labels.title}</h2>
      <p className="space-inspector-intro">{labels.help}</p>

      <section className="inspector-section">
        <h3>{labels.identity.toUpperCase()}</h3>
        <div className="property-fields">
          <label>
            <span>{labels.name}</span>
            <input value={space.name} onChange={(event) => onUpdateSpace({ name: event.target.value })} />
          </label>
          <label>
            <span>{labels.usage}</span>
            <select value={space.usage} onChange={(event) => onUpdateSpace({ usage: event.target.value as SpaceUsage })}>
              {usageOptions.map((option) => <option key={option.value} value={option.value}>{language === "fr" ? option.fr : option.en}</option>)}
            </select>
          </label>
        </div>
      </section>

      <section className="inspector-section">
        <h3>{labels.thermal.toUpperCase()}</h3>
        <div className="property-fields">
          <label>
            <span>{labels.setpoint}</span>
            <div className="unit-input">
              <input
                type="number"
                min="5"
                max="35"
                step="0.5"
                value={space.temperatureSetpoint}
                onChange={(event) => onUpdateSpace({ temperatureSetpoint: Math.min(35, Math.max(5, Number(event.target.value))) })}
              />
              <b>°C</b>
            </div>
          </label>
          <label>
            <span>{labels.zone}</span>
            <div className="space-readonly-field">{space.thermalZoneId ?? labels.unassigned}</div>
          </label>
        </div>
      </section>

      <section className="inspector-section">
        <div className="section-title-row"><h3>{labels.geometry.toUpperCase()}</h3><span>{level.name}</span></div>
        <dl className="space-metrics">
          <div><dt>{labels.area}</dt><dd>{formatNumber(space.area, 2, locale)} m²</dd></div>
          <div><dt>{labels.perimeter}</dt><dd>{formatNumber(space.perimeter, 2, locale)} m</dd></div>
          <div><dt>{labels.height}</dt><dd>{formatNumber(height, 2, locale)} m</dd></div>
          <div className="primary"><dt>{labels.volume}</dt><dd>{formatNumber(volume, 2, locale)} m³</dd></div>
          <div><dt>{labels.level}</dt><dd>{level.name}</dd></div>
        </dl>
      </section>
    </aside>
  );
}
