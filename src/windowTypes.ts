import type { Language } from "./i18n";
import { createId, type WallOpening } from "./model";
import { DEFAULT_FRAME_DEPTH_MM, type OpeningDepthMode } from "./openingDepth";

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

export const loadWindowTypes = (): WindowTypeDefinition[] => {
  if (typeof localStorage === "undefined") return builtInWindowTypes();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return builtInWindowTypes();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return builtInWindowTypes();
    const custom = parsed
      .map((item, index) => item && typeof item === "object" ? normalizeWindowType(item as Partial<WindowTypeDefinition>, index) : null)
      .filter((item): item is WindowTypeDefinition => Boolean(item))
      .map((item) => ({ ...item, builtIn: false }));
    return [...builtInWindowTypes(), ...custom];
  } catch {
    return builtInWindowTypes();
  }
};

export const saveWindowTypes = (types: WindowTypeDefinition[]) => {
  if (typeof localStorage === "undefined") return;
  try {
    const custom = types.filter((type) => !type.builtIn).map((type, index) => ({ ...normalizeWindowType(type, index), builtIn: undefined }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  } catch {
    // The type library remains usable for the current session if storage is unavailable.
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
