/**
 * 占比条（design.md 4.8）：一个整体在至多六个类别间的分布，画成一条 8px 的 100% 横条，轨道是悬停底色。
 * 图例在上方，只列有值的类别并带各自的数量，可以开关类别；不显示图例时（例如放在 KPI 卡片里）
 * 读屏仍能从描述里读到每一类的数量与占比。指针或方向键选中一段时弹出提示并淡化其他段。
 */
import { useId, useState, type ReactNode } from "react";
import styles from "./charts.module.css";
import { formatCompact, formatNumber, formatPercent } from "./format.ts";
import {
  ChartEmpty,
  ChartLegend,
  ChartTooltip,
  fadedBy,
  useActivePoint,
  useHiddenKeys,
} from "./primitives.tsx";

/** 占比条的一类。 */
export interface ShareSegment {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly color: string;
}

export interface ShareBarProps {
  /** 按显示顺序排列，至多六类。 */
  readonly segments: readonly ShareSegment[];
  /** 读屏读到的名称（度量与范围）。 */
  readonly label: string;
  /** 各类都是 0 时显示的一行说明。 */
  readonly empty: string;
  /** 默认在横条上方显示图例。 */
  readonly legend?: boolean;
  /** 提示与读屏描述里的数量，完整写出。 */
  readonly formatValue?: (value: number) => string;
  /** 图例里的数量，可以缩写。 */
  readonly formatLegend?: (value: number) => string;
}

/** 一条占比条至多的类别数。 */
const MAX_SEGMENTS = 6;

export function ShareBar({
  segments,
  label,
  empty,
  legend = true,
  formatValue = formatNumber,
  formatLegend = formatCompact,
}: ShareBarProps): ReactNode {
  const { hidden, toggle } = useHiddenKeys();
  const [emphasis, setEmphasis] = useState<string | null>(null);
  const present = segments.filter((segment) => segment.value > 0);
  const visible = present.filter((segment) => !hidden.has(segment.key));
  const { active, point, clear, enter, keys } = useActivePoint(visible.length, "first", "x");
  const descId = useId();
  const tipId = useId();
  if (segments.length > MAX_SEGMENTS) {
    throw new Error(
      `ShareBar shows at most ${String(MAX_SEGMENTS)} categories, got ${String(segments.length)}`,
    );
  }

  // 提示与读屏描述共用这一个合计：关掉一类图例后，横条、提示与描述里的占比一起变。
  const total = visible.reduce((sum, segment) => sum + segment.value, 0);
  const share = (value: number): number => (total > 0 ? value / total : 0);
  const current = active === null ? undefined : visible[active];
  const focused = current?.key ?? emphasis;

  let tooltip: ReactNode = null;
  if (active !== null && current !== undefined) {
    const before = visible.slice(0, active).reduce((sum, segment) => sum + share(segment.value), 0);
    const center = before + share(current.value) / 2;
    tooltip = (
      <ChartTooltip
        id={tipId}
        content={{
          title: current.label,
          rows: [
            {
              label: formatValue(current.value),
              value: formatPercent(share(current.value)),
              color: current.color,
            },
          ],
        }}
        anchor={{ x: `${String(center * 100)}%`, y: 12, flip: center > 0.6 }}
      />
    );
  }

  return (
    <div className={styles.chart} data-chart="share">
      {present.length === 0 ? (
        <ChartEmpty height={legend ? 36 : 20} text={empty} />
      ) : (
        <>
          {legend && (
            <ChartLegend
              items={present.map((segment) => ({
                key: segment.key,
                label: segment.label,
                color: segment.color,
                total: formatLegend(segment.value),
              }))}
              hidden={hidden}
              onToggle={toggle}
              onEmphasis={setEmphasis}
            />
          )}
          <div className={styles.plot}>
            <div
              className={styles.shareBar}
              role="img"
              aria-label={label}
              aria-describedby={tooltip === null ? descId : `${descId} ${tipId}`}
              tabIndex={0}
              onFocus={enter}
              onBlur={clear}
              onKeyDown={keys}
              onPointerLeave={clear}
            >
              {visible.map((segment, index) => (
                <span
                  key={segment.key}
                  className={`${styles.shareSegment} ${styles.series}`}
                  data-segment={segment.key}
                  data-faded={fadedBy(focused, segment.key)}
                  style={{
                    width: `${String(share(segment.value) * 100)}%`,
                    background: segment.color,
                  }}
                  onPointerMove={() => point(index)}
                />
              ))}
            </div>
            {tooltip}
          </div>
          <span id={descId} className={styles.srOnly}>
            {visible
              .map(
                (segment) =>
                  `${segment.label} ${formatValue(segment.value)} (${formatPercent(share(segment.value))})`,
              )
              .join(", ")}
          </span>
        </>
      )}
    </div>
  );
}
