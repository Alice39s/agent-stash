// @vitest-environment happy-dom
import { describe, expect, test, vi } from "vitest";
import type { ItemView } from "../shared.ts";
import { everyItem, finishedItems, pollInterval } from "./store.ts";
import { fakeHost, inboxOf, item, progress, settle, UNSUMMARIZED } from "./testing.tsx";

describe("pollInterval", () => {
  test("polls every second while a model writes a summary or draft", () => {
    expect(pollInterval(inboxOf([item({ state: "drafting" })], { working: 1 }))).toBe(1_000);
  });

  test("polls every few seconds while sessions are analyzed, read by a backfill, or a write is checked", () => {
    expect(pollInterval(inboxOf([], { scanning: true }))).toBe(3_000);
    const running = { range: "90d", state: "running", total: 40, done: 3, failed: 0 } as const;
    expect(pollInterval(inboxOf([], { backfill: running }))).toBe(3_000);
    expect(pollInterval(inboxOf([], { backfill: { ...running, state: "paused" } }))).toBe(45_000);
    const checking = item({
      state: "written",
      write: {
        at: 0,
        scope: "project",
        skill: "x",
        path: "~/x/SKILL.md",
        discovered: false,
        checking: true,
      },
    });
    expect(pollInterval(inboxOf([checking]))).toBe(3_000);
  });

  test("polls rarely when nothing is in progress", () => {
    expect(pollInterval(inboxOf([item()]))).toBe(45_000);
    expect(pollInterval(null)).toBe(45_000);
  });
});

/** 没有表面列出任何卡片。 */
function nothing(): boolean {
  return false;
}

/** 只有 `id` 这张卡片在眼前。 */
function showing(id: string): (entry: ItemView) => boolean {
  return (entry) => entry.id === id;
}

describe("finishedItems", () => {
  const summarizing = item({ ...UNSUMMARIZED, state: "summarizing", progress: progress() });

  test("follows a lead card to its first idea once the summary proposes ideas", () => {
    const after = inboxOf([
      item({ state: "proposed", ideaCount: 2 }),
      item({ id: "repeated:1~1", state: "proposed", ideaCount: 2 }),
    ]);
    const done = finishedItems(inboxOf([summarizing]), after, nothing);
    expect(done.map((entry) => [entry.item.id, entry.ideas])).toEqual([["repeated:1~0", 2]]);
  });

  test("reports skipped summaries and finished or failed drafts", () => {
    const drafting = item({ state: "drafting" });
    const failed = item({
      id: "recovery:2~0",
      state: "failed",
      failure: { stage: "draft", kind: "timeout", message: "", at: 0, attempts: 1 },
    });
    const done = finishedItems(
      inboxOf([summarizing, drafting, { ...failed, state: "drafting", failure: null }]),
      inboxOf([item({ ...UNSUMMARIZED, state: "skipped" }), item(), failed]),
      nothing,
    );
    expect(done.map((entry) => [entry.item.id, entry.item.state])).toEqual([
      ["repeated:1", "skipped"],
      ["repeated:1~0", "ready"],
      ["recovery:2~0", "failed"],
    ]);
  });

  test("leaves out the card on screen, cards still in progress, and the first read", () => {
    const after = inboxOf([item({ state: "proposed" })]);
    expect(finishedItems(inboxOf([summarizing]), after, showing("repeated:1"))).toEqual([]);
    expect(finishedItems(inboxOf([summarizing]), after, showing("repeated:1~0"))).toEqual([]);
    expect(finishedItems(inboxOf([summarizing]), inboxOf([summarizing]), nothing)).toEqual([]);
    expect(finishedItems(null, after, nothing)).toEqual([]);
  });
});

describe("createInboxStore notices", () => {
  test("announces a finished request with a link to the card", async () => {
    const host = fakeHost(inboxOf([item({ state: "drafting" })], { working: 1 }));
    await host.store.refresh();
    expect(host.store.getSnapshot().notice).toBeNull();
    host.inbox = inboxOf([item({ state: "ready" })]);
    await host.store.refresh();
    expect(host.store.getSnapshot().notice).toEqual({
      key: "notice.done.ready",
      params: { title: "Cut a local patch release", count: "0" },
      undo: null,
      view: "repeated:1~0",
    });
    host.store.dispose();
  });

  test("counts several requests that finish together and links to the first", async () => {
    const host = fakeHost(
      inboxOf([item({ state: "drafting" }), item({ id: "complex:2~0", state: "drafting" })]),
    );
    await host.store.refresh();
    host.inbox = inboxOf([item({ state: "ready" }), item({ id: "complex:2~0", state: "ready" })]);
    await host.store.refresh();
    await settle();
    expect(host.store.getSnapshot().notice).toMatchObject({
      key: "notice.done.many",
      params: { count: "2" },
      view: "repeated:1~0",
    });
    host.store.dispose();
  });

  test("reads again a few seconds after an action even when nothing is in progress", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const host = fakeHost(inboxOf([]));
    let reads = 0;
    const read = host.store.subscribe(() => {
      reads += 1;
    });
    await vi.advanceTimersByTimeAsync(0);
    const before = reads;
    await host.store.act({ action: "backfill-pause" });
    const afterAct = reads;
    host.inbox = inboxOf([], {
      backfill: { range: "90d", state: "paused", total: 40, done: 4, failed: 0 },
    });
    await vi.advanceTimersByTimeAsync(3_000);
    expect(afterAct).toBeGreaterThan(before);
    expect(host.store.getSnapshot().inbox?.status.backfill?.done).toBe(4);
    read();
    host.store.dispose();
    vi.useRealTimers();
  });

  test("raises no notice for work that ends on a card a visible surface lists", async () => {
    const host = fakeHost(
      inboxOf([item({ state: "drafting" }), item({ id: "complex:2~0", state: "drafting" })]),
    );
    await host.store.refresh();
    const stop = host.store.listing((entry) => entry.id === "repeated:1~0");
    host.inbox = inboxOf([
      item({ state: "ready" }),
      item({ id: "complex:2~0", state: "drafting" }),
    ]);
    await host.store.refresh();
    expect(host.store.getSnapshot().notice).toBeNull();

    stop();
    host.inbox = inboxOf([item({ state: "ready" }), item({ id: "complex:2~0", state: "ready" })]);
    await host.store.refresh();
    expect(host.store.getSnapshot().notice).toMatchObject({
      key: "notice.done.ready",
      view: "complex:2~0",
    });

    const all = host.store.listing(everyItem);
    host.store.clearNotice();
    host.inbox = inboxOf([item({ state: "drafting" })], { working: 1 });
    await host.store.refresh();
    host.inbox = inboxOf([item({ state: "ready" })]);
    await host.store.refresh();
    expect(host.store.getSnapshot().notice).toBeNull();
    all();
    host.store.dispose();
  });

  test("tracks which cards are on screen and whether the page shows notices", () => {
    const host = fakeHost(inboxOf([]));
    const first = host.store.watch("a");
    const second = host.store.watch("a");
    const release = host.store.hostNotices();
    expect(host.store.getSnapshot()).toMatchObject({ viewing: ["a"], hosting: true });
    first();
    expect(host.store.getSnapshot().viewing).toEqual(["a"]);
    second();
    release();
    expect(host.store.getSnapshot()).toMatchObject({ viewing: [], hosting: false });
  });

  test("forgets the surfaces and the cards on screen once disposed", async () => {
    const host = fakeHost(inboxOf([item({ state: "drafting" })], { working: 1 }));
    await host.store.refresh();
    host.store.watch("repeated:1~0");
    host.store.listing(everyItem);
    host.store.hostNotices();
    host.store.dispose();
    expect(host.store.getSnapshot()).toMatchObject({ viewing: [], hosting: false });

    // 清干净之后，同一张卡片结束不再算「在眼前」，提示照常发出。
    host.inbox = inboxOf([item({ state: "ready" })]);
    await host.store.refresh();
    expect(host.store.getSnapshot().notice).toMatchObject({
      key: "notice.done.ready",
      view: "repeated:1~0",
    });
  });
});
