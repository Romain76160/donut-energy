import { PlusIcon, TrashIcon } from "../icons";
import type { Room } from "../geometry";
import { localeFor, materialLabel, translations, type Language } from "../i18n";
import { formatNumber, levelClearHeight, levelPhysicalFloorArea, MATERIALS, type Level, type SurfaceAssembly, type WallLayer } from "../model";
import { assemblyResistance, assemblyUValue } from "../thermal";

type SurfaceKey = "floor" | "ceiling";

type Props = {
  level: Level;
  rooms: Room[];
  language: Language;
  onUpdateLevel: (patch: Partial<Level>) => void;
  onUpdateSurfaceLayer: (surface: SurfaceKey, layerId: string, patch: Partial<WallLayer>) => void;
  onAddSurfaceLayer: (surface: SurfaceKey) => void;
  onRemoveSurfaceLayer: (surface: SurfaceKey, layerId: string) => void;
};

function AssemblyEditor({
  title,
  assembly,
  surface,
  language,
  onUpdateLayer,
  onAddLayer,
  onRemoveLayer,
}: {
  title: string;
  assembly: SurfaceAssembly;
  surface: SurfaceKey;
  language: Language;
  onUpdateLayer: Props["onUpdateSurfaceLayer"];
  onAddLayer: Props["onAddSurfaceLayer"];
  onRemoveLayer: Props["onRemoveSurfaceLayer"];
}) {
  const text = translations[language];
  const locale = localeFor(language);
  return (
    <div className="inspector-section">
      <div className="section-title-row"><h3>{title}</h3><span>U {formatNumber(assemblyUValue(assembly), 2, locale)}</span></div>
      <div className="layer-columns"><span>{text.material}</span><span>{text.thickness}</span></div>
      <div className="layer-list">
        {assembly.layers.map((layer) => (
          <div className="layer-row" key={layer.id}>
            <span className="drag-dots" aria-hidden="true">⠿</span>
            <span className="material-swatch" style={{ backgroundColor: layer.color }} />
            <select
              value={layer.name}
              aria-label={text.material}
              onChange={(event) => {
                const material = MATERIALS.find((item) => item.name === event.target.value);
                if (material) onUpdateLayer(surface, layer.id, material);
              }}
            >
              {MATERIALS.map((material) => <option key={material.name} value={material.name}>{materialLabel(material.name, language)}</option>)}
            </select>
            <div className="unit-input compact">
              <input type="number" min="1" step="1" value={layer.thicknessMm} onChange={(event) => onUpdateLayer(surface, layer.id, { thicknessMm: Math.max(1, Number(event.target.value)) })} />
              <b>mm</b>
            </div>
            <button className="icon-button" disabled={assembly.layers.length === 1} onClick={() => onRemoveLayer(surface, layer.id)}><TrashIcon /></button>
          </div>
        ))}
      </div>
      <button className="add-layer-button" onClick={() => onAddLayer(surface)}><PlusIcon /> {text.addLayer}</button>
      <dl className="surface-performance">
        <div><dt>R</dt><dd>{formatNumber(assemblyResistance(assembly), 2, locale)} m²·K/W</dd></div>
        <div><dt>U</dt><dd>{formatNumber(assemblyUValue(assembly), 2, locale)} W/m²·K</dd></div>
      </dl>
    </div>
  );
}

export function LevelInspector({
  level,
  rooms,
  language,
  onUpdateLevel,
  onUpdateSurfaceLayer,
  onAddSurfaceLayer,
  onRemoveSurfaceLayer,
}: Props) {
  const text = translations[language];
  const locale = localeFor(language);
  const geometricArea = rooms.reduce((total, room) => total + room.area, 0);
  const floorArea = levelPhysicalFloorArea(level, geometricArea);
  const clearHeight = levelClearHeight(level);
  const labels = language === "fr" ? {
    floorElevation: "Altitude du plancher",
    ceilingElevation: "Altitude du plafond / plancher haut",
    clearHeight: "Hauteur libre",
    openBelow: "Ouvert sur le niveau inférieur",
    openHelp: "Le plancher de ce niveau est supprimé : le volume communique avec le niveau inférieur.",
    solidHelp: "Un plancher sépare ce niveau du niveau inférieur.",
    voidTitle: "VIDE SUR NIVEAU INFÉRIEUR",
    voidBody: "Aucune surface de plancher n’est comptée pour ce niveau. Les pièces restent détectées en plan pour définir le volume.",
    geometricArea: "Surface géométrique",
  } : {
    floorElevation: "Floor elevation",
    ceilingElevation: "Ceiling / upper floor elevation",
    clearHeight: "Clear height",
    openBelow: "Open to level below",
    openHelp: "This level has no floor: its volume communicates with the level below.",
    solidHelp: "A floor separates this level from the level below.",
    voidTitle: "OPEN TO LEVEL BELOW",
    voidBody: "No floor surface is counted for this level. Rooms remain detected in plan to define the volume.",
    geometricArea: "Geometric area",
  };

  const updateFloorElevation = (value: number) => {
    if (!Number.isFinite(value)) return;
    onUpdateLevel({ elevation: value, defaultHeight: Math.max(0.1, level.ceilingElevation - value) });
  };

  const updateCeilingElevation = (value: number) => {
    if (!Number.isFinite(value)) return;
    const ceilingElevation = Math.max(level.elevation + 0.1, value);
    onUpdateLevel({ ceilingElevation, defaultHeight: ceilingElevation - level.elevation });
  };

  return (
    <aside className="inspector level-inspector" aria-label={text.levelSettings}>
      <h2>{text.levelSettings.toUpperCase()}</h2>
      <div className="property-fields">
        <label>
          <span>{text.name}</span>
          <input value={level.name} onChange={(event) => onUpdateLevel({ name: event.target.value })} />
        </label>
        <label>
          <span>{labels.floorElevation}</span>
          <div className="unit-input"><input type="number" step="0.05" value={level.elevation} onChange={(event) => updateFloorElevation(Number(event.target.value))} /><b>m</b></div>
        </label>
        <label>
          <span>{labels.ceilingElevation}</span>
          <div className="unit-input"><input type="number" step="0.05" value={level.ceilingElevation} onChange={(event) => updateCeilingElevation(Number(event.target.value))} /><b>m</b></div>
        </label>
        <div className="level-clear-height">
          <span>{labels.clearHeight}</span><strong>{formatNumber(clearHeight, 2, locale)} m</strong>
        </div>
        <label className="level-open-toggle">
          <input type="checkbox" checked={level.openToBelow} onChange={(event) => onUpdateLevel({ openToBelow: event.target.checked })} />
          <span><strong>{labels.openBelow}</strong><small>{level.openToBelow ? labels.openHelp : labels.solidHelp}</small></span>
        </label>
        <label className="toggle-field">
          <input type="checkbox" checked={level.showLowerReference} onChange={(event) => onUpdateLevel({ showLowerReference: event.target.checked })} />
          <span>{text.lowerReference}</span>
        </label>
      </div>

      <div className="level-room-summary inspector-section">
        <div className="section-title-row"><h3>{text.detectedRooms.toUpperCase()}</h3><span>{text.roomCount(rooms.length)}</span></div>
        {rooms.length ? (
          <div className="detected-room-list">
            {rooms.map((room, index) => (
              <div key={room.id}><span>{language === "fr" ? `Pièce ${index + 1}` : `Room ${index + 1}`}</span><strong>{formatNumber(room.area, 2, locale)} m²</strong></div>
            ))}
            <div><span>{labels.geometricArea}</span><strong>{formatNumber(geometricArea, 2, locale)} m²</strong></div>
            <div className="room-total"><span>{text.floorArea}</span><strong>{formatNumber(floorArea, 2, locale)} m²</strong></div>
          </div>
        ) : <p className="section-help">{text.noRoom}</p>}
      </div>

      {level.openToBelow ? (
        <div className="inspector-section level-open-void-card">
          <h3>{labels.voidTitle}</h3>
          <p>{labels.voidBody}</p>
          <div className="level-open-void-symbol" aria-hidden="true"><span>↓</span><i /></div>
        </div>
      ) : (
        <AssemblyEditor title={text.floor} assembly={level.floor} surface="floor" language={language} onUpdateLayer={onUpdateSurfaceLayer} onAddLayer={onAddSurfaceLayer} onRemoveLayer={onRemoveSurfaceLayer} />
      )}
      <AssemblyEditor title={text.ceiling} assembly={level.ceiling} surface="ceiling" language={language} onUpdateLayer={onUpdateSurfaceLayer} onAddLayer={onAddSurfaceLayer} onRemoveLayer={onRemoveSurfaceLayer} />
    </aside>
  );
}
