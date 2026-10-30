// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { StatsView } from "../shared.ts";
import type { ScoutFace } from "./face.ts";
import { SCOUT_DICTIONARIES } from "./locale.ts";
import { StatsTab } from "./stats.tsx";
import {
  button,
  click,
  fakeHost,
  inboxOf,
  mount,
  NOW,
  STATS,
  translator,
  type FakeHost,
} from "./testing.tsx";
import {
  driveResize,
  focus,
  measureText,
  tooltipText,
  type ResizeDriver,
} from "./ui/charts/testing.tsx";

let unmount: (() => void) | undefined;
let root: HTMLElement;
let driver: ResizeDriver;

/** 挂载统计分栏，并把容器宽度设为 `width`，图表与表格按这个宽度排版。 */
async function render(
  host: FakeHost,
  {
    locale = "en",
    width = 960,
    face = host.face,
  }: {
    readonly locale?: "en" | "zh";
    readonly width?: number;
    readonly face?: ScoutFace;
  } = {},
): Promise<void> {
  const mounted = await mount(<StatsTab face={face} view={inboxOf([])} t={translator(locale)} />);
  unmount = mounted.unmount;
  root = mounted.container;
  await driver.resize(width);
}

/** 按 h2 标题找卡片。 */
function card(title: string): HTMLElement {
  const heading = [...root.querySelectorAll("h2")].find((h2) => h2.textContent === title);
  const section = heading?.closest("section");
  if (section === null || section === undefined) throw new Error(`没有统计卡片 ${title}`);
  return section;
}

/** 按标签找 KPI 卡片。 */
function tile(label: string): HTMLElement {
  const found = [...root.querySelectorAll<HTMLElement>("[role=group]")].find(
    (group) => group.querySelector("p")?.textContent === label,
  );
  if (found === undefined) throw new Error(`没有 KPI ${label}`);
  return found;
}

function legend(scope: HTMLElement): (string | null)[] {
  return [...scope.querySelectorAll("[data-legend]")].map((item) => item.textContent);
}

function summary(scope: HTMLElement): string | null | undefined {
  return scope.querySelector("header span")?.textContent;
}

function headers(scope: HTMLElement): (string | null)[] {
  return [...scope.querySelectorAll("th")].map((th) => th.textContent);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
  driver = driveResize();
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** 一列卡片的标题，自上而下。 */
function column(index: 1 | 2): (string | null)[] {
  return [...root.querySelectorAll(`[data-column="${String(index)}"] h2`)].map(
    (h2) => h2.textContent,
  );
}

describe("StatsTab layout", () => {
  test("puts four KPI tiles above the daily tasks, two card columns, and the calls table", async () => {
    await render(fakeHost(inboxOf([])));
    expect(
      [...root.querySelectorAll("[role=group] > p:first-child")].map((p) => p.textContent),
    ).toEqual(["Sessions analyzed", "Tasks, last 30 days", "Ideas to review", "Skills saved"]);
    expect([...root.querySelectorAll("h2")].map((h2) => h2.textContent)).toEqual([
      "Tasks per day, last 30 days",
      "Leads by state",
      "Frequent actions",
      "New leads per day, last 30 days",
      "Ideas by state",
      "Recurring errors",
      "Sessions that failed analysis",
      "Model usage, last 7 days",
      "Recent model calls",
    ]);
    expect(root.querySelector("h1")).toBeNull();
  });

  test("fills both card columns in the same order: share card, ranked list, card chart", async () => {
    await render(fakeHost(inboxOf([])));
    expect(column(1)).toEqual([
      "Leads by state",
      "Frequent actions",
      "New leads per day, last 30 days",
    ]);
    expect(column(2)).toEqual([
      "Ideas by state",
      "Recurring errors",
      "Sessions that failed analysis",
      "Model usage, last 7 days",
    ]);
  });

  test.each(["en", "zh"] as const)(
    "shows no dictionary key as visible text in %s",
    async (locale) => {
      await render(fakeHost(inboxOf([])), { locale });
      const keys = new Set(Object.keys(SCOUT_DICTIONARIES.en));
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      const texts: string[] = [];
      for (let node = walker.nextNode(); node !== null; node = walker.nextNode()) {
        const text = node.textContent?.trim() ?? "";
        if (text !== "") texts.push(text);
      }
      expect(texts.length).toBeGreaterThan(50);
      expect(texts.filter((text) => keys.has(text))).toEqual([]);
    },
  );

  test("draws skeletons of the final sizes while the stats load", async () => {
    const host = fakeHost(inboxOf([]));
    const pending: { release?: (stats: StatsView) => void } = {};
    const face: ScoutFace = {
      ...host.face,
      loadStats: () =>
        new Promise<StatsView>((resolve) => {
          pending.release = resolve;
        }),
    };
    await render(host, { face });
    const values = [...root.querySelectorAll("[data-kpi-value]")];
    expect(
      values.map((value) => value.querySelector<HTMLElement>("[data-skeleton]")?.style.height),
    ).toEqual(Array(4).fill("24px"));
    expect(
      card("Tasks per day, last 30 days").querySelector<HTMLElement>("[data-skeleton]")?.style
        .height,
    ).toBe("180px");
    expect(card("Model usage, last 7 days").getAttribute("aria-busy")).toBe("true");
    expect(root.querySelector("svg")).toBeNull();
    const { release } = pending;
    if (release === undefined) throw new Error("统计还没开始读取");
    release(STATS);
    await driver.resize(960);
    expect(root.querySelector("[data-skeleton]")).toBeNull();
  });

  test("shows the reason in one error line when the stats cannot load", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host, {
      face: { ...host.face, loadStats: async () => Promise.reject(new Error("boom")) },
    });
    expect(root.querySelector("[role=alert]")?.textContent).toBe("Could not load stats: boom");
  });

  test("shows zeros and one line per chart when nothing has happened yet", async () => {
    const host = fakeHost(inboxOf([]));
    host.stats = {
      ...STATS,
      coverage: { analyzed: 0, inRange: 0, total: 0, backfilled: 0, failed: [] },
      funnel: {
        leads: { detected: 0, summarized: 0, skipped: 0, failed: 0, dismissed: 0 },
        ideas: { proposed: 0, ready: 0, failed: 0, written: 0, dismissed: 0 },
      },
      actions: [],
      errors: [],
      daily: STATS.daily.map((day) => ({
        ...day,
        verified: 0,
        succeeded: 0,
        unverified: 0,
        disputed: 0,
        failed: 0,
        aborted: 0,
        leads: 0,
      })),
      usage: STATS.usage.map((day) => ({
        ...day,
        summaries: 0,
        requested: 0,
        failures: 0,
        inputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        outputTokens: 0,
      })),
      calls: [],
    };
    await render(host);
    expect(
      [...root.querySelectorAll("[data-kpi-value]")].map((value) => value.textContent),
    ).toEqual(["0", "0", "0", "0"]);
    expect([...root.querySelectorAll("[data-empty]")].map((line) => line.textContent)).toEqual([
      "No tasks in the last 30 days",
      "No leads yet",
      "No action repeats across sessions",
      "No new leads in the last 30 days",
      "No ideas yet",
      "No error repeats across sessions",
      "No model calls in the last 7 days",
    ]);
    expect(tile("Sessions analyzed").querySelector("[role=img]")).toBeNull();
    expect(root.querySelector("[data-legend]")).toBeNull();
    expect(card("Recent model calls").textContent).toContain("No model calls yet");
  });
});

describe("StatsTab KPI tiles", () => {
  test.each([
    ["en", "of 120", "48 in range · 12 by backfill"],
    ["zh", "共 120 个", "范围内 48 个 · 回溯读入 12 个"],
  ] as const)(
    "shows sessions analyzed out of all sessions in %s with the range and backfill split in a tooltip",
    async (locale, whole, split) => {
      await render(fakeHost(inboxOf([])), { locale });
      const context = root.querySelector<HTMLElement>("[data-kpi-context]");
      expect(context?.textContent).toBe(whole);
      expect(context?.tabIndex).toBe(0);
      expect(context?.closest("[data-tooltip]")?.getAttribute("data-tooltip")).toBe(split);
    },
  );

  test("shows the analysis states of all sessions in a share bar", async () => {
    await render(fakeHost(inboxOf([])));
    const analyzed = tile("Sessions analyzed");
    const bar = analyzed.querySelector("[role=img]");
    expect(bar?.getAttribute("aria-label")).toBe("Sessions by analysis state");
    expect(document.getElementById(bar?.getAttribute("aria-describedby") ?? "")?.textContent).toBe(
      "Analyzed 40 (33%), Failed 1 (0.8%), Not analyzed 79 (66%)",
    );
  });

  test("says when the sessions are not listed yet", async () => {
    const host = fakeHost(inboxOf([]));
    host.stats = {
      ...STATS,
      coverage: { ...STATS.coverage, inRange: null, total: null, failed: [] },
    };
    await render(host);
    const analyzed = tile("Sessions analyzed");
    expect(analyzed.textContent).toBe("Sessions analyzed40Not listed yet");
    expect(analyzed.querySelector("[data-tooltip]")?.getAttribute("data-tooltip")).toBe(
      "12 by backfill",
    );
    expect(analyzed.querySelector("[role=img]")).toBeNull();
  });

  test("counts the tasks of 30 days with the share that passed a check and a daily trend", async () => {
    await render(fakeHost(inboxOf([])));
    const tasks = tile("Tasks, last 30 days");
    expect(tasks.textContent).toContain("Tasks, last 30 days12");
    expect(tasks.textContent).toContain("50% passed a check");
    // 迷你趋势线在数值一行的尾侧。
    const trend = tasks.querySelector("[data-kpi-value] + * svg");
    expect(trend?.getAttribute("width")).toBe("80");
    expect(trend?.getAttribute("height")).toBe("24");
    expect(trend?.querySelector("desc")?.textContent).toMatch(/^10\/1 0, .*10\/30 5$/u);
  });

  test("counts the ideas waiting for a decision and the Skills saved", async () => {
    await render(fakeHost(inboxOf([])));
    expect(tile("Ideas to review").textContent).toBe("Ideas to review41 draft ready");
    expect(tile("Skills saved").textContent).toBe("Skills saved2of 8 ideas");
  });
});

describe("StatsTab charts", () => {
  test("stacks the daily tasks of 30 days by outcome with every outcome in the legend", async () => {
    await render(fakeHost(inboxOf([])));
    const tasks = card("Tasks per day, last 30 days");
    expect(summary(tasks)).toBe("12 tasks");
    expect(legend(tasks)).toEqual([
      "Check passed6",
      "Succeeded2",
      "Unverified1",
      "User disagreed1",
      "Failed1",
      "Cancelled1",
    ]);
    expect(tasks.querySelectorAll("[data-day]")).toHaveLength(30);
    expect(tasks.querySelector('g[data-series="leads"]')).toBeNull();
    const svg = tasks.querySelector("svg");
    await focus(svg);
    expect(tooltipText(tasks)).toBe("10/30Cancelled1Succeeded1Check passed3Total5");
  });

  test("draws new leads per day in their own chart because leads and tasks are different units", async () => {
    await render(fakeHost(inboxOf([])));
    const leads = card("New leads per day, last 30 days");
    expect(summary(leads)).toBe("3 leads");
    expect(legend(leads)).toEqual(["New leads3"]);
    expect(leads.querySelector("svg")?.getAttribute("height")).toBe("140");
  });

  test("splits leads and ideas by state", async () => {
    await render(fakeHost(inboxOf([])));
    expect(summary(card("Leads by state"))).toBe("12 leads");
    expect(legend(card("Leads by state"))).toEqual([
      "Summarized6",
      "Waiting for summary2",
      "Summary failed1",
      "Not worth saving2",
      "Dismissed1",
    ]);
    expect(summary(card("Ideas by state"))).toBe("8 ideas");
    expect(legend(card("Ideas by state"))).toEqual([
      "Saved2",
      "Draft ready1",
      "Waiting for you3",
      "Draft failed1",
      "Dismissed1",
    ]);
  });

  test("shows seven days of token usage with the requests of the week", async () => {
    await render(fakeHost(inboxOf([])));
    const usage = card("Model usage, last 7 days");
    expect(summary(usage)).toBe("11,400 tokens");
    expect(legend(usage)).toEqual(["Input2.4K", "Cache read6.8K", "Cache write1.2K", "Output1K"]);
    expect(usage.textContent).toContain("2 background · 2 requested · 1 failed");
    await focus(usage.querySelector("svg"));
    expect(tooltipText(usage)).toBe(
      "10/30Output500Cache write600Cache read3,400Input1,200Total5,700",
    );
  });

  test("writes chart dates in the Chinese month and day form", async () => {
    await render(fakeHost(inboxOf([])), { locale: "zh" });
    const labels = [...card("近 30 天每天的任务").querySelectorAll("[data-label]")].map(
      (label) => label.textContent,
    );
    expect(labels.at(0)).toBe("10月1日");
    expect(labels.at(-1)).toBe("10月30日");
  });
});

describe("StatsTab lists and tables", () => {
  test("ranks frequent actions with their weekly trend and searches for one", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host);
    const actions = card("Frequent actions");
    const build = button("Search for pnpm build", actions);
    expect(build.textContent).toContain("pnpm build9 sessions");
    const trend = build.querySelector("svg");
    expect(trend?.querySelector("title")?.textContent).toBe(
      "pnpm build, sessions per week, last 8 weeks",
    );
    expect(trend?.querySelector("desc")?.textContent).toBe(
      "49–55 days ago 0, 42–48 days ago 1, 35–41 days ago 3, 28–34 days ago 2, 21–27 days ago 1, 14–20 days ago 0, 7–13 days ago 1, Last 7 days 1",
    );
    await click(build);
    expect(host.face.page.getSnapshot()).toMatchObject({ tab: "search", query: "pnpm build" });
  });

  test("searches for a recurring error", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host);
    const errors = card("Recurring errors");
    expect(errors.textContent).toContain("Cannot find module 'vite'3 sessions");
    await click(button("Search for Cannot find module 'vite'", errors));
    expect(host.face.page.getSnapshot().query).toBe("Cannot find module 'vite'");
  });

  test("lists the sessions that failed analysis and opens one", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host);
    const failed = card("Sessions that failed analysis");
    expect(summary(failed)).toBe("1 session");
    const row = failed.querySelector<HTMLElement>('li[data-session="s9"]');
    expect(row?.textContent).toBe("s9日志无法解析Failed10 min ago");
    expect(row?.querySelector("[data-state]")?.getAttribute("data-state")).toBe("error");
    expect(row?.querySelector("[data-status]")?.getAttribute("data-ink")).toBe("error");
    await click(button("s9", failed));
    expect(host.sessionsOpened).toEqual(["s9"]);
  });

  test("lists failed sessions without an open button when sessions cannot be opened", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host, { face: { ...host.face, openSession: null } });
    const failed = card("Sessions that failed analysis");
    expect(failed.querySelector('li[data-session="s9"]')).not.toBeNull();
    expect(failed.querySelector("button")).toBeNull();
  });

  test("leaves out the failed sessions card when no session failed analysis", async () => {
    const host = fakeHost(inboxOf([]));
    host.stats = { ...STATS, coverage: { ...STATS.coverage, failed: [] } };
    await render(host);
    expect(column(2)).toEqual(["Ideas by state", "Recurring errors", "Model usage, last 7 days"]);
  });

  test("lists recent model calls in columns and opens the card a call worked on", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host);
    const calls = card("Recent model calls");
    expect(headers(calls)).toEqual([
      "Item",
      "Stage",
      "Model",
      "Duration",
      "Input",
      "Output",
      "Result",
      "Time",
    ]);
    const rows = [...calls.querySelectorAll("tbody tr")];
    expect([...(rows[0]?.querySelectorAll("td") ?? [])].map((td) => td.textContent)).toEqual([
      "Cut a local patch release",
      "Draft",
      "deepseek-pro",
      "42s",
      "5,200",
      "500",
      "Drafted",
      "1 min ago",
    ]);
    expect(rows[1]?.textContent).toContain("Not worth saving: A one-off migration");
    expect(
      rows.map((row) => row.querySelector("[data-state]")?.getAttribute("data-state")),
    ).toEqual(["done", "idle"]);
    expect(rows[0]?.querySelector('td[data-column="time"]')?.getAttribute("title")).toBe(
      new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(
        NOW - 60_000,
      ),
    );
    await click(rows[0]?.querySelector("button"));
    expect(host.face.page.getSnapshot()).toMatchObject({
      tab: "suggestions",
      selected: "repeated:1~0",
    });
  });

  test("sizes the call columns to their values and leaves the rest to the item title", async () => {
    measureText();
    await render(fakeHost(inboxOf([])));
    const widths = [...card("Recent model calls").querySelectorAll<HTMLElement>("th")].map(
      (th) => th.style.width,
    );
    expect(widths[0]).toBe("");
    expect(widths.slice(1).every((width) => /^\d+px$/u.test(width))).toBe(true);
    const total = widths.slice(1).reduce((sum, width) => sum + Number.parseInt(width, 10), 0);
    expect(total).toBeLessThanOrEqual(960 * 0.7);
  });

  test("hides the stage, model, and input columns when the tab is narrow", async () => {
    await render(fakeHost(inboxOf([])), { width: 560 });
    expect(headers(card("Recent model calls"))).toEqual([
      "Item",
      "Duration",
      "Output",
      "Result",
      "Time",
    ]);
  });

  test("names the idea count of a call that proposed ideas", async () => {
    const host = fakeHost(inboxOf([]));
    const [first] = STATS.calls;
    if (first === undefined) throw new Error("没有调用记录");
    host.stats = {
      ...STATS,
      calls: [{ ...first, stage: "summary", result: "proposed", detail: "2" }],
    };
    await render(host);
    expect(card("Recent model calls").textContent).toContain("2 ideas");
  });

  test("uses the singular for one idea", async () => {
    const host = fakeHost(inboxOf([]));
    const [first] = STATS.calls;
    if (first === undefined) throw new Error("没有调用记录");
    host.stats = {
      ...STATS,
      calls: [{ ...first, stage: "summary", result: "proposed", detail: "1" }],
    };
    await render(host);
    const text = card("Recent model calls").textContent ?? "";
    expect(text).toContain("1 idea");
    expect(text).not.toContain("1 ideas");
  });
});
