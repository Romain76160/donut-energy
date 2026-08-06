import type { Wall, WallLayer } from "./model";
import { wallLength } from "./model";

const INTERNAL_SURFACE_RESISTANCE = 0.13;
const EXTERNAL_SURFACE_RESISTANCE = 0.04;

export const layerResistance = (layer: WallLayer) =>
  layer.conductivity > 0 ? layer.thicknessMm / 1000 / layer.conductivity : 0;

export const wallResistance = (wall: Wall) =>
  INTERNAL_SURFACE_RESISTANCE +
  EXTERNAL_SURFACE_RESISTANCE +
  wall.layers.reduce((total, layer) => total + layerResistance(layer), 0);

export const wallUValue = (wall: Wall) => {
  const resistance = wallResistance(wall);
  return resistance > 0 ? 1 / resistance : 0;
};

export const wallArea = (wall: Wall) => wallLength(wall) * wall.height;

export const projectPerimeter = (walls: Wall[]) =>
  walls.reduce((total, wall) => total + wallLength(wall), 0);

export const projectWallArea = (walls: Wall[]) =>
  walls.reduce((total, wall) => total + wallArea(wall), 0);
