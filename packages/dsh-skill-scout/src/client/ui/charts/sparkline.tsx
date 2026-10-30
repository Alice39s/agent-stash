/**
 * 迷你趋势线（design.md 4.8）：没有坐标轴，只有折线与最后一个点的实心圆；排行行里 64×20，KPI 卡片里 80×24。
 * 宽度默认跟随容器；少于两个点时保持高度显示一行说明。可交互时指针或方向键选中一个点并弹出提示；
 * 放进可点的行之类的控件里时传 `interactive={false}`，只留读屏能读到的名称与各点的值。
 */
import { scaleLinear } from "d3-scale";
import { line } from "d3-shape";
import { useId, type ReactNode } from "react";
import styles from "./charts.module.css";
import { formatNumber } from "./format.ts";
import { ACCENT_COLOR } from "./theme.ts";
import {
  ChartEmpty,
  ChartTooltip,
  pathOf,
  useActivePoint,
  useElementWidth,
} from "./primitives.tsx";

/** 趋势线上的一个点，例如一周和这一周的次数。 */
export interface SparkPoint {
  readonly label: string;
  readonly value: number;
}

export interface SparklineProps {
  /** 按时间先后排列。 */
  readonly points: readonly SparkPoint[];
  /** 读屏读到的图片名称（度量与范围），也是提示里数值一行的名称。 */
  readonly label: string;
  /** 少于两个点时显示的一行说明。 */
  readonly empty: string;
  readonly height?: number;
  /** 固定宽度；不传时跟随容器宽度。 */
  readonly width?: number;
  /** 纵轴下限，默认 0（计数）。 */
  readonly min?: number;
  readonly color?: string;
  readonly formatValue?: (value: number) => string;
  /** 默认可以聚焦并弹出提示；放在别的控件里时设为 false。 */
  readonly interactive?: boolean;
}

/** 折线离边缘留的空白，放得下末端的圆点。 */
const PAD = 3;

export function Sparkline({
  points,
  label,
  empty,
  height = 24,
  width: fixedWidth,
  min = 0,
  color = ACCENT_COLOR,
  formatValue = formatNumber,
  interactive = true,
}: SparklineProps): ReactNode {
  const [ref, width] = useElementWidth<HTMLSpanElement>(fixedWidth);
  const { active, point, clear, enter, keys } = useActivePoint(
    interactive ? points.length : 0,
    "last",
    "x",
  );
  const titleId = useId();
  const descId = useId();
  const tipId = useId();

  const values = points.map((entry) => entry.value);
  const x = scaleLinear()
    .domain([0, points.length - 1])
    .range([PAD, width - PAD]);
  const y = scaleLinear()
    .domain([min, Math.max(min + 1, ...values)])
    .range([height - PAD, PAD]);
  const lastIndex = points.length - 1;
  const last = points[lastIndex];
  const current = active === null ? undefined : points[active];

  let body: ReactNode = null;
  if (points.length < 2 || last === undefined) {
    body = <ChartEmpty height={height} text={empty} />;
  } else if (width > 0) {
    const stroke = pathOf(
      line<number>()
        .x((_, index) => x(index))
        .y((value) => y(value))(values),
    );
    body = (
      <svg
        className={styles.svg}
        width={width}
        height={height}
        role="img"
        aria-labelledby={titleId}
        aria-describedby={current === undefined ? descId : `${descId} ${tipId}`}
        tabIndex={interactive ? 0 : undefined}
        onFocus={interactive ? enter : undefined}
        onBlur={interactive ? clear : undefined}
        onKeyDown={interactive ? keys : undefined}
        onPointerLeave={interactive ? clear : undefined}
      >
        <title id={titleId}>{label}</title>
        <desc id={descId}>
          {points.map((entry) => `${entry.label} ${formatValue(entry.value)}`).join(", ")}
        </desc>
        <path className={styles.sparkLine} d={stroke} style={{ stroke: color }} />
        <circle
          className={styles.dot}
          data-point="last"
          cx={x(lastIndex)}
          cy={y(last.value)}
          r={2.5}
          style={{ fill: color }}
        />
        {active !== null && current !== undefined && (
          <circle
            className={styles.dot}
            data-point="active"
            cx={x(active)}
            cy={y(current.value)}
            r={3.5}
            style={{ fill: color }}
          />
        )}
        {interactive &&
          points.map((entry, index) => {
            // 每个点的感应区从它与前一个点的中点延伸到它与后一个点的中点。
            const from = index === 0 ? 0 : (x(index - 1) + x(index)) / 2;
            const to = index === lastIndex ? width : (x(index) + x(index + 1)) / 2;
            return (
              <rect
                key={entry.label}
                className={styles.hit}
                data-point-label={entry.label}
                x={from}
                width={to - from}
                height={height}
                onPointerMove={() => point(index)}
              />
            );
          })}
      </svg>
    );
  }

  return (
    <span
      ref={ref}
      className={`${styles.chart} ${styles.spark}`}
      data-chart="sparkline"
      style={{ minHeight: height }}
    >
      {body}
      {active !== null && current !== undefined && (
        <ChartTooltip
          id={tipId}
          content={{ title: current.label, rows: [{ label, value: formatValue(current.value) }] }}
          anchor={{ x: x(active), y: height + 4, flip: x(active) > width * 0.6 }}
        />
      )}
    </span>
  );
}
