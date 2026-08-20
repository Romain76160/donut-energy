import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Project, Wall } from "./model";
import {
  linkWallType,
  syncProjectWallTypeInstances,
  unlinkWallType,
  type WallTypeDefinition,
} from "./wallTypes";
import {
  linkWindowType,
  syncProjectWindowTypeInstances,
  unlinkWindowType,
  type WindowTypeDefinition,
} from "./windowTypes";

const installMemoryStorage = () => {
  const values = new Map<string, string>();
  const storage = {
    get length() { return values.size; },
    clear: () => values.clear(),
    getItem: (key: string) => values.get(key) ?? null,
    key: (index: number) => [...values.keys()][index] ?? null,
    removeItem: (key: string) => { values.delete(key); },
    setItem: (key: string, value: string) => { values.set(key, String(value)); },
  } satisfies Storage;
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage });
};

const wall = (): Wall => ({
  id: "wall-1",
  name: "Façade jardin",
  start: { x: 0, y: 0 },
  end: { x: 5, y: 0 },
  height: 2.8,
  orientation: "Nord",
  type: "external",
  layers: [{ id: "old", name: "Brique", conductivity: 0.72, color: "#b65948", thicknessMm: 200 }],
  profile: [
    { id: "p1", position: 0, height: 2.8 },
    { id: "p2", position: 5, height: 2.8 },
  ],
  openings: [{
    id: "window-1",
    name: "Fenêtre cuisine",
    type: "window",
    position: 3.4,
    width: 1,
    height: 1,
    sillHeight: 0.9,
    uValue: 1.6,
    solarFactor: 0.45,
  }],
});

const project = (): Project => ({
  schemaVersion: 3,
  title: "Test",
  spaces: [],
  levels: [{
    id: "level-1",
    name: "RDC",
    elevation: 0,
    ceilingElevation: 2.8,
    defaultHeight: 2.8,
    openToBelow: false,
    showLowerReference: true,
    walls: [wall()],
    floor: { name: "Plancher", layers: [] },
    ceiling: { name: "Plafond", layers: [] },
  }],
});

beforeEach(installMemoryStorage);
afterEach(() => Reflect.deleteProperty(globalThis, "localStorage"));

describe("linked window types", () => {
  const type: WindowTypeDefinition = {
    id: "window-type-a",
    name: "PVC 2 vantaux",
    operation: "casement-2",
    width: 1.4,
    height: 1.2,
    sillHeight: 0.8,
    frameWidthMm: 70,
    frameDepthMm: 80,
    depthMode: "center",
    uValue: 1.1,
    solarFactor: 0.52,
  };

  it("updates linked geometry and thermal values while preserving instance identity and position", () => {
    linkWindowType("wall-1", "window-1", type.id);
    const next = syncProjectWindowTypeInstances(project(), [type]);
    const opening = next.levels[0].walls[0].openings![0];
    expect(opening.name).toBe("Fenêtre cuisine");
    expect(opening.position).toBe(3.4);
    expect(opening.width).toBe(1.4);
    expect(opening.height).toBe(1.2);
    expect(opening.uValue).toBe(1.1);
    expect(opening.solarFactor).toBe(0.52);
  });

  it("stops propagating after detaching the instance", () => {
    linkWindowType("wall-1", "window-1", type.id);
    unlinkWindowType("wall-1", "window-1");
    const next = syncProjectWindowTypeInstances(project(), [{ ...type, width: 1.8 }]);
    expect(next.levels[0].walls[0].openings![0].width).toBe(1);
  });
});

describe("linked wall types", () => {
  const type: WallTypeDefinition = {
    id: "wall-type-a",
    name: "Façade isolée",
    physicalType: "external",
    layers: [
      { id: "l1", name: "Plaque de plâtre", conductivity: 0.25, color: "#eee", thicknessMm: 13 },
      { id: "l2", name: "Laine de verre", conductivity: 0.03, color: "#ffd", thicknessMm: 160 },
      { id: "l3", name: "Brique", conductivity: 0.72, color: "#b65", thicknessMm: 200 },
    ],
  };

  it("updates composition while preserving wall geometry, profile and openings", () => {
    linkWallType("wall-1", type.id);
    const source = project();
    const next = syncProjectWallTypeInstances(source, [type]);
    const linked = next.levels[0].walls[0];
    expect(linked.name).toBe("Façade jardin");
    expect(linked.start).toEqual({ x: 0, y: 0 });
    expect(linked.end).toEqual({ x: 5, y: 0 });
    expect(linked.height).toBe(2.8);
    expect(linked.profile).toEqual(source.levels[0].walls[0].profile);
    expect(linked.openings).toEqual(source.levels[0].walls[0].openings);
    expect(linked.layers.map((layer) => layer.thicknessMm)).toEqual([13, 160, 200]);
  });

  it("stops propagating after detaching the wall", () => {
    linkWallType("wall-1", type.id);
    unlinkWallType("wall-1");
    const next = syncProjectWallTypeInstances(project(), [{ ...type, physicalType: "internal", layers: type.layers.slice(0, 1) }]);
    expect(next.levels[0].walls[0].type).toBe("external");
    expect(next.levels[0].walls[0].layers).toHaveLength(1);
    expect(next.levels[0].walls[0].layers[0].thicknessMm).toBe(200);
  });
});
