// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, test } from "vitest";
import { mount } from "../testing.tsx";
import { DashCard } from "./dash-card.tsx";

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

describe("DashCard", () => {
  test("names the section with its h2 title and shows the summary on the trailing side", async () => {
    const root = await render(
      <DashCard title="Tasks per day" summary="43 tasks">
        <p>chart</p>
      </DashCard>,
    );
    const section = root.querySelector("section");
    const title = section?.querySelector("h2");
    expect(title?.textContent).toBe("Tasks per day");
    expect(section?.getAttribute("aria-labelledby")).toBe(title?.id);
    expect(section?.querySelector("header")?.textContent).toBe("Tasks per day43 tasks");
    expect(section?.textContent).toContain("chart");
    expect(section?.hasAttribute("aria-busy")).toBe(false);
  });

  test("leaves the trailing side empty without a summary and marks loading cards busy", async () => {
    const root = await render(
      <DashCard title="Recurring errors" busy>
        <p>rows</p>
      </DashCard>,
    );
    expect(root.querySelector("header")?.textContent).toBe("Recurring errors");
    expect(root.querySelector("section")?.getAttribute("aria-busy")).toBe("true");
  });
});
