import { normalizeProfile, wallLength, type SurfaceAssembly, type Wall, type WallLayer } from "./model";
import { openingsTransmission, wallOpeningsArea } from "./openings";
import { wallInclinationSurfaceFactor } from "./wallInclination";

const INTERNAL_SURFACE_RESISTANCE = 0.13;
const EXTERNAL_SURFACE_RESISTANCE = 0.04;
const HORIZONTAL_INTERNAL_RESISTANCE = 0.17;

export const layerResistance = (layer: WallLayer) =>
  layer.conductivity > 0 ? layer.thicknessMm / 1000 / layer.conductivity : 0;

export const layersResistance = (layers: WallLayer[]) =>
  layers.reduce((total, layer) => total + layerResistance(layer), 0);

export const wallResistance = (wall: Wall) => {
  if (wall.type === "virtual") return 0;
  return INTERNAL_SURFACE_RESISTANCE +
    (wall.type === "internal" ? INTERNAL_SURFACE_RESISTANCE : EXTERNAL_SURFACE_RESISTANCE) +
    layersResistance(wall.layers);
};

export const wallUValue = (wall: Wall) => {
  if (wall.type === "virtual") return 0;
  const resistance = wallResistance(wall);
  return resistance > 0 ? 1 / resistance : 0;
};

export const wallProjectedArea = (wall: Wall) => {
  if (wall.type === "virtual") return 0;
  const profile = normalizeProfile(wall);
  let area = 0;
  for (let index = 0; index < profile.length - 1; index += 1) {
    const a = profile[index];
    const b = profile[index + 1];
    area += Math.max(0, b.position - a.position) * (a.height + b.height) / 2;
  }
  return area;
};

/** Gross wall area before subtracting windows and doors. */
export const wallArea = (wall: Wall) =>
  wall.type === "virtual" ? 0 : wallProjectedArea(wall) * wallInclinationSurfaceFactor(wall);

/** Net opaque wall area after subtracting openings. */
export const wallOpaqueArea = (wall: Wall) =>
  wall.type === "virtual" ? 0 : Math.max(0, wallArea(wall) - wallOpeningsArea(wall));

/** Total opening area attached to the wall, capped by the gross wall area for summaries. */
export const wallOpeningArea = (wall: Wall) =>
  wall.type === "virtual" ? 0 : Math.min(wallArea(wall), wallOpeningsArea(wall));

/** Transmission heat-loss coefficient H for the wall assembly + its openings, in W/K. */
export const wallTransmissionCoefficient = (wall: Wall) =>
  wall.type === "virtual" ? 0 : wallOpaqueArea(wall) * wallUValue(wall) + openingsTransmission(wall);

export const assemblyResistance = (assembly: SurfaceAssembly) =>
  HORIZONTAL_INTERNAL_RESISTANCE + EXTERNAL_SURFACE_RESISTANCE + layersResistance(assembly.layers);

export const assemblyUValue = (assembly: SurfaceAssembly) => {
  const resistance = assemblyResistance(assembly);
  return resistance > 0 ? 1 / resistance : 0;
};

export const projectPerimeter = (walls: Wall[]) =>
  walls
    .filter((wall) => wall.type === "external")
    .reduce((total, wall) => total + wallLength(wall), 0);

export const projectWallArea = (walls: Wall[]) =>
  walls.filter((wall) => wall.type !== "virtual").reduce((total, wall) => total + wallArea(wall), 0);

export const projectOpaqueWallArea = (walls: Wall[]) =>
  walls.filter((wall) => wall.type !== "virtual").reduce((total, wall) => total + wallOpaqueArea(wall), 0);

export const projectExternalWallArea = (walls: Wall[]) =>
  walls.filter((wall) => wall.type === "external").reduce((total, wall) => total + wallArea(wall), 0);

export const projectExternalOpaqueWallArea = (walls: Wall[]) =>
  walls.filter((wall) => wall.type === "external").reduce((total, wall) => total + wallOpaqueArea(wall), 0);
