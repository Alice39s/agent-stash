// @vitest-environment happy-dom
// @vitest-environment-options {"settings":{"device":{"prefersReducedMotion":"reduce"}}}
import { afterEach, describe, expect, test } from "vitest";
import { Working } from "./progress.tsx";
import { mount, progress, translator } from "./testing.tsx";

const t = translator("en");
let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
});

describe("Working with reduced motion", () => {
  test("keeps every bar and the label still while the text and lit bars still follow progress", async () => {
    const mounted = await mount(
      <Working
        stage="draft"
        progress={progress({ stage: "draft", chars: 800, expected: 1600 })}
        model="deepseek-pro"
        t={t}
      />,
    );
    unmount = mounted.unmount;
    const root = mounted.container;
    expect(root.firstElementChild?.getAttribute("data-motion")).toBe("reduce");
    const bars = [...root.querySelectorAll<HTMLElement>("[data-bar]")];
    expect(bars.map((bar) => bar.style.animationDelay)).toEqual(Array(8).fill(""));
    expect(bars.filter((bar) => bar.hasAttribute("data-lit"))).toHaveLength(4);
    expect(root.querySelector("[data-shimmer]")?.getAttribute("data-shimmer")).toBe("false");
    expect(root.querySelector("[role=status]")?.textContent).toBe(
      "Writing (800 characters received)",
    );
  });
});
