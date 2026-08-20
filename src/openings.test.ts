import { describe, expect, it } from "vitest";
import { splitWallsAtPoint } from "./geometry";
import {
  CURRENT_SCHEMA_VERSION,
  migrateProject,
  rectangleProfile,
  type Wall,
  type WallOpening,
} from "./model";
import { defaultOpening, normalizeOpening, wallOpeningsArea } from "./openings";
import { wallArea, wallOpaqueArea, wallOpeningArea, wallTransmissionCoefficient } from "./thermal";

const baseWall = (): Wall => ({
  id: "wall",
  name: "Mur test",
  start: { x: 0, y: 0 },
  end: { x: 6, y: 0 },
  height: 3,
  orientation: "Nord",
  type: "external",
  layers: [
    { id: "layer", name: "Béton", thicknessMm: 200, conductivity: 1.75, color: "#aaa" },
  ],
  profile: rectangleProfile(6, 3),
  openings: [],
});

const windowOpening = (): WallOpening => ({
  id: "window-1",
  name: "Fenêtre séjour",
  type: "window",
  position: 1.5,
  width: 1.2,
  height: 1.4,
  sillHeight: 0.9,
  uValue: 1.3,
  solarFactor: 0.55,
});

describe("wall openings", () => {
  it("creates and clamps a default opening inside its wall", () => {
    const wall = baseWall();
    const opening = defaultOpening("window", wall);
    const normalized = normalizeOpening({ ...opening, position: 99, width: 20 }, wall);
    expect(normalized.width).toBe(6);
    expect(normalized.position).toBe(3);
    expect(normalized.height).toBeLessThanOrEqual(3);
    expect(normalized.sillHeight + normalized.height).toBeLessThanOrEqual(3.0001);
  });

  it("subtracts opening area from the opaque wall surface", () => {
    const wall = { ...baseWall(), openings: [windowOpening()] };
    expect(wallArea(wall)).toBeCloseTo(18, 5);
    expect(wallOpeningsArea(wall)).toBeCloseTo(1.68, 5);
    expect(wallOpeningArea(wall)).toBeCloseTo(1.68, 5);
    expect(wallOpaqueArea(wall)).toBeCloseTo(16.32, 5);
    expect(wallTransmissionCoefficient(wall)).toBeGreaterThan(0);
  });

  it("moves an opening to only one child wall when the host wall is split", () => {
    const wall = { ...baseWall(), openings: [windowOpening()] };
    const children = splitWallsAtPoint([wall], { x: 3, y: 0 });
    expect(children).toHaveLength(2);
    expect(children[0].openings).toHaveLength(1);
    expect(children[1].openings).toHaveLength(0);
    expect(children[0].openings?.[0].id).toBe("window-1");
  });

  it("repositions an opening on the second child when the split occurs before it", () => {
    const wall = { ...baseWall(), openings: [{ ...windowOpening(), position: 4.5 }] };
    const children = splitWallsAtPoint([wall], { x: 3, y: 0 });
    expect(children[0].openings).toHaveLength(0);
    expect(children[1].openings).toHaveLength(1);
    expect(children[1].openings?.[0].position).toBeCloseTo(1.5, 5);
  });

  it("migrates stored openings and upgrades the project schema", () => {
    const wall = { ...baseWall(), openings: [windowOpening()] };
    const oldProject = {
      schemaVersion: 2,
      title: "Projet avec baie",
      levels: [{
        id: "level",
        name: "RDC",
        elevation: 0,
        ceilingElevation: 3,
        defaultHeight: 3,
        openToBelow: false,
        showLowerReference: true,
        walls: [wall],
        floor: { name: "Plancher", layers: [] },
        ceiling: { name: "Plafond", layers: [] },
      }],
      spaces: [],
    };
    const migrated = migrateProject(oldProject);
    expect(migrated.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(migrated.levels[0].walls[0].openings).toHaveLength(1);
    expect(migrated.levels[0].walls[0].openings?.[0].name).toBe("Fenêtre séjour");
  });
});
