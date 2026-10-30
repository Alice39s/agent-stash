/**
 * 按天的堆叠柱（design.md 4.8）：每天一根柱，各序列按传入顺序从下往上堆；可以叠一个同单位的阶梯面积。
 * 宽度跟随容器；时间轴每天一格，没有记录的日子留空，标签间隔按实测的最宽标签加 12px 选，首尾两天贴绘图区两端；
 * 数值轴从 0 起、3 到 5 个刻度、在尾侧。图例在上方，只列有值的序列并带合计，可以开关序列。
 * 指针停在某一天的某个序列上时弹出这一天的提示并淡化其他序列；方向键逐天移动提示。
 * 没有任何值时保持高度，只显示一行说明。
 */
import { scaleBand } from "d3-scale";
import { area, curveStepAfter, stack } from "d3-shape";
import { useId, useState, type PointerEvent, type ReactNode } from "react";
import styles from "./charts.module.css";
import { formatCompact, formatDay as defaultDay, formatNumber } from "./format.ts";
import {
  BandAxis,
  ChartEmpty,
  ChartLegend,
  ChartTooltip,
  axisTicks,
  fadedBy,
  MeasureTexts,
  pathOf,
  ScreenReaderTable,
  useActivePoint,
  useElementWidth,
  useHiddenKeys,
  useTextWidths,
  ValueAxis,
  valueScale,
  type TooltipRow,
} from "./primitives.tsx";

/** 一个序列：`key` 是数据行里的字段名。 */
export interface ChartSeries<K extends string> {
  readonly key: K;
  readonly label: string;
  readonly color: string;
}

/** 一天的数据：`day` 是 `YYYY-MM-DD`，其余字段是各序列这一天的值。 */
export type DayRow<K extends string> = { readonly day: string } & Readonly<Record<K, number>>;

export interface StackedBarAreaProps<K extends string, L extends string = never> {
  /** 按时间先后排列，每天一行，日期不重复。序列的字段名只从 `bars` 与 `overlay` 推断。 */
  readonly data: readonly DayRow<NoInfer<K | L>>[];
  /** 堆叠的序列，第一个在最下面。 */
  readonly bars: readonly ChartSeries<K>[];
  /** 与柱子同一单位的阶梯面积，铺满每天的整格。 */
  readonly overlay?: ChartSeries<L>;
  /** 图表名称（度量与范围）：读屏读到的图片名称与数据表标题。 */
  readonly label: string;
  /** 范围内没有任何值时显示的一行说明。 */
  readonly empty: string;
  /** 提示里合计一行的名称；不传时不显示合计。 */
  readonly totalLabel?: string;
  /** 绘图区高度：主图 180，卡片里的图 140。 */
  readonly height?: number;
  /** 固定宽度；不传时跟随容器宽度。 */
  readonly width?: number;
  /** 提示与数据表里的数值，完整写出。 */
  readonly formatValue?: (value: number) => string;
  /** 纵轴刻度与图例合计，可以缩写。 */
  readonly formatTick?: (value: number) => string;
  /** 横轴标签、提示标题与数据表的行名。 */
  readonly formatDay?: (day: string) => string;
}

const MARGIN = { top: 8, right: 40, bottom: 22, left: 0 } as const;

function valueOf<K extends string>(row: Readonly<Record<K, number>>, key: K): number {
  return row[key];
}

/** 阶梯面积的一个转折点。 */
interface Edge {
  readonly x: number;
  readonly value: number;
}

/** 每天的一格：`left` 是整格左端，`start` 是柱子左端，`center` 是柱子中线。 */
interface Slot {
  readonly day: string;
  readonly left: number;
  readonly start: number;
  readonly center: number;
}

export function StackedBarArea<K extends string, L extends string = never>({
  data,
  bars,
  overlay,
  label,
  empty,
  totalLabel,
  height = 180,
  width: fixedWidth,
  formatValue = formatNumber,
  formatTick = formatCompact,
  formatDay = defaultDay,
}: StackedBarAreaProps<K, L>): ReactNode {
  const [ref, width] = useElementWidth<HTMLDivElement>(fixedWidth);
  const { hidden, toggle } = useHiddenKeys();
  const [emphasis, setEmphasis] = useState<string | null>(null);
  const { active, point, clear, enter, keys } = useActivePoint(data.length, "last", "x");
  const titleId = useId();
  const tipId = useId();

  const days = data.map((row) => row.day);
  if (new Set(days).size !== days.length) throw new Error("StackedBarArea needs one row per day");
  const totalOf = (key: K | L): number => data.reduce((sum, row) => sum + valueOf(row, key), 0);
  const series: readonly ChartSeries<K | L>[] = overlay === undefined ? bars : [...bars, overlay];
  const present = series.filter((entry) => totalOf(entry.key) > 0);
  const dayLabels = days.map(formatDay);
  const [measureRef, measured] = useTextWidths(dayLabels.join("\n"));
  const labelWidth = measured.get("day") ?? 0;

  const visible = bars.filter((bar) => !hidden.has(bar.key) && totalOf(bar.key) > 0);
  const shown =
    overlay !== undefined && !hidden.has(overlay.key) && totalOf(overlay.key) > 0
      ? overlay
      : undefined;

  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);
  const x = scaleBand().domain(days).range([0, innerWidth]).paddingInner(0.25).paddingOuter(0.125);
  const step = x.step();
  const band = x.bandwidth();
  const slots: Slot[] = days.map((day) => {
    const start = x(day);
    if (start === undefined) throw new Error(`no band for ${day}`);
    return { day, left: start - (step - band) / 2, start, center: start + band / 2 };
  });
  const layers = stack<DayRow<K | L>, K>()
    .keys(visible.map((bar) => bar.key))
    .value((row, key) => valueOf(row, key))(data);
  const overlayValues = shown === undefined ? [] : data.map((row) => valueOf(row, shown.key));
  const top = Math.max(
    0,
    ...layers.flatMap((layer) => layer.map((entry) => entry[1])),
    ...overlayValues,
  );
  const scale = valueScale(top, innerHeight);
  const { y } = scale;

  const colorOf = new Map(visible.map((bar) => [bar.key, bar.color]));
  // 从下往上画；一天里已经有段落的，上面的段落底部让出 1px，露出卡片底色当作缝。
  const stacked = new Set<number>();
  const groups = layers.map((layer) => ({
    key: layer.key,
    color: colorOf.get(layer.key),
    rects: layer.flatMap((entry, index) => {
      const slot = slots[index];
      if (slot === undefined || entry[1] === entry[0]) return [];
      const full = y(entry[0]) - y(entry[1]);
      const drawn = stacked.has(index) ? Math.max(0, full - 1) : full;
      stacked.add(index);
      return [{ day: slot.day, x: slot.start, y: y(entry[1]), height: drawn }];
    }),
  }));

  let overlayFill: string | null = null;
  let overlayLine: string | null = null;
  if (shown !== undefined) {
    // 阶梯面积：每天的值铺满这一天的整格，末尾补一个点收住最后一格。
    const edges: Edge[] = slots.map((slot, index) => ({
      x: slot.left,
      value: overlayValues[index] ?? 0,
    }));
    const last = edges.at(-1);
    if (last !== undefined) edges.push({ x: last.x + step, value: last.value });
    const shape = area<Edge>()
      .x((edge) => edge.x)
      .y0(innerHeight)
      .y1((edge) => y(edge.value))
      .curve(curveStepAfter);
    overlayFill = pathOf(shape(edges));
    overlayLine = pathOf(shape.lineY1()(edges));
  }

  /** 指针所在的序列：按指针高度在这一天的堆叠里找。 */
  const pointAt = (index: number, event: PointerEvent<SVGRectElement>): void => {
    point(index);
    const svg = event.currentTarget.ownerSVGElement;
    if (svg === null) throw new Error("the hit area is outside the chart");
    const value = y.invert(event.clientY - svg.getBoundingClientRect().top - MARGIN.top);
    const hit = layers.find((layer) => {
      const entry = layer[index];
      return entry !== undefined && entry[0] <= value && value < entry[1];
    });
    setEmphasis(hit?.key ?? null);
  };
  const leave = (): void => {
    clear();
    setEmphasis(null);
  };

  const activeSlot = active === null ? undefined : slots[active];
  const activeRow = active === null ? undefined : data[active];
  let tooltip: ReactNode = null;
  if (activeSlot !== undefined && activeRow !== undefined) {
    const shownSeries: readonly ChartSeries<K | L>[] =
      shown === undefined ? visible.toReversed() : [...visible.toReversed(), shown];
    const rows: TooltipRow[] = shownSeries
      .filter((entry) => valueOf(activeRow, entry.key) !== 0)
      .map((entry) => ({
        label: entry.label,
        value: formatValue(valueOf(activeRow, entry.key)),
        color: entry.color,
      }));
    if (totalLabel !== undefined) {
      const total = visible.reduce((sum, bar) => sum + valueOf(activeRow, bar.key), 0);
      rows.push({ label: totalLabel, value: formatValue(total) });
    }
    const anchorX = MARGIN.left + activeSlot.center;
    tooltip = (
      <ChartTooltip
        id={tipId}
        content={{ title: formatDay(activeSlot.day), rows }}
        anchor={{ x: anchorX, y: MARGIN.top, flip: anchorX > width * 0.6 }}
      />
    );
  }

  return (
    <div ref={ref} className={styles.chart} data-chart="stacked">
      {present.length === 0 ? (
        <ChartEmpty height={height} text={empty} />
      ) : (
        <>
          <ChartLegend
            items={present.map((entry) => ({
              key: entry.key,
              label: entry.label,
              color: entry.color,
              total: formatTick(totalOf(entry.key)),
            }))}
            hidden={hidden}
            onToggle={toggle}
            onEmphasis={setEmphasis}
          />
          <div className={styles.plot} style={{ height }}>
            {width > 0 && (
              <svg
                ref={measureRef}
                className={styles.svg}
                width={width}
                height={height}
                role="img"
                aria-labelledby={titleId}
                aria-describedby={tooltip === null ? undefined : tipId}
                tabIndex={0}
                onFocus={enter}
                onBlur={clear}
                onKeyDown={keys}
                onPointerLeave={leave}
              >
                <title id={titleId}>{label}</title>
                <g transform={`translate(${String(MARGIN.left)},${String(MARGIN.top)})`}>
                  <ValueAxis scale={scale} width={innerWidth} format={formatTick} />
                  {activeSlot !== undefined && (
                    <rect
                      className={styles.hover}
                      data-hover={activeSlot.day}
                      x={activeSlot.left}
                      width={step}
                      height={innerHeight}
                    />
                  )}
                  {groups.map((group) => (
                    <g
                      key={group.key}
                      className={styles.series}
                      data-series={group.key}
                      data-faded={fadedBy(emphasis, group.key)}
                      style={{ fill: group.color }}
                    >
                      {group.rects.map((rect) => (
                        <rect
                          key={rect.day}
                          x={rect.x}
                          y={rect.y}
                          width={band}
                          height={rect.height}
                        />
                      ))}
                    </g>
                  ))}
                  {overlayFill !== null && overlayLine !== null && shown !== undefined && (
                    <g
                      className={styles.series}
                      data-series={shown.key}
                      data-faded={fadedBy(emphasis, shown.key)}
                    >
                      <path
                        className={styles.overlayArea}
                        data-overlay="area"
                        d={overlayFill}
                        style={{ fill: shown.color }}
                      />
                      <path
                        className={styles.overlayLine}
                        data-overlay="line"
                        d={overlayLine}
                        style={{ stroke: shown.color }}
                      />
                    </g>
                  )}
                  <BandAxis
                    top={innerHeight}
                    width={innerWidth}
                    ticks={axisTicks(
                      slots.map((slot) => slot.center),
                      innerWidth,
                      labelWidth,
                    )}
                    keys={days}
                    texts={dayLabels}
                  />
                  <MeasureTexts name="day" texts={dayLabels} className={styles.tick} />
                  {slots.map((slot, index) => (
                    <rect
                      key={slot.day}
                      className={styles.hit}
                      data-day={slot.day}
                      x={slot.left}
                      width={step}
                      height={innerHeight}
                      onPointerMove={(event) => pointAt(index, event)}
                    />
                  ))}
                </g>
              </svg>
            )}
            {tooltip}
          </div>
          <ScreenReaderTable
            caption={label}
            columns={series.map((entry) => ({ key: entry.key, text: entry.label }))}
            rows={data.map((row) => ({
              key: row.day,
              header: formatDay(row.day),
              cells: series.map((entry) => ({
                key: entry.key,
                text: formatValue(valueOf(row, entry.key)),
              })),
            }))}
          />
        </>
      )}
    </div>
  );
}
