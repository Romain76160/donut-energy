import { describe, expect, it } from "vitest";
import { detectRooms, wallOrientationFromNorth } from "./geometry";
import type { Point, Wall } from "./model";

const makeWall = (id: string, start: Point, end: Point): Wall => ({
  id,
  name: id,
  start,
  end,
  height: 2.8,
  orientation: "Nord",
  type: "external",
  layers: [],
  profile: [
    { id: `${id}-0`, position: 0, height: 2.8 },
    { id: `${id}-1`, position: Math.hypot(end.x - start.x, end.y - start.y), height: 2.8 },
  ],
});

const square = [
  makeWall("north", { x: -4, y: -4 }, { x: 4, y: -4 }),
  makeWall("east", { x: 4, y: -4 }, { x: 4, y: 4 }),
  makeWall("south", { x: 4, y: 4 }, { x: -4, y: 4 }),
  makeWall("west", { x: -4, y: 4 }, { x: -4, y: -4 }),
];

describe("automatic wall orientation", () => {
  it("derives facade orientation from geometry when north points up", () => {
    const rooms = detectRooms(square);
    expect(square.map((wall) => wallOrientationFromNorth(wall, square, 0, rooms))).toEqual(["Nord", "Est", "Sud", "Ouest"]);
  });

  it("rotates all orientations when project north rotates", () => {
    const rooms = detectRooms(square);
    expect(square.map((wall) => wallOrientationFromNorth(wall, square, 90, rooms))).toEqual(["Ouest", "Nord", "Est", "Sud"]);
  });

  it("does not depend on the drawing direction of an exterior wall", () => {
    const reversed = [makeWall("north-reversed", { x: 4, y: -4 }, { x: -4, y: -4 }), ...square.slice(1)];
    const rooms = detectRooms(reversed);
    expect(wallOrientationFromNorth(reversed[0], reversed, 0, rooms)).toBe("Nord");
  });
});
