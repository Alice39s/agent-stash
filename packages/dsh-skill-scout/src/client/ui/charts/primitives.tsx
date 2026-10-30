/**
 * 图表共用的部件（design.md 4.8）：跟随容器宽度的测量、指针与键盘共用的当前数据点、悬停提示、图例、
 * 读屏数据表、空状态、文字测量，以及数值轴（从 0 起、3 到 5 个刻度、在尾侧）与时间轴（按实测标签宽度取间隔，首尾两天贴两端）。
 */
import { scaleLinear, type ScaleLinear } from "d3-scale";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type RefObject,
} from "react";
import styles from "./charts.module.css";

/**
 * 元素的内容宽度（向下取整的像素）：挂载时读一次，之后跟随 ResizeObserver 更新。
 * 传入 `fixed` 时直接用它，不测量也不观察。
 */
export function useElementWidth<E extends HTMLElement>(
  fixed: number | undefined,
): readonly [RefObject<E>, number] {
  const ref = useRef<E>(null);
  const [measured, setMeasured] = useState(0);
  useLayoutEffect(() => {
    if (fixed !== undefined) return undefined;
    const element = ref.current;
    if (element === null) throw new Error("the measured element is not mounted");
    setMeasured(Math.floor(element.clientWidth));
    const observer = new ResizeObserver((entries) => {
      const last = entries.at(-1);
      if (last !== undefined) setMeasured(Math.floor(last.contentRect.width));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [fixed]);
  return [ref, fixed ?? measured];
}

/** 每个方向的方向键对应的移动步数。 */
const STEPS = {
  x: new Map([
    ["ArrowLeft", -1],
    ["ArrowRight", 1],
  ]),
  y: new Map([
    ["ArrowUp", -1],
    ["ArrowDown", 1],
  ]),
} as const;

/** 指针与键盘共用的当前数据点。 */
export interface ActivePoint {
  /** 当前数据点的下标；没有选中，或数据变短后超出范围时为 null。 */
  readonly active: number | null;
  /** 指针移到第 `index` 个数据点上。 */
  readonly point: (index: number) => void;
  readonly clear: () => void;
  /** 键盘聚焦绘图区：还没有当前数据点时选中起点。 */
  readonly enter: () => void;
  /** 方向键逐个移动，Home、End 跳到两端，Escape 收起提示。 */
  readonly keys: (event: KeyboardEvent) => void;
  /** 只处理 Escape：收起提示，不再往外传；没有提示时照常冒泡。 */
  readonly dismiss: (event: KeyboardEvent) => void;
}

/**
 * 当前数据点：`count` 是数据点个数，`start` 是键盘聚焦时的起点，
 * `axis` 决定用左右方向键（时间序列、横条）还是上下方向键（逐行排列的列表）移动。
 */
export function useActivePoint(
  count: number,
  start: "first" | "last",
  axis: "x" | "y",
): ActivePoint {
  const [chosen, setChosen] = useState<number | null>(null);
  const active = chosen !== null && chosen < count ? chosen : null;
  const origin = start === "first" ? 0 : count - 1;
  const clear = useCallback(() => setChosen(null), []);
  const dismiss = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || active === null) return;
    event.preventDefault();
    event.stopPropagation();
    setChosen(null);
  };
  const keys = (event: KeyboardEvent): void => {
    if (count === 0) return;
    const step = STEPS[axis].get(event.key);
    let next: number;
    if (step !== undefined) {
      next = active === null ? origin : Math.min(count - 1, Math.max(0, active + step));
    } else if (event.key === "Home") {
      next = 0;
    } else if (event.key === "End") {
      next = count - 1;
    } else {
      dismiss(event);
      return;
    }
    event.preventDefault();
    setChosen(next);
  };
  return {
    active,
    point: setChosen,
    clear,
    enter: () => {
      if (active === null && count > 0) setChosen(origin);
    },
    keys,
    dismiss,
  };
}

export interface TooltipRow {
  readonly label: string;
  readonly value: string;
  /** 色块的颜色；不传时这一行没有色块。 */
  readonly color?: string;
}

export interface TooltipContent {
  readonly title: string;
  readonly rows: readonly TooltipRow[];
}

/** 提示的锚点，相对绘图区；`x` 是像素或百分比，`flip` 时提示放在锚点左侧。 */
export interface TooltipAnchor {
  readonly x: number | string;
  readonly y: number;
  readonly flip: boolean;
}

/** 浮在图表上的提示，宿主 Tooltip 的材质；不传 `anchor` 时放在父元素下方、左端对齐。 */
export function ChartTooltip({
  id,
  content,
  anchor,
}: {
  readonly id: string;
  readonly content: TooltipContent;
  readonly anchor?: TooltipAnchor | undefined;
}): ReactNode {
  let side = "below";
  if (anchor !== undefined) side = anchor.flip ? "start" : "end";
  return (
    <div
      role="tooltip"
      id={id}
      className={styles.tooltip}
      data-side={side}
      style={anchor === undefined ? undefined : { left: anchor.x, top: anchor.y }}
    >
      <p className={styles.tooltipTitle}>{content.title}</p>
      {content.rows.map((row) => (
        <p key={row.label} className={styles.tooltipRow}>
          {row.color !== undefined && (
            <span className={styles.swatch} style={{ background: row.color }} aria-hidden="true" />
          )}
          <span className={styles.tooltipLabel}>{row.label}</span>
          <span className={styles.tooltipValue}>{row.value}</span>
        </p>
      ))}
    </div>
  );
}

export interface LegendItem {
  readonly key: string;
  readonly label: string;
  readonly color: string;
  /** 这个序列在显示范围内的合计。 */
  readonly total: string;
}

/**
 * 图例，放在绘图区上方：每个序列一个开关按钮，按下的序列显示在图里；
 * 指针或焦点停在按钮上时强调这个序列（`onEmphasis`），其他序列淡下去。
 */
export function ChartLegend({
  items,
  hidden,
  onToggle,
  onEmphasis,
}: {
  readonly items: readonly LegendItem[];
  readonly hidden: ReadonlySet<string>;
  readonly onToggle: (key: string) => void;
  readonly onEmphasis: (key: string | null) => void;
}): ReactNode {
  return (
    <div className={styles.legend}>
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          className={styles.legendItem}
          data-legend={item.key}
          aria-pressed={!hidden.has(item.key)}
          onClick={() => onToggle(item.key)}
          onPointerEnter={() => onEmphasis(item.key)}
          onPointerLeave={() => onEmphasis(null)}
          onFocus={() => onEmphasis(item.key)}
          onBlur={() => onEmphasis(null)}
        >
          <span className={styles.swatch} style={{ background: item.color }} aria-hidden="true" />
          {item.label}
          <span className={styles.legendTotal}>{item.total}</span>
        </button>
      ))}
    </div>
  );
}

/** 图例里被关掉的序列。 */
export function useHiddenKeys(): {
  readonly hidden: ReadonlySet<string>;
  readonly toggle: (key: string) => void;
} {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = useCallback((key: string) => {
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  return { hidden, toggle };
}

/** 序列的淡化标记：有强调的序列且不是它时淡到 0.35。 */
export function fadedBy(emphasis: string | null, key: string): true | undefined {
  return emphasis !== null && emphasis !== key ? true : undefined;
}

export interface TableCell {
  readonly key: string;
  readonly text: string;
}

export interface TableRow {
  readonly key: string;
  readonly header: string;
  readonly cells: readonly TableCell[];
}

/** 只给读屏看的数据表：每行一个数据点，每列一个序列。 */
export function ScreenReaderTable({
  caption,
  columns,
  rows,
}: {
  readonly caption: string;
  readonly columns: readonly TableCell[];
  readonly rows: readonly TableRow[];
}): ReactNode {
  return (
    <table className={styles.srOnly}>
      <caption>{caption}</caption>
      <thead>
        <tr>
          <td />
          {columns.map((column) => (
            <th key={column.key} scope="col">
              {column.text}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key}>
            <th scope="row">{row.header}</th>
            {row.cells.map((cell) => (
              <td key={cell.key}>{cell.text}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** 没有可画的值：保持图表高度，居中一行说明，不画坐标轴与图例。 */
export function ChartEmpty({
  height,
  text,
}: {
  readonly height: number;
  readonly text: string;
}): ReactNode {
  return (
    <p className={styles.empty} data-empty="" style={{ height }}>
      {text}
    </p>
  );
}

/** 数值轴：从 0 起，顶端取整，3 到 5 个整数刻度。 */
export interface ValueScale {
  readonly y: ScaleLinear<number, number>;
  readonly ticks: readonly number[];
}

/** 依次尝试的刻度数：d3 会把它当作近似值，挑出落在 3 到 5 个之间的那一种。 */
const TICK_COUNTS = [4, 5, 3, 2, 6] as const;

export function valueScale(top: number, height: number): ValueScale {
  const domainTop = Math.max(top, 2);
  let fallback: ValueScale | undefined;
  for (const count of TICK_COUNTS) {
    const y = scaleLinear().domain([0, domainTop]).range([height, 0]).nice(count);
    const ticks = y.ticks(count).filter((tick) => Number.isInteger(tick));
    const [, max] = y.domain();
    const fits = ticks.length >= 3 && ticks.length <= 5 && ticks.at(-1) === max;
    if (fits) return { y, ticks };
    fallback ??= { y, ticks };
  }
  if (fallback === undefined) throw new Error("no tick count was tried");
  return fallback;
}

/** 数值轴：每个刻度一条横贯绘图区的网格线，刻度标签在绘图区尾侧。 */
export function ValueAxis({
  scale,
  width,
  format,
}: {
  readonly scale: ValueScale;
  readonly width: number;
  readonly format: (value: number) => string;
}): ReactNode {
  return (
    <g>
      {scale.ticks.map((tick) => (
        <g key={tick} data-tick={tick} transform={`translate(0,${String(scale.y(tick))})`}>
          {tick !== 0 && <line className={styles.grid} x2={width} />}
          <text className={styles.tick} x={width + 6} dy="0.32em">
            {format(tick)}
          </text>
        </g>
      ))}
    </g>
  );
}

/**
 * 量文字宽度：把返回的回调 ref 挂到一个 SVG 元素上，元素里每个 `data-measure` 分组放几段与实际文字同样字体的
 * `<text>`，得到每组最宽的一段（像素）。`key` 标识这些文字：它变化时回调换新，React 用新回调重新量一次。
 * 还没量到当前 `key` 的文字时返回空表。
 */
export function useTextWidths(
  key: string,
): readonly [(element: SVGElement | null) => void, ReadonlyMap<string, number>] {
  const [measured, setMeasured] = useState<{
    readonly key: string;
    readonly widths: ReadonlyMap<string, number>;
  } | null>(null);
  const ref = useCallback(
    (element: SVGElement | null) => {
      if (element === null) return;
      const widths = new Map<string, number>();
      for (const group of element.querySelectorAll("[data-measure]")) {
        const lengths = [...group.children].flatMap((child) =>
          child instanceof SVGTextElement ? [child.getComputedTextLength()] : [],
        );
        widths.set(group.getAttribute("data-measure") ?? "", Math.max(0, ...lengths));
      }
      setMeasured({ key, widths });
    },
    [key],
  );
  return [ref, measured?.key === key ? measured.widths : EMPTY_WIDTHS];
}

const EMPTY_WIDTHS: ReadonlyMap<string, number> = new Map();

/** 时间轴两个相邻标签之间至少留的空隙。 */
const LABEL_GAP = 12;

/** 横轴上的一个标签：第几天、横坐标与对齐方式。 */
export interface AxisTick {
  readonly index: number;
  readonly x: number;
  readonly anchor: "start" | "middle" | "end";
}

/**
 * 时间轴的标签：第一天贴绘图区起点，最后一天贴终点，中间每隔固定天数一个，居中在那一天的柱子上。
 * 间隔取「最宽的标签 + 12px」能容下的天数；放不下的中间标签不画，首尾两个放不下时只留最后一天。
 * @param centers - 每天柱子中线的横坐标，等距。
 * @param width - 绘图区宽度。
 * @param labelWidth - 最宽的标签的实测宽度。
 */
export function axisTicks(
  centers: readonly number[],
  width: number,
  labelWidth: number,
): AxisTick[] {
  const last = centers.length - 1;
  if (last < 0) return [];
  const end: AxisTick = { index: last, x: width, anchor: "end" };
  if (last === 0 || 2 * labelWidth + LABEL_GAP > width) return [end];
  const step = (centers[1] ?? 0) - (centers[0] ?? 0);
  const every = Math.max(1, Math.ceil((labelWidth + LABEL_GAP) / step));
  const ticks: AxisTick[] = [{ index: 0, x: 0, anchor: "start" }];
  let right = labelWidth;
  const limit = width - labelWidth - LABEL_GAP;
  for (let index = every; index < last; index += every) {
    const center = centers[index] ?? 0;
    if (center - labelWidth / 2 >= right + LABEL_GAP && center + labelWidth / 2 <= limit) {
      ticks.push({ index, x: center, anchor: "middle" });
      right = center + labelWidth / 2;
    }
  }
  ticks.push(end);
  return ticks;
}

/** 横轴：绘图区底部的基线与标签；`keys`、`texts` 按天排列，标签取 `ticks` 指向的那几天。 */
export function BandAxis({
  ticks,
  keys,
  texts,
  top,
  width,
}: {
  readonly ticks: readonly AxisTick[];
  readonly keys: readonly string[];
  readonly texts: readonly string[];
  readonly top: number;
  readonly width: number;
}): ReactNode {
  return (
    <g transform={`translate(0,${String(top)})`}>
      <line className={styles.axis} x2={width} />
      {ticks.map((tick) => {
        const key = keys[tick.index] ?? String(tick.index);
        return (
          <text
            key={key}
            className={styles.tick}
            data-label={key}
            x={tick.x}
            y={14}
            textAnchor={tick.anchor}
          >
            {texts[tick.index]}
          </text>
        );
      })}
    </g>
  );
}

/** 量标签宽度用的隐藏文字：与刻度同样的字体，不占位、读屏不读。 */
export function MeasureTexts({
  name,
  texts,
  className,
}: {
  readonly name: string;
  readonly texts: readonly string[];
  /** 与实际文字相同的字体类名。 */
  readonly className: string | undefined;
}): ReactNode {
  return (
    <g data-measure={name} className={styles.measure} aria-hidden="true">
      {[...new Set(texts)].map((text) => (
        <text key={text} className={className}>
          {text}
        </text>
      ))}
    </g>
  );
}

/** SVG 路径生成器只在设置了 canvas context 时返回 null；这里没有 context，拿到 null 就是用错了。 */
export function pathOf(path: string | null): string {
  if (path === null) throw new Error("the shape generator returned no path");
  return path;
}
