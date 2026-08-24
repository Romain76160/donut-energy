import type { OpeningType } from "./model";

export type JoineryPlacementSelection = {
  openingType: OpeningType;
  windowTypeId?: string;
};

export type JoineryPlanPlaceDetail = {
  wallId: string;
  position: number;
  selection: JoineryPlacementSelection;
};

export const JOINERY_PLACEMENT_CHANGE_EVENT = "donut-energy-joinery-placement-change";
export const JOINERY_PLAN_PLACE_EVENT = "donut-energy-joinery-plan-place";

let currentSelection: JoineryPlacementSelection | null = null;

export const getJoineryPlacement = () => currentSelection;

export const setJoineryPlacement = (selection: JoineryPlacementSelection | null) => {
  currentSelection = selection ? { ...selection } : null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(JOINERY_PLACEMENT_CHANGE_EVENT, { detail: currentSelection }));
  }
};

export const emitJoineryPlanPlace = (detail: JoineryPlanPlaceDetail) => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(JOINERY_PLAN_PLACE_EVENT, { detail }));
  }
};
