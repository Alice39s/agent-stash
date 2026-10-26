import { describe, expect, test } from "vitest";
import { outsideBox, placeTooltip, TOOLTIP_GAP, TOOLTIP_MARGIN } from "./placement.ts";

const VIEWPORT = { width: 800, height: 600 };
const BUBBLE = { width: 100, height: 26 };

describe("placeTooltip", () => {
  test("centers the bubble below the anchor with the gap", () => {
    const anchor = { left: 300, right: 328, top: 10, bottom: 38 };
    expect(placeTooltip(anchor, BUBBLE, VIEWPORT)).toEqual({
      left: 264,
      top: 38 + TOOLTIP_GAP,
      side: "bottom",
    });
  });

  test("keeps the viewport margin at both horizontal edges", () => {
    expect(placeTooltip({ left: 0, right: 28, top: 10, bottom: 38 }, BUBBLE, VIEWPORT).left).toBe(
      TOOLTIP_MARGIN,
    );
    expect(
      placeTooltip({ left: 780, right: 800, top: 10, bottom: 38 }, BUBBLE, VIEWPORT).left,
    ).toBe(800 - TOOLTIP_MARGIN - BUBBLE.width);
  });

  test("flips above the anchor when only the space above fits", () => {
    const anchor = { left: 300, right: 328, top: 560, bottom: 588 };
    expect(placeTooltip(anchor, BUBBLE, VIEWPORT)).toMatchObject({
      top: 560 - TOOLTIP_GAP - BUBBLE.height,
      side: "top",
    });
  });

  test("stays below when neither side fits", () => {
    const tall = { width: 100, height: 590 };
    expect(placeTooltip({ left: 300, right: 328, top: 5, bottom: 30 }, tall, VIEWPORT).side).toBe(
      "bottom",
    );
  });
});

describe("outsideBox", () => {
  const CARD = { left: 100, right: 300, top: 50, bottom: 250 };

  test("treats points on the card and its edges as inside", () => {
    expect(outsideBox(CARD, 200, 150)).toBe(false);
    expect(outsideBox(CARD, 100, 250)).toBe(false);
  });

  test("treats points beyond any edge as outside", () => {
    expect(outsideBox(CARD, 99, 150)).toBe(true);
    expect(outsideBox(CARD, 301, 150)).toBe(true);
    expect(outsideBox(CARD, 200, 49)).toBe(true);
    expect(outsideBox(CARD, 200, 251)).toBe(true);
  });
});
