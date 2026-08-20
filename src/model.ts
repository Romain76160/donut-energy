export type Point = { x: number; y: number };

export type Orientation = "Nord" | "Est" | "Sud" | "Ouest";
export type PhysicalWallType = "external" | "internal";
export type WallType = PhysicalWallType | "virtual";

export type Material = {
  name: string;
  conductivity: number;
  color: string;
};

export type WallLayer = Material & {
  id: string;
  thicknessMm: number;
};

export type ProfilePoint = {
  id: string;
  position: number;
  height: number;
};

export type SectionPoint = {
  id: string;
  height: number;
  offset: number;
};

export type Wall = {
  id: string;
  name: string;
  start: Point;
  end: Point;
  height: number;
  orientation: Orientation;
  type: WallType;
  layers: WallLayer[];
  profile: ProfilePoint[];
  inclinationDeg?: number;
  sectionProfile?: SectionPoint[];
};

export type SurfaceAssembly = {
  name: string;
  layers: WallLayer[];
};

export type Level = {
  id: string;
  name: string;
  /** Absolute altitude of the finished floor reference plane. */
  elevation: number;
  /** Absolute altitude of the ceiling / upper horizontal reference plane. */
  ceilingElevation: number;
  /** Default wall height for new walls. Kept for compatibility and derived from the two planes. */
  defaultHeight: number;
  /** When true, no floor separates this level from the level below. */
  openToBelow: boolean;
  showLowerReference: boolean;
  walls: Wall[];
  floor: SurfaceAssembly;
  ceiling: SurfaceAssembly;
};

export type Project = {
  title: string;
  levels: Level[];
};

export type EditorMode = "select" | "draw-external" | "draw-internal" | "draw-virtual" | "node";

export const MATERIALS: Material[] = [
  { name: "Plaque de plâtre", conductivity: 0.25, color: "#e8e5dc" },
  { name: "Laine de verre", conductivity: 0.03, color: "#f1cf65" },
  { name: "Brique", conductivity: 0.72, color: "#b65948" },
  { name: "Béton", conductivity: 1.75, color: "#aeb5bd" },
  { name: "Bois", conductivity: 0.13, color: "#b98a5b" },
  { name: "Polystyrène", conductivity: 0.036, color: "#b8dcf3" },
  { name: "Laine de roche", conductivity: 0.035, color: "#d9c981" },
  { name: "Chape ciment", conductivity: 1.4, color: "#c8c7c1" },
];

export const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `de-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
};

export const cloneLayers = (layers: WallLayer[]) => layers.map((layer) => ({ ...layer, id: createId() }));

export const externalWallLayers = (): WallLayer[] => [
  { id: createId(), thicknessMm: 13, ...MATERIALS[0] },
  { id: createId(), thicknessMm: 120, ...MATERIALS[1] },
  { id: createId(), thicknessMm: 200, ...MATERIALS[2] },
];

export const internalWallLayers = (): WallLayer[] => [
  { id: createId(), thicknessMm: 13, ...MATERIALS[0] },
  { id: createId(), thicknessMm: 70, ...MATERIALS[1] },
  { id: createId(), thicknessMm: 13, ...MATERIALS[0] },
];

export const floorLayers = (): WallLayer[] => [
  { id: createId(), thicknessMm: 60, ...MATERIALS[7] },
  { id: createId(), thicknessMm: 80, ...MATERIALS[5] },
  { id: createId(), thicknessMm: 200, ...MATERIALS[3] },
];

export const ceilingLayers = (): WallLayer[] => [
  { id: createId(), thicknessMm: 13, ...MATERIALS[0] },
  { id: createId(), thicknessMm: 200, ...MATERIALS[6] },
];

export const levelClearHeight = (level: Pick<Level, "elevation" | "ceilingElevation">) =>
  Math.max(0.1, level.ceilingElevation - level.elevation);

export const levelPhysicalFloorArea = (level: Pick<Level, "openToBelow">, geometricArea: number) =>
  level.openToBelow ? 0 : geometricArea;

export const wallLength = (wall: Pick<Wall, "start" | "end">) =>
  Math.hypot(wall.end.x - wall.start.x, wall.end.y - wall.start.y);

export const pointsEqual = (a: Point, b: Point, tolerance = 0.001) =>
  Math.abs(a.x - b.x) <= tolerance && Math.abs(a.y - b.y) <= tolerance;

export const orientationFromPoints = (start: Point, end: Point): Orientation => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dy <= 0 ? "Nord" : "Sud";
  return dx >= 0 ? "Est" : "Ouest";
};

export const rectangleProfile = (length: number, height: number): ProfilePoint[] => [
  { id: createId(), position: 0, height },
  { id: createId(), position: Math.max(0.01, length), height },
];

export const slopeProfile = (length: number, height: number): ProfilePoint[] => [
  { id: createId(), position: 0, height },
  { id: createId(), position: Math.max(0.01, length), height: height + 1 },
];

export const gableProfile = (length: number, height: number): ProfilePoint[] => [
  { id: createId(), position: 0, height },
  { id: createId(), position: Math.max(0.01, length / 2), height: height + 1.5 },
  { id: createId(), position: Math.max(0.02, length), height },
];

export const normalizeProfile = (wall: Pick<Wall, "profile" | "height" | "start" | "end">): ProfilePoint[] => {
  const length = wallLength(wall);
  const fallback = rectangleProfile(length, wall.height);
  if (!Array.isArray(wall.profile) || wall.profile.length < 2 || length <= 0) return fallback;
  const points = wall.profile
    .map((point) => ({ ...point, position: Math.min(length, Math.max(0, Number(point.position))), height: Math.max(0.1, Number(point.height)) }))
    .filter((point) => Number.isFinite(point.position) && Number.isFinite(point.height))
    .sort((a, b) => a.position - b.position);
  if (points.length < 2) return fallback;
  const first = { ...points[0], position: 0 };
  const last = { ...points.at(-1)!, position: length };
  return [first, ...points.slice(1, -1), last];
};

export const resizeProfile = (wall: Wall, nextLength: number) => {
  const currentLength = wallLength(wall);
  if (currentLength <= 0) return rectangleProfile(nextLength, wall.height);
  return normalizeProfile(wall).map((point, index, points) => ({
    ...point,
    position: index === 0 ? 0 : index === points.length - 1 ? nextLength : point.position * (nextLength / currentLength),
  }));
};

const createWall = (name: string, start: Point, end: Point, type: WallType, height = 2.8): Wall => ({
  id: createId(),
  name,
  start,
  end,
  height,
  orientation: orientationFromPoints(start, end),
  type,
  layers: type === "external" ? externalWallLayers() : type === "internal" ? internalWallLayers() : [],
  profile: rectangleProfile(Math.hypot(end.x - start.x, end.y - start.y), height),
});

export type CreateLevelOptions = {
  ceilingElevation?: number;
  openToBelow?: boolean;
  defaultHeight?: number;
};

export const createLevel = (name: string, elevation: number, withSeedWalls = false, options: CreateLevelOptions = {}): Level => {
  const requestedHeight = Number.isFinite(options.defaultHeight) ? Math.max(0.5, Number(options.defaultHeight)) : 2.8;
  const ceilingElevation = Number.isFinite(options.ceilingElevation)
    ? Math.max(elevation + 0.1, Number(options.ceilingElevation))
    : elevation + requestedHeight;
  const defaultHeight = Math.max(0.1, ceilingElevation - elevation);
  const walls = withSeedWalls ? [
    createWall("Mur Nord", { x: -4, y: -4 }, { x: 4, y: -4 }, "external", defaultHeight),
    createWall("Mur Est", { x: 4, y: -4 }, { x: 4, y: 4 }, "external", defaultHeight),
    createWall("Mur Sud", { x: 4, y: 4 }, { x: -4, y: 4 }, "external", defaultHeight),
    createWall("Mur Ouest", { x: -4, y: 4 }, { x: -4, y: -4 }, "external", defaultHeight),
  ] : [];
  return {
    id: createId(),
    name,
    elevation,
    ceilingElevation,
    defaultHeight,
    openToBelow: options.openToBelow === true,
    showLowerReference: true,
    walls,
    floor: { name: "Plancher", layers: floorLayers() },
    ceiling: { name: "Plafond", layers: ceilingLayers() },
  };
};

export const initialProject = (): Project => ({
  title: "Projet sans titre",
  levels: [createLevel("RDC", 0, true)],
});

const isPoint = (value: unknown): value is Point => {
  if (!value || typeof value !== "object") return false;
  const point = value as Point;
  return Number.isFinite(point.x) && Number.isFinite(point.y);
};

const migrateWall = (value: unknown, fallbackIndex: number, defaultHeight: number): Wall | null => {
  if (!value || typeof value !== "object") return null;
  const source = value as Partial<Wall>;
  if (!isPoint(source.start) || !isPoint(source.end)) return null;
  const height = Number.isFinite(source.height) ? Math.max(0.5, Number(source.height)) : defaultHeight;
  const length = Math.hypot(source.end.x - source.start.x, source.end.y - source.start.y);
  const type: WallType = source.type === "virtual" ? "virtual" : source.type === "internal" ? "internal" : "external";
  const inclinationDeg = Number.isFinite(source.inclinationDeg) ? Number(source.inclinationDeg) : undefined;
  const sectionProfile = Array.isArray(source.sectionProfile) && source.sectionProfile.length >= 2
    ? source.sectionProfile
      .map((point) => ({ id: point.id || createId(), height: Number(point.height), offset: Number(point.offset) }))
      .filter((point) => Number.isFinite(point.height) && Number.isFinite(point.offset))
    : undefined;
  return {
    id: typeof source.id === "string" ? source.id : createId(),
    name: typeof source.name === "string" ? source.name : `Mur ${fallbackIndex + 1}`,
    start: { ...source.start },
    end: { ...source.end },
    height,
    orientation: source.orientation ?? orientationFromPoints(source.start, source.end),
    type,
    layers: type === "virtual"
      ? []
      : Array.isArray(source.layers) && source.layers.length
        ? source.layers.map((layer) => ({ ...layer, id: layer.id || createId() }))
        : type === "external" ? externalWallLayers() : internalWallLayers(),
    profile: Array.isArray(source.profile) && source.profile.length >= 2 ? source.profile.map((point) => ({ ...point, id: point.id || createId() })) : rectangleProfile(length, height),
    inclinationDeg: type === "virtual" ? undefined : inclinationDeg,
    sectionProfile: type === "virtual" ? undefined : sectionProfile,
  };
};

export const migrateProject = (value: unknown): Project => {
  if (!value || typeof value !== "object") return initialProject();
  const source = value as { title?: unknown; levels?: unknown; walls?: unknown };
  const title = typeof source.title === "string" ? source.title : "Projet sans titre";

  if (Array.isArray(source.levels) && source.levels.length) {
    const levels = source.levels.map((levelValue, index) => {
      const levelSource = levelValue && typeof levelValue === "object" ? levelValue as Partial<Level> : {};
      const elevation = Number.isFinite(levelSource.elevation) ? Number(levelSource.elevation) : index * 3;
      const legacyHeight = Number.isFinite(levelSource.defaultHeight) ? Math.max(0.5, Number(levelSource.defaultHeight)) : 2.8;
      const ceilingElevation = Number.isFinite(levelSource.ceilingElevation)
        ? Math.max(elevation + 0.1, Number(levelSource.ceilingElevation))
        : elevation + legacyHeight;
      const defaultHeight = Math.max(0.1, ceilingElevation - elevation);
      const walls = Array.isArray(levelSource.walls)
        ? levelSource.walls.map((wall, wallIndex) => migrateWall(wall, wallIndex, defaultHeight)).filter((wall): wall is Wall => Boolean(wall))
        : [];
      return {
        id: typeof levelSource.id === "string" ? levelSource.id : createId(),
        name: typeof levelSource.name === "string" ? levelSource.name : `Niveau ${index + 1}`,
        elevation,
        ceilingElevation,
        defaultHeight,
        openToBelow: levelSource.openToBelow === true,
        showLowerReference: levelSource.showLowerReference !== false,
        walls,
        floor: levelSource.floor?.layers?.length ? levelSource.floor : { name: "Plancher", layers: floorLayers() },
        ceiling: levelSource.ceiling?.layers?.length ? levelSource.ceiling : { name: "Plafond", layers: ceilingLayers() },
      } satisfies Level;
    });
    return { title, levels };
  }

  if (Array.isArray(source.walls)) {
    const level = createLevel("RDC", 0, false);
    level.walls = source.walls.map((wall, index) => migrateWall(wall, index, level.defaultHeight)).filter((wall): wall is Wall => Boolean(wall));
    return { title, levels: [level] };
  }

  return initialProject();
};

export const formatNumber = (value: number, decimals = 2, locale = "fr-FR") =>
  new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);