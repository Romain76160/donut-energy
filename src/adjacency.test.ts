import { describe, expect, it } from "vitest";
import { buildWallAdjacencies } from "./adjacency";
import { CURRENT_SCHEMA_VERSION, createLevel, rectangleProfile, type Point, type Project, type Wall, type WallType } from "./model";
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

const projectWithWalls = (walls: Wall[]): Project => {
  const level = createLevel("RDC", 0, false);
  level.walls = walls;
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    title: "Adjacences",
    levels: [level],
    spaces: [],
  };
};

const rectangleWalls = (): Wall[] => [
  wall("north", { x: -4, y: -4 }, { x: 4, y: -4 }),
  wall("east", { x: 4, y: -4 }, { x: 4, y: 4 }),
  wall("south", { x: 4, y: 4 }, { x: -4, y: 4 }),
  wall("west", { x: -4, y: 4 }, { x: -4, y: -4 }),
];

describe("wall adjacencies", () => {
  it("links every envelope wall to one space and the outside", () => {
    const project = syncProjectSpaces(projectWithWalls(rectangleWalls()));
    const adjacencies = buildWallAdjacencies(project.levels[0].walls, project.spaces);

    expect(project.spaces).toHaveLength(1);
    expect(adjacencies).toHaveLength(4);
    for (const adjacency of adjacencies) {
      expect(adjacency.quality).toBe("resolved");
      const kinds = [adjacency.sideA.kind, adjacency.sideB.kind].sort();
      expect(kinds).toEqual(["outside", "space"]);
    }
  });

  it("links a virtual separator to the two spaces it separates", () => {
    const walls: Wall[] = [
      wall("north-left", { x: -4, y: -4 }, { x: 0, y: -4 }),
      wall("north-right", { x: 0, y: -4 }, { x: 4, y: -4 }),
      wall("east", { x: 4, y: -4 }, { x: 4, y: 4 }),
      wall("south-right", { x: 4, y: 4 }, { x: 0, y: 4 }),
      wall("south-left", { x: 0, y: 4 }, { x: -4, y: 4 }),
      wall("west", { x: -4, y: 4 }, { x: -4, y: -4 }),
      wall("separator", { x: 0, y: -4 }, { x: 0, y: 4 }, "virtual"),
    ];
    const project = syncProjectSpaces(projectWithWalls(walls));
    const adjacency = buildWallAdjacencies(project.levels[0].walls, project.spaces)
      .find((candidate) => candidate.wallId === "separator");

    expect(project.spaces).toHaveLength(2);
    expect(adjacency?.quality).toBe("resolved");
    expect(adjacency?.sideA.kind).toBe("space");
    expect(adjacency?.sideB.kind).toBe("space");
    if (adjacency?.sideA.kind === "space" && adjacency.sideB.kind === "space") {
      expect(adjacency.sideA.spaceId).not.toBe(adjacency.sideB.spaceId);
    }
  });

  it("marks an isolated internal wall as incomplete", () => {
    const isolated = wall("isolated", { x: -1, y: 0 }, { x: 1, y: 0 }, "internal");
    const project = syncProjectSpaces(projectWithWalls([isolated]));
    const adjacency = buildWallAdjacencies(project.levels[0].walls, project.spaces)[0];

    expect(project.spaces).toHaveLength(0);
    expect(adjacency.quality).toBe("partial");
    expect(adjacency.sideA.kind).toBe("unassigned");
    expect(adjacency.sideB.kind).toBe("unassigned");
  });
});
