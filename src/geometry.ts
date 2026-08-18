import { createId, orientationFromPoints, pointsEqual, rectangleProfile, wallLength, type Orientation, type Point, type Wall } from "./model";

export type Room = {
  id: string;
  name: string;
  polygon: Point[];
  area: number;
  perimeter: number;
  centroid: Point;
};

const ROUNDING = 1000;
const pointKey = (point: Point) => `${Math.round(point.x * ROUNDING)},${Math.round(point.y * ROUNDING)}`;
const normalizeAngle = (value: number) => ((value % 360) + 360) % 360;

const orientationFromAzimuth = (azimuth: number): Orientation => {
  const normalized = normalizeAngle(azimuth);
  if (normalized >= 315 || normalized < 45) return "Nord";
  if (normalized < 135) return "Est";
  if (normalized < 225) return "Sud";
  return "Ouest";
};

const roomUsesWall = (room: Room, wall: Wall) => room.polygon.some((point, index) => {
  const next = room.polygon[(index + 1) % room.polygon.length];
  return (
    (pointsEqual(point, wall.start, 0.02) && pointsEqual(next, wall.end, 0.02)) ||
    (pointsEqual(point, wall.end, 0.02) && pointsEqual(next, wall.start, 0.02))
  );
});

const envelopeCenter = (walls: Wall[]): Point => {
  const envelope = walls.filter((wall) => wall.type === "external");
  const source = envelope.length ? envelope : walls;
  const points = source.flatMap((wall) => [wall.start, wall.end]);
  if (!points.length) return { x: 0, y: 0 };
  return points.reduce(
    (center, point) => ({ x: center.x + point.x / points.length, y: center.y + point.y / points.length }),
    { x: 0, y: 0 },
  );
};

export const wallAzimuthFromNorth = (wall: Wall, walls: Wall[], northAngleDeg: number, rooms?: Room[]) => {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.001) return 0;

  const midpoint = { x: (wall.start.x + wall.end.x) / 2, y: (wall.start.y + wall.end.y) / 2 };
  const detectedRooms = rooms ?? detectRooms(walls);
  const adjacentRoom = detectedRooms.find((room) => roomUsesWall(room, wall));
  const reference = adjacentRoom?.centroid ?? envelopeCenter(walls);
  const away = { x: midpoint.x - reference.x, y: midpoint.y - reference.y };

  const leftNormal = { x: dy / length, y: -dx / length };
  const leftScore = leftNormal.x * away.x + leftNormal.y * away.y;
  const normal = leftScore >= 0 ? leftNormal : { x: -leftNormal.x, y: -leftNormal.y };

  const absoluteBearing = normalizeAngle(Math.atan2(normal.x, -normal.y) * 180 / Math.PI);
  return normalizeAngle(absoluteBearing - northAngleDeg);
};

export const wallOrientationFromNorth = (wall: Wall, walls: Wall[], northAngleDeg: number, rooms?: Room[]): Orientation =>
  orientationFromAzimuth(wallAzimuthFromNorth(wall, walls, northAngleDeg, rooms));

export const snapToGrid = (point: Point, step = 0.5): Point => ({
  x: Math.round(point.x / step) * step,
  y: Math.round(point.y / step) * step,
});

export const distancePointToSegment = (point: Point, start: Point, end: Point) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared === 0) return { distance: Math.hypot(point.x - start.x, point.y - start.y), point: { ...start }, t: 0 };
  const rawT = ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared;
  const t = Math.max(0, Math.min(1, rawT));
  const projection = { x: start.x + t * dx, y: start.y + t * dy };
  return { distance: Math.hypot(point.x - projection.x, point.y - projection.y), point: projection, t };
};

export const nearestWallPoint = (point: Point, walls: Wall[], maxDistance = 0.25) => {
  let best: { wall: Wall; point: Point; distance: number; t: number } | null = null;
  for (const wall of walls) {
    const candidate = distancePointToSegment(point, wall.start, wall.end);
    if (candidate.distance > maxDistance) continue;
    if (!best || candidate.distance < best.distance) best = { wall, ...candidate };
  }
  return best;
};

export const snapPoint = (point: Point, walls: Wall[], tolerance = 0.22): Point => {
  let endpointBest: { point: Point; distance: number } | null = null;
  let segmentBest: { point: Point; distance: number } | null = null;

  for (const wall of walls) {
    for (const endpoint of [wall.start, wall.end]) {
      const distance = Math.hypot(point.x - endpoint.x, point.y - endpoint.y);
      if (distance <= tolerance && (!endpointBest || distance < endpointBest.distance)) endpointBest = { point: { ...endpoint }, distance };
    }
    const projection = distancePointToSegment(point, wall.start, wall.end);
    if (projection.distance <= tolerance && (!segmentBest || projection.distance < segmentBest.distance)) {
      segmentBest = { point: projection.point, distance: projection.distance };
    }
  }

  const best = endpointBest ?? segmentBest ?? { point: snapToGrid(point), distance: 0 };
  return {
    x: Math.round(best.point.x * ROUNDING) / ROUNDING,
    y: Math.round(best.point.y * ROUNDING) / ROUNDING,
  };
};

export const projectFromLengthAngle = (start: Point, length: number, angleDeg: number): Point => {
  const angle = angleDeg * Math.PI / 180;
  return {
    x: start.x + Math.cos(angle) * length,
    y: start.y + Math.sin(angle) * length,
  };
};

const splitSingleWall = (wall: Wall, point: Point): Wall[] => {
  const hit = distancePointToSegment(point, wall.start, wall.end);
  const length = wallLength(wall);
  if (hit.distance > 0.02 || length < 0.2 || hit.t <= 0.01 || hit.t >= 0.99) return [wall];

  const firstLength = Math.hypot(point.x - wall.start.x, point.y - wall.start.y);
  const secondLength = Math.hypot(wall.end.x - point.x, wall.end.y - point.y);
  const normalized = wall.profile?.length >= 2 ? [...wall.profile].sort((a, b) => a.position - b.position) : rectangleProfile(length, wall.height);

  const heightAt = (position: number) => {
    for (let index = 0; index < normalized.length - 1; index += 1) {
      const a = normalized[index];
      const b = normalized[index + 1];
      if (position >= a.position && position <= b.position) {
        const span = b.position - a.position || 1;
        const ratio = (position - a.position) / span;
        return a.height + (b.height - a.height) * ratio;
      }
    }
    return wall.height;
  };

  const firstProfile = normalized
    .filter((item) => item.position < firstLength - 0.001)
    .map((item) => ({ ...item, id: createId() }));
  firstProfile.push({ id: createId(), position: firstLength, height: heightAt(firstLength) });
  if (!firstProfile.length || firstProfile[0].position !== 0) firstProfile.unshift({ id: createId(), position: 0, height: heightAt(0) });

  const secondProfile = [{ id: createId(), position: 0, height: heightAt(firstLength) }];
  for (const item of normalized.filter((candidate) => candidate.position > firstLength + 0.001)) {
    secondProfile.push({ ...item, id: createId(), position: item.position - firstLength });
  }
  if (secondProfile.at(-1)?.position !== secondLength) secondProfile.push({ id: createId(), position: secondLength, height: heightAt(length) });

  return [
    {
      ...wall,
      id: createId(),
      name: `${wall.name} A`,
      end: { ...point },
      orientation: orientationFromPoints(wall.start, point),
      profile: firstProfile,
    },
    {
      ...wall,
      id: createId(),
      name: `${wall.name} B`,
      start: { ...point },
      orientation: orientationFromPoints(point, wall.end),
      profile: secondProfile,
    },
  ];
};

export const splitWallsAtPoint = (walls: Wall[], point: Point, skipWallId?: string) =>
  walls.flatMap((wall) => wall.id === skipWallId ? [wall] : splitSingleWall(wall, point));

export const polygonAreaSigned = (polygon: Point[]) => {
  let twiceArea = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    twiceArea += a.x * b.y - b.x * a.y;
  }
  return twiceArea / 2;
};

export const polygonArea = (polygon: Point[]) => Math.abs(polygonAreaSigned(polygon));

export const polygonPerimeter = (polygon: Point[]) => polygon.reduce((sum, point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  return sum + Math.hypot(next.x - point.x, next.y - point.y);
}, 0);

export const polygonCentroid = (polygon: Point[]): Point => {
  const signedArea = polygonAreaSigned(polygon);
  if (Math.abs(signedArea) < 1e-9) {
    return polygon.reduce((sum, point) => ({ x: sum.x + point.x / polygon.length, y: sum.y + point.y / polygon.length }), { x: 0, y: 0 });
  }
  let cx = 0;
  let cy = 0;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index];
    const b = polygon[(index + 1) % polygon.length];
    const factor = a.x * b.y - b.x * a.y;
    cx += (a.x + b.x) * factor;
    cy += (a.y + b.y) * factor;
  }
  const factor = 1 / (6 * signedArea);
  return { x: cx * factor, y: cy * factor };
};

export const detectRooms = (walls: Wall[]): Room[] => {
  type Vertex = { point: Point; neighbors: string[] };
  const vertices = new Map<string, Vertex>();

  const ensureVertex = (point: Point) => {
    const key = pointKey(point);
    if (!vertices.has(key)) vertices.set(key, { point: { ...point }, neighbors: [] });
    return key;
  };

  for (const wall of walls) {
    if (wallLength(wall) < 0.05) continue;
    const a = ensureVertex(wall.start);
    const b = ensureVertex(wall.end);
    if (a === b) continue;
    const va = vertices.get(a)!;
    const vb = vertices.get(b)!;
    if (!va.neighbors.includes(b)) va.neighbors.push(b);
    if (!vb.neighbors.includes(a)) vb.neighbors.push(a);
  }

  for (const vertex of vertices.values()) {
    vertex.neighbors.sort((aKey, bKey) => {
      const a = vertices.get(aKey)!.point;
      const b = vertices.get(bKey)!.point;
      const angleA = Math.atan2(a.y - vertex.point.y, a.x - vertex.point.x);
      const angleB = Math.atan2(b.y - vertex.point.y, b.x - vertex.point.x);
      return angleA - angleB;
    });
  }

  const visited = new Set<string>();
  const faces: Point[][] = [];

  for (const [fromKey, vertex] of vertices) {
    for (const toKey of vertex.neighbors) {
      const directedKey = `${fromKey}>${toKey}`;
      if (visited.has(directedKey)) continue;

      const polygon: Point[] = [];
      let from = fromKey;
      let to = toKey;
      let guard = 0;
      const start = directedKey;

      while (guard < walls.length * 4 + 20) {
        guard += 1;
        const edgeKey = `${from}>${to}`;
        if (visited.has(edgeKey) && edgeKey !== start) break;
        visited.add(edgeKey);
        polygon.push(vertices.get(from)!.point);

        const at = vertices.get(to);
        if (!at || at.neighbors.length < 2) break;
        const reverseIndex = at.neighbors.indexOf(from);
        if (reverseIndex < 0) break;
        const nextIndex = (reverseIndex - 1 + at.neighbors.length) % at.neighbors.length;
        const next = at.neighbors[nextIndex];
        from = to;
        to = next;
        if (`${from}>${to}` === start) {
          if (polygon.length >= 3) faces.push(polygon);
          break;
        }
      }
    }
  }

  const bounded = faces
    .map((polygon) => ({ polygon, signedArea: polygonAreaSigned(polygon) }))
    .filter(({ signedArea }) => signedArea > 0.2)
    .sort((a, b) => b.signedArea - a.signedArea);

  const unique = bounded.filter((face, index, all) => {
    const centroid = polygonCentroid(face.polygon);
    return all.findIndex((candidate) => {
      const other = polygonCentroid(candidate.polygon);
      return Math.abs(candidate.signedArea - face.signedArea) < 0.01 && Math.hypot(other.x - centroid.x, other.y - centroid.y) < 0.01;
    }) === index;
  });

  return unique.map((face, index) => ({
    id: `room-${index}-${Math.round(face.signedArea * 100)}`,
    name: `Pièce ${index + 1}`,
    polygon: face.polygon,
    area: face.signedArea,
    perimeter: polygonPerimeter(face.polygon),
    centroid: polygonCentroid(face.polygon),
  }));
};

export const connectedPoint = (candidate: Point, reference: Point) => pointsEqual(candidate, reference, 0.01);
