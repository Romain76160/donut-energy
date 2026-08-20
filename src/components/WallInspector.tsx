import { useState } from "react";
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
  type WallOpening,
  type WallType,
} from "../model";
import { wallArea, wallOpeningArea, wallOpaqueArea, wallResistance, wallTransmissionCoefficient, wallUValue } from "../thermal";
import { normalizeWallSectionProfile } from "../wallInclination";
import { wallProfileFromPreset, type WallProfilePreset } from "../wallProfilePresets";
import "../wall-inspector-editing.css";
import { WallOpeningsEditor } from "./WallOpeningsEditor";
import { WallProfileEditor } from "./WallProfileEditor";
import { WallSectionView } from "./WallSectionView";
import { WallShapeLibrary } from "./WallShapeLibrary";

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
  const [shapeLibraryOpen, setShapeLibraryOpen] = useState(false);
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
        : index === 0
          ? 0
          : index === profile.length - 1
            ? length
            : Math.max(0.01, Math.min(length - 0.01, patch.position));
      return {
        ...point,
        ...patch,
        position,
        height: patch.height === undefined ? point.height : Math.max(0.1, patch.height),
      };
    }).sort((a, b) => a.position - b.position);
    onUpdateProfile(next);
  };

  const changeHeight = (value: number) => {
    const height = Math.max(0.5, value);
    const currentProfile = normalizeProfile(wall);
    const delta = height - wall.height;
    const currentSection = normalizeWallSectionProfile(wall);
    const ratio = height / Math.max(0.1, wall.height);
    const openings = (wall.openings ?? []).map((opening) => ({
      ...opening,
      height: Math.min(opening.height, height),
      sillHeight: opening.type === "window" ? Math.min(opening.sillHeight, Math.max(0, height - Math.min(opening.height, height))) : 0,
    } satisfies WallOpening));
    onUpdateWall({
      height,
      profile: currentProfile.map((point) => ({ ...point, height: Math.max(0.1, point.height + delta) })),
      sectionProfile: currentSection.map((point, index) => ({
        ...point,
        height: index === 0 ? 0 : index === currentSection.length - 1 ? height : point.height * ratio,
        offset: point.offset * ratio,
      })),
      openings,
    });
  };

  const applyPreset = (preset: WallProfilePreset) => {
    if (preset === "rectangle") return onSetProfilePreset("rectangle");
    if (preset === "slope-up") return onSetProfilePreset("slope");
    if (preset === "gable-center") return onSetProfilePreset("gable");
    onUpdateProfile(wallProfileFromPreset(preset, length, wall.height));
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
            <input type="number" min="0.5" step="0.1" value={wall.height} onChange={(event) => changeHeight(Number(event.target.value))} />
            <b>m</b>
          </div>
        </label>
        <label>
          <span>{text.orientation}</span>
          <div className="orientation-readonly">
            <strong>{wall.type === "internal" ? text.internal : automaticOrientation ? orientationLabel(automaticOrientation, language) : "—"}</strong>
            <small>{wall.type === "external" && automaticAzimuth !== null ? `${formatNumber(automaticAzimuth, 0, locale)}° · ` : ""}{automaticLabel}</small>
          </div>
        </label>
      </div>

      <div className="inspector-section profile-section">
        <div className="section-title-row">
          <h3>{text.profile}</h3>
          <span>{formatNumber(wallArea(wall), 2, locale)} m²</span>
        </div>
        <p className="section-help">{language === "fr" ? "Édition directe : déplacez les points et modifiez les cotes sur le dessin." : "Direct editing: drag points and edit dimensions on the drawing."}</p>

        <button type="button" className="shape-library-launch" onClick={() => setShapeLibraryOpen(true)}>
          <span>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3 4h6v5H3zM11 4h6v5h-6zM3 11h6v5H3zM11 11h6v5h-6z" /></svg>
            {language === "fr" ? "Bibliothèque de formes" : "Shape library"}
          </span>
          <small>{language === "fr" ? "Recherche + catégories" : "Search + categories"}</small>
        </button>

        <WallProfileEditor wall={wall} language={language} onProfileChange={onUpdateProfile} onLengthChange={onUpdateLength} />

        <details className="numeric-point-editor">
          <summary>{language === "fr" ? "Valeurs numériques des points" : "Numeric point values"}</summary>
          <div className="profile-point-list">
            <div className="profile-point-header"><span>{text.position}</span><span>{text.height}</span><span /></div>
            {profile.map((point, index) => (
              <div className="profile-point-row" key={point.id}>
                <div className="unit-input compact">
                  <input type="number" min="0" max={length} step="0.1" disabled={index === 0 || index === profile.length - 1} value={point.position.toFixed(2)} onChange={(event) => updatePoint(point.id, { position: Number(event.target.value) })} />
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
        </details>
      </div>

      <WallSectionView wall={wall} language={language} onUpdateWall={onUpdateWall} onHeightChange={changeHeight} />

      <WallOpeningsEditor
        wall={wall}
        language={language}
        onChange={(openings) => onUpdateWall({ openings })}
      />

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
          <div><dt>□</dt><dd><strong>{language === "fr" ? "Surface brute" : "Gross area"} = {formatNumber(wallArea(wall), 2, locale)}</strong> m²</dd></div>
          <div><dt>▣</dt><dd><strong>{language === "fr" ? "Ouvertures" : "Openings"} = {formatNumber(wallOpeningArea(wall), 2, locale)}</strong> m²</dd></div>
          <div><dt>■</dt><dd><strong>{language === "fr" ? "Opaque" : "Opaque"} = {formatNumber(wallOpaqueArea(wall), 2, locale)}</strong> m²</dd></div>
          <div><dt>H</dt><dd><strong>H = {formatNumber(wallTransmissionCoefficient(wall), 2, locale)}</strong> W/K</dd></div>
        </dl>
      </div>

      {shapeLibraryOpen ? <WallShapeLibrary language={language} onApply={applyPreset} onClose={() => setShapeLibraryOpen(false)} /> : null}
    </aside>
  );
}
