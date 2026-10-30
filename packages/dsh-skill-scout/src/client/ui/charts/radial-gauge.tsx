/**
 * 径向仪表：一个比例画成开口朝下的分段圆环，中间是百分比与一行说明。
 * 直径不超过 `size`，容器更窄时跟着缩小。传了 `details` 时可以聚焦，指针或键盘焦点在仪表上时弹出明细。
 */
import { arc, type DefaultArcObject } from "d3-shape";
import { useId, type ReactNode } from "react";
import styles from "./charts.module.css";
import { formatPercent } from "./format.ts";
import { ACCENT_COLOR } from "./theme.ts";
import {
  ChartEmpty,
  ChartTooltip,
  pathOf,
  useActivePoint,
  useElementWidth,
  type TooltipRow,
} from "./primitives.tsx";

export interface RadialGaugeProps {
  readonly value: number;
  /** 比例的分母；不大于 0 时显示空状态。 */
  readonly max: number;
  /** 读屏读到的图片名称，也是提示的标题。 */
  readonly label: string;
  readonly empty: string;
  /** 百分比下方的一行说明，例如「40 / 48」。 */
  readonly caption?: string;
  /** 提示里的明细；不传时不弹提示，也不能聚焦。 */
  readonly details?: readonly TooltipRow[];
  /** 最大直径。 */
  readonly size?: number;
  /** 圆环的段数。 */
  readonly segments?: number;
  readonly color?: string;
  /** 固定宽度；不传时跟随容器宽度。 */
  readonly width?: number;
}

/** 圆环从左下 -135° 顺时针走到右下 135°（0° 在正上方）。 */
const START = (-3 * Math.PI) / 4;
const END = (3 * Math.PI) / 4;
/** 相邻两段之间的间隙（像素）。 */
const GAP = 3;
const ARC = arc<DefaultArcObject>();

function arcPath(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): string {
  return pathOf(ARC({ innerRadius, outerRadius, startAngle, endAngle }));
}

export function RadialGauge({
  value,
  max,
  label,
  empty,
  caption,
  details,
  size = 160,
  segments = 10,
  color = ACCENT_COLOR,
  width: fixedWidth,
}: RadialGaugeProps): ReactNode {
  const [ref, width] = useElementWidth<HTMLDivElement>(fixedWidth);
  const { active, clear, enter, keys } = useActivePoint(
    details === undefined ? 0 : 1,
    "first",
    "x",
  );
  const titleId = useId();
  const descId = useId();
  const tipId = useId();
  if (!Number.isInteger(segments) || segments < 1) {
    throw new Error(
      `RadialGauge needs a positive whole number of segments, got ${String(segments)}`,
    );
  }

  const ratio = max > 0 ? value / max : 0;
  const share = Math.min(1, Math.max(0, ratio));
  const diameter = Math.min(width, size);
  const outer = Math.max(0, diameter / 2 - 1);
  const inner = outer * 0.76;
  const cx = diameter / 2;
  const cy = outer + 1;
  // 圆环最低处在中心下方 outer·sin45°。
  const height = Math.ceil(cy + outer * Math.SQRT1_2 + 2);
  const span = (END - START) / segments;
  const pad = outer > 0 ? GAP / ((outer + inner) / 2) : 0;
  const arcs = Array.from({ length: segments }, (_, index) => {
    const from = START + index * span + pad / 2;
    const to = START + (index + 1) * span - pad / 2;
    const part = Math.min(1, Math.max(0, share * segments - index));
    return {
      key: index,
      track: arcPath(inner, outer, from, to),
      fill: part > 0 ? arcPath(inner, outer, from, from + (to - from) * part) : null,
    };
  });
  const percent = formatPercent(ratio);

  return (
    <div ref={ref} className={`${styles.chart} ${styles.gauge}`} data-chart="gauge">
      {max <= 0 ? (
        <ChartEmpty height={Math.ceil(size * 0.86)} text={empty} />
      ) : (
        <div className={styles.plot} style={{ width: diameter, height }}>
          {diameter > 0 && (
            <svg
              className={styles.svg}
              width={diameter}
              height={height}
              role="img"
              aria-labelledby={titleId}
              aria-describedby={active === null ? descId : `${descId} ${tipId}`}
              tabIndex={details === undefined ? undefined : 0}
              onFocus={details === undefined ? undefined : enter}
              onBlur={details === undefined ? undefined : clear}
              onKeyDown={details === undefined ? undefined : keys}
              onPointerMove={details === undefined ? undefined : enter}
              onPointerLeave={details === undefined ? undefined : clear}
            >
              <title id={titleId}>{label}</title>
              <desc id={descId}>{caption === undefined ? percent : `${percent}, ${caption}`}</desc>
              <g transform={`translate(${String(cx)},${String(cy)})`}>
                {arcs.map((segment) => (
                  <g key={segment.key}>
                    <path className={styles.gaugeTrack} data-part="track" d={segment.track} />
                    {segment.fill !== null && (
                      <path data-part="fill" d={segment.fill} style={{ fill: color }} />
                    )}
                  </g>
                ))}
                <text className={styles.gaugeValue} y={caption === undefined ? 0 : -6}>
                  {percent}
                </text>
                {caption !== undefined && (
                  <text className={styles.gaugeCaption} y={16}>
                    {caption}
                  </text>
                )}
              </g>
            </svg>
          )}
          {active !== null && details !== undefined && (
            <ChartTooltip id={tipId} content={{ title: label, rows: details }} />
          )}
        </div>
      )}
    </div>
  );
}
