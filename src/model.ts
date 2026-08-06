export type Point = { x: number; y: number };

export type Orientation = "Nord" | "Est" | "Sud" | "Ouest";

export type Material = {
  name: string;
  conductivity: number;
  color: string;
};

export type WallLayer = Material & {
  id: string;
  thicknessMm: number;
};

export type Wall = {
  id: string;
  name: string;
  start: Point;
  end: Point;
  height: number;
  orientation: Orientation;
  layers: WallLayer[];
};

export type Project = {
  title: string;
  walls: Wall[];
};

export type EditorMode = "select" | "draw";

export const MATERIALS: Material[] = [
  { name: "Plaque de plâtre", conductivity: 0.25, color: "#e8e5dc" },
  { name: "Laine de verre", conductivity: 0.03, color: "#f1cf65" },
  { name: "Brique", conductivity: 0.72, color: "#b65948" },
  { name: "Béton", conductivity: 1.75, color: "#aeb5bd" },
  { name: "Bois", conductivity: 0.13, color: "#b98a5b" },
  { name: "Polystyrène", conductivity: 0.036, color: "#b8dcf3" },
];

const makeLayers = (): WallLayer[] => [
  { id: crypto.randomUUID(), thicknessMm: 13, ...MATERIALS[0] },
  { id: crypto.randomUUID(), thicknessMm: 120, ...MATERIALS[1] },
  { id: crypto.randomUUID(), thicknessMm: 200, ...MATERIALS[2] },
];

export const initialProject = (): Project => ({
  title: "Projet sans titre",
  walls: [
    {
      id: crypto.randomUUID(),
      name: "Mur Nord",
      start: { x: -4, y: -4 },
      end: { x: 4, y: -4 },
      height: 2.8,
      orientation: "Nord",
      layers: makeLayers(),
    },
    {
      id: crypto.randomUUID(),
      name: "Mur Est",
      start: { x: 4, y: -4 },
      end: { x: 4, y: 4 },
      height: 2.8,
      orientation: "Est",
      layers: makeLayers(),
    },
    {
      id: crypto.randomUUID(),
      name: "Mur Sud",
      start: { x: 4, y: 4 },
      end: { x: -4, y: 4 },
      height: 2.8,
      orientation: "Sud",
      layers: makeLayers(),
    },
    {
      id: crypto.randomUUID(),
      name: "Mur Ouest",
      start: { x: -4, y: 4 },
      end: { x: -4, y: -4 },
      height: 2.8,
      orientation: "Ouest",
      layers: makeLayers(),
    },
  ],
});

export const wallLength = (wall: Wall) =>
  Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);

export const pointsEqual = (a: Point, b: Point) =>
  Math.abs(a.x - b.x) < 0.001 && Math.abs(a.y - b.y) < 0.001;

export const orientationFromPoints = (start: Point, end: Point): Orientation => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dy <= 0 ? "Nord" : "Sud";
  return dx >= 0 ? "Est" : "Ouest";
};

export const formatNumber = (value: number, decimals = 2) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
