import { describe, expect, it } from "vitest";
import type { Wall } from "./model";
import { initialWallDefaults, wallTemplateFromWall, wallTemplateLayers } from "./wallDefaults";

const sourceWall: Wall = {
  id: "source-wall",
  name: "Mur test",
  start: { x: 0, y: 0 },
  end: { x: 5, y: 0 },
  height: 2.8,
  orientation: "Nord",
  type: "external",
  layers: [
    { id: "layer-a", name: "Béton", thicknessMm: 180, conductivity: 1.75, color: "#aaa" },
    { id: "layer-b", name: "Laine de verre", thicknessMm: 140, conductivity: 0.03, color: "#bbb" },
  ],
  profile: [
    { id: "p0", position: 0, height: 2.8 },
    { id: "p1", position: 5, height: 2.8 },
  ],
};

describe("default wall templates", () => {
  it("creates separate external and internal defaults", () => {
    const defaults = initialWallDefaults();
    expect(defaults.external.layers.length).toBeGreaterThan(0);
    expect(defaults.internal.layers.length).toBeGreaterThan(0);
    expect(defaults.external.layers).not.toBe(defaults.internal.layers);
  });

  it("copies the composition from an existing wall", () => {
    const template = wallTemplateFromWall(sourceWall);
    expect(template.sourceWallId).toBe(sourceWall.id);
    expect(template.layers.map((layer) => layer.thicknessMm)).toEqual([180, 140]);
    expect(template.layers).not.toBe(sourceWall.layers);
  });

  it("clones layer ids when a new wall uses a default", () => {
    const defaults = initialWallDefaults();
    defaults.external = wallTemplateFromWall(sourceWall);
    const layers = wallTemplateLayers(defaults, "external");
    expect(layers.map((layer) => layer.name)).toEqual(["Béton", "Laine de verre"]);
    expect(layers[0].id).not.toBe(sourceWall.layers[0].id);
  });
});
