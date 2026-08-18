import { describe, expect, it } from "vitest";
import { projectPerimeter, projectWallArea, wallArea, wallResistance, wallUValue } from "./thermal";
import type { Wall } from "./model";

const wall: Wall = {
  id: "north",
  name: "Mur Nord",
  start: { x: 0, y: 0 },
  end: { x: 8, y: 0 },
  height: 2.8,
  orientation: "Nord",
  type: "external",
  profile: [
    { id: "p0", position: 0, height: 2.8 },
    { id: "p1", position: 8, height: 2.8 },
  ],
  layers: [
    { id: "plaster", name: "Plaque de plâtre", thicknessMm: 13, conductivity: 0.25, color: "#fff" },
    { id: "wool", name: "Laine de verre", thicknessMm: 120, conductivity: 0.03, color: "#fff" },
    { id: "brick", name: "Brique", thicknessMm: 200, conductivity: 0.72, color: "#fff" },
  ],
};

describe("thermal wall calculations", () => {
  it("calculates a rectangular profile area", () => {
    expect(wallArea(wall)).toBeCloseTo(22.4);
  });

  it("calculates a gable profile area", () => {
    expect(wallArea({ ...wall, profile: [
      { id: "g0", position: 0, height: 2.8 },
      { id: "g1", position: 4, height: 4.3 },
      { id: "g2", position: 8, height: 2.8 },
    ] })).toBeCloseTo(28.4);
  });

  it("includes internal and external surface resistances", () => {
    expect(wallResistance(wall)).toBeCloseTo(4.5, 1);
    expect(wallUValue(wall)).toBeCloseTo(0.22, 1);
  });

  it("aggregates external perimeter and wall area", () => {
    expect(projectPerimeter([wall, wall])).toBe(16);
    expect(projectWallArea([wall, wall])).toBeCloseTo(44.8);
  });
});
