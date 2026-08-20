import { wallLength, type Point, type Space, type Wall } from "./model";

export type WallBoundaryRef =
  | { kind: "space"; spaceId: string }
  | { kind: "outside" }
  | { kind: "unassigned" };

export type WallAdjacencyQuality = "resolved" | "partial" | "conflict";

export type WallAdjacency = {
  wallId: string;
  sideA: WallBoundaryRef;
  sideB: WallBoundaryRef;
  quality: WallAdjacencyQuality;
};

const SAMPLE_POSITIONS = [0.2, 0.5, 0.8];
const SAMPLE_OFFSETS = [0.025, 0.06];

export const pointInPolygon = (point: Point, polygon: Point[]) => {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const current = polygon[index];
    const before = polygon[previous];
    const crosses = ((current.y > point.y) !== (before.y > point.y))
      && point.x < ((before.x - current.x) * (point.y - current.y)) / ((before.y - current.y) || 1e-9) + current.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

const sideNormal = (wall: Wall, side: "A" | "B") => {
  const length = wallLength(wall);
  if (length < 0.001) return { x: 0, y: 0 };
  const dx = (wall.end.x - wall.start.x) / length;
  const dy = (wall.end.y - wall.start.y) / length;
  const normal = { x: -dy, y: dx };
  return side === "A" ? normal : { x: -normal.x, y: -normal.y };
};

export const wallSideAnchor = (wall: Wall, side: "A" | "B", distance = 0.42): Point => {
  const normal = sideNormal(wall, side);
  return {
    x: (wall.start.x + wall.end.x) / 2 + normal.x * distance,
    y: (wall.start.y + wall.end.y) / 2 + normal.y * distance,
  };
};

const sampledSpaceId = (wall: Wall, side: "A" | "B", spaces: Space[]) => {
  const length = wallLength(wall);
  if (length < 0.05) return null;
  const normal = sideNormal(wall, side);
  const votes = new Map<string, number>();

  for (const position of SAMPLE_POSITIONS) {
    const center = {
      x: wall.start.x + (wall.end.x - wall.start.x) * position,
      y: wall.start.y + (wall.end.y - wall.start.y) * position,
    };
    for (const offset of SAMPLE_OFFSETS) {
      const sample = {
        x: center.x + normal.x * offset,
        y: center.y + normal.y * offset,
      };
      const space = spaces.find((candidate) => pointInPolygon(sample, candidate.polygon));
      if (space) votes.set(space.id, (votes.get(space.id) ?? 0) + 1);
    }
  }

  return [...votes.entries()].sort((left, right) => right[1] - left[1])[0]?.[0] ?? null;
};

const emptyBoundary = (wall: Wall): WallBoundaryRef =>
  wall.type === "external" ? { kind: "outside" } : { kind: "unassigned" };

const boundaryForSide = (wall: Wall, side: "A" | "B", spaces: Space[]): WallBoundaryRef => {
  const spaceId = sampledSpaceId(wall, side, spaces);
  return spaceId ? { kind: "space", spaceId } : emptyBoundary(wall);
};

const adjacencyQuality = (wall: Wall, sideA: WallBoundaryRef, sideB: WallBoundaryRef): WallAdjacencyQuality => {
  const aSpace = sideA.kind === "space" ? sideA.spaceId : null;
  const bSpace = sideB.kind === "space" ? sideB.spaceId : null;

  if (wall.type === "external") {
    if (aSpace && bSpace) return "conflict";
    if ((aSpace && sideB.kind === "outside") || (bSpace && sideA.kind === "outside")) return "resolved";
    return "partial";
  }

  if (aSpace && bSpace) return aSpace === bSpace ? "conflict" : "resolved";
  return "partial";
};

export const buildWallAdjacency = (wall: Wall, spaces: Space[]): WallAdjacency => {
  const sideA = boundaryForSide(wall, "A", spaces);
  const sideB = boundaryForSide(wall, "B", spaces);
  return {
    wallId: wall.id,
    sideA,
    sideB,
    quality: adjacencyQuality(wall, sideA, sideB),
  };
};

export const buildWallAdjacencies = (walls: Wall[], spaces: Space[]) =>
  walls.map((wall) => buildWallAdjacency(wall, spaces));

export const boundarySpace = (boundary: WallBoundaryRef, spaces: Space[]) =>
  boundary.kind === "space" ? spaces.find((space) => space.id === boundary.spaceId) ?? null : null;
