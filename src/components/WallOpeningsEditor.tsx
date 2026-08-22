import { useEffect, useState } from "react";
import { PlusIcon, TrashIcon } from "../icons";
import { localeFor, type Language } from "../i18n";
import { OPENING_PLAN_MOVE_EVENT, type OpeningPlanMoveDetail } from "../openingEditing";
import { removeOpeningDepth, writeOpeningDepth } from "../openingDepth";
import { fitOpeningToWallProfile } from "../openingProfileFit";
import { formatNumber, wallLength, type OpeningType, type Wall, type WallOpening } from "../model";
import { normalizeOpening, openingArea, openingTypeLabel, wallOpenings } from "../openings";
import {
  applyWindowTypeToOpening,
  linkWindowType,
  loadWindowTypes,
  readWindowTypeLink,
  saveWindowTypes,
  unlinkWindowType,
  type WindowTypeDefinition,
} from "../windowTypes";
import "../openings.css";
import "../joinery-placement.css";
import { OpeningDepthEditor } from "./OpeningDepthEditor";
import { OpeningElevationEditor } from "./OpeningElevationEditor";
import { WindowTypeLibrary, WindowTypePicker } from "./WindowTypeLibrary";

type Props = {
  wall: Wall;
  language: Language;
  onChange: (openings: WallOpening[]) => void;
};

export function WallOpeningsEditor({ wall, language, onChange }: Props) {
  const locale = localeFor(language);
  const openings = wallOpenings(wall);
  const length = wallLength(wall);
  const [windowTypes, setWindowTypes] = useState<WindowTypeDefinition[]>(loadWindowTypes);
  const [placementType, setPlacementType] = useState<OpeningType | null>(null);
  const [placementWindowTypeId, setPlacementWindowTypeId] = useState("");
  const [, setLinkRevision] = useState(0);
  const labels = language === "fr" ? {
    title: "MENUISERIES",
    help: "Choisissez une menuiserie puis cliquez dans l’élévation du mur pour la poser. Les menuiseries restent automatiquement sous le profil réel du mur.",
    place: "Poser une menuiserie",
    addWindow: "Fenêtre",
    addDoor: "Porte",
    addGlazedDoor: "Baie vitrée",
    windowType: "Type de fenêtre",
    standardWindow: "Fenêtre standard",
    placing: "Mode pose actif — cliquez dans le mur · Échap pour terminer",
    none: "Aucune menuiserie sur ce mur.",
    name: "Nom",
    type: "Type",
    position: "Centre depuis le début",
    width: "Largeur",
    height: "Hauteur",
    sill: "Allège",
    uValue: "U ouverture",
    solar: "Facteur solaire",
    area: "Surface",
    delete: "Supprimer la menuiserie",
  } : {
    title: "JOINERY",
    help: "Choose joinery then click in the wall elevation to place it. Joinery is automatically kept below the actual wall profile.",
    place: "Place joinery",
    addWindow: "Window",
    addDoor: "Door",
    addGlazedDoor: "Glazed door",
    windowType: "Window type",
    standardWindow: "Standard window",
    placing: "Placement mode active — click in the wall · Escape to finish",
    none: "No joinery on this wall.",
    name: "Name",
    type: "Type",
    position: "Centre from wall start",
    width: "Width",
    height: "Height",
    sill: "Sill height",
    uValue: "Opening U-value",
    solar: "Solar factor",
    area: "Area",
    delete: "Delete joinery",
  };

  const emit = (next: WallOpening[]) => onChange(next.map((opening) =>
    fitOpeningToWallProfile(normalizeOpening(opening, wall), wall)
  ));

  useEffect(() => {
    const handlePlanMove = (event: Event) => {
      const detail = (event as CustomEvent<OpeningPlanMoveDetail>).detail;
      if (!detail || detail.wallId !== wall.id) return;
      const current = wallOpenings(wall);
      if (!current.some((opening) => opening.id === detail.openingId)) return;
      emit(current.map((opening) => opening.id === detail.openingId ? { ...opening, position: detail.position } : opening));
    };
    window.addEventListener(OPENING_PLAN_MOVE_EVENT, handlePlanMove);
    return () => window.removeEventListener(OPENING_PLAN_MOVE_EVENT, handlePlanMove);
  }, [wall, onChange]);

  useEffect(() => {
    if (!placementType) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setPlacementType(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [placementType]);

  const changeWindowTypes = (next: WindowTypeDefinition[]) => {
    setWindowTypes(next);
    saveWindowTypes(next);
    if (placementWindowTypeId && !next.some((type) => type.id === placementWindowTypeId)) {
      setPlacementWindowTypeId("");
    }
  };

  const placeOpening = (candidate: WallOpening) => {
    let next = fitOpeningToWallProfile(normalizeOpening(candidate, wall), wall);
    if (next.type === "window" && placementWindowTypeId) {
      const selectedType = windowTypes.find((type) => type.id === placementWindowTypeId);
      if (selectedType) {
        next = fitOpeningToWallProfile(normalizeOpening(applyWindowTypeToOpening(next, selectedType), wall), wall);
        linkWindowType(wall.id, next.id, selectedType.id);
        writeOpeningDepth(wall, next.id, { mode: selectedType.depthMode, frameDepthMm: selectedType.frameDepthMm });
      }
    }
    emit([...openings, next]);
  };

  const updateOpening = (id: string, patch: Partial<WallOpening>, detachLinked = false) => {
    if (detachLinked && readWindowTypeLink(wall.id, id)) {
      unlinkWindowType(wall.id, id);
      setLinkRevision((value) => value + 1);
    }
    emit(openings.map((opening) => opening.id === id ? { ...opening, ...patch } : opening));
  };

  const applyWindowType = (openingId: string, type: WindowTypeDefinition) => {
    linkWindowType(wall.id, openingId, type.id);
    setLinkRevision((value) => value + 1);
    emit(openings.map((opening) => opening.id === openingId
      ? fitOpeningToWallProfile(normalizeOpening(applyWindowTypeToOpening(opening, type), wall), wall)
      : opening));
    writeOpeningDepth(wall, openingId, { mode: type.depthMode, frameDepthMm: type.frameDepthMm });
  };

  const detachWindowType = (openingId: string) => {
    unlinkWindowType(wall.id, openingId);
    setLinkRevision((value) => value + 1);
  };

  const removeOpening = (id: string) => {
    unlinkWindowType(wall.id, id);
    removeOpeningDepth(wall.id, id);
    emit(openings.filter((opening) => opening.id !== id));
  };

  const totalArea = openings.reduce((total, opening) => total + openingArea(opening), 0);

  const placementButton = (type: OpeningType, label: string) => (
    <button
      type="button"
      className={placementType === type ? "active" : ""}
      onClick={() => setPlacementType((current) => current === type ? null : type)}
      aria-pressed={placementType === type}
    >
      <PlusIcon /> {label}
    </button>
  );

  return (
    <section className="inspector-section wall-openings-section joinery-placement-section">
      <div className="section-title-row">
        <h3>{labels.title}</h3>
        <span>{openings.length} · {formatNumber(totalArea, 2, locale)} m²</span>
      </div>
      <p className="section-help">{labels.help}</p>

      <div className="joinery-placement-toolbar">
        <strong>{labels.place}</strong>
        <div className="opening-add-row joinery-placement-buttons">
          {placementButton("window", labels.addWindow)}
          {placementButton("door", labels.addDoor)}
          {placementButton("glazed-door", labels.addGlazedDoor)}
        </div>
        {placementType === "window" ? (
          <label className="joinery-type-select">
            <span>{labels.windowType}</span>
            <select value={placementWindowTypeId} onChange={(event) => setPlacementWindowTypeId(event.target.value)}>
              <option value="">{labels.standardWindow}</option>
              {windowTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}
            </select>
          </label>
        ) : null}
        {placementType ? <div className="joinery-placement-hint">{labels.placing}</div> : null}
      </div>

      <OpeningElevationEditor
        wall={wall}
        openings={openings}
        language={language}
        placementType={placementType}
        onPlace={placeOpening}
        onChange={emit}
      />

      <WindowTypeLibrary types={windowTypes} language={language} onChange={changeWindowTypes} />

      {!openings.length && !placementType ? <div className="opening-empty">{labels.none}</div> : null}

      <div className="opening-list">
        {openings.map((opening, index) => (
          <article className={`opening-card ${opening.type}`} key={opening.id}>
            <div className="opening-card-head">
              <div>
                <strong>{opening.name || `${openingTypeLabel(opening.type, language)} ${index + 1}`}</strong>
                <small>{openingTypeLabel(opening.type, language)} · {formatNumber(openingArea(opening), 2, locale)} m²</small>
              </div>
              <button className="icon-button" type="button" onClick={() => removeOpening(opening.id)} aria-label={labels.delete}><TrashIcon /></button>
            </div>

            {opening.type === "window" ? (
              <WindowTypePicker
                types={windowTypes}
                language={language}
                currentTypeId={readWindowTypeLink(wall.id, opening.id)}
                onApply={(type) => applyWindowType(opening.id, type)}
                onDetach={() => detachWindowType(opening.id)}
              />
            ) : null}

            <OpeningDepthEditor wall={wall} opening={opening} language={language} />

            <div className="opening-fields">
              <label className="opening-wide-field">
                <span>{labels.name}</span>
                <input value={opening.name} onChange={(event) => updateOpening(opening.id, { name: event.target.value })} />
              </label>
              <label>
                <span>{labels.type}</span>
                <select
                  value={opening.type}
                  onChange={(event) => {
                    const type = event.target.value as OpeningType;
                    updateOpening(opening.id, {
                      type,
                      sillHeight: type === "window" ? Math.min(opening.sillHeight || 0.9, Math.max(0, wall.height - opening.height)) : 0,
                      solarFactor: type === "door" ? 0 : opening.solarFactor || 0.55,
                    }, true);
                  }}
                >
                  <option value="window">{openingTypeLabel("window", language)}</option>
                  <option value="door">{openingTypeLabel("door", language)}</option>
                  <option value="glazed-door">{openingTypeLabel("glazed-door", language)}</option>
                </select>
              </label>
              <label>
                <span>{labels.position}</span>
                <div className="unit-input compact"><input type="number" min="0" max={length} step="0.1" value={opening.position.toFixed(2)} onChange={(event) => updateOpening(opening.id, { position: Number(event.target.value) })} /><b>m</b></div>
              </label>
              <label>
                <span>{labels.width}</span>
                <div className="unit-input compact"><input type="number" min="0.2" max={length} step="0.1" value={opening.width.toFixed(2)} onChange={(event) => updateOpening(opening.id, { width: Number(event.target.value) }, true)} /><b>m</b></div>
              </label>
              <label>
                <span>{labels.height}</span>
                <div className="unit-input compact"><input type="number" min="0.2" max={wall.height} step="0.1" value={opening.height.toFixed(2)} onChange={(event) => updateOpening(opening.id, { height: Number(event.target.value) }, true)} /><b>m</b></div>
              </label>
              <label>
                <span>{labels.sill}</span>
                <div className="unit-input compact"><input type="number" min="0" max={wall.height} step="0.1" disabled={opening.type !== "window"} value={opening.sillHeight.toFixed(2)} onChange={(event) => updateOpening(opening.id, { sillHeight: Number(event.target.value) }, true)} /><b>m</b></div>
              </label>
              <label>
                <span>{labels.uValue}</span>
                <div className="unit-input compact"><input type="number" min="0.1" step="0.1" value={opening.uValue.toFixed(2)} onChange={(event) => updateOpening(opening.id, { uValue: Number(event.target.value) }, true)} /><b>W/m²K</b></div>
              </label>
              <label>
                <span>{labels.solar}</span>
                <div className="unit-input compact"><input type="number" min="0" max="1" step="0.05" disabled={opening.type === "door"} value={opening.solarFactor.toFixed(2)} onChange={(event) => updateOpening(opening.id, { solarFactor: Number(event.target.value) }, true)} /><b>Sw</b></div>
              </label>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
