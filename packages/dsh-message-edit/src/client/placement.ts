/**
 * 视口几何：Tooltip 气泡的定位，以及对话框遮罩点击的命中判断。
 *
 * 气泡规则取自宿主 `Tooltip`：默认在触发元素下方居中，留 8px 间距，与视口边缘至少留 12px；
 * 下方放不下而上方放得下时翻到上方。
 */

/** 触发元素与气泡之间的距离。 */
export const TOOLTIP_GAP = 8;
/** 气泡与视口边缘的最小距离。 */
export const TOOLTIP_MARGIN = 12;

export interface AnchorBox {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface TooltipPlacement {
  readonly left: number;
  readonly top: number;
  readonly side: "bottom" | "top";
}

export function placeTooltip(anchor: AnchorBox, bubble: Size, viewport: Size): TooltipPlacement {
  const center = (anchor.left + anchor.right) / 2;
  const left = Math.max(
    TOOLTIP_MARGIN,
    Math.min(center - bubble.width / 2, viewport.width - TOOLTIP_MARGIN - bubble.width),
  );
  const below = anchor.bottom + TOOLTIP_GAP;
  const above = anchor.top - TOOLTIP_GAP - bubble.height;
  const fitsBelow = below + bubble.height <= viewport.height - TOOLTIP_MARGIN;
  const fitsAbove = above >= TOOLTIP_MARGIN;
  return !fitsBelow && fitsAbove
    ? { left, top: above, side: "top" }
    : { left, top: below, side: "bottom" };
}

/** 点 (x, y) 是否在矩形之外；落在边上算在矩形内。 */
export function outsideBox(box: AnchorBox, x: number, y: number): boolean {
  return x < box.left || x > box.right || y < box.top || y > box.bottom;
}
