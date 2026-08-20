import { describe, expect, it } from "vitest";
import {
  depthOffsetForMode,
  normalizeOpeningDepth,
  openingDepthGeometry,
  wallThicknessMm,
} from "./openingDepth";
import type { WallLayer } from "./model";

const layers: WallLayer[] = [
  { id: "plaster", name: "Plaque", conductivity: 0.25, color: "#eee", thicknessMm: 13 },
  { id: "insulation", name: "Isolant", conductivity: 0.035, color: "#ddd", thicknessMm: 120 },
  { id: "brick", name: "Brique", conductivity: 0.72, color: "#bbb", thicknessMm: 200 },
];

const wall = { layers };

describe("opening frame depth", () => {
  it("uses the complete multilayer wall thickness", () => {
    expect(wallThicknessMm(wall)).toBe(333);
  });

  it("defaults legacy openings to a 70 mm frame centred in the current wall", () => {
    expect(normalizeOpeningDepth(undefined, wall)).toEqual({
      mode: "center",
      offsetMm: 166.5,
      frameDepthMm: 70,
    });
  });

  it("keeps the full frame inside the wall for the three presets", () => {
    expect(depthOffsetForMode("interior", 333, 0, 70)).toBe(35);
    expect(depthOffsetForMode("center", 333, 0, 70)).toBe(166.5);
    expect(depthOffsetForMode("exterior", 333, 0, 70)).toBe(298);
  });

  it("clamps a custom frame centre so the complete frame stays inside both finishes", () => {
    expect(depthOffsetForMode("custom", 333, -50, 70)).toBe(35);
    expect(depthOffsetForMode("custom", 333, 90, 70)).toBe(90);
    expect(depthOffsetForMode("custom", 333, 500, 70)).toBe(298);
  });

  it("calculates interior and exterior reveals from the physical frame faces", () => {
    expect(openingDepthGeometry({ mode: "center", offsetMm: 0, frameDepthMm: 70 }, wall)).toMatchObject({
      frameStartMm: 131.5,
      frameEndMm: 201.5,
      interiorRevealMm: 131.5,
      exteriorRevealMm: 131.5,
    });

    expect(openingDepthGeometry({ mode: "interior", offsetMm: 0, frameDepthMm: 70 }, wall)).toMatchObject({
      frameStartMm: 0,
      frameEndMm: 70,
      interiorRevealMm: 0,
      exteriorRevealMm: 263,
    });

    expect(openingDepthGeometry({ mode: "exterior", offsetMm: 0, frameDepthMm: 70 }, wall)).toMatchObject({
      frameStartMm: 263,
      frameEndMm: 333,
      interiorRevealMm: 263,
      exteriorRevealMm: 0,
    });
  });

  it("recomputes preset positions when wall thickness changes", () => {
    const thickerWall = { layers: [...layers, { id: "finish", name: "Finition", conductivity: 0.2, color: "#fff", thicknessMm: 67 }] };
    expect(normalizeOpeningDepth({ mode: "center", offsetMm: 10, frameDepthMm: 70 }, thickerWall).offsetMm).toBe(200);
    expect(normalizeOpeningDepth({ mode: "exterior", offsetMm: 10, frameDepthMm: 70 }, thickerWall).offsetMm).toBe(365);
  });

  it("clamps an oversized frame to the available wall thickness", () => {
    const result = openingDepthGeometry({ mode: "center", frameDepthMm: 500 }, wall);
    expect(result.frameDepthMm).toBe(333);
    expect(result.frameStartMm).toBe(0);
    expect(result.frameEndMm).toBe(333);
    expect(result.interiorRevealMm).toBe(0);
    expect(result.exteriorRevealMm).toBe(0);
  });
});
