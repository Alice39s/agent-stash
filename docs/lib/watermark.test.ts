import type { Node } from "takumi-js";
import { describe, expect, test } from "vitest";
import { WATERMARK_TEXT, watermarkOverlay, watermarkStyle } from "./watermark.ts";

function children(node: Node): Node[] {
  return node.type === "container" ? (node.children ?? []) : [];
}

function texts(node: Node): string[] {
  return node.type === "text" ? [node.text] : children(node).flatMap(texts);
}

describe("watermarkOverlay", () => {
  test("names the repository without the URL scheme", () => {
    expect(WATERMARK_TEXT).toBe("github.com/Alice39s/agent-stash");
  });

  test("covers the frame and pins the badge to the bottom-right corner", () => {
    const [width, height] = [760, 496];
    const root = watermarkOverlay(width, height);
    expect(root.style).toMatchObject({ width, height, overflow: "hidden" });
    const [tiles, badge] = children(root);
    if (tiles === undefined || badge === undefined) throw new Error("overlay layers missing");

    expect(badge.style).toMatchObject({
      position: "absolute",
      right: watermarkStyle.inset,
      bottom: watermarkStyle.inset,
    });
    expect(texts(badge)).toEqual([WATERMARK_TEXT]);

    // 旋转后的平铺面以画面中心为圆心，边长不小于对角线，任何角度都盖住整个画面。
    const side = Number(tiles.style?.width);
    expect(side).toBeGreaterThanOrEqual(Math.hypot(width, height));
    expect(tiles.style).toMatchObject({
      left: (width - side) / 2,
      top: (height - side) / 2,
      transform: `rotate(${String(watermarkStyle.tileAngle)}deg)`,
    });
    const labels = texts(tiles);
    expect(labels.length).toBeGreaterThan((side / watermarkStyle.tileStepX) * 2);
    expect(new Set(labels)).toEqual(new Set([WATERMARK_TEXT]));
  });
});
