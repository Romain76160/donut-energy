import { createId, type SectionPoint, type Wall } from "./model";

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
  const explicit = Number(wall.inclinationDeg);
  if (Number.isFinite(explicit)) return clampWallInclination(explicit);
  return storedWallInclination(wall.id) ?? DEFAULT_WALL_INCLINATION;
};

export const wallInclinationRadians = (wall: Wall) => wallInclinationDeg(wall) * Math.PI / 180;

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

export const inclinationFromTopOffset = (verticalHeight: number, offset: number) => {
  if (!Number.isFinite(offset) || Math.abs(offset) < 0.0001) return DEFAULT_WALL_INCLINATION;
  const angle = Math.atan2(Math.max(0.1, verticalHeight), offset) * 180 / Math.PI;
  return clampWallInclination(angle);
};

export const normalizeWallSectionProfile = (wall: Wall): SectionPoint[] => {
  const height = Math.max(0.1, wall.height);
  const source = Array.isArray(wall.sectionProfile)
    ? wall.sectionProfile
      .map((point) => ({
        ...point,
        id: point.id || createId(),
        height: Number(point.height),
        offset: Number(point.offset),
      }))
      .filter((point) => Number.isFinite(point.height) && Number.isFinite(point.offset))
      .sort((a, b) => a.height - b.height)
    : [];

  if (source.length < 2) {
    return [
      { id: createId(), height: 0, offset: 0 },
      { id: createId(), height, offset: wallTopOffset(height, wallInclinationDeg(wall)) },
    ];
  }

  const first = { ...source[0], height: 0, offset: 0 };
  const last = { ...source.at(-1)!, height };
  const middle = source.slice(1, -1).map((point) => ({
    ...point,
    height: Math.min(height - 0.01, Math.max(0.01, point.height)),
  }));
  return [first, ...middle, last].sort((a, b) => a.height - b.height);
};

export const wallSectionTrueHeight = (wall: Wall) => {
  const points = normalizeWallSectionProfile(wall);
  let total = 0;
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    total += Math.hypot(next.height - current.height, next.offset - current.offset);
  }
  return total;
};

export const wallInclinationSurfaceFactor = (wall: Wall) => {
  const verticalHeight = Math.max(0.1, wall.height);
  return wallSectionTrueHeight(wall) / verticalHeight;
};

export const wallSectionTopOffset = (wall: Wall) => normalizeWallSectionProfile(wall).at(-1)?.offset ?? 0;

export const wallTotalThickness = (wall: Wall) =>
  wall.layers.reduce((total, layer) => total + layer.thicknessMm / 1000, 0);
