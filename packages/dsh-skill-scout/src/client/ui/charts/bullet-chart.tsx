/**
 * 子弹图：每个类别一行，横条是实际值，可以带一段背景区间（例如上一步的数量）与一条目标线（例如范围内的会话数），
 * 各行共用一个刻度。适合比例、漏斗与计数排行。
 * 容器宽度不足时名称单独占一行。指针或键盘选中一行时在这一行下方弹出提示；
 * 传了 `onSelect` 时每行是一个按钮，否则整张列表是一个焦点，用上下方向键逐行移动。
 */
import { scaleLinear } from "d3-scale";
import { useId, type ReactNode } from "react";
import styles from "./charts.module.css";
import { formatNumber } from "./format.ts";
import { ACCENT_COLOR } from "./theme.ts";
import {
  ChartEmpty,
  ChartTooltip,
  useActivePoint,
  useElementWidth,
  type TooltipContent,
  type TooltipRow,
} from "./primitives.tsx";

export interface BulletItem {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  /** 目标线的位置。 */
  readonly target?: number;
  /** 背景区间的终点，区间从 0 开始。 */
  readonly range?: number;
  /** 数值后面的附注，例如占第一步的比例。 */
  readonly note?: string;
  /** 横条的颜色，默认着重色。 */
  readonly color?: string;
}

/** 提示与读屏文字里各个量的名称。 */
export interface BulletNames {
  readonly value: string;
  /** 有一行带 `target` 时必填。 */
  readonly target?: string;
  /** 有一行带 `range` 时必填。 */
  readonly range?: string;
}

export interface BulletChartProps {
  readonly items: readonly BulletItem[];
  /** 列表的名称。 */
  readonly label: string;
  /** 没有行或所有量都是 0 时显示的文案。 */
  readonly empty: string;
  readonly names: BulletNames;
  /** 共用刻度的上限；默认取各行 value、target、range 里的最大值。 */
  readonly max?: number;
  readonly formatValue?: (value: number) => string;
  /** 传入时每行是一个按钮，点击时回调这一行的 key。 */
  readonly onSelect?: (key: string) => void;
  /** 固定宽度；不传时跟随容器宽度。 */
  readonly width?: number;
}

/** 容器窄于这个宽度时，名称单独占一行。 */
const STACK_BELOW = 360;

/** 某一量存在时它的名称必须给出。 */
function nameFor(name: string | undefined, field: "target" | "range"): string {
  if (name === undefined)
    throw new Error(`BulletChart needs names.${field} for items with a ${field}`);
  return name;
}

export function BulletChart({
  items,
  label,
  empty,
  names,
  max,
  formatValue = formatNumber,
  onSelect,
  width: fixedWidth,
}: BulletChartProps): ReactNode {
  const [ref, width] = useElementWidth<HTMLDivElement>(fixedWidth);
  const list = onSelect === undefined;
  const { active, point, clear, enter, keys, dismiss } = useActivePoint(items.length, "first", "y");
  const tipId = useId();

  const top =
    max ?? Math.max(0, ...items.flatMap((item) => [item.value, item.target ?? 0, item.range ?? 0]));
  const scale = scaleLinear().domain([0, top]).range([0, 100]).clamp(true);
  const percent = (value: number): string => `${String(scale(value))}%`;
  const layout = width > 0 && width < STACK_BELOW ? "stacked" : "inline";

  /** 一行的提示与读屏文字里的各个量。 */
  const figures = (item: BulletItem): TooltipRow[] => [
    { label: names.value, value: formatValue(item.value) },
    ...(item.target === undefined
      ? []
      : [{ label: nameFor(names.target, "target"), value: formatValue(item.target) }]),
    ...(item.range === undefined
      ? []
      : [{ label: nameFor(names.range, "range"), value: formatValue(item.range) }]),
  ];

  /** 一行的名称、横条与数值；目标与区间只画出来，读屏从隐藏的文字里读到。 */
  const line = (item: BulletItem): ReactNode => {
    const extra = figures(item).slice(1);
    return (
      <>
        <span className={styles.bulletLabel}>{item.label}</span>
        <span className={styles.bulletTrack} aria-hidden="true">
          {item.range !== undefined && (
            <span
              className={styles.bulletRange}
              data-part="range"
              style={{ width: percent(item.range) }}
            />
          )}
          <span
            className={styles.bulletFill}
            data-part="fill"
            style={{ width: percent(item.value), background: item.color ?? ACCENT_COLOR }}
          />
          {item.target !== undefined && (
            <span
              className={styles.bulletTarget}
              data-part="target"
              style={{ left: percent(item.target) }}
            />
          )}
        </span>
        <span className={styles.bulletValue}>
          {formatValue(item.value)}
          {item.note !== undefined && <span className={styles.bulletNote}>{item.note}</span>}
        </span>
        {extra.length > 0 && (
          <span className={styles.srOnly}>
            {extra.map((figure) => `${figure.label} ${figure.value}`).join(", ")}
          </span>
        )}
      </>
    );
  };

  const tip = (item: BulletItem): TooltipContent => ({ title: item.label, rows: figures(item) });

  return (
    <div ref={ref} className={styles.chart} data-chart="bullet" data-layout={layout}>
      {items.length === 0 || top <= 0 ? (
        <ChartEmpty height={28} text={empty} />
      ) : (
        <ul
          className={styles.bulletList}
          aria-label={label}
          aria-describedby={list && active !== null ? tipId : undefined}
          tabIndex={list ? 0 : undefined}
          onFocus={list ? enter : undefined}
          onBlur={list ? clear : undefined}
          onKeyDown={list ? keys : undefined}
          onPointerLeave={clear}
        >
          {items.map((item, index) => (
            <li
              key={item.key}
              className={styles.bulletRow}
              data-key={item.key}
              data-active={active === index || undefined}
            >
              {onSelect === undefined ? (
                <div className={styles.bulletLine} onPointerMove={() => point(index)}>
                  {line(item)}
                </div>
              ) : (
                <button
                  type="button"
                  className={styles.bulletLine}
                  aria-describedby={active === index ? tipId : undefined}
                  onClick={() => onSelect(item.key)}
                  onFocus={() => point(index)}
                  onBlur={clear}
                  onKeyDown={dismiss}
                  onPointerMove={() => point(index)}
                >
                  {line(item)}
                </button>
              )}
              {active === index && <ChartTooltip id={tipId} content={tip(item)} />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
