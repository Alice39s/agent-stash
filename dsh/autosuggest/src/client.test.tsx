// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mountOverlay, type ComposerHarness } from "../../shared/client/harness.tsx";
import { apply } from "./client.tsx";

const HISTORY = [
  {
    text: "帮我分析这个项目的缓存命中率，并给出优化建议。",
    time: new Date(2026, 9, 25, 20, 15).getTime(),
    sessionId: "a",
    title: "工程会话",
  },
  {
    text: "帮我对比这三个方案的优缺点，并给出推荐。",
    time: new Date(2026, 9, 21, 10, 0).getTime(),
    sessionId: "b",
    title: "产品调研",
  },
  { text: "Fix the build", time: new Date(2026, 9, 18, 9, 0).getTime(), sessionId: "c" },
];

let harness: ComposerHarness | undefined;
const requested: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 26, 12, 0) });
  vi.stubGlobal("fetch", (url: string) => {
    requested.push(url);
    return Promise.resolve(Response.json({ items: HISTORY }));
  });
});

afterEach(() => {
  harness?.unmount();
  harness = undefined;
  requested.length = 0;
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

async function mount(): Promise<ComposerHarness> {
  harness = await mountOverlay(apply, 100);
  await act(async () => {});
  return harness;
}

/** 打开着的面板；关闭后播放退场动画的面板不算。 */
const panel = (h: ComposerHarness) =>
  h.overlay().querySelector('[data-dsh-history-panel][data-state="open"]');
const ghost = (h: ComposerHarness) => h.overlay().querySelector("style")?.textContent ?? null;
const rows = (h: ComposerHarness) =>
  [...(panel(h)?.querySelectorAll('[role="option"]') ?? [])].map((row) => row.textContent);
/** 灰字出现动画用的关键帧名，换名字表示重新播放。 */
const ghostAnimation = (h: ComposerHarness) => /animation: (\S+)/u.exec(ghost(h) ?? "")?.[1];

describe("dsh-autosuggest overlay", () => {
  test("loads the global history", async () => {
    await mount();
    expect(requested).toEqual(["dsh-autosuggest/prompts"]);
  });

  test("typing a prefix shows the rest of the newest match as ghost text and lists every match", async () => {
    const h = await mount();
    await h.type("帮我");
    expect(ghost(h)).toContain('content: "分析这个项目的缓存命中率，并给出优化建议。"');
    expect(panel(h)?.textContent).toContain("History suggestions");
    expect(panel(h)?.textContent).toContain("01 / 02");
    expect(rows(h)).toEqual([
      "帮我分析这个项目的缓存命中率，并给出优化建议。工程会话 · Yesterday",
      "帮我对比这三个方案的优缺点，并给出推荐。产品调研 · 10-21",
    ]);
  });

  test("Tab fills the suggestion and ArrowDown switches to the next one first", async () => {
    const h = await mount();
    await h.type("帮我");
    expect(await h.press("ArrowDown")).toBe(true);
    expect(ghost(h)).toContain('content: "对比这三个方案的优缺点，并给出推荐。"');
    expect(await h.press("Tab")).toBe(true);
    expect(h.draft()).toBe("帮我对比这三个方案的优缺点，并给出推荐。");
    expect(panel(h)).toBeNull();
    expect(ghost(h)).toBeNull();
  });

  test("ArrowRight fills the only suggestion", async () => {
    const h = await mount();
    await h.type("Fix");
    expect(await h.press("ArrowRight")).toBe(true);
    expect(h.draft()).toBe("Fix the build");
  });

  test("the ghost text replays its entrance for a new suggestion only", async () => {
    const h = await mount();
    await h.type("帮我");
    const first = ghostAnimation(h);
    expect(first).toBe("dsh-stash-ghost-wave-a");
    await h.type("分析");
    expect(ghost(h)).toContain('content: "这个项目的缓存命中率，并给出优化建议。"');
    expect(ghostAnimation(h)).toBe(first);
    await h.write("");
    await h.type("帮我");
    await h.press("ArrowDown");
    expect(ghostAnimation(h)).toBe("dsh-stash-ghost-wave-b");
  });

  test("matching is case-sensitive on the whole prefix", async () => {
    const h = await mount();
    await h.type("fix");
    expect(panel(h)).toBeNull();
    expect(await h.press("Tab")).toBe(false);
  });

  test("Escape hides the suggestion until the draft changes", async () => {
    const h = await mount();
    await h.type("帮我分析");
    expect(await h.press("Escape")).toBe(true);
    expect(panel(h)).toBeNull();
    await h.type("这");
    expect(ghost(h)).toContain('content: "个项目的缓存命中率，并给出优化建议。"');
  });

  test("a draft written by another plugin gets no suggestion until the user types", async () => {
    const h = await mount();
    await h.write("帮我");
    expect(panel(h)).toBeNull();
    expect(await h.press("Tab")).toBe(false);
    await h.type("分");
    expect(ghost(h)).toContain('content: "析这个项目的缓存命中率，并给出优化建议。"');
  });

  test("suggests nothing while the caret is away from the end of the draft", async () => {
    const h = await mount();
    await h.type("帮我");
    await h.caretToStart();
    expect(panel(h)).toBeNull();
    expect(await h.press("Tab")).toBe(false);
  });
});
