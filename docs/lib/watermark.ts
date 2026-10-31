import { container, image, text } from "takumi-js/helpers";
import type { Node } from "takumi-js";
import { repositoryUrl } from "./repository.ts";

/** 水印上的仓库地址：去掉协议，读者照着就能输入。 */
export const WATERMARK_TEXT = repositoryUrl.replace(/^https:\/\//u, "");

/** GitHub 标志（与 Fumadocs 仓库链接图标同一个路径），白色填充。 */
const GITHUB_MARK = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="#ffffff"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>',
)}`;

/** design.md「录屏水印」的取值，单位为 CSS 像素；录屏按 2 倍像素渲染。 */
export const watermarkStyle = {
  /** 角标离画面右边与底边的距离。 */
  inset: 12,
  /** 平铺层的旋转角度、相邻两条文字的横向与纵向间距、文字透明度。 */
  tileAngle: -24,
  tileStepX: 300,
  tileStepY: 120,
  tileOpacity: 0.05,
} as const;

function cornerBadge(): Node {
  return container({
    style: {
      position: "absolute",
      right: watermarkStyle.inset,
      bottom: watermarkStyle.inset,
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: "5px 10px 5px 8px",
      borderRadius: 8,
      backgroundColor: "rgb(15 17 21 / 0.64)",
      border: "0.5px solid rgb(255 255 255 / 0.16)",
      boxShadow: "0 2px 8px rgb(0 0 0 / 0.24)",
    },
    children: [
      image({
        src: GITHUB_MARK,
        width: 13,
        height: 13,
        style: { width: 13, height: 13, opacity: 0.9 },
      }),
      text(WATERMARK_TEXT, {
        fontSize: 12,
        lineHeight: 1.4,
        fontWeight: 500,
        color: "rgb(255 255 255 / 0.88)",
      }),
    ],
  });
}

function tiledLayer(width: number, height: number): Node {
  const { tileAngle, tileStepX, tileStepY, tileOpacity } = watermarkStyle;
  // 旋转后的平铺面要盖住整个画面，边长取画面对角线再加一格。
  const side = Math.ceil(Math.hypot(width, height)) + tileStepX;
  const columns = Math.ceil(side / tileStepX) + 1;
  const rows = Math.ceil(side / tileStepY);
  const label = () =>
    text(WATERMARK_TEXT, {
      width: tileStepX,
      flexShrink: 0,
      fontSize: 14,
      lineHeight: 1,
      fontWeight: 600,
      color: `rgb(255 255 255 / ${String(tileOpacity)})`,
      textAlign: "center",
    });
  return container({
    style: {
      position: "absolute",
      left: (width - side) / 2,
      top: (height - side) / 2,
      width: side,
      height: side,
      display: "flex",
      flexDirection: "column",
      justifyContent: "space-between",
      transform: `rotate(${String(tileAngle)}deg)`,
    },
    children: Array.from({ length: rows }, (_, row) =>
      container({
        style: {
          display: "flex",
          // 相邻两行错开半格，文字排成斜向的网格而不是竖直的列。
          marginLeft: row % 2 === 0 ? -tileStepX / 2 : -tileStepX,
        },
        children: Array.from({ length: columns }, label),
      }),
    ),
  });
}

/**
 * 录屏水印的覆盖层：铺满画面的低透明度斜向文字，加右下角的仓库角标。背景透明，按画面的 CSS 尺寸排版。
 */
export function watermarkOverlay(width: number, height: number): Node {
  return container({
    style: { position: "relative", width, height, overflow: "hidden", display: "flex" },
    children: [tiledLayer(width, height), cornerBadge()],
  });
}
