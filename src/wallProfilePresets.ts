import { createId, type ProfilePoint } from "./model";

export type WallProfilePreset =
  | "rectangle"
  | "slope-up"
  | "slope-down"
  | "gable-center"
  | "gable-left"
  | "gable-right"
  | "step-up"
  | "step-down"
  | "parapet-left"
  | "parapet-right"
  | "double-step"
  | "truncated-gable"
  | "butterfly"
  | "shed"
  | "double-shed"
  | "arch";

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
    case "parapet-left": {
      const edge = safeLength * 0.14;
      const parapet = rise * 0.55;
      return [
        point(0, safeHeight + parapet),
        point(edge, safeHeight + parapet),
        point(edge, safeHeight),
        point(safeLength, safeHeight),
      ];
    }
    case "parapet-right": {
      const edge = safeLength * 0.86;
      const parapet = rise * 0.55;
      return [
        point(0, safeHeight),
        point(edge, safeHeight),
        point(edge, safeHeight + parapet),
        point(safeLength, safeHeight + parapet),
      ];
    }
    case "double-step": {
      const first = safeLength * 0.32;
      const second = safeLength * 0.68;
      return [
        point(0, safeHeight),
        point(first, safeHeight),
        point(first, safeHeight + rise * 0.45),
        point(second, safeHeight + rise * 0.45),
        point(second, safeHeight + rise),
        point(safeLength, safeHeight + rise),
      ];
    }
    case "truncated-gable":
      return [
        point(0, safeHeight),
        point(safeLength * 0.36, safeHeight + rise),
        point(safeLength * 0.64, safeHeight + rise),
        point(safeLength, safeHeight),
      ];
    case "butterfly":
      return [
        point(0, safeHeight + rise),
        point(safeLength * 0.5, safeHeight),
        point(safeLength, safeHeight + rise),
      ];
    case "shed": {
      const drop = safeLength * 0.62;
      return [
        point(0, safeHeight),
        point(drop, safeHeight + rise),
        point(drop, safeHeight),
        point(safeLength, safeHeight + rise * 0.58),
      ];
    }
    case "double-shed": {
      const first = safeLength * 0.3;
      const second = safeLength * 0.62;
      return [
        point(0, safeHeight),
        point(first, safeHeight + rise),
        point(first, safeHeight),
        point(second, safeHeight + rise),
        point(second, safeHeight),
        point(safeLength, safeHeight + rise * 0.8),
      ];
    }
    case "arch":
      return [
        point(0, safeHeight),
        point(safeLength * 0.125, safeHeight + rise * 0.45),
        point(safeLength * 0.25, safeHeight + rise * 0.75),
        point(safeLength * 0.5, safeHeight + rise),
        point(safeLength * 0.75, safeHeight + rise * 0.75),
        point(safeLength * 0.875, safeHeight + rise * 0.45),
        point(safeLength, safeHeight),
      ];
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
    case "parapet-left": return [[0, 0.25], [0.14, 0.25], [0.14, 0.58], [1, 0.58]];
    case "parapet-right": return [[0, 0.58], [0.86, 0.58], [0.86, 0.25], [1, 0.25]];
    case "double-step": return [[0, 0.72], [0.32, 0.72], [0.32, 0.5], [0.68, 0.5], [0.68, 0.18], [1, 0.18]];
    case "truncated-gable": return [[0, 0.72], [0.36, 0.16], [0.64, 0.16], [1, 0.72]];
    case "butterfly": return [[0, 0.18], [0.5, 0.74], [1, 0.18]];
    case "shed": return [[0, 0.72], [0.62, 0.16], [0.62, 0.72], [1, 0.4]];
    case "double-shed": return [[0, 0.72], [0.3, 0.14], [0.3, 0.72], [0.62, 0.14], [0.62, 0.72], [1, 0.26]];
    case "arch": return [[0, 0.72], [0.125, 0.47], [0.25, 0.28], [0.5, 0.12], [0.75, 0.28], [0.875, 0.47], [1, 0.72]];
    case "rectangle":
    default: return [[0, 0.5], [1, 0.5]];
  }
};
