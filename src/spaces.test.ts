import { describe, expect, it } from "vitest";
import {
  CURRENT_SCHEMA_VERSION,
  createLevel,
  migrateProject,
  rectangleProfile,
  type Point,
  type Project,
  type Wall,
  type WallType,
} from "./model";
import { syncProjectSpaces } from "./spaces";

const wall = (id: string, start: Point, end: Point, type: WallType = "external"): Wall => ({
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

const rectangleWalls = (right = 4): Wall[] => [
  wall("north", { x: -4, y: -4 }, { x: right, y: -4 }),
  wall("east", { x: right, y: -4 }, { x: right, y: 4 }),
  wall("south", { x: right, y: 4 }, { x: -4, y: 4 }),
  wall("west", { x: -4, y: 4 }, { x: -4, y: -4 }),
];

const projectWithWalls = (walls: Wall[]): Project => {
  const level = createLevel("RDC", 0, false);
  level.walls = walls;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: "Test",
    levels: [level],
    spaces: [],
  };
};

describe("persistent spaces", () => {
  it("creates a persistent space from a closed room", () => {
    const project = syncProjectSpaces(projectWithWalls(rectangleWalls()));
    expect(project.spaces).toHaveLength(1);
    expect(project.spaces[0].area).toBeCloseTo(64);
    expect(project.spaces[0].temperatureSetpoint).toBe(19);
  });

  it("keeps identity and properties when a wall moves", () => {
    const initial = syncProjectSpaces(projectWithWalls(rectangleWalls()));
    const original = initial.spaces[0];
    const customized: Project = {
      ...initial,
      spaces: [{ ...original, name: "Séjour", usage: "living", temperatureSetpoint: 20 }],
      levels: [{ ...initial.levels[0], walls: rectangleWalls(4.25) }],
    };

    const updated = syncProjectSpaces(customized);
    expect(updated.spaces).toHaveLength(1);
    expect(updated.spaces[0].id).toBe(original.id);
    expect(updated.spaces[0].name).toBe("Séjour");
    expect(updated.spaces[0].usage).toBe("living");
    expect(updated.spaces[0].temperatureSetpoint).toBe(20);
    expect(updated.spaces[0].area).toBeGreaterThan(original.area);
  });

  it("keeps the old identity on one child when a room is split", () => {
    const initial = syncProjectSpaces(projectWithWalls(rectangleWalls()));
    const original = { ...initial.spaces[0], name: "Grand séjour" };
    const splitWalls: Wall[] = [
      wall("north-left", { x: -4, y: -4 }, { x: 0, y: -4 }),
      wall("north-right", { x: 0, y: -4 }, { x: 4, y: -4 }),
      wall("east", { x: 4, y: -4 }, { x: 4, y: 4 }),
      wall("south-right", { x: 4, y: 4 }, { x: 0, y: 4 }),
      wall("south-left", { x: 0, y: 4 }, { x: -4, y: 4 }),
      wall("west", { x: -4, y: 4 }, { x: -4, y: -4 }),
      wall("separator", { x: 0, y: -4 }, { x: 0, y: 4 }, "virtual"),
    ];
    const split: Project = {
      ...initial,
      spaces: [original],
      levels: [{ ...initial.levels[0], walls: splitWalls }],
    };

    const updated = syncProjectSpaces(split);
    expect(updated.spaces).toHaveLength(2);
    expect(updated.spaces.some((space) => space.id === original.id)).toBe(true);
    expect(updated.spaces.find((space) => space.id === original.id)?.name).toBe("Grand séjour");
    expect(updated.spaces.every((space) => space.area > 31.9 && space.area < 32.1)).toBe(true);
  });

  it("migrates old projects to schema version 2 without inventing stored spaces", () => {
    const old = {
      title: "Ancien projet",
      levels: [createLevel("RDC", 0, false)],
    };
    const migrated = migrateProject(old);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.spaces).toEqual([]);
  });
});
