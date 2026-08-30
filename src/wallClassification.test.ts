import { describe, expect, it } from "vitest";
import { createId, rectangleProfile, type Project, type Space, type Wall } from "./model";
import { autoClassifyProjectWalls, inferWallClassification, inferWallPhysicalType } from "./wallClassification";
import { applyWallTypeToWall, type WallTypeDefinition } from "./wallTypes";

const wall = (id: string, start: [number, number], end: [number, number], type: Wall["type"] = "external"): Wall => ({
  id,
  name: id,
  start: { x: start[0], y: start[1] },
  end: { x: end[0], y: end[1] },
  height: 2.8,
  orientation: "Nord",
  type,
  layers: [{ id: createId(), name: "Béton", thicknessMm: 200, conductivity: 1.75, color: "#aaa" }],
  profile: rectangleProfile(Math.hypot(end[0] - start[0], end[1] - start[1]), 2.8),
  openings: [],
});

const space = (id: string, polygon: Array<[number, number]>): Space => {
  const points = polygon.map(([x, y]) => ({ x, y }));
  return {
    id,
    levelId: "level",
    name: id,
    polygon: points,
    area: 16,
    perimeter: 16,
    centroid: {
      x: points.reduce((sum, point) => sum + point.x, 0) / points.length,
      y: points.reduce((sum, point) => sum + point.y, 0) / points.length,
    },
    usage: "unspecified",
    temperatureSetpoint: 19,
  };
};

describe("automatic wall classification", () => {
  it("reports indeterminate while no closed space is available", () => {
    const candidate = wall("draft", [0, 0], [4, 0], "external");
    expect(inferWallClassification(candidate, [])).toBe("indeterminate");
  });

  it("classifies an envelope wall as external", () => {
    const candidate = wall("outer", [0, 0], [4, 0], "internal");
    const room = space("room", [[0, 0], [4, 0], [4, 4], [0, 4]]);
    expect(inferWallPhysicalType(candidate, [room])).toBe("external");
  });

  it("classifies a partition with space on both sides as internal", () => {
    const candidate = wall("partition", [2, 0], [2, 4]);
    const left = space("left", [[0, 0], [2, 0], [2, 4], [0, 4]]);
    const right = space("right", [[2, 0], [4, 0], [4, 4], [2, 4]]);
    expect(inferWallPhysicalType(candidate, [left, right])).toBe("internal");
  });

  it("applying a construction type never overrides geometry classification", () => {
    const candidate = wall("partition", [2, 0], [2, 4], "internal");
    const construction: WallTypeDefinition = {
      id: "construction",
      name: "Construction",
      physicalType: "external",
      layers: [{ id: "layer", name: "Béton", thicknessMm: 300, conductivity: 1.75, color: "#aaa" }],
    };
    const next = applyWallTypeToWall(candidate, construction);
    expect(next.type).toBe("internal");
    expect(next.layers[0].thicknessMm).toBe(300);
  });

  it("never reclassifies a virtual boundary", () => {
    const virtual = wall("virtual", [2, 0], [2, 4], "virtual");
    const left = space("left", [[0, 0], [2, 0], [2, 4], [0, 4]]);
    const right = space("right", [[2, 0], [4, 0], [4, 4], [2, 4]]);
    const project: Project = {
      schemaVersion: 3,
      title: "test",
      spaces: [left, right],
      levels: [{
        id: "level",
        name: "RDC",
        elevation: 0,
        ceilingElevation: 2.8,
        defaultHeight: 2.8,
        openToBelow: false,
        showLowerReference: false,
        walls: [virtual],
        floor: { name: "floor", layers: [] },
        ceiling: { name: "ceiling", layers: [] },
      }],
    };
    expect(autoClassifyProjectWalls(project).levels[0].walls[0].type).toBe("virtual");
  });
});
