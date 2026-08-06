import { PlusIcon, TrashIcon } from "../icons";
import { formatNumber, MATERIALS, wallLength, type Orientation, type Wall, type WallLayer } from "../model";
import { wallArea, wallResistance, wallUValue } from "../thermal";

const ORIENTATIONS: Orientation[] = ["Nord", "Est", "Sud", "Ouest"];

type Props = {
  wall: Wall | null;
  onUpdateWall: (patch: Partial<Wall>) => void;
  onUpdateLength: (length: number) => void;
  onAddLayer: () => void;
  onUpdateLayer: (layerId: string, patch: Partial<WallLayer>) => void;
  onRemoveLayer: (layerId: string) => void;
};

export function WallInspector({
  wall,
  onUpdateWall,
  onUpdateLength,
  onAddLayer,
  onUpdateLayer,
  onRemoveLayer,
}: Props) {
  if (!wall) {
    return (
      <aside className="inspector empty-inspector">
        <h2>PROPRIÉTÉS DU MUR</h2>
        <p>Sélectionnez un mur dans le plan pour afficher ses propriétés.</p>
      </aside>
    );
  }

  return (
    <aside className="inspector" aria-label="Propriétés du mur">
      <h2>PROPRIÉTÉS DU MUR</h2>
      <div className="property-fields">
        <label>
          <span>Nom</span>
          <input value={wall.name} onChange={(event) => onUpdateWall({ name: event.target.value })} />
        </label>
        <label>
          <span>Longueur</span>
          <div className="unit-input">
            <input
              type="number"
              min="0.5"
              step="0.1"
              value={wallLength(wall).toFixed(2)}
              onChange={(event) => onUpdateLength(Number(event.target.value))}
            />
            <b>m</b>
          </div>
        </label>
        <label>
          <span>Hauteur</span>
          <div className="unit-input">
            <input
              type="number"
              min="0.5"
              step="0.1"
              value={wall.height}
              onChange={(event) => onUpdateWall({ height: Math.max(0.5, Number(event.target.value)) })}
            />
            <b>m</b>
          </div>
        </label>
        <label>
          <span>Orientation</span>
          <select value={wall.orientation} onChange={(event) => onUpdateWall({ orientation: event.target.value as Orientation })}>
            {ORIENTATIONS.map((orientation) => <option key={orientation}>{orientation}</option>)}
          </select>
        </label>
      </div>

      <div className="inspector-section">
        <h3>COMPOSITION</h3>
        <div className="layer-columns"><span>Matériau</span><span>Épaisseur</span></div>
        <div className="layer-list">
          {wall.layers.map((layer) => (
            <div className="layer-row" key={layer.id}>
              <span className="drag-dots" aria-hidden="true">⠿</span>
              <span className="material-swatch" style={{ backgroundColor: layer.color }} />
              <select
                aria-label="Matériau"
                value={layer.name}
                onChange={(event) => {
                  const material = MATERIALS.find((item) => item.name === event.target.value);
                  if (material) onUpdateLayer(layer.id, material);
                }}
              >
                {MATERIALS.map((material) => <option key={material.name}>{material.name}</option>)}
              </select>
              <div className="unit-input compact">
                <input
                  aria-label={`Épaisseur de ${layer.name}`}
                  type="number"
                  min="1"
                  step="1"
                  value={layer.thicknessMm}
                  onChange={(event) => onUpdateLayer(layer.id, { thicknessMm: Math.max(1, Number(event.target.value)) })}
                />
                <b>mm</b>
              </div>
              <button
                className="icon-button"
                aria-label={`Supprimer ${layer.name}`}
                onClick={() => onRemoveLayer(layer.id)}
                disabled={wall.layers.length === 1}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
        <button className="add-layer-button" onClick={onAddLayer}><PlusIcon /> Ajouter une couche</button>
      </div>

      <div className="inspector-section performance-section">
        <h3>PERFORMANCES</h3>
        <dl className="performance-list">
          <div><dt>R</dt><dd><strong>R = {formatNumber(wallResistance(wall))}</strong> m²·K/W</dd></div>
          <div><dt>U</dt><dd><strong>U = {formatNumber(wallUValue(wall))}</strong> W/m²·K</dd></div>
          <div><dt>□</dt><dd><strong>Surface = {formatNumber(wallArea(wall))}</strong> m²</dd></div>
        </dl>
      </div>
    </aside>
  );
}
