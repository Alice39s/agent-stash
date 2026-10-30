// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { button, click, mount, press } from "../../testing.tsx";
import { axisTicks } from "./primitives.tsx";
import { StackedBarArea } from "./stacked-bar-area.tsx";
import {
  blur,
  driveResize,
  enter,
  focus,
  hover,
  leave,
  measureText,
  tooltipText,
} from "./testing.tsx";
import { OUTCOME_COLORS, OUTCOME_ORDER, OVERLAY_COLOR } from "./theme.ts";

const DAYS = [
  { day: "2026-10-28", low: 4, high: 1, scans: 9 },
  { day: "2026-10-29", low: 6, high: 2, scans: 12 },
  { day: "2026-10-30", low: 2, high: 5, scans: 8 },
];

const BARS = [
  { key: "low", label: "Low", color: "var(--test-low)" },
  { key: "high", label: "High", color: "var(--test-high)" },
] as const;

const SCANS = { key: "scans", label: "Scans", color: OVERLAY_COLOR } as const;

let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function render(node: ReactNode): Promise<HTMLElement> {
  const mounted = await mount(node);
  unmount = mounted.unmount;
  return mounted.container;
}

function svgOf(root: HTMLElement): SVGSVGElement {
  const svg = root.querySelector("svg");
  if (svg === null) throw new Error("没有绘图区");
  return svg;
}

function bars(root: HTMLElement, series?: string): SVGRectElement[] {
  const selector = series === undefined ? "g[data-series] rect" : `g[data-series="${series}"] rect`;
  return [...root.querySelectorAll<SVGRectElement>(selector)];
}

function attr(element: Element | undefined, name: string): number {
  if (element === undefined) throw new Error(`没有元素读取 ${name}`);
  return Number(element.getAttribute(name));
}

/** 时间轴标签的文字与左右边界（按 `measureText` 的替身宽度与 `text-anchor` 算）。 */
function labelBoxes(root: HTMLElement) {
  return [...root.querySelectorAll<SVGTextElement>("[data-label]")].map((label) => {
    const width = label.getComputedTextLength();
    const x = Number(label.getAttribute("x"));
    const anchor = label.getAttribute("text-anchor");
    const left = anchor === "start" ? x : anchor === "end" ? x - width : x - width / 2;
    return { text: label.textContent, anchor, x, left, right: left + width };
  });
}

/** 相邻两个标签之间的空隙。 */
function gaps(boxes: readonly { readonly left: number; readonly right: number }[]): number[] {
  return boxes.slice(1).map((box, index) => box.left - (boxes[index]?.right ?? 0));
}

const MONTH = Array.from({ length: 30 }, (_, index) => ({
  day: `2026-10-${String(index + 1).padStart(2, "0")}`,
  low: index % 4,
  high: 1,
}));

function chineseDay(day: string): string {
  const [, month = "", date = ""] = day.split("-");
  return `${String(Number(month))}月${String(Number(date))}日`;
}

function legend(root: HTMLElement): (string | null)[] {
  return [...root.querySelectorAll("[data-legend]")].map((item) => item.textContent);
}

describe("StackedBarArea", () => {
  test("stacks one bar per non-zero value from the bottom with a 1px gap between segments", async () => {
    const root = await render(
      <StackedBarArea
        data={[...DAYS, { day: "2026-10-31", low: 3, high: 0, scans: 1 }]}
        bars={BARS}
        label="Events per day"
        empty="No events"
        width={500}
        height={220}
      />,
    );
    expect(bars(root)).toHaveLength(7);
    expect(bars(root, "high")).toHaveLength(3);
    const [low] = bars(root, "low");
    const [high] = bars(root, "high");
    // 绘图区高 220 - 8 - 22 = 190，最下面的序列从基线长起，上面的序列底部让出 1px 露出底色。
    expect(attr(low, "y") + attr(low, "height")).toBeCloseTo(190);
    expect(attr(high, "y") + attr(high, "height")).toBeCloseTo(attr(low, "y") - 1);
    expect(root.querySelector('g[data-series="low"]')?.getAttribute("style")).toContain(
      "var(--test-low)",
    );
  });

  test("starts the value axis at zero with three to five ticks on the trailing side", async () => {
    const root = await render(
      <StackedBarArea
        data={DAYS}
        bars={BARS}
        label="Events per day"
        empty="No events"
        width={500}
      />,
    );
    const ticks = [...root.querySelectorAll("[data-tick]")];
    expect(ticks.map((tick) => tick.getAttribute("data-tick"))).toEqual(["0", "2", "4", "6", "8"]);
    // 绘图区宽 500 - 40 = 460，刻度标签在它右侧 6px。
    expect(ticks.map((tick) => tick.querySelector("text")?.getAttribute("x"))).toEqual(
      Array(5).fill("466"),
    );
  });

  test("names the chart image with its title", async () => {
    const root = await render(
      <StackedBarArea
        data={DAYS}
        bars={BARS}
        label="Events per day"
        empty="No events"
        width={500}
      />,
    );
    const svg = svgOf(root);
    expect(svg.getAttribute("role")).toBe("img");
    const title = svg.querySelector("title");
    expect(title?.textContent).toBe("Events per day");
    expect(svg.getAttribute("aria-labelledby")).toBe(title?.id);
  });

  test("draws the overlay as steps whose neighbouring points share x or y", async () => {
    const root = await render(
      <StackedBarArea
        data={DAYS}
        bars={BARS}
        overlay={SCANS}
        label="Events per day"
        empty="No events"
        width={500}
        height={220}
      />,
    );
    const path = root.querySelector('[data-overlay="area"]')?.getAttribute("d") ?? "";
    const points = [...path.matchAll(/(-?[\d.]+),(-?[\d.]+)/gu)].map((match) => [
      Number(match[1]),
      Number(match[2]),
    ]);
    expect(points.length).toBeGreaterThan(4);
    points.slice(1).forEach(([x, y], index) => {
      const [px, py] = points[index] ?? [Number.NaN, Number.NaN];
      expect(x === px || y === py).toBe(true);
    });
    expect(root.querySelector('[data-overlay="line"]')?.getAttribute("style")).toContain(
      "var(--dsw-alias-label-secondary)",
    );
  });

  test("lists only series with values in the legend, each with its total", async () => {
    const root = await render(
      <StackedBarArea
        data={DAYS.map((row) => ({ ...row, high: 0 }))}
        bars={BARS}
        overlay={SCANS}
        label="Events per day"
        empty="No events"
        width={500}
      />,
    );
    expect(legend(root)).toEqual(["Low12", "Scans29"]);
    expect(bars(root, "high")).toHaveLength(0);
  });

  test("hides a series when its legend button is turned off", async () => {
    const root = await render(
      <StackedBarArea
        data={DAYS}
        bars={BARS}
        label="Events per day"
        empty="No events"
        width={500}
      />,
    );
    const toggle = button(/^High/u, root);
    expect(toggle.getAttribute("aria-pressed")).toBe("true");
    await click(toggle);
    expect(toggle.getAttribute("aria-pressed")).toBe("false");
    expect(bars(root, "high")).toHaveLength(0);
    expect(bars(root, "low")).toHaveLength(3);
    await click(toggle);
    expect(bars(root, "high")).toHaveLength(3);
  });

  test("fades the other series while the pointer or focus rests on a legend item", async () => {
    const root = await render(
      <StackedBarArea
        data={DAYS}
        bars={BARS}
        label="Events per day"
        empty="No events"
        width={500}
      />,
    );
    const faded = (): (string | null)[] =>
      [...root.querySelectorAll("g[data-series][data-faded]")].map((group) =>
        group.getAttribute("data-series"),
      );
    expect(faded()).toEqual([]);
    await enter(button(/^High/u, root));
    expect(faded()).toEqual(["low"]);
    await focus(button(/^Low/u, root));
    expect(faded()).toEqual(["high"]);
    await blur(button(/^Low/u, root));
    expect(faded()).toEqual([]);
  });

  test("keeps the height and shows one line instead of axes and legend when every value is zero", async () => {
    const zeros = DAYS.map((row) => ({ ...row, low: 0, high: 0, scans: 0 }));
    const root = await render(
      <StackedBarArea
        data={zeros}
        bars={BARS}
        overlay={SCANS}
        label="Events per day"
        empty="No events"
        height={140}
        width={500}
      />,
    );
    expect(root.textContent).toBe("No events");
    expect(root.querySelector("svg")).toBeNull();
    expect(root.querySelector("button")).toBeNull();
    expect(root.querySelector<HTMLElement>("[data-empty]")?.style.height).toBe("140px");
    unmount?.();
    const none = await render(
      <StackedBarArea data={[]} bars={BARS} label="Events per day" empty="No events" />,
    );
    expect(none.textContent).toBe("No events");
  });

  test("rejects two rows for the same day", async () => {
    // React 把渲染时抛出的错误再打印一遍；这里只看抛出的错误本身。
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const row = { day: "2026-10-28", low: 1, high: 1 };
    await expect(
      render(
        <StackedBarArea
          data={[row, row]}
          bars={BARS}
          label="Events per day"
          empty="No events"
          width={500}
        />,
      ),
    ).rejects.toThrow("one row per day");
  });

  test("follows the container width and anchors the first and last day to the plot ends", async () => {
    measureText();
    const driver = driveResize();
    const root = await render(
      <StackedBarArea data={MONTH} bars={BARS} label="Events per day" empty="No events" />,
    );
    expect(root.querySelector("svg")).toBeNull();
    expect(driver.observed()).toBe(1);
    // 绘图区宽 width - 40：第一天贴起点，最后一天贴终点，相邻标签至少隔 12px。
    const expectAnchored = async (width: number): Promise<void> => {
      await driver.resize(width);
      expect(svgOf(root).getAttribute("width")).toBe(String(width));
      const boxes = labelBoxes(root);
      expect(boxes.at(0)).toMatchObject({ text: "10/1", anchor: "start", x: 0 });
      expect(boxes.at(-1)).toMatchObject({ text: "10/30", anchor: "end", x: width - 40 });
      expect(Math.min(...gaps(boxes))).toBeGreaterThanOrEqual(12);
    };
    await expectAnchored(600);
    await expectAnchored(300);
    unmount?.();
    unmount = undefined;
    expect(driver.observed()).toBe(0);
  });

  test("spaces labels by the widest label of the locale, so Chinese dates get fewer labels", async () => {
    // 替身宽度：数字与斜杠 6px，汉字 11px；「10月30日」46px，「10/30」30px。
    measureText();
    const english = await render(
      <StackedBarArea
        data={MONTH}
        bars={BARS}
        label="Events per day"
        empty="No events"
        width={600}
      />,
    );
    const en = labelBoxes(english);
    unmount?.();
    const chinese = await render(
      <StackedBarArea
        data={MONTH}
        bars={BARS}
        label="每天的事件"
        empty="没有事件"
        width={600}
        formatDay={chineseDay}
      />,
    );
    const zh = labelBoxes(chinese);
    expect(zh.at(0)).toMatchObject({ text: "10月1日", anchor: "start", x: 0 });
    expect(zh.at(-1)).toMatchObject({ text: "10月30日", anchor: "end", x: 560 });
    expect(Math.min(...gaps(en))).toBeGreaterThanOrEqual(12);
    expect(Math.min(...gaps(zh))).toBeGreaterThanOrEqual(12);
    expect(zh.length).toBeLessThan(en.length);
  });

  test("moves the tooltip between days with the arrow keys and hides it with Escape", async () => {
    const root = await render(
      <StackedBarArea
        data={DAYS}
        bars={BARS}
        label="Events per day"
        empty="No events"
        totalLabel="Total"
        width={500}
      />,
    );
    const svg = svgOf(root);
    expect(svg.getAttribute("tabindex")).toBe("0");
    expect(tooltipText(root)).toBeNull();
    await focus(svg);
    expect(tooltipText(root)).toBe("10/30High5Low2Total7");
    const tip = root.querySelector("[role=tooltip]");
    expect(svg.getAttribute("aria-describedby")).toBe(tip?.id);
    expect(root.querySelector("[data-hover]")?.getAttribute("data-hover")).toBe("2026-10-30");
    await press(svg, "ArrowLeft");
    expect(tooltipText(root)).toBe("10/29High2Low6Total8");
    await press(svg, "ArrowRight");
    await press(svg, "ArrowRight");
    expect(tooltipText(root)).toContain("10/30");
    await press(svg, "Home");
    expect(tooltipText(root)).toContain("10/28");
    await press(svg, "End");
    expect(tooltipText(root)).toContain("10/30");
    await press(svg, "Escape");
    expect(tooltipText(root)).toBeNull();
    expect(svg.hasAttribute("aria-describedby")).toBe(false);
    await press(svg, "ArrowLeft");
    expect(tooltipText(root)).toContain("10/30");
    await blur(svg);
    expect(tooltipText(root)).toBeNull();
  });

  test("leaves zero values out of the tooltip", async () => {
    const root = await render(
      <StackedBarArea
        data={[...DAYS, { day: "2026-10-31", low: 3, high: 0, scans: 0 }]}
        bars={BARS}
        overlay={SCANS}
        label="Events per day"
        empty="No events"
        width={500}
      />,
    );
    await focus(svgOf(root));
    expect(tooltipText(root)).toBe("10/31Low3");
  });

  test("shows the day under the pointer and fades the series it does not point at", async () => {
    const root = await render(
      <StackedBarArea
        data={DAYS}
        bars={BARS}
        overlay={SCANS}
        label="Events per day"
        empty="No events"
        width={500}
        height={220}
      />,
    );
    const day = root.querySelector('[data-day="2026-10-29"]');
    const faded = (): (string | null)[] =>
      [...root.querySelectorAll("g[data-series][data-faded]")].map((group) =>
        group.getAttribute("data-series"),
      );
    // 纵轴 0 到 15（覆盖面积的最大值 12），绘图区高 190、上边距 8：值 3 在 8 + 190·(1 - 3/15) 处。
    await hover(day, 8 + 190 * (1 - 3 / 15));
    expect(tooltipText(root)).toBe("10/29High2Low6Scans12");
    expect(root.querySelector("[data-hover]")?.getAttribute("data-hover")).toBe("2026-10-29");
    expect(faded()).toEqual(["high", "scans"]);
    await hover(day, 8 + 190 * (1 - 7 / 15));
    expect(faded()).toEqual(["low", "scans"]);
    await leave(svgOf(root));
    expect(tooltipText(root)).toBeNull();
    expect(faded()).toEqual([]);
  });

  test("lists every value in a table for screen readers", async () => {
    const root = await render(
      <StackedBarArea
        data={DAYS}
        bars={BARS}
        overlay={SCANS}
        label="Events per day"
        empty="No events"
        width={500}
      />,
    );
    const table = root.querySelector("table");
    expect(table?.querySelector("caption")?.textContent).toBe("Events per day");
    const headers = [...(table?.querySelectorAll("thead th") ?? [])].map((th) => th.textContent);
    expect(headers).toEqual(["Low", "High", "Scans"]);
    const rows = [...(table?.querySelectorAll("tbody tr") ?? [])].map((tr) =>
      [...tr.children].map((cell) => cell.textContent),
    );
    expect(rows).toEqual([
      ["10/28", "4", "1", "9"],
      ["10/29", "6", "2", "12"],
      ["10/30", "2", "5", "8"],
    ]);
  });

  test("colors daily outcomes with the result tokens and skips outcomes without tasks", async () => {
    const daily = [
      {
        day: "2026-10-29",
        verified: 3,
        succeeded: 1,
        unverified: 0,
        disputed: 0,
        failed: 1,
        aborted: 0,
      },
      {
        day: "2026-10-30",
        verified: 2,
        succeeded: 0,
        unverified: 1,
        disputed: 1,
        failed: 0,
        aborted: 0,
      },
    ];
    const root = await render(
      <StackedBarArea
        data={daily}
        bars={OUTCOME_ORDER.map((outcome) => ({
          key: outcome,
          label: outcome,
          color: OUTCOME_COLORS[outcome],
        }))}
        label="Tasks per day"
        empty="No tasks"
        width={480}
      />,
    );
    expect(bars(root)).toHaveLength(6);
    expect(legend(root)).toEqual([
      "verified5",
      "succeeded1",
      "unverified1",
      "disputed1",
      "failed1",
    ]);
    expect(root.querySelector('g[data-series="verified"]')?.getAttribute("style")).toContain(
      "var(--dsw-alias-state-success-primary)",
    );
    expect(root.querySelector('g[data-series="failed"]')?.getAttribute("style")).toContain(
      "var(--dsw-alias-state-error-primary)",
    );
    expect(root.querySelector('g[data-series="aborted"]')).toBeNull();
  });
});

describe("axisTicks", () => {
  // 十天，每天 20px，中线在 10、30……190。
  const centers = Array.from({ length: 10 }, (_, index) => 10 + index * 20);

  test("labels every few days, keeping 12px between labels and the ends anchored", () => {
    // 30px 的标签加 12px 空隙需要三天：第 0、3、6 天，最后一天贴终点。
    expect(axisTicks(centers, 200, 30)).toEqual([
      { index: 0, x: 0, anchor: "start" },
      { index: 3, x: 70, anchor: "middle" },
      { index: 6, x: 130, anchor: "middle" },
      { index: 9, x: 200, anchor: "end" },
    ]);
  });

  test("drops a middle label that would come within 12px of the last one", () => {
    // 九天、宽 180：第 6 天的标签右缘 145 离最后一天的左缘 150 只有 5px。
    expect(axisTicks(centers.slice(0, 9), 180, 30).map((tick) => tick.index)).toEqual([0, 3, 8]);
  });

  test("keeps only the last day when two labels cannot fit", () => {
    expect(axisTicks(centers, 200, 95)).toEqual([{ index: 9, x: 200, anchor: "end" }]);
    expect(axisTicks([10], 20, 30)).toEqual([{ index: 0, x: 20, anchor: "end" }]);
    expect(axisTicks([], 200, 30)).toEqual([]);
  });
});
