import { describe, expect, it } from "vitest";
import { depthOffsetForMode, normalizeOpeningDepth, wallThicknessMm } from "./openingDepth";
import type { WallLayer } from "./model";

const layers: WallLayer[] = [
  { id: "plaster", name: "Plaque", conductivity: 0.25, color: "#eee", thicknessMm: 13 },
  { id: "insulation", name: "Isolant", conductivity: 0.035, color: "#ddd", thicknessMm: 120 },
  { id: "brick", name: "Brique", conductivity: 0.72, color: "#bbb", thicknessMm: 200 },
];

const wall = { layers };

describe("opening depth position", () => {
  it("uses the complete multilayer wall thickness", () => {
    expect(wallThicknessMm(wall)).toBe(333);
  });

  it("maps the three presets to the two faces and the centre", () => {
    expect(depthOffsetForMode("interior", 333)).toBe(0);
    expect(depthOffsetForMode("center", 333)).toBe(166.5);
    expect(depthOffsetForMode("exterior", 333)).toBe(333);
  });

  it("clamps a custom position between both finished faces", () => {
    expect(depthOffsetForMode("custom", 333, -50)).toBe(0);
    expect(depthOffsetForMode("custom", 333, 90)).toBe(90);
    expect(depthOffsetForMode("custom", 333, 500)).toBe(333);
  });

  it("defaults legacy openings to the centre of the current wall", () => {
    expect(normalizeOpeningDepth(undefined, wall)).toEqual({ mode: "center", offsetMm: 166.5 });
  });

  it("recomputes preset positions when wall thickness changes", () => {
    const thickerWall = { layers: [...layers, { id: "finish", name: "Finition", conductivity: 0.2, color: "#fff", thicknessMm: 67 }] };
    expect(normalizeOpeningDepth({ mode: "center", offsetMm: 10 }, thickerWall).offsetMm).toBe(200);
    expect(normalizeOpeningDepth({ mode: "exterior", offsetMm: 10 }, thickerWall).offsetMm).toBe(400);
  });
});
