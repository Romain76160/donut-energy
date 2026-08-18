import { describe, expect, it } from "vitest";
import { wallProfileFromPreset, type WallProfilePreset } from "./wallProfilePresets";

const presets: WallProfilePreset[] = [
  "rectangle",
  "slope-up",
  "slope-down",
  "gable-center",
  "gable-left",
  "gable-right",
  "step-up",
  "step-down",
  "parapet-left",
  "parapet-right",
  "double-step",
  "truncated-gable",
  "butterfly",
  "shed",
  "double-shed",
  "arch",
];

describe("wall profile presets", () => {
  it("always starts at 0 and ends at the wall length", () => {
    for (const preset of presets) {
      const profile = wallProfileFromPreset(preset, 8, 2.8);
      expect(profile[0].position).toBe(0);
      expect(profile.at(-1)?.position).toBe(8);
    }
  });

  it("creates a centered gable with a higher midpoint", () => {
    const profile = wallProfileFromPreset("gable-center", 8, 2.8);
    expect(profile).toHaveLength(3);
    expect(profile[1].position).toBe(4);
    expect(profile[1].height).toBeGreaterThan(profile[0].height);
  });

  it("creates vertical steps using two points at the same position", () => {
    const profile = wallProfileFromPreset("step-up", 10, 2.8);
    expect(profile).toHaveLength(4);
    expect(profile[1].position).toBe(profile[2].position);
    expect(profile[2].height).toBeGreaterThan(profile[1].height);
  });

  it("creates a truncated gable with a flat high section", () => {
    const profile = wallProfileFromPreset("truncated-gable", 10, 2.8);
    expect(profile).toHaveLength(4);
    expect(profile[1].height).toBe(profile[2].height);
    expect(profile[1].height).toBeGreaterThan(profile[0].height);
  });

  it("creates a butterfly roof with a central valley", () => {
    const profile = wallProfileFromPreset("butterfly", 10, 2.8);
    expect(profile[1].position).toBe(5);
    expect(profile[1].height).toBeLessThan(profile[0].height);
    expect(profile[1].height).toBeLessThan(profile[2].height);
  });

  it("approximates an arch with several profile points", () => {
    const profile = wallProfileFromPreset("arch", 8, 2.8);
    expect(profile.length).toBeGreaterThanOrEqual(7);
    const middle = profile[Math.floor(profile.length / 2)];
    expect(middle.height).toBeGreaterThan(profile[0].height);
  });
});
