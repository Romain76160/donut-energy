import type { Language } from "./i18n";
import {
  cloneLayers,
  createId,
  externalWallLayers,
  internalWallLayers,
  type PhysicalWallType,
  type Project,
  type Wall,
  type WallLayer,
} from "./model";

export type WallTypeDefinition = {
  id: string;
  name: string;
  physicalType: PhysicalWallType;
  layers: WallLayer[];
  builtIn?: boolean;
};

const STORAGE_KEY = "donut-energy-wall-types";
const LINKS_STORAGE_KEY = "donut-energy-wall-type-links";
export const WALL_TYPES_CHANGE_EVENT = "donut-energy-wall-types-change";

type WallTypeLinks = Record<string, string>;

const makeBuiltIns = (): WallTypeDefinition[] => [
  {
    id: "wall-external-standard",
    name: "Mur extérieur standard",
    physicalType: "external",
    layers: externalWallLayers(),
    builtIn: true,
  },
  {
    id: "wall-internal-standard",
    name: "Cloison intérieure standard",
    physicalType: "internal",
    layers: internalWallLayers(),
    builtIn: true,
  },
];

const fallbackLayers = (physicalType: PhysicalWallType) =>
  physicalType === "external" ? externalWallLayers() : internalWallLayers();

export const normalizeWallType = (value: Partial<WallTypeDefinition>, index = 0): WallTypeDefinition => {
  const physicalType: PhysicalWallType = value.physicalType === "internal" ? "internal" : "external";
  const layers = Array.isArray(value.layers) && value.layers.length
    ? value.layers.map((layer) => ({
      ...layer,
      id: layer.id || createId(),
      thicknessMm: Math.max(1, Number(layer.thicknessMm) || 1),
      conductivity: Math.max(0.001, Number(layer.conductivity) || 0.001),
    }))
    : fallbackLayers(physicalType);
  return {
    id: typeof value.id === "string" && value.id ? value.id : createId(),
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : `Type de mur ${index + 1}`,
    physicalType,
    layers,
    builtIn: value.builtIn === true,
  };
};

export const builtInWallTypes = () => makeBuiltIns().map((type) => ({
  ...type,
  layers: cloneLayers(type.layers),
}));

const loadStoredCustomWallTypes = (): WallTypeDefinition[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => item && typeof item === "object" ? normalizeWallType(item as Partial<WallTypeDefinition>, index) : null)
      .filter((item): item is WallTypeDefinition => Boolean(item))
      .map((item) => ({ ...item, builtIn: false }));
  } catch {
    return [];
  }
};

export const loadWallTypes = (): WallTypeDefinition[] => [
  ...builtInWallTypes(),
  ...loadStoredCustomWallTypes(),
];

const readWallTypeLinks = (): WallTypeLinks => {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(LINKS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed as WallTypeLinks : {};
  } catch {
    return {};
  }
};

const saveWallTypeLinks = (links: WallTypeLinks) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
  } catch {
    // The current editor session can continue even without persistent storage.
  }
};

export const readWallTypeLink = (wallId: string) => readWallTypeLinks()[wallId] ?? null;

export const linkWallType = (wallId: string, typeId: string) => {
  const links = readWallTypeLinks();
  links[wallId] = typeId;
  saveWallTypeLinks(links);
};

export const unlinkWallType = (wallId: string) => {
  const links = readWallTypeLinks();
  delete links[wallId];
  saveWallTypeLinks(links);
};

const purgeWallTypeLinks = (typeIds: Set<string>) => {
  if (!typeIds.size) return;
  const links = readWallTypeLinks();
  let changed = false;
  Object.entries(links).forEach(([wallId, typeId]) => {
    if (!typeIds.has(typeId)) return;
    delete links[wallId];
    changed = true;
  });
  if (changed) saveWallTypeLinks(links);
};

export const saveWallTypes = (types: WallTypeDefinition[]) => {
  const previousCustomIds = new Set(loadStoredCustomWallTypes().map((type) => type.id));
  const custom = types.filter((type) => !type.builtIn).map((type, index) => ({
    ...normalizeWallType(type, index),
    builtIn: undefined,
  }));
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch {
      // The library remains available for the current session if storage is unavailable.
    }
  }
  const nextCustomIds = new Set(custom.map((type) => type.id));
  purgeWallTypeLinks(new Set([...previousCustomIds].filter((id) => !nextCustomIds.has(id))));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WALL_TYPES_CHANGE_EVENT, { detail: { types } }));
  }
};

export const createWallType = (index = 0, physicalType: PhysicalWallType = "external"): WallTypeDefinition => normalizeWallType({
  id: createId(),
  name: physicalType === "external" ? `Type mur extérieur ${index + 1}` : `Type cloison ${index + 1}`,
  physicalType,
  layers: fallbackLayers(physicalType),
});

export const wallTypeFromWall = (wall: Wall, index = 0): WallTypeDefinition => normalizeWallType({
  id: createId(),
  name: wall.name || `Type de mur ${index + 1}`,
  physicalType: wall.type === "internal" ? "internal" : "external",
  layers: cloneLayers(wall.layers),
});

export const wallTypeThicknessMm = (type: Pick<WallTypeDefinition, "layers">) =>
  type.layers.reduce((total, layer) => total + Math.max(0, Number(layer.thicknessMm) || 0), 0);

export const wallPhysicalTypeLabel = (type: PhysicalWallType, language: Language) => {
  if (language === "fr") return type === "external" ? "Mur extérieur" : "Mur intérieur";
  return type === "external" ? "External wall" : "Internal wall";
};

export const applyWallTypeToWall = (wall: Wall, type: WallTypeDefinition): Wall => {
  if (wall.type === "virtual") return wall;
  return {
    ...wall,
    type: type.physicalType,
    layers: cloneLayers(type.layers),
  };
};

export const syncProjectWallTypeInstances = (project: Project, types: WallTypeDefinition[]): Project => {
  const byId = new Map(types.map((type) => [type.id, type]));
  let changed = false;
  const levels = project.levels.map((level) => {
    let levelChanged = false;
    const walls = level.walls.map((wall) => {
      if (wall.type === "virtual") return wall;
      const typeId = readWallTypeLink(wall.id);
      const type = typeId ? byId.get(typeId) : undefined;
      if (!type) return wall;
      const sameLayers = wall.layers.length === type.layers.length && wall.layers.every((layer, index) => {
        const source = type.layers[index];
        return source && layer.name === source.name && layer.thicknessMm === source.thicknessMm && layer.conductivity === source.conductivity && layer.color === source.color;
      });
      if (wall.type === type.physicalType && sameLayers) return wall;
      levelChanged = true;
      return applyWallTypeToWall(wall, type);
    });
    if (!levelChanged) return level;
    changed = true;
    return { ...level, walls };
  });
  return changed ? { ...project, levels } : project;
};
