import {
  orientationFromPoints,
  pointsEqual,
  resizeProfile,
  wallLength,
  type Point,
  type Wall,
} from "./model";

const NODE_TOLERANCE = 0.02;
const MIN_WALL_LENGTH = 0.15;

export const connectedWallsAtNode = (walls: Wall[], node: Point, tolerance = NODE_TOLERANCE) =>
  walls.filter((wall) => pointsEqual(wall.start, node, tolerance) || pointsEqual(wall.end, node, tolerance));

export const moveConnectedNode = (
  walls: Wall[],
  from: Point,
  to: Point,
  tolerance = NODE_TOLERANCE,
): Wall[] => {
  if (pointsEqual(from, to, 0.0005)) return walls;

  const connected = connectedWallsAtNode(walls, from, tolerance);
  if (!connected.length) return walls;

  const wouldCollapse = connected.some((wall) => {
    const opposite = pointsEqual(wall.start, from, tolerance) ? wall.end : wall.start;
    return Math.hypot(to.x - opposite.x, to.y - opposite.y) < MIN_WALL_LENGTH;
  });
  if (wouldCollapse) return walls;

  return walls.map((wall) => {
    const moveStart = pointsEqual(wall.start, from, tolerance);
    const moveEnd = pointsEqual(wall.end, from, tolerance);
    if (!moveStart && !moveEnd) return wall;

    const oldLength = Math.max(0.001, wallLength(wall));
    const nextStart = moveStart ? { ...to } : wall.start;
    const nextEnd = moveEnd ? { ...to } : wall.end;
    const nextLength = Math.hypot(nextEnd.x - nextStart.x, nextEnd.y - nextStart.y);
    const ratio = nextLength / oldLength;

    const openings = (wall.openings ?? []).map((opening) => {
      const width = Math.min(opening.width, nextLength);
      const halfWidth = width / 2;
      const rawPosition = opening.position * ratio;
      const position = Math.max(halfWidth, Math.min(Math.max(halfWidth, nextLength - halfWidth), rawPosition));
      return { ...opening, width, position };
    });

    return {
      ...wall,
      start: nextStart,
      end: nextEnd,
      orientation: orientationFromPoints(nextStart, nextEnd),
      profile: resizeProfile(wall, nextLength),
      openings,
    };
  });
};
