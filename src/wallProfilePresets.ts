import { createId, type ProfilePoint } from "./model";

export type WallProfilePreset =
  | "rectangle"
  | "slope-up"
  | "slope-down"
  | "gable-center"
  | "gable-left"
  | "gable-right"
  | "step-up"
  | "step-down";

const riseFor = (height: number) => Math.max(0.8, Math.min(1.8, height * 0.45));

const point = (position: number, height: number): ProfilePoint => ({
  id: createId(),
  position,
  height,
});

export const wallProfileFromPreset = (
  preset: WallProfilePreset,
  length: number,
  baseHeight: number,
): ProfilePoint[] => {
  const safeLength = Math.max(0.2, length);
  const safeHeight = Math.max(0.5, baseHeight);
  const rise = riseFor(safeHeight);

  switch (preset) {
    case "slope-up":
      return [point(0, safeHeight), point(safeLength, safeHeight + rise)];
    case "slope-down":
      return [point(0, safeHeight + rise), point(safeLength, safeHeight)];
    case "gable-center":
      return [point(0, safeHeight), point(safeLength * 0.5, safeHeight + rise), point(safeLength, safeHeight)];
    case "gable-left":
      return [point(0, safeHeight), point(safeLength * 0.35, safeHeight + rise), point(safeLength, safeHeight)];
    case "gable-right":
      return [point(0, safeHeight), point(safeLength * 0.65, safeHeight + rise), point(safeLength, safeHeight)];
    case "step-up": {
      const step = safeLength * 0.55;
      return [
        point(0, safeHeight),
        point(step, safeHeight),
        point(step, safeHeight + rise),
        point(safeLength, safeHeight + rise),
      ];
    }
    case "step-down": {
      const step = safeLength * 0.45;
      return [
        point(0, safeHeight + rise),
        point(step, safeHeight + rise),
        point(step, safeHeight),
        point(safeLength, safeHeight),
      ];
    }
    case "rectangle":
    default:
      return [point(0, safeHeight), point(safeLength, safeHeight)];
  }
};

export const wallProfilePresetPoints = (preset: WallProfilePreset): Array<[number, number]> => {
  switch (preset) {
    case "slope-up": return [[0, 0.72], [1, 0.18]];
    case "slope-down": return [[0, 0.18], [1, 0.72]];
    case "gable-center": return [[0, 0.72], [0.5, 0.12], [1, 0.72]];
    case "gable-left": return [[0, 0.72], [0.35, 0.12], [1, 0.72]];
    case "gable-right": return [[0, 0.72], [0.65, 0.12], [1, 0.72]];
    case "step-up": return [[0, 0.72], [0.55, 0.72], [0.55, 0.2], [1, 0.2]];
    case "step-down": return [[0, 0.2], [0.45, 0.2], [0.45, 0.72], [1, 0.72]];
    case "rectangle":
    default: return [[0, 0.5], [1, 0.5]];
  }
};
