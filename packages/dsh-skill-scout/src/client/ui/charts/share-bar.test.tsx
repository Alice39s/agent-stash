// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { button, click, mount, press } from "../../testing.tsx";
import { ShareBar, type ShareSegment } from "./share-bar.tsx";
import { blur, enter, focus, hover, leave, tooltipText } from "./testing.tsx";
import { LEAD_COLORS } from "./theme.ts";

const LEADS: readonly ShareSegment[] = [
  { key: "summarized", label: "Summarized", value: 6, color: LEAD_COLORS.summarized },
  { key: "detected", label: "Waiting", value: 3, color: LEAD_COLORS.detected },
  { key: "skipped", label: "Not worth saving", value: 0, color: LEAD_COLORS.skipped },
  { key: "failed", label: "Failed", value: 1, color: LEAD_COLORS.failed },
];

let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.restoreAllMocks();
});

async function render(node: ReactNode): Promise<HTMLElement> {
  const mounted = await mount(node);
  unmount = mounted.unmount;
  return mounted.container;
}

function barOf(root: HTMLElement): HTMLElement {
  const bar = root.querySelector<HTMLElement>("[role=img]");
  if (bar === null) throw new Error("没有占比条");
  return bar;
}

function widths(root: HTMLElement): (string | null)[][] {
  return [...root.querySelectorAll<HTMLElement>("[data-segment]")].map((segment) => [
    segment.getAttribute("data-segment"),
    segment.style.width,
  ]);
}

describe("ShareBar", () => {
  test("splits the bar by share and leaves out empty categories", async () => {
    const root = await render(
      <ShareBar segments={LEADS} label="Leads by state" empty="No leads" />,
    );
    expect(widths(root)).toEqual([
      ["summarized", "60%"],
      ["detected", "30%"],
      ["failed", "10%"],
    ]);
    expect(root.querySelector('[data-segment="failed"]')?.getAttribute("style")).toContain(
      "var(--dsw-alias-state-error-primary)",
    );
  });

  test("lists each category with its count above the bar", async () => {
    const root = await render(
      <ShareBar segments={LEADS} label="Leads by state" empty="No leads" />,
    );
    expect([...root.querySelectorAll("[data-legend]")].map((item) => item.textContent)).toEqual([
      "Summarized6",
      "Waiting3",
      "Failed1",
    ]);
    await click(button(/^Waiting/u, root));
    expect(widths(root)).toEqual([
      ["summarized", "85.71428571428571%"],
      ["failed", "14.285714285714285%"],
    ]);
  });

  test("describes every category with its count and share for screen readers", async () => {
    const root = await render(
      <ShareBar segments={LEADS} label="Leads by state" empty="No leads" legend={false} />,
    );
    expect(root.querySelector("[data-legend]")).toBeNull();
    const bar = barOf(root);
    expect(bar.getAttribute("aria-label")).toBe("Leads by state");
    const desc = document.getElementById(bar.getAttribute("aria-describedby") ?? "");
    expect(desc?.textContent).toBe("Summarized 6 (60%), Waiting 3 (30%), Failed 1 (10%)");
  });

  test("describes the visible total after a legend category is hidden", async () => {
    const root = await render(
      <ShareBar segments={LEADS} label="Leads by state" empty="No leads" />,
    );
    await click(button(/^Waiting/u, root));
    const bar = barOf(root);
    const [descId = ""] = (bar.getAttribute("aria-describedby") ?? "").split(" ");
    expect(document.getElementById(descId)?.textContent).toBe("Summarized 6 (86%), Failed 1 (14%)");
    await focus(bar);
    expect(tooltipText(root)).toBe("Summarized686%");
  });

  test("shows one line instead of the bar when every category is zero", async () => {
    const root = await render(
      <ShareBar
        segments={LEADS.map((segment) => ({ ...segment, value: 0 }))}
        label="Leads by state"
        empty="No leads"
      />,
    );
    expect(root.textContent).toBe("No leads");
    expect(root.querySelector("[role=img]")).toBeNull();
  });

  test("walks the categories with the arrow keys and fades the others", async () => {
    const root = await render(
      <ShareBar segments={LEADS} label="Leads by state" empty="No leads" />,
    );
    const bar = barOf(root);
    expect(bar.getAttribute("tabindex")).toBe("0");
    await focus(bar);
    expect(tooltipText(root)).toBe("Summarized660%");
    expect(bar.getAttribute("aria-describedby")).toContain(
      root.querySelector("[role=tooltip]")?.id,
    );
    const faded = (): (string | null)[] =>
      [...root.querySelectorAll("[data-segment][data-faded]")].map((segment) =>
        segment.getAttribute("data-segment"),
      );
    expect(faded()).toEqual(["detected", "failed"]);
    await press(bar, "ArrowRight");
    expect(tooltipText(root)).toBe("Waiting330%");
    await press(bar, "End");
    expect(tooltipText(root)).toBe("Failed110%");
    await press(bar, "Escape");
    expect(tooltipText(root)).toBeNull();
    expect(faded()).toEqual([]);
    await blur(bar);
  });

  test("shows the category under the pointer", async () => {
    const root = await render(
      <ShareBar segments={LEADS} label="Leads by state" empty="No leads" />,
    );
    await hover(root.querySelector('[data-segment="detected"]'));
    expect(tooltipText(root)).toBe("Waiting330%");
    await leave(barOf(root));
    expect(tooltipText(root)).toBeNull();
    await enter(button(/^Failed/u, root));
    expect(
      [...root.querySelectorAll("[data-segment][data-faded]")].map((segment) =>
        segment.getAttribute("data-segment"),
      ),
    ).toEqual(["summarized", "detected"]);
  });

  test("rejects more than six categories", async () => {
    // React 把渲染时抛出的错误再打印一遍；这里只看抛出的错误本身。
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const seven = Array.from({ length: 7 }, (_, index) => ({
      key: String(index),
      label: String(index),
      value: 1,
      color: "var(--test)",
    }));
    await expect(
      render(<ShareBar segments={seven} label="Too many" empty="None" />),
    ).rejects.toThrow("at most 6");
  });
});
