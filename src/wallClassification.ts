import { pointInPolygon } from "./adjacency";
import { wallLength, type PhysicalWallType, type Project, type Space, type Wall } from "./model";

const SAMPLE_POSITIONS = [0.2, 0.5, 0.8];

/**
 * Infer whether a physical wall is on the envelope or separates interior spaces.
 * Virtual boundaries are deliberately left untouched by the caller.
 */
export const inferWallPhysicalType = (wall: Wall, spaces: Space[]): PhysicalWallType => {
  const length = wallLength(wall);
  if (length < 0.05 || !spaces.length) {
    return wall.type === "internal" ? "internal" : "external";
  }

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

  // A physical wall with occupied space on both faces is an interior wall.
  // One occupied face and one empty face means building envelope.
  if (sideA && sideB) return "internal";
  if (sideA || sideB) return "external";

  // Open/incomplete geometry: keep the previous classification until the
  // surrounding room geometry becomes resolvable.
  return wall.type === "internal" ? "internal" : "external";
};

export const autoClassifyProjectWalls = (project: Project): Project => {
  let changed = false;
  const levels = project.levels.map((level) => {
    const spaces = project.spaces.filter((space) => space.levelId === level.id);
    let levelChanged = false;
    const walls = level.walls.map((wall) => {
      if (wall.type === "virtual") return wall;
      const inferred = inferWallPhysicalType(wall, spaces);
      if (wall.type === inferred) return wall;
      levelChanged = true;
      return { ...wall, type: inferred };
    });
    if (!levelChanged) return level;
    changed = true;
    return { ...level, walls };
  });
  return changed ? { ...project, levels } : project;
};
