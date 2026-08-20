import { detectRooms, type Room as DetectedRoom } from "./geometry";
import { createId, levelClearHeight, type Level, type Point, type Project, type Space } from "./model";

const SAMPLE_STEPS = 24;
const MATCH_THRESHOLD = 0.34;

const polygonBounds = (polygon: Point[]) => {
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
};

const pointInPolygon = (point: Point, polygon: Point[]) => {
  let inside = false;
  for (let index = 0, previous = polygon.length - 1; index < polygon.length; previous = index, index += 1) {
    const a = polygon[index];
    const b = polygon[previous];
    const crosses = ((a.y > point.y) !== (b.y > point.y))
      && point.x < ((b.x - a.x) * (point.y - a.y)) / ((b.y - a.y) || 1e-9) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
};

const approximateIntersectionArea = (a: Point[], b: Point[]) => {
  if (a.length < 3 || b.length < 3) return 0;
  const boundsA = polygonBounds(a);
  const boundsB = polygonBounds(b);
  const minX = Math.max(boundsA.minX, boundsB.minX);
  const maxX = Math.min(boundsA.maxX, boundsB.maxX);
  const minY = Math.max(boundsA.minY, boundsB.minY);
  const maxY = Math.min(boundsA.maxY, boundsB.maxY);
  if (maxX <= minX || maxY <= minY) return 0;

  const width = maxX - minX;
  const height = maxY - minY;
  let insideCount = 0;
  for (let xIndex = 0; xIndex < SAMPLE_STEPS; xIndex += 1) {
    for (let yIndex = 0; yIndex < SAMPLE_STEPS; yIndex += 1) {
      const point = {
        x: minX + ((xIndex + 0.5) / SAMPLE_STEPS) * width,
        y: minY + ((yIndex + 0.5) / SAMPLE_STEPS) * height,
      };
      if (pointInPolygon(point, a) && pointInPolygon(point, b)) insideCount += 1;
    }
  }
  return width * height * (insideCount / (SAMPLE_STEPS * SAMPLE_STEPS));
};

const matchScore = (room: DetectedRoom, space: Space) => {
  const intersection = approximateIntersectionArea(room.polygon, space.polygon);
  const oldArea = Math.max(0.001, space.area);
  const nextArea = Math.max(0.001, room.area);
  const overlapOld = Math.min(1, intersection / oldArea);
  const overlapNext = Math.min(1, intersection / nextArea);
  const areaRatio = Math.min(oldArea, nextArea) / Math.max(oldArea, nextArea);
  const centroidDistance = Math.hypot(room.centroid.x - space.centroid.x, room.centroid.y - space.centroid.y);
  const referenceLength = Math.max(0.5, Math.sqrt(Math.max(oldArea, nextArea)));
  const centroidScore = 1 - Math.min(1, centroidDistance / (referenceLength * 1.5));
  return overlapOld * 0.4 + overlapNext * 0.3 + areaRatio * 0.15 + centroidScore * 0.15;
};

const geometryFromRoom = (room: DetectedRoom) => ({
  polygon: room.polygon.map((point) => ({ ...point })),
  area: room.area,
  perimeter: room.perimeter,
  centroid: { ...room.centroid },
});

const nextSpaceName = (existing: Space[], createdIndex: number) => {
  const used = new Set(existing.map((space) => space.name));
  let index = existing.length + createdIndex + 1;
  while (used.has(`Pièce ${index}`)) index += 1;
  return `Pièce ${index}`;
};

export const reconcileSpaces = (detectedRooms: DetectedRoom[], existingSpaces: Space[], level: Level): Space[] => {
  const candidates = detectedRooms.flatMap((room, roomIndex) => existingSpaces.map((space, spaceIndex) => ({
    roomIndex,
    spaceIndex,
    score: matchScore(room, space),
  }))).sort((a, b) => b.score - a.score);

  const matchedRooms = new Map<number, number>();
  const usedSpaces = new Set<number>();
  for (const candidate of candidates) {
    if (candidate.score < MATCH_THRESHOLD) break;
    if (matchedRooms.has(candidate.roomIndex) || usedSpaces.has(candidate.spaceIndex)) continue;
    matchedRooms.set(candidate.roomIndex, candidate.spaceIndex);
    usedSpaces.add(candidate.spaceIndex);
  }

  let created = 0;
  return detectedRooms.map((room, roomIndex) => {
    const matchedIndex = matchedRooms.get(roomIndex);
    const matched = matchedIndex === undefined ? null : existingSpaces[matchedIndex];
    if (matched) {
      return {
        ...matched,
        levelId: level.id,
        ...geometryFromRoom(room),
      };
    }

    const space: Space = {
      id: createId(),
      levelId: level.id,
      name: nextSpaceName(existingSpaces, created),
      usage: "unspecified",
      temperatureSetpoint: 19,
      ...geometryFromRoom(room),
    };
    created += 1;
    return space;
  });
};

export const syncProjectSpaces = (project: Project): Project => {
  const spaces = project.levels.flatMap((level) => reconcileSpaces(
    detectRooms(level.walls),
    project.spaces.filter((space) => space.levelId === level.id),
    level,
  ));
  return { ...project, spaces };
};

export const spaceVolume = (space: Space, level: Level) => space.area * levelClearHeight(level);
