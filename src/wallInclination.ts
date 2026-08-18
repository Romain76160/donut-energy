import type { Wall } from "./model";

export type InclinedWall = Wall & { inclinationDeg?: number };

export const MIN_WALL_INCLINATION = 30;
export const MAX_WALL_INCLINATION = 150;
export const DEFAULT_WALL_INCLINATION = 90;

export const clampWallInclination = (value: number) => {
  if (!Number.isFinite(value)) return DEFAULT_WALL_INCLINATION;
  return Math.min(MAX_WALL_INCLINATION, Math.max(MIN_WALL_INCLINATION, value));
};

export const wallInclinationDeg = (wall: Wall) =>
  clampWallInclination(Number((wall as InclinedWall).inclinationDeg ?? DEFAULT_WALL_INCLINATION));

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
