import type { Language } from "./i18n";
import { createId, type Project, type Wall, type WallOpening } from "./model";
import { normalizeOpening } from "./openings";
import { DEFAULT_FRAME_DEPTH_MM, type OpeningDepthMode, writeOpeningDepth } from "./openingDepth";

export type WindowOperation = "fixed" | "casement-1" | "casement-2" | "tilt-turn" | "sliding";

export type WindowTypeDefinition = {
  id: string;
  name: string;
  operation: WindowOperation;
  width: number;
  height: number;
  sillHeight: number;
  frameWidthMm: number;
  frameDepthMm: number;
  depthMode: OpeningDepthMode;
  uValue: number;
  solarFactor: number;
  builtIn?: boolean;
};

const STORAGE_KEY = "donut-energy-window-types";
const LINKS_STORAGE_KEY = "donut-energy-window-type-links";
export const WINDOW_TYPES_CHANGE_EVENT = "donut-energy-window-types-change";

type WindowTypeLinks = Record<string, string>;

const BUILT_IN_TYPES: WindowTypeDefinition[] = [
  {
    id: "window-fixed-120",
    name: "Fixe 120 × 120",
    operation: "fixed",
    width: 1.2,
    height: 1.2,
    sillHeight: 0.9,
    frameWidthMm: 70,
    frameDepthMm: DEFAULT_FRAME_DEPTH_MM,
    depthMode: "center",
    uValue: 1.3,
    solarFactor: 0.55,
    builtIn: true,
  },
  {
    id: "window-casement-090",
    name: "1 vantail 90 × 120",
    operation: "casement-1",
    width: 0.9,
    height: 1.2,
    sillHeight: 0.9,
    frameWidthMm: 70,
    frameDepthMm: DEFAULT_FRAME_DEPTH_MM,
    depthMode: "center",
    uValue: 1.3,
    solarFactor: 0.55,
    builtIn: true,
  },
  {
    id: "window-casement-140",
    name: "2 vantaux 140 × 120",
    operation: "casement-2",
    width: 1.4,
    height: 1.2,
    sillHeight: 0.9,
    frameWidthMm: 70,
    frameDepthMm: DEFAULT_FRAME_DEPTH_MM,
    depthMode: "center",
    uValue: 1.3,
    solarFactor: 0.55,
    builtIn: true,
  },
  {
    id: "window-sliding-180",
    name: "Coulissant 180 × 215",
    operation: "sliding",
    width: 1.8,
    height: 2.15,
    sillHeight: 0,
    frameWidthMm: 75,
    frameDepthMm: 90,
    depthMode: "center",
    uValue: 1.4,
    solarFactor: 0.5,
    builtIn: true,
  },
];

export const normalizeWindowType = (value: Partial<WindowTypeDefinition>, index = 0): WindowTypeDefinition => {
  const width = Math.max(0.2, Number(value.width) || 1.2);
  const height = Math.max(0.2, Number(value.height) || 1.2);
  const maxFrameWidth = Math.max(10, Math.min(width, height) * 500 - 1);
  const operation: WindowOperation = value.operation === "fixed" || value.operation === "casement-1" || value.operation === "casement-2" || value.operation === "tilt-turn" || value.operation === "sliding"
    ? value.operation
    : "casement-1";
  const depthMode: OpeningDepthMode = value.depthMode === "interior" || value.depthMode === "exterior" || value.depthMode === "custom" || value.depthMode === "center"
    ? value.depthMode
    : "center";
  return {
    id: typeof value.id === "string" && value.id ? value.id : createId(),
    name: typeof value.name === "string" && value.name.trim() ? value.name.trim() : `Type fenêtre ${index + 1}`,
    operation,
    width,
    height,
    sillHeight: Math.max(0, Number(value.sillHeight) || 0),
    frameWidthMm: Math.max(10, Math.min(maxFrameWidth, Number(value.frameWidthMm) || 70)),
    frameDepthMm: Math.max(10, Number(value.frameDepthMm) || DEFAULT_FRAME_DEPTH_MM),
    depthMode,
    uValue: Math.max(0.1, Number(value.uValue) || 1.3),
    solarFactor: Math.max(0, Math.min(1, Number(value.solarFactor) || 0)),
    builtIn: value.builtIn === true,
  };
};

export const builtInWindowTypes = () => BUILT_IN_TYPES.map((type) => ({ ...type }));

const loadStoredCustomWindowTypes = (): WindowTypeDefinition[] => {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((item, index) => item && typeof item === "object" ? normalizeWindowType(item as Partial<WindowTypeDefinition>, index) : null)
      .filter((item): item is WindowTypeDefinition => Boolean(item))
      .map((item) => ({ ...item, builtIn: false }));
  } catch {
    return [];
  }
};

export const loadWindowTypes = (): WindowTypeDefinition[] => [
  ...builtInWindowTypes(),
  ...loadStoredCustomWindowTypes(),
];

const readWindowTypeLinks = (): WindowTypeLinks => {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(LINKS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed as WindowTypeLinks : {};
  } catch {
    return {};
  }
};

const saveWindowTypeLinks = (links: WindowTypeLinks) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(LINKS_STORAGE_KEY, JSON.stringify(links));
  } catch {
    // Links remain usable for the current session when storage is unavailable.
  }
};

const windowTypeLinkKey = (wallId: string, openingId: string) => `${wallId}:${openingId}`;

export const readWindowTypeLink = (wallId: string, openingId: string) =>
  readWindowTypeLinks()[windowTypeLinkKey(wallId, openingId)] ?? null;

export const linkWindowType = (wallId: string, openingId: string, typeId: string) => {
  const links = readWindowTypeLinks();
  links[windowTypeLinkKey(wallId, openingId)] = typeId;
  saveWindowTypeLinks(links);
};

export const unlinkWindowType = (wallId: string, openingId: string) => {
  const links = readWindowTypeLinks();
  delete links[windowTypeLinkKey(wallId, openingId)];
  saveWindowTypeLinks(links);
};

const purgeWindowTypeLinks = (typeIds: Set<string>) => {
  if (!typeIds.size) return;
  const links = readWindowTypeLinks();
  let changed = false;
  Object.entries(links).forEach(([key, typeId]) => {
    if (!typeIds.has(typeId)) return;
    delete links[key];
    changed = true;
  });
  if (changed) saveWindowTypeLinks(links);
};

export const saveWindowTypes = (types: WindowTypeDefinition[]) => {
  const previousCustomIds = new Set(loadStoredCustomWindowTypes().map((type) => type.id));
  const custom = types.filter((type) => !type.builtIn).map((type, index) => ({ ...normalizeWindowType(type, index), builtIn: undefined }));
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    } catch {
      // The type library remains usable for the current session if storage is unavailable.
    }
  }
  const nextCustomIds = new Set(custom.map((type) => type.id));
  purgeWindowTypeLinks(new Set([...previousCustomIds].filter((id) => !nextCustomIds.has(id))));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(WINDOW_TYPES_CHANGE_EVENT, { detail: { types } }));
  }
};

export const createWindowType = (index = 0): WindowTypeDefinition => normalizeWindowType({
  id: createId(),
  name: `Type fenêtre ${index + 1}`,
  operation: "casement-1",
  width: 1.2,
  height: 1.2,
  sillHeight: 0.9,
  frameWidthMm: 70,
  frameDepthMm: DEFAULT_FRAME_DEPTH_MM,
  depthMode: "center",
  uValue: 1.3,
  solarFactor: 0.55,
});

export const windowOperationLabel = (operation: WindowOperation, language: Language) => {
  if (language === "fr") {
    if (operation === "fixed") return "Fixe";
    if (operation === "casement-1") return "1 vantail";
    if (operation === "casement-2") return "2 vantaux";
    if (operation === "tilt-turn") return "Oscillo-battant";
    return "Coulissant";
  }
  if (operation === "fixed") return "Fixed";
  if (operation === "casement-1") return "Single casement";
  if (operation === "casement-2") return "Double casement";
  if (operation === "tilt-turn") return "Tilt & turn";
  return "Sliding";
};

export const windowTypeGlazingSize = (type: WindowTypeDefinition) => {
  const frame = Math.max(0, type.frameWidthMm) / 1000;
  return {
    width: Math.max(0, type.width - frame * 2),
    height: Math.max(0, type.height - frame * 2),
  };
};

export const windowTypeGlazingArea = (type: WindowTypeDefinition) => {
  const glazing = windowTypeGlazingSize(type);
  return glazing.width * glazing.height;
};

export const applyWindowTypeToOpening = (opening: WallOpening, type: WindowTypeDefinition): WallOpening => ({
  ...opening,
  type: "window",
  width: type.width,
  height: type.height,
  sillHeight: type.sillHeight,
  uValue: type.uValue,
  solarFactor: type.solarFactor,
});

export const syncWallWindowTypeInstances = (wall: Wall, types: WindowTypeDefinition[]): Wall => {
  if (!wall.openings?.length) return wall;
  const byId = new Map(types.map((type) => [type.id, type]));
  let changed = false;
  const openings = wall.openings.map((opening) => {
    const typeId = readWindowTypeLink(wall.id, opening.id);
    const type = typeId ? byId.get(typeId) : undefined;
    if (!type || opening.type !== "window") return opening;
    const next = normalizeOpening(applyWindowTypeToOpening(opening, type), wall);
    if (
      next.width === opening.width &&
      next.height === opening.height &&
      next.sillHeight === opening.sillHeight &&
      next.uValue === opening.uValue &&
      next.solarFactor === opening.solarFactor
    ) return opening;
    changed = true;
    return next;
  });
  return changed ? { ...wall, openings } : wall;
};

export const syncProjectWindowTypeInstances = (project: Project, types: WindowTypeDefinition[]): Project => {
  let changed = false;
  const levels = project.levels.map((level) => {
    let levelChanged = false;
    const walls = level.walls.map((wall) => {
      const next = syncWallWindowTypeInstances(wall, types);
      if (next !== wall) levelChanged = true;
      return next;
    });
    if (!levelChanged) return level;
    changed = true;
    return { ...level, walls };
  });
  return changed ? { ...project, levels } : project;
};

export const syncWindowTypeDepths = (project: Project, types: WindowTypeDefinition[]) => {
  const byId = new Map(types.map((type) => [type.id, type]));
  project.levels.forEach((level) => {
    level.walls.forEach((wall) => {
      wall.openings?.forEach((opening) => {
        if (opening.type !== "window") return;
        const typeId = readWindowTypeLink(wall.id, opening.id);
        const type = typeId ? byId.get(typeId) : undefined;
        if (!type) return;
        writeOpeningDepth(wall, opening.id, { mode: type.depthMode, frameDepthMm: type.frameDepthMm });
      });
    });
  });
};
