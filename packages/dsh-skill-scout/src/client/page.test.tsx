// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { showItem } from "./face.ts";
import { PICK_LIMIT } from "./search.tsx";
import { HistoryPage } from "./page.tsx";
import { driveResize } from "./ui/charts/testing.tsx";
import {
  button,
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

let unmount: (() => void) | undefined;
let root: HTMLElement;

async function render(host: FakeHost, locale: "en" | "zh" = "en") {
  const mounted = await mount(<HistoryPage {...host.face} t={translator(locale)} />);
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

/** 右栏的详情面板。 */
function detail(): HTMLElement | null {
  return root.querySelector("section[data-state][aria-label]");
}

function page(): HTMLElement | null {
  return root.querySelector("[data-view=page]");
}

function searchBox(): HTMLInputElement | null {
  return root.querySelector("input[type=search]");
}

/** 搜索结果行里的勾选框，按它的标签文字找。 */
function pick(name: string): HTMLInputElement | null {
  const label = [...root.querySelectorAll("label")].find((entry) => entry.textContent === name);
  return label?.querySelector("input") ?? null;
}

function chip(name: string): HTMLButtonElement {
  return button(name, root.querySelector("[role=group][aria-label='Outcome']") ?? root);
}

function selectionBar(): HTMLElement | null {
  return root.querySelector("[role=region][aria-label='Selected tasks']");
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
  vi.unstubAllGlobals();
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
    expect([...root.querySelectorAll("h1")].map((h1) => h1.textContent)).toEqual([
      "Skill Scout History",
    ]);
    expect(root.querySelector("[data-window-drag] h1")).not.toBeNull();
    expect(pageTab("Suggestions").getAttribute("aria-selected")).toBe("true");
    const panel = root.querySelector("[role=tabpanel]");
    expect(panel?.getAttribute("aria-labelledby")).toBe(pageTab("Suggestions").id);
    const groups = [...root.querySelectorAll("section[aria-label] > div > h2")].map(
      (title) => title.textContent,
    );
    expect(groups).toEqual(["Needs your decision", "Found locally", "History"]);
    expect(button("Expand History", root).getAttribute("aria-expanded")).toBe("false");
    expect(root.querySelector("[data-item='repeated:3~0']")).toBeNull();
    expect(detail()?.getAttribute("aria-label")).toBe("Rotate the signing key");
    const current = root.querySelector("[aria-current=true]");
    expect(current?.getAttribute("data-item")).toBe("complex:2~0");
    expect(current?.closest("li")?.hasAttribute("data-selected")).toBe(true);
    expect(page()?.hasAttribute("data-open")).toBe(false);

    await click(root.querySelector("[data-item='recovery:1']"));
    await settle();
    expect(host.face.page.getSnapshot().selected).toBe("recovery:1");
    expect(detail()?.getAttribute("aria-label")).toBe("Release a patch version");
    expect(page()?.hasAttribute("data-open")).toBe(true);
    await click(button("Back to the list", detail() ?? root));
    expect(host.face.page.getSnapshot().selected).toBeNull();
    expect(page()?.hasAttribute("data-open")).toBe(false);
  });

  test("leads the detail with a back button only while the page is one pane wide", async () => {
    const width = driveResize();
    const host = fakeHost(inboxOf([item()]));
    host.face.page.update({ selected: "repeated:1~0" });
    await render(host);
    await width.resize(1440);
    expect(detail()?.querySelector("[aria-label='Back to the list']")).toBeNull();
    await width.resize(720);
    await click(button("Back to the list", detail() ?? root));
    expect(host.face.page.getSnapshot().selected).toBeNull();
  });

  test.each([
    ["en", "en-US"],
    ["zh", "zh-CN"],
  ] as const)("writes a row's absolute time in the interface locale in %s", async (locale, tag) => {
    await render(fakeHost(inboxOf([item()])), locale);
    const time = root
      .querySelector("[data-item='repeated:1~0']")
      ?.closest("li")
      ?.querySelector("time[title]");
    expect(time?.getAttribute("title")).toBe(
      new Date(NOW - 60_000).toLocaleString(tag, { dateStyle: "medium", timeStyle: "short" }),
    );
  });

  test("lists only the card its open detail shows while the page is one pane wide", async () => {
    const waiting = item({ state: "drafting" });
    const done = item({
      id: "recovery:2~0",
      kind: "recovery",
      state: "drafting",
      title: "Reinstall deps",
    });
    const host = fakeHost(inboxOf([waiting, done], { working: 2 }));
    host.face.page.update({ selected: "repeated:1~0" });
    await render(host);
    host.inbox = inboxOf([waiting, { ...done, state: "ready" }], { working: 1 });
    await perform(() => host.store.refresh());
    await settle();
    expect(root.querySelector("[data-notice=result]")?.textContent).toContain(
      "Draft ready: Reinstall deps",
    );
  });

  test("lists every card while both panes are shown", async () => {
    const width = driveResize();
    const waiting = item({ state: "drafting" });
    const done = item({
      id: "recovery:2~0",
      kind: "recovery",
      state: "drafting",
      title: "Reinstall deps",
    });
    const host = fakeHost(inboxOf([waiting, done], { working: 2 }));
    host.face.page.update({ selected: "repeated:1~0" });
    await render(host);
    await width.resize(1200);
    await settle();
    host.inbox = inboxOf([waiting, { ...done, state: "ready" }], { working: 1 });
    await perform(() => host.store.refresh());
    await settle();
    expect(root.querySelector("[data-notice=result]")).toBeNull();
  });

  test("leads each row with its status dot and starts the metadata with the status word", async () => {
    const host = fakeHost(
      inboxOf([
        item({ id: "complex:2~0", state: "proposed" }),
        item({ ...UNSUMMARIZED, id: "recovery:1", kind: "recovery" }),
      ]),
    );
    await render(host);
    const rows = [...root.querySelectorAll("[data-item]")].map((open) => open.closest("li"));
    expect(
      rows.map((row) => row?.querySelector("[data-state]")?.getAttribute("data-state")),
    ).toEqual(["warning", "idle"]);
    expect(rows[0]?.querySelector("[data-status]")?.textContent).toBe("Summary ready");
    expect(rows[1]?.querySelector("[data-status]")?.textContent).toBe("No summary yet");
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
    expect(button("Collapse History", root).getAttribute("aria-expanded")).toBe("true");
    expect(detail()?.getAttribute("aria-label")).toBe("Old");
    expect(button("Restore", detail() ?? root)).toBeDefined();
  });

  test("highlights a card opened from outside the page once", async () => {
    const host = fakeHost(
      inboxOf([item(), item({ id: "recovery:2~0", kind: "recovery", title: "Reinstall deps" })]),
    );
    await render(host);
    await perform(() => showItem(host.face, "recovery:2~0"));
    const revealed = root.querySelector("[data-item='recovery:2~0']")?.closest("li");
    expect(revealed?.hasAttribute("data-highlight")).toBe(true);
    expect(detail()?.getAttribute("aria-label")).toBe("Reinstall deps");
    await click(root.querySelector("[data-item='repeated:1~0']"));
    expect(root.querySelector("li[data-highlight]")).toBeNull();
    expect(host.face.page.getSnapshot().reveal).toBeNull();
  });

  test("states the empty inbox as a fact with the analyzed sessions", async () => {
    await render(fakeHost(inboxOf([])));
    const empty = [...root.querySelectorAll("[data-empty]")].map((entry) => entry.textContent);
    expect(empty).toEqual(["No suggestions4 sessions analyzed", "No suggestion selected"]);
  });

  test("shows notices with an undo under the section tabs", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(button("Dismiss: Cut a local patch release", root));
    const notice = root.querySelector("[data-notice=result]");
    expect(notice?.getAttribute("role")).toBe("status");
    expect(notice?.textContent).toContain("Dismissed");
    await click(button("Undo", notice ?? root));
    expect(host.actions.at(-1)).toEqual({ action: "restore", id: "repeated:1~0" });
  });
});

describe("HistoryPage search", () => {
  test("searches after typing stops and right away on Enter, with the outcome chips", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host);
    await click(pageTab("Search"));
    expect(root.querySelector("[data-view=page]")?.getAttribute("data-tab")).toBe("search");
    expect(root.querySelector("select")).toBeNull();
    expect(root.textContent).toContain("Searches 4 tasks from 4 analyzed sessions");
    expect(chip("All outcomes").getAttribute("aria-pressed")).toBe("true");
    await type(searchBox(), "npm");
    await type(searchBox(), "npm test");
    expect(host.queries).toEqual([]);
    await wait(300);
    expect(host.queries).toEqual([{ q: "npm test", outcome: null, limit: 50 }]);

    await click(chip("Check passed"));
    await settle();
    expect(chip("Check passed").getAttribute("aria-pressed")).toBe("true");
    expect(chip("All outcomes").getAttribute("aria-pressed")).toBe("false");
    expect(host.queries.at(-1)).toEqual({ q: "npm test", outcome: "verified", limit: 50 });

    await type(searchBox(), "vitest");
    await press(searchBox(), "Enter");
    await settle();
    expect(host.queries.at(-1)).toEqual({ q: "vitest", outcome: "verified", limit: 50 });

    await click(button("Clear search", root));
    expect(searchBox()?.value).toBe("");
  });

  test("highlights the query in the matched lines and leads each result with a checkbox and its outcome dot", async () => {
    const host = fakeHost(inboxOf([]));
    host.face.page.update({ tab: "search", query: "npm test" });
    await render(host);
    await settle();
    expect(root.querySelector("section[aria-label='Results'] [role=status]")?.textContent).toBe(
      "3 matching tasks",
    );
    const first = root.querySelector("[data-episode='s1:8']");
    expect([...(first?.querySelectorAll("mark") ?? [])].map((mark) => mark.textContent)).toEqual([
      "npm",
      "test",
      "npm",
      "test",
    ]);
    expect(first?.querySelectorAll("[data-matches] code")).toHaveLength(2);
    expect(first?.textContent).toContain("Error: npm test failed");
    expect(first?.querySelector("input[type=checkbox]")).not.toBeNull();
    expect(first?.querySelector("[data-state]")?.getAttribute("data-state")).toBe("done");
    expect(
      root.querySelector("[data-episode='s3:4'] [data-state]")?.getAttribute("data-state"),
    ).toBe("idle");
    await click(button("Open session", first ?? root));
    expect(host.sessionsOpened).toEqual(["s1"]);
  });

  test("extracts the selected tasks from the selection bar and opens the new lead", async () => {
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
    expect(selectionBar()).toBeNull();
    await click(pick("Select Release a patch version"));
    await click(pick("Select Release another patch"));
    expect(selectionBar()?.textContent).toContain("2 selected");
    await click(button("Extract selected", selectionBar() ?? root));
    await settle();
    expect(host.actions).toEqual([{ action: "extract-selected", episodeIds: ["s1:8", "s2:8"] }]);
    expect(host.face.page.getSnapshot()).toMatchObject({
      tab: "suggestions",
      selected: "selected:0123456789abcdef",
      picked: [],
    });
    expect(detail()?.querySelector("[data-tone=outline]")?.textContent).toBe("Selected tasks");
    expect(detail()?.textContent).toContain("2 sessions");
    expect(detail()?.textContent).toContain("Queued");
    expect(
      root
        .querySelector("[data-item='selected:0123456789abcdef']")
        ?.closest("li")
        ?.hasAttribute("data-highlight"),
    ).toBe(true);
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
    await click(pick("Select Release a patch version"));
    await click(button("Extract selected", root));
    await settle();
    expect(host.face.page.getSnapshot().selected).toBe("selected:aaaaaaaaaaaaaaaa");
    expect(root.querySelector("[data-item][aria-current=true]")?.getAttribute("data-item")).toBe(
      reused.id,
    );
    expect(detail()?.getAttribute("aria-label")).toBe("Tag from package.json");
  });

  test("stops selecting at twelve tasks, clears the selection, and reads more rows on request", async () => {
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
    expect(root.textContent).toContain("Searches 90 tasks from 30 analyzed sessions");
    const boxes = [...root.querySelectorAll<HTMLInputElement>("input[type=checkbox]")];
    await act(async () => {
      for (const box of boxes.slice(0, PICK_LIMIT)) box.click();
    });
    const bar = selectionBar();
    expect(bar?.textContent).toContain("12 selected");
    expect(bar?.textContent).toContain("Up to 12 tasks");
    expect(boxes.at(-1)?.disabled).toBe(true);
    expect(boxes[0]?.disabled).toBe(false);
    await click(button("Clear", bar ?? root));
    expect(host.face.page.getSnapshot().picked).toEqual([]);
    expect(boxes.at(-1)?.disabled).toBe(false);
    expect(selectionBar()).toBeNull();

    await click(button("Show more", root));
    await settle();
    expect(host.queries.at(-1)).toEqual({ q: "task", outcome: null, limit: 100 });
  });

  test("names the query when nothing matches", async () => {
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
    expect(root.querySelector("[data-empty]")?.textContent).toBe('No tasks match "kubectl"');
    expect(root.querySelectorAll("[data-episode]")).toHaveLength(0);
  });

  test("reports a failed search with a retry under the query row", async () => {
    const host = fakeHost(inboxOf([]));
    const answer = host.answerSearch;
    let fail = true;
    host.answerSearch = (query) => {
      if (fail) throw new Error("index busy");
      return answer(query);
    };
    host.face.page.update({ tab: "search", query: "npm test" });
    await render(host);
    await settle();
    const alert = root.querySelector("[role=alert]");
    expect(alert?.textContent).toContain("Search failed: index busy");
    fail = false;
    await click(button("Retry", alert ?? root));
    await settle();
    expect(root.querySelector("[role=alert]")).toBeNull();
    expect(root.querySelectorAll("[data-episode]")).toHaveLength(3);
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

  test("shows real progress in the scope line and pauses, then resumes the same range", async () => {
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

  test("shows the listing step before the total is known and can pause it", async () => {
    const host = fakeHost(
      inboxOf([], { backfill: { range: "90d", state: "listing", total: 0, done: 0, failed: 0 } }),
    );
    host.face.page.update({ tab: "search" });
    await render(host);
    expect(root.textContent).toContain("Listing sessions");
    const bar = root.querySelector("[role=progressbar]");
    expect(bar).not.toBeNull();
    expect(bar?.hasAttribute("aria-valuenow")).toBe(false);
    expect(bar?.hasAttribute("aria-valuemax")).toBe(false);
    expect(button("Pause", root).disabled).toBe(false);
    await click(button("Pause", root));
    expect(host.actions).toEqual([{ action: "backfill-pause" }]);
  });
});
