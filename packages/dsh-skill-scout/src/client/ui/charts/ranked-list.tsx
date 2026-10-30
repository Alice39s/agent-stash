/**
 * 排行（design.md 4.8）：按数量排在前几位的条目，每行名称、数量与相对第一行的横条，尾侧可带 64×20 的迷你趋势线。
 * 传了 `select` 时每行是一个按钮。没有条目或数量都是 0 时显示一行说明。
 */
import type { ReactNode } from "react";
import styles from "./charts.module.css";
import { formatNumber } from "./format.ts";
import { ChartEmpty } from "./primitives.tsx";
import { Sparkline, type SparkPoint } from "./sparkline.tsx";

/** 排行里的一个条目。 */
export interface RankedItem {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** 这个条目自己的趋势线与它的名称（度量与范围）。 */
  readonly trend?: { readonly label: string; readonly points: readonly SparkPoint[] };
}

/** 点击一行时做的事；`label` 是这一行按钮的无障碍名称，例如「搜索 pnpm build」。 */
export interface RankedSelect {
  readonly label: (item: RankedItem) => string;
  readonly onSelect: (item: RankedItem) => void;
}

export interface RankedListProps {
  /** 按数量从大到小排列。 */
  readonly items: readonly RankedItem[];
  /** 列表名称（度量与范围）。 */
  readonly label: string;
  readonly empty: string;
  /** 最多显示的行数，默认 5。 */
  readonly limit?: number;
  readonly formatValue?: (value: number) => string;
  /** 名称是命令、错误一类的代码文字，用等宽字体。 */
  readonly code?: boolean;
  readonly select?: RankedSelect;
}

/** 趋势线在行里的尺寸。 */
const TREND = { width: 64, height: 20 } as const;

export function RankedList({
  items,
  label,
  empty,
  limit = 5,
  formatValue = formatNumber,
  code = false,
  select,
}: RankedListProps): ReactNode {
  const shown = items.slice(0, limit);
  const top = Math.max(0, ...shown.map((item) => item.value));

  const content = (item: RankedItem): ReactNode => (
    <>
      <span className={styles.rankLabel} data-code={code || undefined} title={item.label}>
        {item.label}
      </span>
      <span className={styles.rankValue}>{formatValue(item.value)}</span>
      <span className={styles.rankBar} aria-hidden="true">
        <span
          className={styles.rankFill}
          data-part="fill"
          style={{ width: `${String((item.value / top) * 100)}%` }}
        />
      </span>
      {item.trend !== undefined && (
        <span className={styles.rankTrend}>
          <Sparkline
            points={item.trend.points}
            label={item.trend.label}
            empty=""
            width={TREND.width}
            height={TREND.height}
            interactive={false}
          />
        </span>
      )}
    </>
  );

  return (
    <div className={styles.chart} data-chart="ranked">
      {top <= 0 ? (
        <ChartEmpty height={28} text={empty} />
      ) : (
        <ul className={styles.ranked} aria-label={label}>
          {shown.map((item) => (
            <li key={item.key} data-key={item.key}>
              {select === undefined ? (
                <div
                  className={styles.rankRow}
                  data-trend={item.trend === undefined ? undefined : ""}
                >
                  {content(item)}
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.rankRow}
                  data-trend={item.trend === undefined ? undefined : ""}
                  aria-label={select.label(item)}
                  onClick={() => select.onSelect(item)}
                >
                  {content(item)}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
