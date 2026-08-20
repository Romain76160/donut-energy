import { describe, expect, it } from "vitest";
import type { WallOpening } from "./model";
import {
  applyWindowTypeToOpening,
  builtInWindowTypes,
  normalizeWindowType,
  windowTypeGlazingArea,
  windowTypeGlazingSize,
} from "./windowTypes";

describe("window type library", () => {
  it("ships useful built-in window types", () => {
    const types = builtInWindowTypes();
    expect(types.length).toBeGreaterThanOrEqual(4);
    expect(types.some((type) => type.operation === "fixed")).toBe(true);
    expect(types.some((type) => type.operation === "casement-2")).toBe(true);
    expect(types.some((type) => type.operation === "sliding")).toBe(true);
  });

  it("normalizes dimensions and thermal properties", () => {
    const type = normalizeWindowType({
      id: "custom",
      name: "Test",
      width: 1.4,
      height: 1.2,
      frameWidthMm: 70,
      frameDepthMm: 90,
      uValue: 1.1,
      solarFactor: 0.48,
    });
    expect(type.width).toBe(1.4);
    expect(type.height).toBe(1.2);
    expect(type.frameWidthMm).toBe(70);
    expect(type.frameDepthMm).toBe(90);
    expect(type.uValue).toBe(1.1);
    expect(type.solarFactor).toBe(0.48);
  });

  it("computes an indicative clear glazing size from visible frame width", () => {
    const type = normalizeWindowType({ width: 1.4, height: 1.2, frameWidthMm: 70 });
    const glazing = windowTypeGlazingSize(type);
    expect(glazing.width).toBeCloseTo(1.26);
    expect(glazing.height).toBeCloseTo(1.06);
    expect(windowTypeGlazingArea(type)).toBeCloseTo(1.3356);
  });

  it("applies a window type without moving the opening instance", () => {
    const opening: WallOpening = {
      id: "opening-1",
      name: "Fenêtre séjour",
      type: "window",
      position: 2.75,
      width: 0.8,
      height: 1,
      sillHeight: 1,
      uValue: 1.8,
      solarFactor: 0.4,
    };
    const type = normalizeWindowType({
      name: "2 vantaux",
      width: 1.4,
      height: 1.2,
      sillHeight: 0.9,
      uValue: 1.1,
      solarFactor: 0.52,
    });
    const applied = applyWindowTypeToOpening(opening, type);
    expect(applied.id).toBe("opening-1");
    expect(applied.name).toBe("Fenêtre séjour");
    expect(applied.position).toBe(2.75);
    expect(applied.width).toBe(1.4);
    expect(applied.height).toBe(1.2);
    expect(applied.sillHeight).toBe(0.9);
    expect(applied.uValue).toBe(1.1);
    expect(applied.solarFactor).toBe(0.52);
  });

  it("keeps frame width physically possible for tiny windows", () => {
    const type = normalizeWindowType({ width: 0.2, height: 0.2, frameWidthMm: 500 });
    expect(type.frameWidthMm).toBeLessThan(100);
    expect(windowTypeGlazingArea(type)).toBeGreaterThanOrEqual(0);
  });
});
