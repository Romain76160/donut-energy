import { normalizeProfile, wallLength, type Wall, type WallOpening } from "./model";

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

/** Height of the wall profile at a horizontal position measured from wall start. */
export const wallProfileHeightAt = (wall: Wall, position: number) => {
  const profile = normalizeProfile(wall);
  if (!profile.length) return Math.max(0.05, wall.height);
  const length = Math.max(0, wallLength(wall));
  const x = clamp(position, 0, length);

  if (x <= profile[0].position) return Math.max(0.05, profile[0].height);
  if (x >= profile[profile.length - 1].position) return Math.max(0.05, profile[profile.length - 1].height);

  for (let index = 0; index < profile.length - 1; index += 1) {
    const a = profile[index];
    const b = profile[index + 1];
    if (x < a.position || x > b.position) continue;
    const span = b.position - a.position;
    if (Math.abs(span) < 1e-9) return Math.max(0.05, Math.min(a.height, b.height));
    const t = (x - a.position) / span;
    return Math.max(0.05, a.height + (b.height - a.height) * t);
  }

  return Math.max(0.05, wall.height);
};

/**
 * Lowest profile height available across the whole width of an opening.
 * Profile vertices inside the opening span are sampled as well as both jambs,
 * so gables, slopes and stepped profiles are respected.
 */
export const openingProfileClearHeight = (wall: Wall, opening: Pick<WallOpening, "position" | "width">) => {
  const length = Math.max(0.05, wallLength(wall));
  const width = clamp(Math.max(0.05, opening.width), 0.05, length);
  const half = width / 2;
  const position = clamp(opening.position, half, Math.max(half, length - half));
  const left = position - half;
  const right = position + half;
  const samples = [
    left,
    right,
    ...normalizeProfile(wall)
      .filter((point) => point.position > left && point.position < right)
      .map((point) => point.position),
  ];
  return Math.min(...samples.map((sample) => wallProfileHeightAt(wall, sample)));
};

/**
 * Keeps an opening fully inside the wall elevation at its current horizontal
 * position. Windows are lowered first and only shortened when the local wall
 * profile is physically too low. Doors remain on the floor.
 */
export const fitOpeningToWallProfile = (opening: WallOpening, wall: Wall): WallOpening => {
  const length = Math.max(0.05, wallLength(wall));
  const width = clamp(Math.max(0.05, opening.width), 0.05, length);
  const half = width / 2;
  const position = clamp(opening.position, half, Math.max(half, length - half));
  const clearHeight = Math.max(0.05, openingProfileClearHeight(wall, { position, width }));
  const height = clamp(Math.max(0.05, opening.height), 0.05, clearHeight);
  const maxSill = Math.max(0, clearHeight - height);
  const sillHeight = opening.type === "window"
    ? clamp(Math.max(0, opening.sillHeight), 0, maxSill)
    : 0;

  return {
    ...opening,
    position,
    width,
    height,
    sillHeight,
  };
};
