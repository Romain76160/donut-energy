import { describe, expect, it } from "vitest";
import {
  addWindowDivider,
  defaultWindowDesign,
  normalizeWindowDesign,
  removeWindowDivider,
  updateWindowDivider,
} from "./windowDesigns";

describe("window drawing helpers", () => {
  it("starts double casement and sliding windows with a centre mullion", () => {
    expect(defaultWindowDesign("casement-2").dividers).toHaveLength(1);
    expect(defaultWindowDesign("casement-2").dividers[0]).toMatchObject({ orientation: "vertical", position: 0.5 });
    expect(defaultWindowDesign("sliding").dividers[0]).toMatchObject({ orientation: "vertical", position: 0.5 });
    expect(defaultWindowDesign("fixed").dividers).toEqual([]);
  });

  it("adds, moves and removes mullions while keeping them inside the frame", () => {
    const added = addWindowDivider({ dividers: [] }, "horizontal", 0.2);
    const id = added.dividers[0].id;
    expect(added.dividers[0]).toMatchObject({ orientation: "horizontal", position: 0.2 });

    const moved = updateWindowDivider(added, id, 2);
    expect(moved.dividers[0].position).toBe(0.94);
    expect(removeWindowDivider(moved, id).dividers).toEqual([]);
  });

  it("normalizes invalid divider positions", () => {
    const normalized = normalizeWindowDesign({
      dividers: [
        { id: "left", orientation: "vertical", position: -1 },
        { id: "top", orientation: "horizontal", position: 0 },
      ],
    });
    expect(normalized.dividers.map((divider) => divider.position)).toEqual([0.06, 0.06]);
  });
});
