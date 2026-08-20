export const OPENING_PLAN_MOVE_EVENT = "donut-energy-opening-plan-move";

export type OpeningPlanMoveDetail = {
  wallId: string;
  openingId: string;
  position: number;
};

export const emitOpeningPlanMove = (detail: OpeningPlanMoveDetail) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<OpeningPlanMoveDetail>(OPENING_PLAN_MOVE_EVENT, { detail }));
};
