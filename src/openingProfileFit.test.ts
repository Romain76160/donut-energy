import { describe, expect, it } from "vitest";
import type { Wall, WallOpening } from "./model";
import { fitOpeningToWallProfile, openingProfileClearHeight, wallProfileHeightAt } from "./openingProfileFit";

const wall: Wall = {
  id: "wall-profile",
  name: "Mur en pente",
  start: { x: 0, y: 0 },
  end: { x: 4, y: 0 },
  height: 3,
  orientation: "Nord",
  type: "external",
  layers: [],
  profile: [
    { id: "p0", position: 0, height: 3 },
    { id: "p1", position: 4, height: 2 },
  ],
};

const windowOpening: WallOpening = {
  id: "window-1",
  name: "Fenêtre",
  type: "window",
  position: 3,
  width: 1,
  height: 1.2,
  sillHeight: 1.5,
  uValue: 1.3,
  solarFactor: 0.55,
};

describe("opening profile fit", () => {
  it("interpolates the wall profile height", () => {
    expect(wallProfileHeightAt(wall, 0)).toBeCloseTo(3);
    expect(wallProfileHeightAt(wall, 2)).toBeCloseTo(2.5);
    expect(wallProfileHeightAt(wall, 4)).toBeCloseTo(2);
  });

  it("uses the lowest profile height across the full opening width", () => {
    expect(openingProfileClearHeight(wall, windowOpening)).toBeCloseTo(2.125);
  });

  it("lowers a window so its top stays under a sloped profile", () => {
    const fitted = fitOpeningToWallProfile(windowOpening, wall);
    expect(fitted.height).toBeCloseTo(1.2);
    expect(fitted.sillHeight).toBeCloseTo(0.925);
    expect(fitted.sillHeight + fitted.height).toBeCloseTo(2.125);
  });

  it("keeps a door on the floor and shortens it only when required", () => {
    const door: WallOpening = {
      ...windowOpening,
      id: "door-1",
      type: "door",
      height: 2.3,
      sillHeight: 0.8,
    };
    const fitted = fitOpeningToWallProfile(door, wall);
    expect(fitted.sillHeight).toBe(0);
    expect(fitted.height).toBeCloseTo(2.125);
  });

  it("takes an internal profile vertex into account", () => {
    const stepped: Wall = {
      ...wall,
      id: "wall-gable",
      profile: [
        { id: "g0", position: 0, height: 3 },
        { id: "g1", position: 2, height: 1.8 },
        { id: "g2", position: 4, height: 3 },
      ],
    };
    expect(openingProfileClearHeight(stepped, { position: 2, width: 2 })).toBeCloseTo(1.8);
  });
});
