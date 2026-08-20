import { useEffect, useMemo, useState } from "react";
import type { Language } from "../i18n";
import { wallProfilePresetPoints, type WallProfilePreset } from "../wallProfilePresets";
import "../wall-shape-library.css";

type Category = "all" | "basic" | "roof" | "steps" | "industrial";

type PresetDefinition = {
  id: WallProfilePreset;
  category: Exclude<Category, "all">;
  fr: string;
  en: string;
  descriptionFr: string;
  descriptionEn: string;
};

const PRESETS: PresetDefinition[] = [
  { id: "rectangle", category: "basic", fr: "Mur droit", en: "Straight wall", descriptionFr: "Profil rectangulaire classique.", descriptionEn: "Classic rectangular profile." },
  { id: "slope-up", category: "roof", fr: "Monopente montante", en: "Rising mono-pitch", descriptionFr: "Une pente régulière vers la droite.", descriptionEn: "Single regular rise to the right." },
  { id: "slope-down", category: "roof", fr: "Monopente descendante", en: "Falling mono-pitch", descriptionFr: "Une pente régulière vers la gauche.", descriptionEn: "Single regular fall to the right." },
  { id: "gable-center", category: "roof", fr: "Pignon centré", en: "Centered gable", descriptionFr: "Sommet au centre du mur.", descriptionEn: "Peak centered on the wall." },
  { id: "gable-left", category: "roof", fr: "Pignon décalé gauche", en: "Left-offset gable", descriptionFr: "Sommet décalé vers la gauche.", descriptionEn: "Peak shifted to the left." },
  { id: "gable-right", category: "roof", fr: "Pignon décalé droit", en: "Right-offset gable", descriptionFr: "Sommet décalé vers la droite.", descriptionEn: "Peak shifted to the right." },
  { id: "step-up", category: "steps", fr: "Décroché montant", en: "Step up", descriptionFr: "Un changement vertical vers le haut.", descriptionEn: "One vertical step upward." },
  { id: "step-down", category: "steps", fr: "Décroché descendant", en: "Step down", descriptionFr: "Un changement vertical vers le bas.", descriptionEn: "One vertical step downward." },
  { id: "parapet-left", category: "steps", fr: "Acrotère gauche", en: "Left parapet", descriptionFr: "Relevé vertical en rive gauche.", descriptionEn: "Raised edge on the left side." },
  { id: "parapet-right", category: "steps", fr: "Acrotère droit", en: "Right parapet", descriptionFr: "Relevé vertical en rive droite.", descriptionEn: "Raised edge on the right side." },
  { id: "double-step", category: "steps", fr: "Double décroché", en: "Double step", descriptionFr: "Deux changements successifs de hauteur.", descriptionEn: "Two successive height changes." },
  { id: "truncated-gable", category: "roof", fr: "Pignon tronqué", en: "Truncated gable", descriptionFr: "Pignon avec sommet horizontal.", descriptionEn: "Gable with a flat top." },
  { id: "butterfly", category: "roof", fr: "Toiture papillon", en: "Butterfly roof", descriptionFr: "Deux pentes convergent vers le centre.", descriptionEn: "Two slopes meet in a central valley." },
  { id: "shed", category: "industrial", fr: "Shed simple", en: "Single sawtooth", descriptionFr: "Profil industriel en dent de scie.", descriptionEn: "Industrial sawtooth profile." },
  { id: "double-shed", category: "industrial", fr: "Double shed", en: "Double sawtooth", descriptionFr: "Deux dents de scie successives.", descriptionEn: "Two successive sawtooth bays." },
  { id: "arch", category: "industrial", fr: "Voûte approximée", en: "Approximate arch", descriptionFr: "Courbe obtenue avec plusieurs points.", descriptionEn: "Curve approximated with several points." },
];

function PresetIcon({ preset }: { preset: WallProfilePreset }) {
  const points = wallProfilePresetPoints(preset).map(([x, y]) => ({ x: 10 + x * 110, y: 8 + y * 52 }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");
  const polygon = ["10,66", ...points.map((point) => `${point.x},${point.y}`), "120,66"].join(" ");
  return (
    <svg viewBox="0 0 130 72" aria-hidden="true">
      <line className="shape-card-ground" x1="8" y1="66" x2="122" y2="66" />
      <polygon className="shape-card-fill" points={polygon} />
      <polyline className="shape-card-line" points={polyline} />
    </svg>
  );
}

type Props = {
  language: Language;
  onApply: (preset: WallProfilePreset) => void;
  onClose: () => void;
};

export function WallShapeLibrary({ language, onApply, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("all");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const labels = language === "fr" ? {
    title: "Bibliothèque de formes",
    subtitle: "Recherchez une géométrie puis appliquez-la au mur sélectionné.",
    search: "Rechercher une forme…",
    all: "Toutes",
    basic: "Basiques",
    roof: "Toitures / pignons",
    steps: "Décrochements",
    industrial: "Industrielles",
    apply: "Appliquer",
    noResult: "Aucune forme ne correspond à la recherche.",
    close: "Fermer",
  } : {
    title: "Shape library",
    subtitle: "Search a geometry and apply it to the selected wall.",
    search: "Search a shape…",
    all: "All",
    basic: "Basic",
    roof: "Roofs / gables",
    steps: "Steps",
    industrial: "Industrial",
    apply: "Apply",
    noResult: "No shape matches your search.",
    close: "Close",
  };

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase();
    return PRESETS.filter((preset) => {
      if (category !== "all" && preset.category !== category) return false;
      if (!normalizedQuery) return true;
      const label = language === "fr" ? preset.fr : preset.en;
      const description = language === "fr" ? preset.descriptionFr : preset.descriptionEn;
      return `${label} ${description}`.toLocaleLowerCase().includes(normalizedQuery);
    });
  }, [category, language, query]);

  const categories: Array<{ id: Category; label: string }> = [
    { id: "all", label: labels.all },
    { id: "basic", label: labels.basic },
    { id: "roof", label: labels.roof },
    { id: "steps", label: labels.steps },
    { id: "industrial", label: labels.industrial },
  ];

  return (
    <div className="wall-shape-dialog-backdrop" role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="wall-shape-dialog" role="dialog" aria-modal="true" aria-label={labels.title}>
        <header className="wall-shape-dialog-header">
          <div><h2>{labels.title}</h2><p>{labels.subtitle}</p></div>
          <button type="button" className="wall-shape-close" onClick={onClose} aria-label={labels.close}>
            <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 5l10 10M15 5 5 15" /></svg>
          </button>
        </header>

        <div className="wall-shape-search-row">
          <label className="wall-shape-search">
            <svg viewBox="0 0 20 20" aria-hidden="true"><circle cx="8.5" cy="8.5" r="5.5" /><path d="m13 13 4 4" /></svg>
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={labels.search} />
          </label>
          <div className="wall-shape-categories">
            {categories.map((item) => <button key={item.id} type="button" className={category === item.id ? "active" : ""} onClick={() => setCategory(item.id)}>{item.label}</button>)}
          </div>
        </div>

        <div className="wall-shape-results">
          {filtered.length ? filtered.map((preset) => {
            const label = language === "fr" ? preset.fr : preset.en;
            const description = language === "fr" ? preset.descriptionFr : preset.descriptionEn;
            return (
              <button
                key={preset.id}
                type="button"
                className="wall-shape-card"
                onClick={() => { onApply(preset.id); onClose(); }}
                aria-label={`${labels.apply} ${label}`}
              >
                <PresetIcon preset={preset.id} />
                <span><strong>{label}</strong><small>{description}</small></span>
              </button>
            );
          }) : <div className="wall-shape-empty">{labels.noResult}</div>}
        </div>
      </section>
    </div>
  );
}
