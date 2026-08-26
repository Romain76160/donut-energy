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
} from "../model";
import { wallArea, wallOpeningArea, wallOpaqueArea, wallResistance, wallTransmissionCoefficient, wallUValue } from "../thermal";
import { normalizeWallSectionProfile } from "../wallInclination";
import { wallProfileFromPreset, type WallProfilePreset } from "../wallProfilePresets";
import {
  applyWallTypeToWall,
  linkWallType,
  loadWallTypes,
  readWallTypeLink,
  saveWallTypes,
  unlinkWallType,
  type WallTypeDefinition,
} from "../wallTypes";
import "../wall-inspector-editing.css";
import { InspectorAccordion } from "./InspectorAccordion";
import { WallOpeningsEditor } from "./WallOpeningsEditor";
import { WallProfileEditor } from "./WallProfileEditor";
import { WallSectionView } from "./WallSectionView";
import { WallShapeLibrary } from "./WallShapeLibrary";
import { WallTypeLibrary } from "./WallTypeLibrary";

type Props = {
  wall: Wall | null;
  language: Language;
  automaticOrientation: Orientation | null;
  automaticAzimuth: number | null;
  onUpdateWall: (patch: Partial<Wall>) => void;
  onUpdateLength: (length: number) => void;
  onSetVirtual: (value: boolean) => void;
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
  onSetVirtual,
  onAddLayer,
  onUpdateLayer,
  onRemoveLayer,
  onUpdateProfile,
  onSetProfilePreset,
  onAddProfilePoint,
  onRemoveProfilePoint,
}: Props) {
  const [shapeLibraryOpen, setShapeLibraryOpen] = useState(false);
  const [wallTypes, setWallTypes] = useState<WallTypeDefinition[]>(loadWallTypes);
  const [, setTypeLinkRevision] = useState(0);
  const text = translations[language];
  const locale = localeFor(language);
  const automaticLabel = language === "fr" ? "Calculée depuis le nord du projet" : "Calculated from project north";

  if (!wall) return null;

  const profile = normalizeProfile(wall);
  const length = wallLength(wall);
  const currentWallTypeId = readWallTypeLink(wall.id);
  const linkedType = currentWallTypeId ? wallTypes.find((type) => type.id === currentWallTypeId) ?? null : null;

  const labels = language === "fr" ? {
    geometry: "Géométrie",
    geometryHint: `${formatNumber(length, 2, locale)} m · ${formatNumber(wall.height, 2, locale)} m de haut`,
    construction: "Construction & matériaux",
    constructionHint: linkedType ? `Lié à ${linkedType.name}` : `${wall.layers.length} couches`,
    composition: "Composition actuelle",
    openings: "Ouvertures",
    openingsHint: `${wall.openings?.length ?? 0} ouverture${(wall.openings?.length ?? 0) > 1 ? "s" : ""}`,
    performance: "Performances",
    performanceHint: `U ${formatNumber(wallUValue(wall), 2, locale)} W/m²·K`,
    advanced: "Avancé",
    advancedHint: "Profils · inclinaisons · points",
    advancedNote: "Les profils et inclinaisons modifient la géométrie verticale du mur. Ils sont regroupés ici pour garder l’inspecteur principal léger.",
    profile: "Profil / élévation",
    classification: "Classification automatique",
    virtual: "Passer en séparation virtuelle",
    autoType: wall.type === "external" ? "Mur extérieur" : "Mur intérieur",
  } : {
    geometry: "Geometry",
    geometryHint: `${formatNumber(length, 2, locale)} m · ${formatNumber(wall.height, 2, locale)} m high`,
    construction: "Construction & materials",
    constructionHint: linkedType ? `Linked to ${linkedType.name}` : `${wall.layers.length} layers`,
    composition: "Current composition",
    openings: "Openings",
    openingsHint: `${wall.openings?.length ?? 0} opening${(wall.openings?.length ?? 0) === 1 ? "" : "s"}`,
    performance: "Performance",
    performanceHint: `U ${formatNumber(wallUValue(wall), 2, locale)} W/m²·K`,
    advanced: "Advanced",
    advancedHint: "Profiles · inclinations · points",
    advancedNote: "Profiles and inclinations modify the wall's vertical geometry. They are grouped here to keep the main inspector compact.",
    profile: "Profile / elevation",
    classification: "Automatic classification",
    virtual: "Make virtual boundary",
    autoType: wall.type === "external" ? "External wall" : "Internal wall",
  };

  const detachWallType = () => {
    unlinkWallType(wall.id);
    setTypeLinkRevision((value) => value + 1);
  };

  const changeWallTypes = (next: WallTypeDefinition[]) => {
    setWallTypes(next);
    saveWallTypes(next);
  };

  const applyLinkedWallType = (type: WallTypeDefinition) => {
    const next = applyWallTypeToWall(wall, type);
    linkWallType(wall.id, type.id);
    setTypeLinkRevision((value) => value + 1);
    onUpdateWall({ layers: next.layers });
  };

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
    <aside className="inspector wall-inspector-compact" aria-label={text.wallPropertiesAria}>
      <h2>{text.wallProperties}</h2>

      <InspectorAccordion title={labels.geometry} hint={labels.geometryHint} defaultOpen>
        <div className="property-fields">
          <label>
            <span>{text.name}</span>
            <input value={wall.name} onChange={(event) => onUpdateWall({ name: event.target.value })} />
          </label>
          <div className="wall-auto-type-field">
            <span>{labels.classification}</span>
            <strong>{labels.autoType}</strong>
            <small>{language === "fr" ? "Calculé d’après les espaces de chaque côté" : "Calculated from the spaces on each side"}</small>
          </div>
          <button type="button" className="wall-virtual-toggle" onClick={() => onSetVirtual(true)}>
            <span aria-hidden="true">┄</span>
            {labels.virtual}
          </button>
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
      </InspectorAccordion>

      <InspectorAccordion title={labels.construction} hint={labels.constructionHint} defaultOpen>
        <WallTypeLibrary
          wall={wall}
          types={wallTypes}
          currentTypeId={currentWallTypeId}
          language={language}
          onChange={changeWallTypes}
          onApply={applyLinkedWallType}
          onDetach={detachWallType}
        />

        <div className="inspector-subheading">{labels.composition}</div>
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
                    if (material) { detachWallType(); onUpdateLayer(layer.id, material); }
                  }}
                >
                  {MATERIALS.map((material) => <option key={material.name} value={material.name}>{materialLabel(material.name, language)}</option>)}
                </select>
                <div className="unit-input compact">
                  <input aria-label={text.thicknessOf(displayedMaterial)} type="number" min="1" step="1" value={layer.thicknessMm} onChange={(event) => { detachWallType(); onUpdateLayer(layer.id, { thicknessMm: Math.max(1, Number(event.target.value)) }); }} />
                  <b>mm</b>
                </div>
                <button className="icon-button" aria-label={text.deleteMaterial(displayedMaterial)} onClick={() => { detachWallType(); onRemoveLayer(layer.id); }} disabled={wall.layers.length === 1}><TrashIcon /></button>
              </div>
            );
          })}
        </div>
        <button className="add-layer-button" onClick={() => { detachWallType(); onAddLayer(); }}><PlusIcon /> {text.addLayer}</button>
      </InspectorAccordion>

      <InspectorAccordion title={labels.openings} hint={labels.openingsHint}>
        <WallOpeningsEditor
          wall={wall}
          language={language}
          onChange={(openings) => onUpdateWall({ openings })}
        />
      </InspectorAccordion>

      <InspectorAccordion title={labels.performance} hint={labels.performanceHint}>
        <div className="inspector-section performance-section">
          <dl className="performance-list">
            <div><dt>R</dt><dd><strong>R = {formatNumber(wallResistance(wall), 2, locale)}</strong> m²·K/W</dd></div>
            <div><dt>U</dt><dd><strong>U = {formatNumber(wallUValue(wall), 2, locale)}</strong> W/m²·K</dd></div>
            <div><dt>□</dt><dd><strong>{language === "fr" ? "Surface brute" : "Gross area"} = {formatNumber(wallArea(wall), 2, locale)}</strong> m²</dd></div>
            <div><dt>▣</dt><dd><strong>{language === "fr" ? "Ouvertures" : "Openings"} = {formatNumber(wallOpeningArea(wall), 2, locale)}</strong> m²</dd></div>
            <div><dt>■</dt><dd><strong>{language === "fr" ? "Opaque" : "Opaque"} = {formatNumber(wallOpaqueArea(wall), 2, locale)}</strong> m²</dd></div>
            <div><dt>H</dt><dd><strong>H = {formatNumber(wallTransmissionCoefficient(wall), 2, locale)}</strong> W/K</dd></div>
          </dl>
        </div>
      </InspectorAccordion>

      <InspectorAccordion title={labels.advanced} hint={labels.advancedHint}>
        <p className="inspector-advanced-note">{labels.advancedNote}</p>
        <div className="inspector-subheading">{labels.profile}</div>
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

        <WallSectionView wall={wall} language={language} onUpdateWall={onUpdateWall} onHeightChange={changeHeight} />
      </InspectorAccordion>

      {shapeLibraryOpen ? <WallShapeLibrary language={language} onApply={applyPreset} onClose={() => setShapeLibraryOpen(false)} /> : null}
    </aside>
  );
}
