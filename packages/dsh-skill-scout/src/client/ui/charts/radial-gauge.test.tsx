// @vitest-environment happy-dom
import type { ReactNode } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { mount, press } from "../../testing.tsx";
import { RadialGauge } from "./radial-gauge.tsx";
import { blur, driveResize, focus, hover, leave, tooltipText } from "./testing.tsx";

const DETAILS = [
  { label: "Analyzed", value: "40" },
  { label: "In range", value: "48" },
];

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
  if (svg === null) throw new Error("没有仪表");
  return svg;
}

describe("RadialGauge", () => {
  test("splits the ring into segments and fills them up to the value", async () => {
    const root = await render(
      <RadialGauge value={89} max={100} label="Coverage" empty="No sessions" width={240} />,
    );
    expect(root.querySelectorAll('[data-part="track"]')).toHaveLength(10);
    expect(root.querySelectorAll('[data-part="fill"]')).toHaveLength(9);
    expect(root.textContent).toContain("89%");
  });

  test("states the ratio and caption to screen readers", async () => {
    const root = await render(
      <RadialGauge
        value={40}
        max={48}
        label="Analyzed sessions"
        caption="40 / 48"
        empty="No sessions"
        width={240}
      />,
    );
    const svg = svgOf(root);
    expect(svg.getAttribute("role")).toBe("img");
    expect(svg.querySelector("title")?.textContent).toBe("Analyzed sessions");
    expect(svg.querySelector("desc")?.textContent).toBe("83%, 40 / 48");
    expect(svg.hasAttribute("tabindex")).toBe(false);
    expect(root.querySelectorAll('[data-part="fill"]')).toHaveLength(9);
  });

  test("shows the empty text when the ratio has no denominator", async () => {
    const root = await render(
      <RadialGauge value={0} max={0} label="Coverage" empty="No sessions" width={240} />,
    );
    expect(root.textContent).toBe("No sessions");
    expect(root.querySelector("svg")).toBeNull();
  });

  test("shrinks with a narrow container and stops growing at its size", async () => {
    const driver = driveResize();
    const root = await render(
      <RadialGauge value={1} max={2} label="Coverage" empty="No sessions" size={160} />,
    );
    expect(root.querySelector("svg")).toBeNull();
    await driver.resize(120);
    expect(svgOf(root).getAttribute("width")).toBe("120");
    await driver.resize(600);
    expect(svgOf(root).getAttribute("width")).toBe("160");
  });

  test("shows the details in a tooltip on keyboard focus until Escape", async () => {
    const root = await render(
      <RadialGauge
        value={40}
        max={48}
        label="Analyzed sessions"
        details={DETAILS}
        empty="No sessions"
        width={240}
      />,
    );
    const svg = svgOf(root);
    expect(svg.getAttribute("tabindex")).toBe("0");
    await focus(svg);
    expect(tooltipText(root)).toBe("Analyzed sessionsAnalyzed40In range48");
    expect(svg.getAttribute("aria-describedby")).toContain(
      root.querySelector("[role=tooltip]")?.id,
    );
    await press(svg, "Escape");
    expect(tooltipText(root)).toBeNull();
    await press(svg, "ArrowRight");
    expect(tooltipText(root)).toContain("In range48");
    await blur(svg);
    expect(tooltipText(root)).toBeNull();
    await hover(svg);
    expect(tooltipText(root)).toContain("Analyzed40");
    await leave(svg);
    expect(tooltipText(root)).toBeNull();
  });

  test("rejects a ring without segments", async () => {
    // React 把渲染时抛出的错误再打印一遍；这里只看抛出的错误本身。
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(
      render(
        <RadialGauge
          value={1}
          max={2}
          segments={0}
          label="Coverage"
          empty="No sessions"
          width={240}
        />,
      ),
    ).rejects.toThrow("segments");
  });
});
