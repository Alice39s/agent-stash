/**
 * 加载占位：照宿主插件页的 `.skeletonFill` 与 `.skeletonBar`，底色 `--dsw-alias-bg-skeleton`，整体缓慢明暗起伏，
 * 减少动态效果时静止。`Skeleton` 是一块占位，`SkeletonRows` 是列表首次加载时的三行占位。
 */
import type { ReactNode } from "react";
import styles from "./skeleton.module.css";

export interface SkeletonProps {
  /** 宽度；数字按像素，字符串原样写入（如 `"60%"`）。默认占满。 */
  readonly width?: number | string | undefined;
  /** 高度（像素）；默认 12，是一行文字的占位条。 */
  readonly height?: number | undefined;
  /** 圆角：`bar` 是文字条的小圆角，`block` 是图表等大块的圆角。 */
  readonly shape?: "bar" | "block";
  readonly className?: string | undefined;
}

/** 一块占位；屏幕阅读器跳过它，加载状态由外层的 `aria-busy` 或状态文字说明。 */
export function Skeleton({ width, height, shape = "bar", className }: SkeletonProps): ReactNode {
  return (
    <span
      className={className === undefined ? styles.fill : `${styles.fill} ${className}`}
      data-shape={shape}
      data-skeleton=""
      aria-hidden="true"
      style={{
        width: typeof width === "number" ? `${String(width)}px` : (width ?? "100%"),
        height: `${String(height ?? 12)}px`,
      }}
    />
  );
}

/** 列表首次加载：几行与列表行同样排版的占位（标记列、标题、一行元信息）。 */
export function SkeletonRows({ count = 3 }: { readonly count?: number }): ReactNode {
  return (
    <ul className={styles.rows} aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <li key={index} className={styles.row}>
          <Skeleton width={10} height={10} className={styles.marker} />
          <span className={styles.lines}>
            <span className={styles.line}>
              <Skeleton width={index % 2 === 0 ? "min(240px, 70%)" : "min(180px, 55%)"} />
            </span>
            <span className={styles.line}>
              <Skeleton width="min(140px, 40%)" />
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}
