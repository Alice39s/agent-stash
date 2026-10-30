// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { button, click, mount, press } from "../../testing.tsx";
import { BulletChart, type BulletItem } from "./bullet-chart.tsx";
import { blur, driveResize, focus, hover, leave, tooltipText } from "./testing.tsx";

/** 线索到草稿的漏斗：每一步对上一步画出背景区间。 */
const FUNNEL: readonly BulletItem[] = [
  { key: "leads", label: "Leads", value: 10 },
  { key: "summarized", label: "Summarized", value: 6, range: 10, note: "60%" },
  { key: "drafted", label: "Drafted", value: 3, range: 6, note: "30%" },
];

const NAMES = { value: "Count", range: "Previous step", target: "Goal" };

let unmount: (() => void) | undefined;

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

async function render(node: ReactNode): Promise<HTMLElement> {
  const mounted = await mount(node);
  unmount = mounted.unmount;
  return mounted.container;
}

function part(root: HTMLElement, key: string, name: string): HTMLElement | null {
  return root.querySelector<HTMLElement>(`[data-key="${key}"] [data-part="${name}"]`);
}

function listOf(root: HTMLElement): HTMLUListElement {
  const list = root.querySelector("ul");
  if (list === null) throw new Error("没有列表");
  return list;
}

describe("BulletChart", () => {
  test("draws each row against the shared scale with its range and target", async () => {
    const root = await render(
      <BulletChart
        items={[...FUNNEL, { key: "written", label: "Written", value: 1, target: 5 }]}
        label="Funnel"
        empty="No leads"
        names={NAMES}
        width={480}
      />,
    );
    expect(root.querySelectorAll("li")).toHaveLength(4);
    expect(part(root, "leads", "fill")?.style.width).toBe("100%");
    expect(part(root, "summarized", "fill")?.style.width).toBe("60%");
    expect(part(root, "drafted", "range")?.style.width).toBe("60%");
    expect(part(root, "written", "target")?.style.left).toBe("50%");
    expect(part(root, "leads", "range")).toBeNull();
    expect(root.querySelector('[data-key="summarized"]')?.textContent).toContain("660%");
  });

  test("clamps values beyond the given maximum", async () => {
    const root = await render(
      <BulletChart
        items={[{ key: "analyzed", label: "Analyzed", value: 52, target: 48 }]}
        max={48}
        label="Coverage"
        empty="No sessions"
        names={NAMES}
        width={480}
      />,
    );
    expect(part(root, "analyzed", "fill")?.style.width).toBe("100%");
    expect(part(root, "analyzed", "target")?.style.left).toBe("100%");
  });

  test("shows the empty text when there is nothing to compare", async () => {
    const root = await render(
      <BulletChart items={[]} label="Funnel" empty="No leads" names={NAMES} width={480} />,
    );
    expect(root.textContent).toBe("No leads");
    expect(root.querySelector("ul")).toBeNull();
    unmount?.();
    const zeros = await render(
      <BulletChart
        items={[{ key: "leads", label: "Leads", value: 0 }]}
        label="Funnel"
        empty="No leads"
        names={NAMES}
      />,
    );
    expect(zeros.textContent).toBe("No leads");
  });

  test("puts the name on its own line when the container is narrow", async () => {
    const driver = driveResize();
    const root = await render(
      <BulletChart items={FUNNEL} label="Funnel" empty="No leads" names={NAMES} />,
    );
    const chart = root.firstElementChild;
    expect(chart?.getAttribute("data-layout")).toBe("inline");
    await driver.resize(300);
    expect(chart?.getAttribute("data-layout")).toBe("stacked");
    await driver.resize(640);
    expect(chart?.getAttribute("data-layout")).toBe("inline");
  });

  test("labels the list and reads the hidden figures of each row", async () => {
    const root = await render(
      <BulletChart items={FUNNEL} label="Funnel" empty="No leads" names={NAMES} width={480} />,
    );
    const list = listOf(root);
    expect(list.getAttribute("aria-label")).toBe("Funnel");
    expect(root.querySelector('[data-key="drafted"]')?.textContent).toContain("Previous step 6");
    expect(root.querySelector('[data-key="leads"]')?.textContent).toBe("Leads10");
  });

  test("walks the rows with the arrow keys and shows each value and range in a tooltip", async () => {
    const root = await render(
      <BulletChart items={FUNNEL} label="Funnel" empty="No leads" names={NAMES} width={480} />,
    );
    const list = listOf(root);
    expect(list.getAttribute("tabindex")).toBe("0");
    await focus(list);
    expect(tooltipText(root)).toBe("LeadsCount10");
    expect(list.getAttribute("aria-describedby")).toBe(root.querySelector("[role=tooltip]")?.id);
    await press(list, "ArrowDown");
    expect(tooltipText(root)).toBe("SummarizedCount6Previous step10");
    expect(root.querySelector("[data-active]")?.getAttribute("data-key")).toBe("summarized");
    await press(list, "End");
    expect(tooltipText(root)).toBe("DraftedCount3Previous step6");
    await press(list, "ArrowRight");
    expect(tooltipText(root)).toContain("Drafted");
    await press(list, "Escape");
    expect(tooltipText(root)).toBeNull();
    await press(list, "ArrowUp");
    expect(tooltipText(root)).toContain("Leads");
    await blur(list);
    expect(tooltipText(root)).toBeNull();
  });

  test("shows the row under the pointer", async () => {
    const root = await render(
      <BulletChart items={FUNNEL} label="Funnel" empty="No leads" names={NAMES} width={480} />,
    );
    await hover(root.querySelector('[data-key="drafted"] [data-part="fill"]'));
    expect(tooltipText(root)).toContain("Drafted");
    await leave(listOf(root));
    expect(tooltipText(root)).toBeNull();
  });

  test("makes each row a button when rows can be picked", async () => {
    const picked: string[] = [];
    const root = await render(
      <BulletChart
        items={[
          { key: "build", label: "pnpm build", value: 9 },
          { key: "test", label: "vitest run", value: 6 },
        ]}
        label="Frequent actions"
        empty="No actions"
        names={NAMES}
        onSelect={(key) => picked.push(key)}
        width={480}
      />,
    );
    expect(listOf(root).hasAttribute("tabindex")).toBe(false);
    const row = button(/vitest run/u, root);
    await focus(row);
    expect(tooltipText(root)).toBe("vitest runCount6");
    expect(row.getAttribute("aria-describedby")).toBe(root.querySelector("[role=tooltip]")?.id);
    await press(row, "Escape");
    expect(tooltipText(root)).toBeNull();
    await click(row);
    expect(picked).toEqual(["test"]);
    await blur(row);
    expect(tooltipText(root)).toBeNull();
  });

  test("requires a name for targets and ranges", async () => {
    // React 把渲染时抛出的错误再打印一遍；这里只看抛出的错误本身。
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      render(
        <BulletChart
          items={[{ key: "analyzed", label: "Analyzed", value: 4, target: 5 }]}
          label="Coverage"
          empty="No sessions"
          names={{ value: "Count" }}
          width={480}
        />,
      ),
    ).rejects.toThrow("names.target");
  });
});
