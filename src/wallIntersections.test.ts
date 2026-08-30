import { describe, expect, it } from "vitest";
import { rectangleProfile, type Wall } from "./model";
import { insertWallWithIntersections, segmentIntersection } from "./wallIntersections";

const wall = (id: string, start: [number, number], end: [number, number]): Wall => ({
  id,
  name: id,
  start: { x: start[0], y: start[1] },
  end: { x: end[0], y: end[1] },
  height: 2.8,
  orientation: "Nord",
  type: "external",
  layers: [],
  profile: rectangleProfile(Math.hypot(end[0] - start[0], end[1] - start[1]), 2.8),
  openings: [],
});

describe("wall intersections", () => {
  it("finds a crossing between two segments", () => {
    expect(segmentIntersection(
      { x: 0, y: 2 },
      { x: 4, y: 2 },
      { x: 2, y: 0 },
      { x: 2, y: 4 },
    )).toEqual({ x: 2, y: 2 });
  });

  it("splits both the existing and inserted wall at a crossing", () => {
    const existing = wall("horizontal", [0, 2], [4, 2]);
    const inserted = wall("vertical", [2, 0], [2, 4]);
    const result = insertWallWithIntersections([existing], inserted);

    expect(result.walls).toHaveLength(4);
    expect(result.insertedWallIds).toHaveLength(2);
    expect(result.splitMap.get("horizontal")).toHaveLength(2);
    expect(result.splitMap.get("vertical")).toHaveLength(2);

    const atIntersection = result.walls.filter((candidate) =>
      [candidate.start, candidate.end].some((point) => Math.hypot(point.x - 2, point.y - 2) < 0.001),
    );
    expect(atIntersection).toHaveLength(4);
  });

  it("splits an existing wall when the new wall ends on its middle", () => {
    const existing = wall("horizontal", [0, 2], [4, 2]);
    const inserted = wall("vertical", [2, 0], [2, 2]);
    const result = insertWallWithIntersections([existing], inserted);

    expect(result.splitMap.get("horizontal")).toHaveLength(2);
    expect(result.insertedWallIds).toHaveLength(1);
    expect(result.walls).toHaveLength(3);
  });
});
