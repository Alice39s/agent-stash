// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { PICK_LIMIT } from "./search.tsx";
import { HistoryPage } from "./page.tsx";
import {
  button,
  choose,
  click,
  fakeHost,
  inboxOf,
  item,
  mount,
  NOW,
  press,
  progress,
  perform,
  settle,
  task,
  translator,
  type,
  UNSUMMARIZED,
  wait,
  type FakeHost,
} from "./testing.tsx";

const t = translator("en");
let unmount: (() => void) | undefined;
let root: HTMLElement;

async function render(host: FakeHost) {
  const mounted = await mount(<HistoryPage {...host.face} t={t} />);
  unmount = mounted.unmount;
  root = mounted.container;
  await settle();
}

function pageTab(name: string): HTMLButtonElement {
  return button(
    name,
    root.querySelector("[role=tablist][aria-label='Skill Scout History sections']") ?? root,
  );
}

/** 右栏的详情面板：标题是面板里唯一的 h2。 */
function detail(): HTMLElement | null {
  return root.querySelector("h2")?.closest("section") ?? null;
}

function searchBox(): HTMLInputElement | null {
  return root.querySelector("input[type=search]");
}

/** 打开「统计」分栏。 */
async function stats(host: FakeHost): Promise<void> {
  host.face.page.update({ tab: "stats" });
  await render(host);
  await settle();
}

function card(name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`section[aria-label='${name}']`);
  if (found === null) throw new Error(`没有统计卡片 ${name}`);
  return found;
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("HistoryPage suggestions", () => {
  test("lists every card by group and shows the first one awaiting a decision", async () => {
    const host = fakeHost(
      inboxOf([
        item({ ...UNSUMMARIZED, id: "recovery:1", kind: "recovery" }),
        item({ id: "complex:2~0", state: "proposed", title: "Rotate the signing key" }),
        item({ id: "repeated:3~0", state: "written" }),
      ]),
    );
    await render(host);
    expect(root.querySelector("h1")?.textContent).toBe("Skill Scout History");
    expect(pageTab("Suggestions").getAttribute("aria-selected")).toBe("true");
    const groups = [...root.querySelectorAll("section[aria-label]")]
      .map((section) => section.getAttribute("aria-label"))
      .filter((label) => label === "Needs your decision" || label === "Found locally");
    expect(groups).toEqual(["Needs your decision", "Found locally"]);
    expect(button("History (1)", root)).toBeDefined();
    expect(detail()?.getAttribute("aria-label")).toBe("Rotate the signing key");
    expect(root.querySelector("[aria-current=true]")?.getAttribute("data-item")).toBe(
      "complex:2~0",
    );

    await click(root.querySelector("[data-item='recovery:1']"));
    await settle();
    expect(host.face.page.getSnapshot().selected).toBe("recovery:1");
    expect(detail()?.getAttribute("aria-label")).toBe("Release a patch version");
  });

  test("opens the card chosen elsewhere, follows a lead to its first idea, and expands history for it", async () => {
    const host = fakeHost(
      inboxOf([item({ ...UNSUMMARIZED, state: "summarizing", progress: progress() })], {
        working: 1,
      }),
    );
    host.face.page.update({ selected: "repeated:1" });
    await render(host);
    expect(detail()?.textContent).toContain("Writing (450 characters received)");

    host.inbox = inboxOf([
      item({ state: "proposed", ideaCount: 2 }),
      item({ id: "repeated:1~1", state: "proposed", ideaCount: 2, title: "Publish the docs" }),
    ]);
    await perform(() => host.store.refresh());
    await settle();
    expect(detail()?.getAttribute("aria-label")).toBe("Cut a local patch release");

    await perform(() => host.face.page.update({ selected: "repeated:9~0" }));
    host.inbox = inboxOf([item(), item({ id: "repeated:9~0", state: "dismissed", title: "Old" })]);
    await perform(() => host.store.refresh());
    await settle();
    expect(button("Hide history", root).getAttribute("aria-expanded")).toBe("true");
    expect(detail()?.getAttribute("aria-label")).toBe("Old");
    expect(button("Restore", detail() ?? root)).toBeDefined();
  });

  test("shows notices with an undo under the page header", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(button("Dismiss: Cut a local patch release", root));
    const notice = root.querySelector("[role=status]");
    expect(notice?.textContent).toContain("Dismissed");
    await click(button("Undo", root));
    expect(host.actions.at(-1)).toEqual({ action: "restore", id: "repeated:1~0" });
  });
});

describe("HistoryPage search", () => {
  test("searches after typing stops and right away on Enter, with the outcome filter", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host);
    await click(pageTab("Search"));
    expect(root.textContent).toContain("Searches 4 tasks from 4 analyzed sessions.");
    await type(searchBox(), "npm");
    await type(searchBox(), "npm test");
    expect(host.queries).toEqual([]);
    await wait(300);
    expect(host.queries).toEqual([{ q: "npm test", outcome: null, limit: 50 }]);

    await choose(root.querySelector("select"), "verified");
    await settle();
    expect(host.queries.at(-1)).toEqual({ q: "npm test", outcome: "verified", limit: 50 });

    await type(searchBox(), "vitest");
    await press(searchBox(), "Enter");
    await settle();
    expect(host.queries.at(-1)).toEqual({ q: "vitest", outcome: "verified", limit: 50 });
  });

  test("highlights the query in the matched commands, errors, and paths", async () => {
    const host = fakeHost(inboxOf([]));
    host.face.page.update({ tab: "search", query: "npm test" });
    await render(host);
    await settle();
    expect(root.textContent).toContain("3 matching tasks");
    const first = root.querySelector("[data-episode='s1:8']");
    expect([...(first?.querySelectorAll("mark") ?? [])].map((mark) => mark.textContent)).toEqual([
      "npm",
      "test",
      "npm",
      "test",
    ]);
    expect(first?.textContent).toContain("Error: npm test failed");
    await click(button("Open session", first ?? root));
    expect(host.sessionsOpened).toEqual(["s1"]);
  });

  test("extracts the selected tasks and opens the new lead", async () => {
    const host = fakeHost(inboxOf([]));
    const lead = item({
      ...UNSUMMARIZED,
      id: "selected:0123456789abcdef",
      kind: "selected",
      goal: "Release a patch version",
      state: "summarizing",
      progress: progress({ phase: "queued", chars: 0 }),
    });
    host.answer = () => {
      host.inbox = inboxOf([lead], { working: 1 });
      return { ok: true, inbox: host.inbox, leadId: lead.id };
    };
    host.face.page.update({ tab: "search", query: "npm test" });
    await render(host);
    await settle();
    await click(root.querySelector("input[aria-label='Select Release a patch version']"));
    await click(root.querySelector("input[aria-label='Select Release another patch']"));
    expect(root.textContent).toContain("2 selected");
    await click(button("Extract selected", root));
    await settle();
    expect(host.actions).toEqual([{ action: "extract-selected", episodeIds: ["s1:8", "s2:8"] }]);
    expect(host.face.page.getSnapshot()).toMatchObject({
      tab: "suggestions",
      selected: "selected:0123456789abcdef",
      picked: [],
    });
    expect(detail()?.textContent).toContain("Selected tasks · 2 sessions");
    expect(detail()?.textContent).toContain("Queued");
  });

  test("opens the first idea of the lead the host reused, even when another selected lead is newer", async () => {
    const newer = item({
      id: "selected:bbbbbbbbbbbbbbbb~0",
      kind: "selected",
      title: "Newer idea",
      detectedAt: NOW,
    });
    const reused = item({
      id: "selected:aaaaaaaaaaaaaaaa~0",
      kind: "selected",
      title: "Tag from package.json",
      state: "proposed",
      detectedAt: NOW - 86_400_000,
    });
    const host = fakeHost(inboxOf([newer, reused]));
    host.answer = () => ({ ok: true, inbox: host.inbox, leadId: "selected:aaaaaaaaaaaaaaaa" });
    host.face.page.update({ tab: "search", query: "npm test" });
    await render(host);
    await settle();
    await click(root.querySelector("input[aria-label='Select Release a patch version']"));
    await click(button("Extract selected", root));
    await settle();
    expect(host.face.page.getSnapshot().selected).toBe("selected:aaaaaaaaaaaaaaaa");
    expect(root.querySelector("[data-item][aria-current=true]")?.getAttribute("data-item")).toBe(
      reused.id,
    );
    expect(detail()?.getAttribute("aria-label")).toBe("Tag from package.json");
  });

  test("stops selecting at twelve tasks and clears the selection", async () => {
    const host = fakeHost(inboxOf([]));
    const hits = Array.from({ length: PICK_LIMIT + 1 }, (_, index) =>
      task({
        episodeId: `s${String(index)}:1`,
        sessionId: `s${String(index)}`,
        goal: `Task ${String(index)}`,
      }),
    );
    host.answerSearch = (query) => ({
      query: query.q,
      total: 40,
      hits,
      indexed: { sessions: 30, episodes: 90 },
    });
    host.face.page.update({ tab: "search", query: "task" });
    await render(host);
    await settle();
    expect(root.textContent).toContain("40 matching tasks, showing the first 13");
    expect(root.textContent).toContain("Searches 90 tasks from 30 analyzed sessions.");
    const boxes = [...root.querySelectorAll<HTMLInputElement>("input[type=checkbox]")];
    await act(async () => {
      for (const box of boxes.slice(0, PICK_LIMIT)) box.click();
    });
    expect(root.textContent).toContain("12 selected");
    expect(root.textContent).toContain("Up to 12 tasks");
    expect(boxes.at(-1)?.disabled).toBe(true);
    expect(boxes[0]?.disabled).toBe(false);
    await click(button("Clear", root));
    expect(host.face.page.getSnapshot().picked).toEqual([]);
    expect(boxes.at(-1)?.disabled).toBe(false);
  });

  test("says when nothing matches", async () => {
    const host = fakeHost(inboxOf([]));
    host.answerSearch = (query) => ({
      query: query.q,
      total: 0,
      hits: [],
      indexed: { sessions: 4, episodes: 4 },
    });
    host.face.page.update({ tab: "search", query: "kubectl" });
    await render(host);
    await settle();
    expect(root.textContent).toContain("No matching tasks.");
    expect(root.querySelectorAll("[data-episode]")).toHaveLength(0);
  });
});

describe("HistoryPage backfill", () => {
  test("starts reading earlier sessions for either range", async () => {
    const host = fakeHost(inboxOf([]));
    host.face.page.update({ tab: "search" });
    await render(host);
    await click(button("Read past 90 days", root));
    await click(button("Read all sessions", root));
    expect(host.actions).toEqual([
      { action: "backfill", range: "90d" },
      { action: "backfill", range: "all" },
    ]);
  });

  test("shows real progress and pauses, then resumes the same range", async () => {
    const running = { range: "all", state: "running", total: 40, done: 12, failed: 2 } as const;
    const host = fakeHost(inboxOf([], { backfill: running }));
    host.face.page.update({ tab: "search" });
    await render(host);
    const bar = root.querySelector("[role=progressbar]");
    expect(bar?.getAttribute("aria-valuenow")).toBe("12");
    expect(bar?.getAttribute("aria-valuemax")).toBe("40");
    expect(root.textContent).toContain("Reading earlier sessions: 12 of 40");
    expect(root.textContent).toContain("2 failed");
    await click(button("Pause", root));
    expect(host.actions).toEqual([{ action: "backfill-pause" }]);

    host.inbox = inboxOf([], { backfill: { ...running, state: "paused" } });
    await perform(() => host.store.refresh());
    await settle();
    expect(root.textContent).toContain("Paused: 12 of 40");
    await click(button("Resume", root));
    expect(host.actions.at(-1)).toEqual({ action: "backfill", range: "all" });

    host.inbox = inboxOf([], { backfill: { ...running, state: "done", done: 40 } });
    await perform(() => host.store.refresh());
    await settle();
    expect(root.querySelector("[role=progressbar]")).toBeNull();
    expect(root.textContent).toContain("Read 40 earlier sessions");
    expect(button("Read past 90 days", root)).toBeDefined();
  });

  test("shows the listing step before the total is known", async () => {
    const host = fakeHost(
      inboxOf([], { backfill: { range: "90d", state: "listing", total: 0, done: 0, failed: 0 } }),
    );
    host.face.page.update({ tab: "search" });
    await render(host);
    expect(root.textContent).toContain("Listing sessions");
    expect(button("Pause", root)).toBeDefined();
  });
});

describe("HistoryPage stats", () => {
  test("shows coverage and opens a session whose analysis failed", async () => {
    const host = fakeHost(inboxOf([]));
    await stats(host);
    const coverage = card("Coverage");
    expect([...coverage.querySelectorAll("dt")].map((dt) => dt.textContent)).toEqual([
      "Analyzed",
      "In range",
      "All sessions",
      "Read by backfill",
    ]);
    expect([...coverage.querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual([
      "40",
      "48",
      "120",
      "12",
    ]);
    const failed = coverage.querySelector("[data-session='s9']");
    expect(failed?.textContent).toContain("日志无法解析");
    expect(failed?.textContent).toContain("10 min ago");
    await click(button("Open session", failed ?? root));
    expect(host.sessionsOpened).toEqual(["s9"]);
  });

  test("shows sessions not listed yet in the coverage", async () => {
    const host = fakeHost(inboxOf([]));
    host.stats = {
      ...host.stats,
      coverage: { ...host.stats.coverage, inRange: null, total: null, failed: [] },
    };
    await stats(host);
    expect([...card("Coverage").querySelectorAll("dd")].map((dd) => dd.textContent)).toEqual([
      "40",
      "not listed yet",
      "not listed yet",
      "12",
    ]);
  });

  test("breaks down task outcomes and the lead and idea funnel", async () => {
    const host = fakeHost(inboxOf([]));
    await stats(host);
    const outcomes = [...card("Task outcomes").querySelectorAll("li")].map((li) => li.textContent);
    expect(outcomes).toEqual([
      "Check passed20",
      "Succeeded8",
      "Unverified6",
      "User disagreed1",
      "Failed4",
      "Cancelled1",
    ]);
    const segments = [...card("Task outcomes").querySelectorAll<HTMLElement>("[data-segment]")]
      .filter((element) => element.style.width !== "")
      .map((element) => [element.getAttribute("data-segment"), element.style.width]);
    expect(segments[0]).toEqual(["verified", "50%"]);
    const funnel = [...card("Leads and ideas").querySelectorAll("[data-step]")].map(
      (step) => step.textContent,
    );
    expect(funnel).toEqual([
      "Leads10",
      "Summarized6",
      "Not worth saving2",
      "Ideas7",
      "Drafted3",
      "Saved1",
      "Dismissed2",
    ]);
  });

  test("jumps from a frequent action or a recurring error to a search for it", async () => {
    const host = fakeHost(inboxOf([]));
    await stats(host);
    expect(card("Frequent actions").textContent).toContain("pnpm build9 sessions");
    await click(button("Search for pnpm build", root));
    expect(host.face.page.getSnapshot()).toMatchObject({ tab: "search", query: "pnpm build" });
    expect(searchBox()?.value).toBe("pnpm build");
    await wait(300);
    expect(host.queries.at(-1)).toMatchObject({ q: "pnpm build" });

    await perform(() => host.face.page.update({ tab: "stats" }));
    await click(button("Search for Cannot find module 'vite'", root));
    expect(host.face.page.getSnapshot().query).toBe("Cannot find module 'vite'");
  });

  test("shows seven days of usage with cache reads and writes", async () => {
    const host = fakeHost(inboxOf([]));
    await stats(host);
    const usage = card("Model usage, last 7 days");
    const days = [...usage.querySelectorAll("[data-day]")];
    expect(days.map((day) => day.getAttribute("data-day"))).toEqual([
      "2026-10-24",
      "2026-10-25",
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
    ]);
    const today = days.at(-1)?.textContent ?? "";
    expect(today).toContain("10-30");
    expect(today).toContain("Input 1.2K · Cache read 3.4K · Cache write 600 · Output 500");
    expect(today).toContain("2 background · 1 requested · 1 failed");
    expect(days[0]?.textContent).toBe("10-24");
  });

  test("lists recent model calls and opens the card a call worked on", async () => {
    const host = fakeHost(inboxOf([item()]));
    await stats(host);
    const calls = card("Recent model calls");
    const rows = [...calls.querySelectorAll("button")];
    expect(rows[0]?.textContent).toContain("Cut a local patch release");
    expect(rows[0]?.textContent).toContain(
      "Draft · deepseek-pro · 42s · 5.2K in · 500 out · 1 min ago",
    );
    expect(rows[1]?.textContent).toContain("Not worth saving: A one-off migration");
    await click(rows[0]);
    expect(host.face.page.getSnapshot()).toMatchObject({
      tab: "suggestions",
      selected: "repeated:1~0",
    });
    expect(detail()?.getAttribute("aria-label")).toBe("Cut a local patch release");
  });

  test("names the idea count of a call that proposed ideas", async () => {
    const host = fakeHost(inboxOf([]));
    const [first] = host.stats.calls;
    if (first === undefined) throw new Error("没有调用记录");
    host.stats = {
      ...host.stats,
      calls: [{ ...first, stage: "summary", result: "proposed", detail: "2" }],
    };
    await stats(host);
    expect(card("Recent model calls").textContent).toContain("2 ideas");
  });

  test("uses the singular for one idea", async () => {
    const host = fakeHost(inboxOf([]));
    const [first] = host.stats.calls;
    if (first === undefined) throw new Error("没有调用记录");
    host.stats = {
      ...host.stats,
      calls: [{ ...first, stage: "summary", result: "proposed", detail: "1" }],
    };
    await stats(host);
    const text = card("Recent model calls").textContent ?? "";
    expect(text).toContain("1 idea");
    expect(text).not.toContain("1 ideas");
  });
});
