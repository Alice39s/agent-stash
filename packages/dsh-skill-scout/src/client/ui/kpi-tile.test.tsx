// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, test } from "vitest";
import { mount } from "../testing.tsx";
import { KpiTile } from "./kpi-tile.tsx";

let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
});

async function render(node: ReactNode): Promise<HTMLElement> {
  const mounted = await mount(node);
  unmount = mounted.unmount;
  return mounted.container;
}

describe("KpiTile", () => {
  test("stacks the label, the value line with its trend, the context, and the content below", async () => {
    const root = await render(
      <KpiTile label="Sessions analyzed" value="40" context="of 120" trend={<i data-trend="" />}>
        <i data-share="" />
      </KpiTile>,
    );
    const tile = root.querySelector("[role=group]");
    expect([...(tile?.children ?? [])].map((child) => child.textContent)).toEqual([
      "Sessions analyzed",
      "40",
      "of 120",
      "",
    ]);
    // 趋势线与数值在同一行，排在数值后面。
    const valueLine = tile?.children[1];
    expect(valueLine?.querySelector("[data-kpi-value] + * [data-trend]")).not.toBeNull();
    expect(tile?.lastElementChild?.querySelector("[data-share]")).not.toBeNull();
    const label = document.getElementById(tile?.getAttribute("aria-labelledby") ?? "");
    expect(label?.textContent).toBe("Sessions analyzed");
    expect(tile?.hasAttribute("aria-busy")).toBe(false);
  });

  test("keeps the full label and context in their titles", async () => {
    const root = await render(
      <KpiTile label="Tasks, last 30 days" value="12" context="50% passed a check" />,
    );
    const lines = [...root.querySelectorAll("[role=group] > p")];
    expect(lines.map((line) => line.getAttribute("title"))).toEqual([
      "Tasks, last 30 days",
      "50% passed a check",
    ]);
    expect(root.querySelector("[data-kpi-context]")?.hasAttribute("tabindex")).toBe(false);
    expect(root.querySelector("[data-tooltip]")).toBeNull();
  });

  test("puts the breakdown of the value into a tooltip on the context line that Tab reaches", async () => {
    const root = await render(
      <KpiTile
        label="Sessions analyzed"
        value="40"
        context="of 120"
        detail="48 in range · 12 by backfill"
      />,
    );
    const context = root.querySelector<HTMLElement>("[data-kpi-context]");
    expect(context?.textContent).toBe("of 120");
    expect(context?.tabIndex).toBe(0);
    expect(context?.closest("[data-tooltip]")?.getAttribute("data-tooltip")).toBe(
      "48 in range · 12 by backfill",
    );
  });

  test("draws a skeleton bar in place of the value while loading", async () => {
    const root = await render(
      <KpiTile label="Sessions analyzed" value={null} context="of 120" trend={<i data-trend="" />}>
        <i data-share="" />
      </KpiTile>,
    );
    const value = root.querySelector("[data-kpi-value]");
    expect(value?.querySelector<HTMLElement>("[data-skeleton]")?.style.height).toBe("24px");
    expect(root.textContent).toBe("Sessions analyzed");
    expect(root.querySelector("[data-trend]")).toBeNull();
    expect(root.querySelector("[data-share]")).toBeNull();
    expect(root.querySelector("[role=group]")?.getAttribute("aria-busy")).toBe("true");
  });
});
