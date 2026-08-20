import { createId, wallLength, type OpeningType, type Wall, type WallOpening } from "./model";

export const openingTypeLabel = (type: OpeningType, language: "fr" | "en") => {
  if (language === "fr") {
    if (type === "window") return "Fenêtre";
    if (type === "door") return "Porte";
    return "Baie vitrée";
  }
  if (type === "window") return "Window";
  if (type === "door") return "Door";
  return "Glazed door";
};

export const defaultOpening = (type: OpeningType, wall: Wall, index = 0): WallOpening => {
  const length = Math.max(0.2, wallLength(wall));
  const wallHeight = Math.max(0.5, wall.height);
  const width = Math.min(length, type === "door" ? 0.9 : type === "glazed-door" ? 1.8 : 1.2);
  const requestedHeight = type === "door" ? 2.1 : type === "glazed-door" ? 2.15 : 1.2;
  const height = Math.min(wallHeight, requestedHeight);
  const sillHeight = type === "window" ? Math.min(0.9, Math.max(0, wallHeight - height)) : 0;
  return {
    id: createId(),
    name: `${openingTypeLabel(type, "fr")} ${index + 1}`,
    type,
    position: length / 2,
    width,
    height,
    sillHeight,
    uValue: type === "door" ? 1.8 : 1.3,
    solarFactor: type === "door" ? 0 : 0.55,
  };
};

export const normalizeOpening = (opening: WallOpening, wall: Wall): WallOpening => {
  const length = Math.max(0.2, wallLength(wall));
  const wallHeight = Math.max(0.5, wall.height);
  const width = Math.max(0.2, Math.min(length, Number(opening.width) || 0.2));
  const height = Math.max(0.2, Math.min(wallHeight, Number(opening.height) || 0.2));
  const maxSill = Math.max(0, wallHeight - height);
  const sillHeight = opening.type === "door" || opening.type === "glazed-door"
    ? 0
    : Math.max(0, Math.min(maxSill, Number(opening.sillHeight) || 0));
  const halfWidth = width / 2;
  const minPosition = halfWidth;
  const maxPosition = Math.max(halfWidth, length - halfWidth);
  const position = Math.max(minPosition, Math.min(maxPosition, Number(opening.position) || length / 2));
  return {
    ...opening,
    position,
    width,
    height,
    sillHeight,
    uValue: Math.max(0.1, Number(opening.uValue) || 0.1),
    solarFactor: opening.type === "door" ? 0 : Math.max(0, Math.min(1, Number(opening.solarFactor) || 0)),
  };
};

export const wallOpenings = (wall: Wall) =>
  wall.type === "virtual" ? [] : (wall.openings ?? []).map((opening) => normalizeOpening(opening, wall));

export const openingArea = (opening: WallOpening) => Math.max(0, opening.width) * Math.max(0, opening.height);

export const wallOpeningsArea = (wall: Wall) =>
  wallOpenings(wall).reduce((total, opening) => total + openingArea(opening), 0);

export const openingsTransmission = (wall: Wall) =>
  wallOpenings(wall).reduce((total, opening) => total + openingArea(opening) * opening.uValue, 0);

export const openingCenterPoint = (wall: Wall, opening: WallOpening) => {
  const length = wallLength(wall);
  if (length <= 0) return { ...wall.start };
  const t = normalizeOpening(opening, wall).position / length;
  return {
    x: wall.start.x + (wall.end.x - wall.start.x) * t,
    y: wall.start.y + (wall.end.y - wall.start.y) * t,
  };
};
