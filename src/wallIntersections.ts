import { splitSingleWall } from "./geometry";
import { pointsEqual, wallLength, type Point, type Wall } from "./model";

export type WallInsertionResult = {
  walls: Wall[];
  insertedWallIds: string[];
  splitMap: Map<string, string[]>;
};

const EPS = 1e-6;

export const segmentIntersection = (
  a1: Point,
  a2: Point,
  b1: Point,
  b2: Point,
): Point | null => {
  const ax = a2.x - a1.x;
  const ay = a2.y - a1.y;
  const bx = b2.x - b1.x;
  const by = b2.y - b1.y;
  const denominator = ax * by - ay * bx;

  if (Math.abs(denominator) < EPS) return null;

  const dx = b1.x - a1.x;
  const dy = b1.y - a1.y;
  const ta = (dx * by - dy * bx) / denominator;
  const tb = (dx * ay - dy * ax) / denominator;

  if (ta < -EPS || ta > 1 + EPS || tb < -EPS || tb > 1 + EPS) return null;

  return {
    x: Math.round((a1.x + ta * ax) * 1000) / 1000,
    y: Math.round((a1.y + ta * ay) * 1000) / 1000,
  };
};

const uniquePoints = (points: Point[]) =>
  points.filter((point, index) => !points.some((candidate, otherIndex) => otherIndex < index && pointsEqual(candidate, point, 0.002)));

const splitWallAtPoints = (wall: Wall, points: Point[]) => {
  let parts = [wall];
  for (const point of points) parts = parts.flatMap((part) => splitSingleWall(part, point));
  return parts;
};

/**
 * Insert a wall and create real graph nodes wherever it crosses existing walls.
 * Both the existing walls and the inserted wall are split at every proper crossing.
 */
export const insertWallWithIntersections = (walls: Wall[], newWall: Wall): WallInsertionResult => {
  if (wallLength(newWall) < 0.05) return { walls, insertedWallIds: [], splitMap: new Map() };

  const intersectionsByWall = new Map<string, Point[]>();
  const newWallIntersections: Point[] = [];

  for (const wall of walls) {
    const point = segmentIntersection(newWall.start, newWall.end, wall.start, wall.end);
    if (!point) continue;

    const onNewEndpoint = pointsEqual(point, newWall.start, 0.002) || pointsEqual(point, newWall.end, 0.002);
    const onExistingEndpoint = pointsEqual(point, wall.start, 0.002) || pointsEqual(point, wall.end, 0.002);

    if (!onNewEndpoint) newWallIntersections.push(point);
    if (!onExistingEndpoint) {
      const list = intersectionsByWall.get(wall.id) ?? [];
      list.push(point);
      intersectionsByWall.set(wall.id, list);
    }
  }

  const splitMap = new Map<string, string[]>();
  const nextExisting = walls.flatMap((wall) => {
    const points = uniquePoints(intersectionsByWall.get(wall.id) ?? []);
    if (!points.length) return [wall];

    const parts = splitWallAtPoints(wall, points);
    if (parts.length > 1) splitMap.set(wall.id, parts.map((part) => part.id));
    return parts;
  });

  const inserted = splitWallAtPoints(newWall, uniquePoints(newWallIntersections));
  splitMap.set(newWall.id, inserted.map((part) => part.id));

  return {
    walls: [...nextExisting, ...inserted],
    insertedWallIds: inserted.map((part) => part.id),
    splitMap,
  };
};
