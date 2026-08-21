import { describe, expect, it } from "vitest";
import { rectangleProfile, wallLength, type Point, type Wall } from "./model";
import { moveConnectedNode } from "./nodeEditing";

const makeWall = (id: string, start: Point, end: Point, openings: Wall["openings"] = []): Wall => ({
  id,
  name: id,
  start,
  end,
  height: 2.8,
  orientation: "Est",
  type: "external",
  layers: [],
  profile: rectangleProfile(Math.hypot(end.x - start.x, end.y - start.y), 2.8),
  openings,
});

describe("moveConnectedNode", () => {
  it("moves every wall sharing the same node and leaves unrelated walls unchanged", () => {
    const shared = { x: 4, y: 0 };
    const first = makeWall("a", { x: 0, y: 0 }, shared);
    const second = makeWall("b", shared, { x: 4, y: 3 });
    const unrelated = makeWall("c", { x: 10, y: 0 }, { x: 12, y: 0 });

    const moved = moveConnectedNode([first, second, unrelated], shared, { x: 5, y: 1 });

    expect(moved[0].end).toEqual({ x: 5, y: 1 });
    expect(moved[1].start).toEqual({ x: 5, y: 1 });
    expect(moved[2]).toBe(unrelated);
    expect(moved[0].id).toBe("a");
    expect(moved[1].id).toBe("b");
  });

  it("resizes the wall profile and repositions openings proportionally", () => {
    const wall = makeWall("wall", { x: 0, y: 0 }, { x: 4, y: 0 }, [
      {
        id: "window",
        name: "Fenêtre",
        type: "window",
        position: 2,
        width: 1,
        height: 1.2,
        sillHeight: 0.9,
        uValue: 1.3,
        solarFactor: 0.55,
      },
    ]);

    const [moved] = moveConnectedNode([wall], { x: 4, y: 0 }, { x: 6, y: 0 });

    expect(wallLength(moved)).toBeCloseTo(6, 6);
    expect(moved.profile.at(-1)?.position).toBeCloseTo(6, 6);
    expect(moved.openings?.[0].position).toBeCloseTo(3, 6);
    expect(moved.openings?.[0].width).toBeCloseTo(1, 6);
  });

  it("clamps an opening inside a shortened wall", () => {
    const wall = makeWall("wall", { x: 0, y: 0 }, { x: 4, y: 0 }, [
      {
        id: "door",
        name: "Baie",
        type: "glazed-door",
        position: 3.4,
        width: 1.8,
        height: 2.15,
        sillHeight: 0,
        uValue: 1.4,
        solarFactor: 0.5,
      },
    ]);

    const [moved] = moveConnectedNode([wall], { x: 4, y: 0 }, { x: 2, y: 0 });

    expect(wallLength(moved)).toBeCloseTo(2, 6);
    expect(moved.openings?.[0].width).toBeCloseTo(1.8, 6);
    expect(moved.openings?.[0].position).toBeLessThanOrEqual(1.1 + 1e-6);
    expect(moved.openings?.[0].position).toBeGreaterThanOrEqual(0.9 - 1e-6);
  });

  it("refuses a move that would collapse a connected wall below the minimum length", () => {
    const wall = makeWall("wall", { x: 0, y: 0 }, { x: 1, y: 0 });
    const source = [wall];

    const moved = moveConnectedNode(source, { x: 1, y: 0 }, { x: 0.05, y: 0 });

    expect(moved).toBe(source);
    expect(moved[0].end).toEqual({ x: 1, y: 0 });
  });
});
