import { pointInPolygon } from "./adjacency";
import { wallLength, type PhysicalWallType, type Project, type Space, type Wall } from "./model";

const SAMPLE_POSITIONS = [0.2, 0.5, 0.8];

export type WallClassification = PhysicalWallType | "indeterminate";

/**
 * Derive the geometric role of a physical wall from the spaces on both sides.
 * "indeterminate" is intentional while the surrounding geometry is still open.
 */
export const inferWallClassification = (wall: Wall, spaces: Space[]): WallClassification => {
  const length = wallLength(wall);
  if (length < 0.05 || !spaces.length) return "indeterminate";

  const dx = (wall.end.x - wall.start.x) / length;
  const dy = (wall.end.y - wall.start.y) / length;
  const normal = { x: -dy, y: dx };
  const offset = Math.max(0.035, Math.min(0.08, length * 0.012));

  let sideA = false;
  let sideB = false;

  for (const t of SAMPLE_POSITIONS) {
    const center = {
      x: wall.start.x + (wall.end.x - wall.start.x) * t,
      y: wall.start.y + (wall.end.y - wall.start.y) * t,
    };
    const a = { x: center.x + normal.x * offset, y: center.y + normal.y * offset };
    const b = { x: center.x - normal.x * offset, y: center.y - normal.y * offset };

    if (!sideA) sideA = spaces.some((space) => pointInPolygon(a, space.polygon));
    if (!sideB) sideB = spaces.some((space) => pointInPolygon(b, space.polygon));
  }

  if (sideA && sideB) return "internal";
  if (sideA || sideB) return "external";
  return "indeterminate";
};

/**
 * Compatibility helper for call sites that still need a physical type.
 * It keeps the previous type while the geometry is indeterminate.
 */
export const inferWallPhysicalType = (wall: Wall, spaces: Space[]): PhysicalWallType => {
  const classification = inferWallClassification(wall, spaces);
  if (classification === "indeterminate") return wall.type === "internal" ? "internal" : "external";
  return classification;
};

export const buildWallClassifications = (walls: Wall[], spaces: Space[]) =>
  new Map(walls.map((wall) => [
    wall.id,
    wall.type === "virtual" ? "indeterminate" as const : inferWallClassification(wall, spaces),
  ]));

export const autoClassifyProjectWalls = (project: Project): Project => {
  let changed = false;

  const levels = project.levels.map((level) => {
    const spaces = project.spaces.filter((space) => space.levelId === level.id);
    let levelChanged = false;

    const walls = level.walls.map((wall) => {
      if (wall.type === "virtual") return wall;
      const inferred = inferWallClassification(wall, spaces);

      // Do not lie while the drawing is incomplete: keep the stored physical
      // type as a compatibility fallback, but expose "indeterminate" in the UI.
      if (inferred === "indeterminate" || wall.type === inferred) return wall;

      levelChanged = true;
      return { ...wall, type: inferred };
    });

    if (!levelChanged) return level;
    changed = true;
    return { ...level, walls };
  });

  return changed ? { ...project, levels } : project;
};
