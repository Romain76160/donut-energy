import type { Language } from "./i18n";
import type { Wall } from "./model";

export type OpeningDepthMode = "interior" | "center" | "exterior" | "custom";

export type OpeningDepthState = {
  mode: OpeningDepthMode;
  /** Position of the frame reference plane from the interior finished face, in mm. */
  offsetMm: number;
};

type StoredOpeningDepths = Record<string, OpeningDepthState>;

const STORAGE_KEY = "donut-energy-opening-depths";
export const OPENING_DEPTH_CHANGE_EVENT = "donut-energy-opening-depth-change";

export const wallThicknessMm = (wall: Pick<Wall, "layers">) =>
  wall.layers.reduce((total, layer) => total + Math.max(0, Number(layer.thicknessMm) || 0), 0);

export const depthOffsetForMode = (mode: OpeningDepthMode, thicknessMm: number, customOffsetMm = thicknessMm / 2) => {
  const thickness = Math.max(0, Number(thicknessMm) || 0);
  if (mode === "interior") return 0;
  if (mode === "exterior") return thickness;
  if (mode === "center") return thickness / 2;
  return Math.max(0, Math.min(thickness, Number(customOffsetMm) || 0));
};

export const normalizeOpeningDepth = (state: Partial<OpeningDepthState> | null | undefined, wall: Pick<Wall, "layers">): OpeningDepthState => {
  const thickness = wallThicknessMm(wall);
  const mode: OpeningDepthMode = state?.mode === "interior" || state?.mode === "exterior" || state?.mode === "custom"
    ? state.mode
    : "center";
  return {
    mode,
    offsetMm: depthOffsetForMode(mode, thickness, Number(state?.offsetMm)),
  };
};

const storageKey = (wallId: string, openingId: string) => `${wallId}:${openingId}`;

const readStore = (): StoredOpeningDepths => {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed as StoredOpeningDepths : {};
  } catch {
    return {};
  }
};

export const readOpeningDepth = (wall: Wall, openingId: string) =>
  normalizeOpeningDepth(readStore()[storageKey(wall.id, openingId)], wall);

export const writeOpeningDepth = (wall: Wall, openingId: string, state: Partial<OpeningDepthState>) => {
  const normalized = normalizeOpeningDepth(state, wall);
  if (typeof localStorage !== "undefined") {
    try {
      const store = readStore();
      store[storageKey(wall.id, openingId)] = normalized;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
    } catch {
      // Depth persistence is optional when browser storage is unavailable.
    }
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(OPENING_DEPTH_CHANGE_EVENT, { detail: { wallId: wall.id, openingId, state: normalized } }));
  }
  return normalized;
};

export const removeOpeningDepth = (wallId: string, openingId: string) => {
  if (typeof localStorage === "undefined") return;
  try {
    const store = readStore();
    delete store[storageKey(wallId, openingId)];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage cleanup failures.
  }
};

export const openingDepthModeLabel = (mode: OpeningDepthMode, language: Language) => {
  if (language === "fr") {
    if (mode === "interior") return "Intérieur";
    if (mode === "center") return "Milieu";
    if (mode === "exterior") return "Extérieur";
    return "Personnalisé";
  }
  if (mode === "interior") return "Interior";
  if (mode === "center") return "Center";
  if (mode === "exterior") return "Exterior";
  return "Custom";
};
