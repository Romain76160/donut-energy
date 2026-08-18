import type { Wall } from "./model";

export type InclinedWall = Wall & { inclinationDeg?: number };

export const MIN_WALL_INCLINATION = 30;
export const MAX_WALL_INCLINATION = 150;
export const DEFAULT_WALL_INCLINATION = 90;

const STORAGE_KEY = "donut-energy-wall-inclinations";

type StoredInclinations = Record<string, number>;

const readStoredInclinations = (): StoredInclinations => {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as StoredInclinations;
  } catch {
    return {};
  }
};

export const clampWallInclination = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_WALL_INCLINATION;
  return Math.min(MAX_WALL_INCLINATION, Math.max(MIN_WALL_INCLINATION, value));
};

export const storedWallInclination = (wallId: string) => {
  const value = Number(readStoredInclinations()[wallId]);
  return Number.isFinite(value) ? clampWallInclination(value) : null;
};

export const persistWallInclination = (wallId: string, value: number) => {
  if (typeof localStorage === "undefined") return;
  try {
    const stored = readStoredInclinations();
    stored[wallId] = clampWallInclination(value);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Inclination persistence is optional when storage is unavailable.
  }
};

export const wallInclinationDeg = (wall: Wall) => {
  const explicit = Number((wall as InclinedWall).inclinationDeg);
  if (Number.isFinite(explicit)) return clampWallInclination(explicit);
  return storedWallInclination(wall.id) ?? DEFAULT_WALL_INCLINATION;
};

export const wallInclinationRadians = (wall: Wall) => wallInclinationDeg(wall) * Math.PI / 180;

export const wallInclinationSurfaceFactor = (wall: Wall) => {
  const sine = Math.abs(Math.sin(wallInclinationRadians(wall)));
  return sine > 0.01 ? 1 / sine : 1;
};

export const wallTrueHeight = (verticalHeight: number, inclinationDeg: number) => {
  const radians = clampWallInclination(inclinationDeg) * Math.PI / 180;
  const sine = Math.abs(Math.sin(radians));
  return sine > 0.01 ? verticalHeight / sine : verticalHeight;
};

export const wallTopOffset = (verticalHeight: number, inclinationDeg: number) => {
  const radians = clampWallInclination(inclinationDeg) * Math.PI / 180;
  const tangent = Math.tan(radians);
  return Math.abs(tangent) > 0.01 ? verticalHeight / tangent : 0;
};

export const wallTotalThickness = (wall: Wall) =>
  wall.layers.reduce((total, layer) => total + layer.thicknessMm / 1000, 0);
