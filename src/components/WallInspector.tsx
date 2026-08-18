import { PlusIcon, TrashIcon } from "../icons";
import { localeFor, materialLabel, orientationLabel, translations, type Language } from "../i18n";
import { formatNumber, MATERIALS, wallLength, type Orientation, type Wall, type WallLayer } from "../model";
import { wallArea, wallResistance, wallUValue } from "../thermal";

const ORIENTATIONS: Orientation[] = ["Nord", "Est", "Sud", "Ouest"];

type Props = {
  wall: Wall | null;
  language: Language;
  onUpdateWall: (patch: Partial<Wall>) => void;
  onUpdateLength: (length: number) => void;
  onAddLayer: () => void;
  onUpdateLayer: (layerId: string, patch: Partial<WallLayer>) => void;
  onRemoveLayer: (layerId: string) => void;
};

export function WallInspector({
  wall,
  language,
  onUpdateWall,
  onUpdateLength,
  onAddLayer,
  onUpdateLayer,
  onRemoveLayer,
}: Props) {
  const text = translations[language];
  const locale = localeFor(language);

  if (!wall) {
    return (
      <aside className="inspector empty-inspector">
        <h2>{text.wallProperties}</h2>
        <p>{text.emptyWall}</p>
      </aside>
    );
  }

  return (
    <aside className="inspector" aria-label={text.wallPropertiesAria}>
      <h2>{text.wallProperties}</h2>
      <div className="property-fields">
        <label>
          <span>{text.name}</span>
          <input value={wall.name} onChange={(event) => onUpdateWall({ name: event.target.value })} />
        </label>
        <label>
          <span>{text.length}</span>
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
          <span>{text.height}</span>
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
          <span>{text.orientation}</span>
          <select value={wall.orientation} onChange={(event) => onUpdateWall({ orientation: event.target.value as Orientation })}>
            {ORIENTATIONS.map((orientation) => (
              <option key={orientation} value={orientation}>{orientationLabel(orientation, language)}</option>
            ))}
          </select>
        </label>
      </div>

      <div className="inspector-section">
        <h3>{text.composition}</h3>
        <div className="layer-columns"><span>{text.material}</span><span>{text.thickness}</span></div>
        <div className="layer-list">
          {wall.layers.map((layer) => {
            const displayedMaterial = materialLabel(layer.name, language);
            return (
              <div className="layer-row" key={layer.id}>
                <span className="drag-dots" aria-hidden="true">⠿</span>
                <span className="material-swatch" style={{ backgroundColor: layer.color }} />
                <select
                  aria-label={text.material}
                  value={layer.name}
                  onChange={(event) => {
                    const material = MATERIALS.find((item) => item.name === event.target.value);
                    if (material) onUpdateLayer(layer.id, material);
                  }}
                >
                  {MATERIALS.map((material) => (
                    <option key={material.name} value={material.name}>{materialLabel(material.name, language)}</option>
                  ))}
                </select>
                <div className="unit-input compact">
                  <input
                    aria-label={text.thicknessOf(displayedMaterial)}
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
                  aria-label={text.deleteMaterial(displayedMaterial)}
                  onClick={() => onRemoveLayer(layer.id)}
                  disabled={wall.layers.length === 1}
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
        <button className="add-layer-button" onClick={onAddLayer}><PlusIcon /> {text.addLayer}</button>
      </div>

      <div className="inspector-section performance-section">
        <h3>{text.performances}</h3>
        <dl className="performance-list">
          <div><dt>R</dt><dd><strong>R = {formatNumber(wallResistance(wall), 2, locale)}</strong> m²·K/W</dd></div>
          <div><dt>U</dt><dd><strong>U = {formatNumber(wallUValue(wall), 2, locale)}</strong> W/m²·K</dd></div>
          <div><dt>□</dt><dd><strong>{text.surface} = {formatNumber(wallArea(wall), 2, locale)}</strong> m²</dd></div>
        </dl>
      </div>
    </aside>
  );
}
