// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { act } from "react";
import type { ProgressView } from "../shared.ts";
import { litBars, Working } from "./progress.tsx";
import { mount, NOW, progress, translator } from "./testing.tsx";

const t = translator("en");
let unmount: (() => void) | undefined;

async function render(value: ProgressView | null, stage: "summary" | "draft" = "summary") {
  const mounted = await mount(
    <Working stage={stage} progress={value} model="deepseek-flash" t={t} />,
  );
  unmount = mounted.unmount;
  return mounted.container;
}

function bars(root: HTMLElement): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>("[data-bar]")];
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("litBars", () => {
  test("lights bars in proportion to the characters received while writing", () => {
    expect(litBars(progress({ chars: 0 }), 5)).toBe(0);
    expect(litBars(progress({ chars: 450 }), 5)).toBe(2);
    expect(litBars(progress({ chars: 899 }), 5)).toBe(4);
    expect(litBars(progress({ chars: 2400 }), 5)).toBe(5);
  });

  test("lights every bar while checking and none before the text starts", () => {
    expect(litBars(progress({ phase: "checking" }), 8)).toBe(8);
    expect(litBars(progress({ phase: "thinking", chars: 0 }), 8)).toBe(0);
    expect(litBars(progress({ phase: "waiting", chars: 0 }), 8)).toBe(0);
    expect(litBars(null, 8)).toBe(0);
  });
});

describe("Working", () => {
  test.each([
    ["queued", "Queued"],
    ["preparing", "Preparing the evidence"],
    ["waiting", "Waiting for the model"],
    ["thinking", "The model is thinking"],
    ["writing", "Writing (450 characters received)"],
    ["checking", "Checking against the evidence"],
  ] as const)("names the %s phase", async (phase, label) => {
    const root = await render(progress({ phase }));
    expect(root.querySelector("[role=status]")?.textContent).toBe(label);
  });

  test("updates the elapsed time every second", async () => {
    const root = await render(progress({ startedAt: NOW - 59_000 }));
    expect(root.textContent).toContain("59s elapsed");
    await act(async () => {
      vi.advanceTimersByTime(1_000);
    });
    expect(root.textContent).toContain("1m 00s elapsed");
  });

  test("keeps lit bars still and lets the rest pulse in a staggered wave", async () => {
    const root = await render(progress({ chars: 900, expected: 1600 }), "draft");
    const all = bars(root);
    expect(all).toHaveLength(8);
    const lit = all.filter((bar) => bar.hasAttribute("data-lit"));
    expect(lit).toHaveLength(4);
    expect(lit.map((bar) => bar.style.animationDelay)).toEqual(["", "", "", ""]);
    expect(all.slice(4).map((bar) => bar.style.animationDelay)).toEqual([
      "350ms",
      "420ms",
      "490ms",
      "560ms",
    ]);
    expect(root.firstElementChild?.getAttribute("data-motion")).toBe("full");
    expect(root.querySelector("[data-shimmer]")?.getAttribute("data-shimmer")).toBe("true");
  });

  test("names the model and stage before the Host reports progress", async () => {
    const root = await render(null);
    expect(root.querySelector("[role=status]")?.textContent).toBe(
      "deepseek-flash is writing the summary",
    );
    expect(root.textContent).not.toContain("elapsed");
  });
});
