import { describe, expect, it } from "vitest";
import { createLevel, levelClearHeight, levelPhysicalFloorArea, migrateProject } from "./model";

describe("vertical level structure", () => {
  it("creates a level from absolute floor and ceiling planes", () => {
    const level = createLevel("R+1", 3.1, false, { ceilingElevation: 5.9 });
    expect(level.elevation).toBeCloseTo(3.1);
    expect(level.ceilingElevation).toBeCloseTo(5.9);
    expect(levelClearHeight(level)).toBeCloseTo(2.8);
    expect(level.defaultHeight).toBeCloseTo(2.8);
  });

  it("can represent a level open to the level below", () => {
    const level = createLevel("Mezzanine", 3, false, { ceilingElevation: 5.7, openToBelow: true });
    expect(level.openToBelow).toBe(true);
    expect(levelPhysicalFloorArea(level, 42)).toBe(0);
  });

  it("keeps a physical floor when the level is closed", () => {
    const level = createLevel("R+1", 3, false, { ceilingElevation: 5.8 });
    expect(levelPhysicalFloorArea(level, 42)).toBe(42);
  });

  it("migrates old projects by deriving the ceiling altitude from the former height", () => {
    const migrated = migrateProject({
      title: "Ancien projet",
      levels: [{
        id: "old-level",
        name: "RDC",
        elevation: 1.2,
        defaultHeight: 2.7,
        showLowerReference: true,
        walls: [],
        floor: { name: "Plancher", layers: [] },
        ceiling: { name: "Plafond", layers: [] },
      }],
    });
    expect(migrated.levels[0].ceilingElevation).toBeCloseTo(3.9);
    expect(migrated.levels[0].openToBelow).toBe(false);
  });
});
