import {
  cloneLayers,
  externalWallLayers,
  internalWallLayers,
  type Wall,
  type WallLayer,
  type WallType,
} from "./model";

export type WallDefaultTemplate = {
  label: string;
  sourceWallId?: string;
  sourceWallName?: string;
  layers: WallLayer[];
};

export type WallDefaults = {
  external: WallDefaultTemplate;
  internal: WallDefaultTemplate;
};

const STORAGE_KEY = "donut-energy-wall-defaults";

const standardTemplate = (type: WallType): WallDefaultTemplate => ({
  label: type === "external" ? "Mur extérieur standard" : "Mur intérieur standard",
  layers: type === "external" ? externalWallLayers() : internalWallLayers(),
});

export const initialWallDefaults = (): WallDefaults => ({
  external: standardTemplate("external"),
  internal: standardTemplate("internal"),
});

const normalizeTemplate = (value: unknown, type: WallType): WallDefaultTemplate => {
  if (!value || typeof value !== "object") return standardTemplate(type);
  const source = value as Partial<WallDefaultTemplate>;
  const layers = Array.isArray(source.layers) && source.layers.length
    ? source.layers.map((layer) => ({ ...layer }))
    : standardTemplate(type).layers;
  return {
    label: typeof source.label === "string" && source.label.trim()
      ? source.label
      : type === "external" ? "Mur extérieur standard" : "Mur intérieur standard",
    sourceWallId: typeof source.sourceWallId === "string" ? source.sourceWallId : undefined,
    sourceWallName: typeof source.sourceWallName === "string" ? source.sourceWallName : undefined,
    layers,
  };
};

export const loadWallDefaults = (): WallDefaults => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return initialWallDefaults();
    const parsed = JSON.parse(raw) as Partial<WallDefaults>;
    return {
      external: normalizeTemplate(parsed.external, "external"),
      internal: normalizeTemplate(parsed.internal, "internal"),
    };
  } catch {
    return initialWallDefaults();
  }
};

export const saveWallDefaults = (defaults: WallDefaults) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
  } catch {
    // Persistence is optional when localStorage is unavailable.
  }
};

export const wallTemplateFromWall = (wall: Wall): WallDefaultTemplate => ({
  label: wall.name,
  sourceWallId: wall.id,
  sourceWallName: wall.name,
  layers: cloneLayers(wall.layers),
});

export const wallTemplateLayers = (defaults: WallDefaults, type: WallType) =>
  cloneLayers(defaults[type].layers);

export const resetWallTemplate = (type: WallType) => standardTemplate(type);

export const wallTemplateThickness = (template: WallDefaultTemplate) =>
  template.layers.reduce((sum, layer) => sum + layer.thicknessMm, 0);
