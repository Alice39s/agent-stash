// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { mountOverlay, type ComposerHarness } from "../../shared/client/harness.tsx";
import { apply } from "./client.tsx";

const PROMPTS = [
  { text: "summarize last week's feedback", time: new Date(2026, 9, 25, 16, 33).getTime() },
  { text: "analyze the cache hit rate", time: new Date(2026, 9, 25, 20, 15).getTime() },
  { text: "compare the three options", time: new Date(2026, 9, 26, 9, 42).getTime() },
];

let harness: ComposerHarness | undefined;
const requested: string[] = [];

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 9, 26, 12, 0) });
  vi.stubGlobal("fetch", (url: string) => {
    requested.push(url);
    return Promise.resolve(Response.json({ items: PROMPTS }));
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
const activeText = (h: ComposerHarness) =>
  panel(h)?.querySelector('[role="option"][aria-selected="true"]')?.textContent;

describe("dsh-recall overlay", () => {
  test("loads the prompts of the current session", async () => {
    await mount();
    expect(requested).toEqual(["dsh-recall/prompts?session=s1"]);
  });

  test("ArrowUp in an empty composer shows the newest prompt in the draft and the panel", async () => {
    const h = await mount();
    expect(await h.press("ArrowUp")).toBe(true);
    expect(h.draft()).toBe("compare the three options");
    expect(panel(h)?.textContent).toContain("Prompt history");
    expect(panel(h)?.textContent).toContain("01 / 03");
    expect(activeText(h)).toBe("compare the three options09:42");
    const sections = [...h.overlay().querySelectorAll(".dsh-stash-section")].map(
      (node) => node.textContent,
    );
    expect(sections).toEqual(["Yesterday", "Today"]);
  });

  test("slides each recalled draft in from the direction of the walk", async () => {
    const h = await mount();
    const swap = () => h.editable.getAttribute("data-dsh-stash-swap");
    await h.press("ArrowUp");
    expect(swap()).toBe("older");
    await h.press("ArrowUp");
    expect(swap()).toBe("older");
    await h.press("ArrowDown");
    expect(swap()).toBe("newer");
    await h.press("Escape");
    expect(swap()).toBe("restore");
  });

  test("walks back through older prompts and returns to the draft past the newest", async () => {
    const h = await mount();
    await h.type("half");
    await h.caretToStart();
    await h.press("ArrowUp");
    await h.press("ArrowUp");
    expect(h.draft()).toBe("analyze the cache hit rate");
    expect(panel(h)?.textContent).toContain("02 / 03");
    await h.press("ArrowDown");
    expect(h.draft()).toBe("compare the three options");
    expect(await h.press("ArrowDown")).toBe(true);
    expect(h.draft()).toBe("half");
    expect(panel(h)).toBeNull();
  });

  test("Escape restores the draft and Tab keeps the recalled prompt", async () => {
    const h = await mount();
    await h.press("ArrowUp");
    await h.press("Escape");
    expect(h.draft()).toBe("");
    expect(panel(h)).toBeNull();

    await h.press("ArrowUp");
    expect(await h.press("Tab")).toBe(true);
    expect(h.draft()).toBe("compare the three options");
    expect(panel(h)).toBeNull();
  });

  test("Enter closes the panel and leaves the key to the composer", async () => {
    const h = await mount();
    await h.press("ArrowUp");
    expect(await h.press("Enter")).toBe(false);
    expect(panel(h)).toBeNull();
  });

  test("ArrowUp away from the start of the draft keeps moving the caret", async () => {
    const h = await mount();
    await h.type("line");
    expect(await h.press("ArrowUp")).toBe(false);
    expect(panel(h)).toBeNull();
  });

  test("a pointer pick fills the prompt and closes the panel", async () => {
    const h = await mount();
    await h.press("ArrowUp");
    const first = panel(h)?.querySelector<HTMLElement>('[role="option"]');
    await act(async () => {
      first?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    });
    expect(h.draft()).toBe("summarize last week's feedback");
    expect(panel(h)).toBeNull();
  });
});
