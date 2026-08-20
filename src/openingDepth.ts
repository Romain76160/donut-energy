import type { Language } from "./i18n";
import type { Wall } from "./model";

export type OpeningDepthMode = "interior" | "center" | "exterior" | "custom";

export type OpeningDepthState = {
  mode: OpeningDepthMode;
  /** Position of the frame centre plane from the interior finished face, in mm. */
  offsetMm: number;
  /** Physical frame depth through the wall, in mm. */
  frameDepthMm: number;
};

export type OpeningDepthGeometry = OpeningDepthState & {
  frameStartMm: number;
  frameEndMm: number;
  interiorRevealMm: number;
  exteriorRevealMm: number;
};

type StoredOpeningDepths = Record<string, OpeningDepthState>;

const STORAGE_KEY = "donut-energy-opening-depths";
export const OPENING_DEPTH_CHANGE_EVENT = "donut-energy-opening-depth-change";
export const DEFAULT_FRAME_DEPTH_MM = 70;

export const wallThicknessMm = (wall: Pick<Wall, "layers">) =>
  wall.layers.reduce((total, layer) => total + Math.max(0, Number(layer.thicknessMm) || 0), 0);

export const normalizeFrameDepthMm = (value: number | null | undefined, thicknessMm: number) => {
  const thickness = Math.max(0, Number(thicknessMm) || 0);
  if (thickness <= 0) return 0;
  const fallback = Math.min(DEFAULT_FRAME_DEPTH_MM, thickness);
  const requested = Number(value);
  if (!Number.isFinite(requested)) return fallback;
  return Math.min(thickness, Math.max(Math.min(10, thickness), requested));
};

export const depthOffsetForMode = (
  mode: OpeningDepthMode,
  thicknessMm: number,
  customOffsetMm = thicknessMm / 2,
  frameDepthMm = 0,
) => {
  const thickness = Math.max(0, Number(thicknessMm) || 0);
  const frameDepth = Math.min(thickness, Math.max(0, Number(frameDepthMm) || 0));
  const halfFrame = frameDepth / 2;
  const minOffset = halfFrame;
  const maxOffset = Math.max(minOffset, thickness - halfFrame);
  if (mode === "interior") return minOffset;
  if (mode === "exterior") return maxOffset;
  if (mode === "center") return thickness / 2;
  return Math.max(minOffset, Math.min(maxOffset, Number(customOffsetMm) || 0));
};

export const normalizeOpeningDepth = (state: Partial<OpeningDepthState> | null | undefined, wall: Pick<Wall, "layers">): OpeningDepthState => {
  const thickness = wallThicknessMm(wall);
  const frameDepthMm = normalizeFrameDepthMm(state?.frameDepthMm, thickness);
  const mode: OpeningDepthMode = state?.mode === "interior" || state?.mode === "exterior" || state?.mode === "custom" || state?.mode === "center"
    ? state.mode
    : "center";
  return {
    mode,
    frameDepthMm,
    offsetMm: depthOffsetForMode(mode, thickness, Number(state?.offsetMm), frameDepthMm),
  };
};

export const openingDepthGeometry = (
  state: Partial<OpeningDepthState> | null | undefined,
  wall: Pick<Wall, "layers">,
): OpeningDepthGeometry => {
  const normalized = normalizeOpeningDepth(state, wall);
  const thickness = wallThicknessMm(wall);
  const halfFrame = normalized.frameDepthMm / 2;
  const frameStartMm = Math.max(0, normalized.offsetMm - halfFrame);
  const frameEndMm = Math.min(thickness, normalized.offsetMm + halfFrame);
  return {
    ...normalized,
    frameStartMm,
    frameEndMm,
    interiorRevealMm: frameStartMm,
    exteriorRevealMm: Math.max(0, thickness - frameEndMm),
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

export const readOpeningDepthGeometry = (wall: Wall, openingId: string) =>
  openingDepthGeometry(readStore()[storageKey(wall.id, openingId)], wall);

export const writeOpeningDepth = (wall: Wall, openingId: string, state: Partial<OpeningDepthState>) => {
  const key = storageKey(wall.id, openingId);
  const store = readStore();
  const normalized = normalizeOpeningDepth({ ...store[key], ...state }, wall);
  if (typeof localStorage !== "undefined") {
    try {
      store[key] = normalized;
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
