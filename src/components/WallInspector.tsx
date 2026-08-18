import { PlusIcon, TrashIcon } from "../icons";
import { localeFor, materialLabel, orientationLabel, translations, type Language } from "../i18n";
import {
  formatNumber,
  MATERIALS,
  normalizeProfile,
  wallLength,
  type Orientation,
  type ProfilePoint,
  type Wall,
  type WallLayer,
  type WallType,
} from "../model";
import { wallArea, wallResistance, wallUValue } from "../thermal";

type Props = {
  wall: Wall | null;
  language: Language;
  automaticOrientation: Orientation | null;
  automaticAzimuth: number | null;
  onUpdateWall: (patch: Partial<Wall>) => void;
  onUpdateLength: (length: number) => void;
  onAddLayer: () => void;
  onUpdateLayer: (layerId: string, patch: Partial<WallLayer>) => void;
  onRemoveLayer: (layerId: string) => void;
  onUpdateProfile: (profile: ProfilePoint[]) => void;
  onSetProfilePreset: (preset: "rectangle" | "slope" | "gable") => void;
  onAddProfilePoint: () => void;
  onRemoveProfilePoint: (id: string) => void;
};

function ProfilePreview({ wall }: { wall: Wall }) {
  const profile = normalizeProfile(wall);
  const length = Math.max(0.01, wallLength(wall));
  const maxHeight = Math.max(3, ...profile.map((point) => point.height)) * 1.12;
  const width = 292;
  const height = 142;
  const padding = 18;
  const plotWidth = width - padding * 2;
  const plotHeight = height - padding * 2;
  const coordinates = profile.map((point) => ({
    ...point,
    x: padding + point.position / length * plotWidth,
    y: height - padding - point.height / maxHeight * plotHeight,
  }));
  const polygon = [
    `${padding},${height - padding}`,
    ...coordinates.map((point) => `${point.x},${point.y}`),
    `${width - padding},${height - padding}`,
  ].join(" ");

  return (
    <svg className="profile-preview" viewBox={`0 0 ${width} ${height}`} aria-label="Profil du mur">
      <line className="profile-ground" x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
      <polygon className="profile-fill" points={polygon} />
      <polyline className="profile-line" points={coordinates.map((point) => `${point.x},${point.y}`).join(" ")} />
      {coordinates.map((point) => <circle key={point.id} className="profile-handle" cx={point.x} cy={point.y} r="5" />)}
    </svg>
  );
}

export function WallInspector({
  wall,
  language,
  automaticOrientation,
  automaticAzimuth,
  onUpdateWall,
  onUpdateLength,
  onAddLayer,
  onUpdateLayer,
  onRemoveLayer,
  onUpdateProfile,
  onSetProfilePreset,
  onAddProfilePoint,
  onRemoveProfilePoint,
}: Props) {
  const text = translations[language];
  const locale = localeFor(language);
  const automaticLabel = language === "fr" ? "Calculée depuis le nord du projet" : "Calculated from project north";

  if (!wall) return null;
  const profile = normalizeProfile(wall);
  const length = wallLength(wall);

  const updatePoint = (id: string, patch: Partial<ProfilePoint>) => {
    const next = profile.map((point, index) => {
      if (point.id !== id) return point;
      const position = patch.position === undefined
        ? point.position
        : index === 0 ? 0 : index === profile.length - 1 ? length : Math.max(0.01, Math.min(length - 0.01, patch.position));
      return { ...point, ...patch, position, height: patch.height === undefined ? point.height : Math.max(0.1, patch.height) };
    }).sort((a, b) => a.position - b.position);
    onUpdateProfile(next);
  };

  return (
    <aside className="inspector" aria-label={text.wallPropertiesAria}>
      <h2>{text.wallProperties}</h2>
      <div className="property-fields">
        <label>
          <span>{text.name}</span>
          <input value={wall.name} onChange={(event) => onUpdateWall({ name: event.target.value })} />
        </label>
        <label>
          <span>{text.wallType}</span>
          <select value={wall.type} onChange={(event) => onUpdateWall({ type: event.target.value as WallType })}>
            <option value="external">{text.external}</option>
            <option value="internal">{text.internal}</option>
          </select>
        </label>
        <label>
          <span>{text.length}</span>
          <div className="unit-input">
            <input type="number" min="0.2" step="0.1" value={length.toFixed(2)} onChange={(event) => onUpdateLength(Number(event.target.value))} />
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
              onChange={(event) => {
                const height = Math.max(0.5, Number(event.target.value));
                const currentProfile = normalizeProfile(wall);
                const delta = height - wall.height;
                onUpdateWall({ height, profile: currentProfile.map((point) => ({ ...point, height: Math.max(0.1, point.height + delta) })) });
              }}
            />
            <b>m</b>
          </div>
        </label>
        <label>
          <span>{text.orientation}</span>
          <div className="orientation-readonly">
            <strong>{wall.type === "internal" ? text.internal : automaticOrientation ? orientationLabel(automaticOrientation, language) : "—"}</strong>
            <small>
              {wall.type === "external" && automaticAzimuth !== null ? `${formatNumber(automaticAzimuth, 0, locale)}° · ` : ""}{automaticLabel}
            </small>
          </div>
        </label>
      </div>

      <div className="inspector-section profile-section">
        <div className="section-title-row"><h3>{text.profile}</h3><span>{formatNumber(wallArea(wall), 2, locale)} m²</span></div>
        <p className="section-help">{text.profileHelp}</p>
        <div className="profile-presets">
          <button onClick={() => onSetProfilePreset("rectangle")}>{text.rectangle}</button>
          <button onClick={() => onSetProfilePreset("slope")}>{text.slope}</button>
          <button onClick={() => onSetProfilePreset("gable")}>{text.gable}</button>
        </div>
        <ProfilePreview wall={wall} />
        <div className="profile-point-list">
          <div className="profile-point-header"><span>{text.position}</span><span>{text.height}</span><span /></div>
          {profile.map((point, index) => (
            <div className="profile-point-row" key={point.id}>
              <div className="unit-input compact">
                <input
                  type="number"
                  min="0"
                  max={length}
                  step="0.1"
                  disabled={index === 0 || index === profile.length - 1}
                  value={point.position.toFixed(2)}
                  onChange={(event) => updatePoint(point.id, { position: Number(event.target.value) })}
                />
                <b>m</b>
              </div>
              <div className="unit-input compact">
                <input type="number" min="0.1" step="0.1" value={point.height.toFixed(2)} onChange={(event) => updatePoint(point.id, { height: Number(event.target.value) })} />
                <b>m</b>
              </div>
              <button className="icon-button" disabled={index === 0 || index === profile.length - 1 || profile.length <= 2} onClick={() => onRemoveProfilePoint(point.id)} aria-label={text.deletePoint}><TrashIcon /></button>
            </div>
          ))}
        </div>
        <button className="add-layer-button" onClick={onAddProfilePoint}><PlusIcon /> {text.addProfilePoint}</button>
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
                  {MATERIALS.map((material) => <option key={material.name} value={material.name}>{materialLabel(material.name, language)}</option>)}
                </select>
                <div className="unit-input compact">
                  <input aria-label={text.thicknessOf(displayedMaterial)} type="number" min="1" step="1" value={layer.thicknessMm} onChange={(event) => onUpdateLayer(layer.id, { thicknessMm: Math.max(1, Number(event.target.value)) })} />
                  <b>mm</b>
                </div>
                <button className="icon-button" aria-label={text.deleteMaterial(displayedMaterial)} onClick={() => onRemoveLayer(layer.id)} disabled={wall.layers.length === 1}><TrashIcon /></button>
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
