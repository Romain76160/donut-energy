import { describe, expect, it } from "vitest";
import { detectRooms } from "./geometry";
import { rectangleProfile, type Point, type Wall, type WallType } from "./model";
import { projectWallArea, wallArea, wallResistance } from "./thermal";

const wall = (id: string, start: Point, end: Point, type: WallType): Wall => ({
  id,
  name: id,
  start,
  end,
  height: 2.8,
  orientation: "Nord",
  type,
  layers: type === "virtual" ? [] : [
    { id: `${id}-layer`, name: "Béton", thicknessMm: 200, conductivity: 1.75, color: "#aaa" },
  ],
  profile: rectangleProfile(Math.hypot(end.x - start.x, end.y - start.y), 2.8),
});

describe("virtual walls", () => {
  it("separates rooms without becoming a thermal wall", () => {
    const walls: Wall[] = [
      wall("top-left", { x: -4, y: -4 }, { x: 0, y: -4 }, "external"),
      wall("top-right", { x: 0, y: -4 }, { x: 4, y: -4 }, "external"),
      wall("right", { x: 4, y: -4 }, { x: 4, y: 4 }, "external"),
      wall("bottom-right", { x: 4, y: 4 }, { x: 0, y: 4 }, "external"),
      wall("bottom-left", { x: 0, y: 4 }, { x: -4, y: 4 }, "external"),
      wall("left", { x: -4, y: 4 }, { x: -4, y: -4 }, "external"),
      wall("virtual-divider", { x: 0, y: -4 }, { x: 0, y: 4 }, "virtual"),
    ];

    const rooms = detectRooms(walls).sort((a, b) => a.centroid.x - b.centroid.x);
    expect(rooms).toHaveLength(2);
    expect(rooms[0].area).toBeCloseTo(32);
    expect(rooms[1].area).toBeCloseTo(32);

    const virtual = walls.at(-1)!;
    expect(wallArea(virtual)).toBe(0);
    expect(wallResistance(virtual)).toBe(0);

    const physicalArea = walls.slice(0, -1).reduce((sum, item) => sum + wallArea(item), 0);
    expect(projectWallArea(walls)).toBeCloseTo(physicalArea);
  });
});
