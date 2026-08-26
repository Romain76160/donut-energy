import { localeFor, type Language } from "../i18n";
import { formatNumber, wallLength, type Wall } from "../model";
import "../virtual-walls.css";

type Props = {
  wall: Wall;
  language: Language;
  onUpdateWall: (patch: Partial<Wall>) => void;
  onUpdateLength: (length: number) => void;
  onSetVirtual: (value: boolean) => void;
};

export function VirtualWallInspector({ wall, language, onUpdateWall, onUpdateLength, onSetVirtual }: Props) {
  const locale = localeFor(language);
  const labels = language === "fr" ? {
    title: "SÉPARATION VIRTUELLE",
    name: "Nom",
    length: "Longueur",
    purpose: "Sépare les pièces sans paroi physique",
    help: "Cette ligne participe à la détection des pièces et aux surfaces de plancher, mais elle n’ajoute ni matériau, ni résistance thermique, ni surface de paroi.",
    thermal: "Impact thermique",
    none: "Aucun",
    roomBoundary: "Limite de pièce",
    yes: "Oui",
    restore: "Repasser en mur physique",
  } : {
    title: "VIRTUAL BOUNDARY",
    name: "Name",
    length: "Length",
    purpose: "Separates rooms without a physical wall",
    help: "This line participates in room detection and floor areas, but adds no material, thermal resistance or wall area.",
    thermal: "Thermal impact",
    none: "None",
    roomBoundary: "Room boundary",
    yes: "Yes",
    restore: "Restore physical wall",
  };

  return (
    <aside className="inspector virtual-wall-inspector" aria-label={labels.title}>
      <div className="virtual-wall-title-row">
        <h2>{labels.title}</h2>
        <span>{language === "fr" ? "VIRTUEL" : "VIRTUAL"}</span>
      </div>

      <div className="virtual-wall-callout">
        <strong>{labels.purpose}</strong>
        <p>{labels.help}</p>
      </div>

      <div className="property-fields">
        <label>
          <span>{labels.name}</span>
          <input value={wall.name} onChange={(event) => onUpdateWall({ name: event.target.value })} />
        </label>
        <label>
          <span>{labels.length}</span>
          <div className="unit-input">
            <input
              type="number"
              min="0.1"
              step="0.1"
              value={wallLength(wall).toFixed(2)}
              onChange={(event) => onUpdateLength(Math.max(0.1, Number(event.target.value)))}
            />
            <b>m</b>
          </div>
        </label>
      </div>

      <button type="button" className="virtual-wall-restore" onClick={() => onSetVirtual(false)}>
        {labels.restore}
      </button>

      <div className="virtual-wall-summary">
        <div><span>{labels.roomBoundary}</span><strong>{labels.yes}</strong></div>
        <div><span>{labels.thermal}</span><strong>{labels.none}</strong></div>
        <div><span>{language === "fr" ? "Longueur actuelle" : "Current length"}</span><strong>{formatNumber(wallLength(wall), 2, locale)} m</strong></div>
      </div>
    </aside>
  );
}
