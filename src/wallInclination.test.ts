import { describe, expect, it } from "vitest";
import type { Wall } from "./model";
import { wallArea } from "./thermal";
import { wallInclinationDeg, wallTopOffset, wallTrueHeight, type InclinedWall } from "./wallInclination";

const baseWall: Wall = {
  id: "tilt-test",
  name: "Mur incliné",
  start: { x: 0, y: 0 },
  end: { x: 8, y: 0 },
  height: 2.8,
  orientation: "Nord",
  type: "external",
  layers: [],
  profile: [
    { id: "p0", position: 0, height: 2.8 },
    { id: "p1", position: 8, height: 2.8 },
  ],
};

describe("wall inclination", () => {
  it("defaults to a vertical wall", () => {
    expect(wallInclinationDeg(baseWall)).toBe(90);
    expect(wallArea(baseWall)).toBeCloseTo(22.4);
  });

  it("increases the true wall surface when the wall leans", () => {
    const wall = { ...baseWall, inclinationDeg: 60 } as InclinedWall;
    expect(wallTrueHeight(2.8, 60)).toBeCloseTo(3.233, 3);
    expect(wallTopOffset(2.8, 60)).toBeCloseTo(1.617, 3);
    expect(wallArea(wall)).toBeCloseTo(25.865, 3);
  });

  it("uses the sign of the angle around 90 degrees for the top offset", () => {
    expect(wallTopOffset(2.8, 80)).toBeGreaterThan(0);
    expect(wallTopOffset(2.8, 100)).toBeLessThan(0);
  });
});
