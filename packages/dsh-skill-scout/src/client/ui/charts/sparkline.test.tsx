// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { mount, press } from "../../testing.tsx";
import { Sparkline } from "./sparkline.tsx";
import { blur, driveResize, focus, hover, leave, tooltipText } from "./testing.tsx";

/** 近 8 周的次数，最早的在前。 */
const WEEKS = [0, 1, 3, 2, 4, 4, 1, 5].map((value, index) => ({
  label: `W${String(index + 1)}`,
  value,
}));

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

function svgOf(root: HTMLElement): SVGSVGElement {
  const svg = root.querySelector("svg");
  if (svg === null) throw new Error("没有趋势线");
  return svg;
}

describe("Sparkline", () => {
  test("draws the line and puts a solid dot on the latest point", async () => {
    const root = await render(
      <Sparkline
        points={WEEKS}
        label="pnpm build per week"
        empty="No data"
        width={80}
        height={24}
      />,
    );
    expect(root.querySelector("path")?.getAttribute("d")).toMatch(/^M3,21L/u);
    const last = root.querySelector('[data-point="last"]');
    expect(last?.getAttribute("cx")).toBe("77");
    expect(last?.getAttribute("cy")).toBe("3");
  });

  test("shows the empty text when there are fewer than two points", async () => {
    const root = await render(
      <Sparkline
        points={WEEKS.slice(0, 1)}
        label="pnpm build per week"
        empty="No data"
        width={80}
      />,
    );
    expect(root.textContent).toBe("No data");
    expect(root.querySelector("svg")).toBeNull();
  });

  test("names the image and lists every point in its description", async () => {
    const root = await render(
      <Sparkline points={WEEKS.slice(-3)} label="pnpm build per week" empty="No data" width={80} />,
    );
    const svg = svgOf(root);
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.querySelector("title")?.textContent).toBe("pnpm build per week");
    const desc = svg.querySelector("desc");
    expect(desc?.textContent).toBe("W6 4, W7 1, W8 5");
    expect(svg.getAttribute("aria-describedby")).toBe(desc?.id);
  });

  test("follows the container width", async () => {
    const driver = driveResize();
    const root = await render(
      <Sparkline points={WEEKS} label="pnpm build per week" empty="No data" height={24} />,
    );
    expect(root.querySelector("svg")).toBeNull();
    await driver.resize(120);
    expect(svgOf(root).getAttribute("width")).toBe("120");
    expect(root.querySelector('[data-point="last"]')?.getAttribute("cx")).toBe("117");
    await driver.resize(60);
    expect(root.querySelector('[data-point="last"]')?.getAttribute("cx")).toBe("57");
  });

  test("walks the points with the arrow keys and shows each in a tooltip", async () => {
    const root = await render(
      <Sparkline points={WEEKS} label="pnpm build per week" empty="No data" width={80} />,
    );
    const svg = svgOf(root);
    await focus(svg);
    expect(tooltipText(root)).toBe("W8pnpm build per week5");
    expect(svg.getAttribute("aria-describedby")).toContain(
      root.querySelector("[role=tooltip]")?.id,
    );
    await press(svg, "ArrowLeft");
    expect(tooltipText(root)).toBe("W7pnpm build per week1");
    await press(svg, "Home");
    expect(tooltipText(root)).toBe("W1pnpm build per week0");
    await press(svg, "Escape");
    expect(tooltipText(root)).toBeNull();
    await press(svg, "End");
    expect(tooltipText(root)).toContain("W8");
    await blur(svg);
    expect(tooltipText(root)).toBeNull();
  });

  test("shows the point under the pointer", async () => {
    const root = await render(
      <Sparkline points={WEEKS} label="pnpm build per week" empty="No data" width={80} />,
    );
    await hover(root.querySelector('[data-point-label="W3"]'));
    expect(tooltipText(root)).toBe("W3pnpm build per week3");
    expect(root.querySelector('[data-point="active"]')).not.toBeNull();
    await leave(svgOf(root));
    expect(tooltipText(root)).toBeNull();
  });

  test("stays out of the tab order inside another control", async () => {
    const root = await render(
      <button type="button">
        <Sparkline
          points={WEEKS}
          label="pnpm build per week"
          empty="No data"
          width={80}
          interactive={false}
        />
      </button>,
    );
    const svg = svgOf(root);
    expect(svg.hasAttribute("tabindex")).toBe(false);
    expect(root.querySelector("[data-point-label]")).toBeNull();
    await focus(svg);
    await press(svg, "ArrowLeft");
    expect(tooltipText(root)).toBeNull();
    expect(svg.querySelector("title")?.textContent).toBe("pnpm build per week");
  });
});
