import { createId, type OpeningType } from "./model";
import type { WindowOperation } from "./windowTypes";

export type WindowDividerOrientation = "vertical" | "horizontal";

export type WindowDivider = {
  id: string;
  orientation: WindowDividerOrientation;
  /** Relative position inside the glazed opening, from 0 to 1. */
  position: number;
};

export type WindowDesign = {
  dividers: WindowDivider[];
};

const STORAGE_KEY = "donut-energy-window-designs";

const clampPosition = (value: number) => Math.max(0.06, Math.min(0.94, Number.isFinite(value) ? value : 0.5));

export const normalizeWindowDesign = (value: Partial<WindowDesign> | null | undefined): WindowDesign => ({
  dividers: Array.isArray(value?.dividers)
    ? value!.dividers
      .filter((divider): divider is WindowDivider => Boolean(divider && (divider.orientation === "vertical" || divider.orientation === "horizontal")))
      .map((divider) => ({
        id: typeof divider.id === "string" && divider.id ? divider.id : createId(),
        orientation: divider.orientation,
        position: clampPosition(Number(divider.position)),
      }))
    : [],
});

const loadAll = (): Record<string, WindowDesign> => {
  if (typeof localStorage === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    if (!parsed || typeof parsed !== "object") return {};
    return Object.fromEntries(
      Object.entries(parsed).map(([id, value]) => [id, normalizeWindowDesign(value as Partial<WindowDesign>)]),
    );
  } catch {
    return {};
  }
};

const saveAll = (designs: Record<string, WindowDesign>) => {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(designs));
  } catch {
    // The editor remains usable in memory when storage is unavailable.
  }
};

export const defaultWindowDesign = (operation: WindowOperation): WindowDesign => {
  if (operation === "casement-2" || operation === "sliding") {
    return { dividers: [{ id: createId(), orientation: "vertical", position: 0.5 }] };
  }
  return { dividers: [] };
};

export const loadWindowDesign = (typeId: string, operation: WindowOperation): WindowDesign => {
  const stored = loadAll()[typeId];
  return stored ? normalizeWindowDesign(stored) : defaultWindowDesign(operation);
};

export const saveWindowDesign = (typeId: string, design: WindowDesign) => {
  const designs = loadAll();
  designs[typeId] = normalizeWindowDesign(design);
  saveAll(designs);
};

export const removeWindowDesign = (typeId: string) => {
  const designs = loadAll();
  delete designs[typeId];
  saveAll(designs);
};

export const addWindowDivider = (
  design: WindowDesign,
  orientation: WindowDividerOrientation,
  position: number,
): WindowDesign => ({
  dividers: [
    ...normalizeWindowDesign(design).dividers,
    { id: createId(), orientation, position: clampPosition(position) },
  ],
});

export const updateWindowDivider = (design: WindowDesign, id: string, position: number): WindowDesign => ({
  dividers: normalizeWindowDesign(design).dividers.map((divider) =>
    divider.id === id ? { ...divider, position: clampPosition(position) } : divider
  ),
});

export const removeWindowDivider = (design: WindowDesign, id: string): WindowDesign => ({
  dividers: normalizeWindowDesign(design).dividers.filter((divider) => divider.id !== id),
});

// Kept here so future door designers can share the same drawing primitives without changing persisted data.
export type JoineryDesignKind = Extract<OpeningType, "window">;
