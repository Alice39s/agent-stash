// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, test } from "vitest";
import { button, click, mount } from "../../testing.tsx";
import { RankedList, type RankedItem } from "./ranked-list.tsx";

const WEEKS = [0, 1, 3, 2, 4, 4, 1, 5].map((value, index) => ({
  label: `W${String(index + 1)}`,
  value,
}));

const ACTIONS: readonly RankedItem[] = [
  {
    key: "build",
    label: "pnpm build",
    value: 8,
    trend: { label: "pnpm build per week", points: WEEKS },
  },
  {
    key: "test",
    label: "vitest run",
    value: 6,
    trend: { label: "vitest run per week", points: WEEKS },
  },
  { key: "lint", label: "oxlint", value: 2 },
];

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

describe("RankedList", () => {
  test("draws each bar relative to the top row", async () => {
    const root = await render(<RankedList items={ACTIONS} label="Frequent actions" empty="None" />);
    const fills = [...root.querySelectorAll<HTMLElement>('[data-part="fill"]')].map(
      (fill) => fill.style.width,
    );
    expect(fills).toEqual(["100%", "75%", "25%"]);
    expect(root.querySelector("ul")?.getAttribute("aria-label")).toBe("Frequent actions");
    expect(root.querySelector('[data-key="lint"]')?.textContent).toBe("oxlint2");
  });

  test("shows at most the top five rows", async () => {
    const many = Array.from({ length: 8 }, (_, index) => ({
      key: String(index),
      label: `item ${String(index)}`,
      value: 10 - index,
    }));
    const root = await render(<RankedList items={many} label="Ranked" empty="None" />);
    expect(root.querySelectorAll("li")).toHaveLength(5);
  });

  test("puts a still sparkline at the end of rows that have a trend", async () => {
    const root = await render(<RankedList items={ACTIONS} label="Frequent actions" empty="None" />);
    const sparks = [...root.querySelectorAll("svg")];
    expect(sparks).toHaveLength(2);
    expect(sparks[0]?.getAttribute("width")).toBe("64");
    expect(sparks[0]?.getAttribute("height")).toBe("20");
    expect(sparks[0]?.hasAttribute("tabindex")).toBe(false);
    expect(sparks[0]?.querySelector("title")?.textContent).toBe("pnpm build per week");
  });

  test("makes each row a button that reports its item", async () => {
    const picked: string[] = [];
    const root = await render(
      <RankedList
        items={ACTIONS}
        label="Frequent actions"
        empty="None"
        code
        formatValue={(value) => `${String(value)} sessions`}
        select={{
          label: (item) => `Search for ${item.label}`,
          onSelect: (item) => picked.push(item.key),
        }}
      />,
    );
    const row = button("Search for vitest run", root);
    expect(row.textContent).toContain("vitest run6 sessions");
    expect(row.querySelector("[data-code]")?.getAttribute("title")).toBe("vitest run");
    await click(row);
    expect(picked).toEqual(["test"]);
  });

  test("shows one line when nothing has a count", async () => {
    const root = await render(
      <RankedList items={[]} label="Frequent actions" empty="No actions" />,
    );
    expect(root.textContent).toBe("No actions");
    expect(root.querySelector("ul")).toBeNull();
  });
});
