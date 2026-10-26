// @vitest-environment happy-dom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, test } from "vitest";
import { DEFAULT_APPEARANCE } from "./appearance.ts";
import { createSettings, mountKit, type KitHarness } from "./harness.tsx";
import type { PanelProps, StashKit } from "./service.ts";

let mounted: KitHarness | undefined;
const roots: Root[] = [];

afterEach(() => {
  act(() => {
    for (const root of roots.splice(0)) root.unmount();
  });
  mounted?.dispose();
  mounted = undefined;
  document.body.replaceChildren();
});

const ROWS = [
  { key: "1", text: "first", meta: "09:00" },
  { key: "2", text: "second", meta: "10:00" },
];

function panelProps(open: boolean, active = 1): PanelProps {
  return {
    owner: "test",
    open,
    title: "History",
    counter: "02 / 02",
    rows: ROWS,
    active,
    hints: [{ keys: ["↑", "↓"], label: "Browse" }],
    trailingHints: [{ keys: ["Esc"], label: "Close" }],
    onPick: () => {},
    onHover: () => {},
  };
}

/** 在一个输入框浮层位置渲染面板，返回重新渲染用的函数。 */
async function renderPanel(
  kit: StashKit,
  props: PanelProps,
): Promise<(next: PanelProps) => Promise<void>> {
  const { Panel } = kit;
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  roots.push(root);
  const render = async (next: PanelProps): Promise<void> => {
    await act(async () => root.render(<Panel {...next} />));
  };
  await render(props);
  return render;
}

const panel = () => document.querySelector<HTMLElement>("[data-dsh-history-panel]");
const button = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll("button")].find((node) => node.textContent === name);
const tab = (root: HTMLElement, name: string) =>
  [...root.querySelectorAll('[role="tab"]')].find((node) => node.textContent === name);
const click = async (node: Element | undefined | null): Promise<void> => {
  if (node === undefined || node === null) throw new Error("the control is not rendered");
  await act(async () => node.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};

describe("stashKit service", () => {
  test("installs one stylesheet and removes it on unload", () => {
    mounted = mountKit();
    expect(document.head.querySelectorAll('style[data-plugin="dsh-stash-kit"]')).toHaveLength(1);
    mounted.dispose();
    mounted = undefined;
    expect(document.head.querySelector('style[data-plugin="dsh-stash-kit"]')).toBeNull();
  });

  test("starts from the default appearance and follows what the Host publishes", async () => {
    const settings = createSettings({ glass: false, motion: "subtle" });
    mounted = mountKit(settings);
    const { appearance } = mounted.kit;
    expect(appearance.get()).toEqual({ ...DEFAULT_APPEARANCE, glass: false, motion: "subtle" });
    await settings.publish({ density: "compact" });
    expect(appearance.get()).toEqual({ ...DEFAULT_APPEARANCE, density: "compact" });
  });

  test("keeps the default appearance when the settings service is off", () => {
    mounted = mountKit();
    expect(mounted.kit.appearance.get()).toEqual(DEFAULT_APPEARANCE);
  });
});

describe("Panel", () => {
  test("carries the appearance on the panel and re-renders when it changes", async () => {
    const settings = createSettings({});
    mounted = mountKit(settings);
    await renderPanel(mounted.kit, panelProps(true));
    const attrs = () =>
      Object.fromEntries(
        ["glass", "motion", "highlight", "density", "state", "fresh"].map((name) => [
          name,
          panel()?.getAttribute(`data-${name}`) ?? null,
        ]),
      );
    expect(attrs()).toEqual({
      glass: "",
      motion: "lively",
      highlight: "glide",
      density: "comfortable",
      state: "open",
      fresh: "",
    });
    expect(panel()?.querySelector(".dsh-stash-glide")).not.toBeNull();
    expect(panel()?.querySelector(".dsh-stash-footer")?.textContent).toContain("Browse");

    await settings.publish({
      glass: false,
      highlight: "instant",
      density: "compact",
      hints: false,
    });
    expect(attrs()).toMatchObject({ glass: null, highlight: "instant", density: "compact" });
    expect(panel()?.querySelector(".dsh-stash-glide")).toBeNull();
    expect(panel()?.querySelector(".dsh-stash-footer")).toBeNull();
  });

  test("plays its exit before unmounting, then leaves nothing behind", async () => {
    mounted = mountKit();
    const render = await renderPanel(mounted.kit, panelProps(true));
    await render(panelProps(false));
    expect(panel()?.dataset["state"]).toBe("closing");
    expect(panel()?.getAttribute("aria-hidden")).toBe("true");
    const target = panel();
    await act(async () => {
      target?.dispatchEvent(new Event("animationend", { bubbles: true }));
    });
    expect(panel()).toBeNull();
  });

  test("reopening during the exit brings the same panel back open", async () => {
    mounted = mountKit();
    const render = await renderPanel(mounted.kit, panelProps(true));
    await render(panelProps(false));
    await render(panelProps(true, 0));
    expect(panel()?.dataset["state"]).toBe("open");
    expect(panel()?.querySelector('[aria-selected="true"]')?.textContent).toContain("first");
  });

  test("closes at once when motion is off", async () => {
    mounted = mountKit(createSettings({ motion: "off" }));
    const render = await renderPanel(mounted.kit, panelProps(true));
    await render(panelProps(false));
    expect(panel()).toBeNull();
  });

  test("ignores pointer picks while it is leaving", async () => {
    mounted = mountKit();
    const picks: number[] = [];
    const render = await renderPanel(mounted.kit, {
      ...panelProps(true),
      onPick: (i) => picks.push(i),
    });
    await render({ ...panelProps(false), onPick: (i) => picks.push(i) });
    await act(async () => {
      panel()
        ?.querySelector('[role="option"]')
        ?.dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }));
    });
    expect(picks).toEqual([]);
  });

  test("adds the macOS backing beside the open panel and drops it when the exit starts", async () => {
    mounted = mountKit(createSettings({}));
    const render = await renderPanel(mounted.kit, panelProps(true));
    const backing = document.querySelector<HTMLElement>(".dsh-stash-backing");
    expect(backing?.parentElement).toBe(document.body);
    expect(backing?.dataset["glass"]).toBe("");
    expect(backing?.style.getPropertyValue("--dsh-stash-anchor")).toBe(
      panel()?.style.getPropertyValue("--dsh-stash-anchor"),
    );
    await render(panelProps(false));
    expect(document.querySelector(".dsh-stash-backing")).toBeNull();
  });
});

/** 在共用的根节点里渲染一份灰字。 */
async function renderGhost(kit: StashKit, identity: string, suffix: string): Promise<void> {
  const { Ghost } = kit;
  const element: ReactNode = (
    <Ghost attribute="data-test" marker="m" suffix={suffix} identity={identity} />
  );
  if (roots.length === 0) {
    const host = document.createElement("div");
    document.body.append(host);
    roots.push(createRoot(host));
  }
  await act(async () => roots[0]?.render(element));
}
const ghostSheet = () => document.body.querySelector("style")?.textContent ?? "";
const animation = () => /animation: (\S+)/u.exec(ghostSheet())?.[1];

describe("Ghost", () => {
  test("replays the entrance when the suggestion changes and holds it while typing along", async () => {
    mounted = mountKit();
    await renderGhost(mounted.kit, "a", "bcd");
    expect(animation()).toBe("dsh-stash-ghost-wave-a");
    await renderGhost(mounted.kit, "a", "cd");
    expect(animation()).toBe("dsh-stash-ghost-wave-a");
    await renderGhost(mounted.kit, "b", "xyz");
    expect(animation()).toBe("dsh-stash-ghost-wave-b");
  });

  test("shows the suffix without animation when motion is off", async () => {
    mounted = mountKit(createSettings({ motion: "off", ghost: "wave" }));
    await renderGhost(mounted.kit, "a", "bcd");
    expect(ghostSheet()).toContain('content: "bcd"');
    expect(ghostSheet().split("@media")[0]).not.toContain("animation");
  });
});

/** 一张只有可编辑区的输入框卡片。 */
function card(): HTMLElement {
  const node = document.createElement("div");
  node.dataset["composerCard"] = "";
  const editable = document.createElement("div");
  editable.setAttribute("contenteditable", "true");
  node.append(editable);
  document.body.append(node);
  return node;
}
const swap = (node: HTMLElement) =>
  node.querySelector('[contenteditable="true"]')?.getAttribute("data-dsh-stash-swap");

describe("swapDraft", () => {
  test("marks the editable with the walk direction and clears it after the animation", () => {
    mounted = mountKit();
    const node = card();
    mounted.kit.swapDraft(node, "older");
    expect(swap(node)).toBe("older");
    node.querySelector('[contenteditable="true"]')?.dispatchEvent(new Event("animationend"));
    expect(swap(node)).toBeNull();
  });

  test("leaves the draft still unless motion is lively", () => {
    mounted = mountKit(createSettings({ motion: "subtle" }));
    const node = card();
    mounted.kit.swapDraft(node, "newer");
    expect(swap(node)).toBeNull();
  });
});

describe("settings page", () => {
  test("previews the staged appearance and writes only the changed fields on save", async () => {
    const settings = createSettings({});
    mounted = mountKit(settings);
    const page = await mounted.openSettings();
    expect(page.textContent).toContain("Preview");
    const preview = () => page.querySelector<HTMLElement>("[data-dsh-history-panel]");
    expect(preview()?.dataset["preview"]).toBe("");
    expect(preview()?.dataset["motion"]).toBe("lively");

    await click(tab(page, "Subtle"));
    await click(page.querySelector('[role="switch"][aria-label="Frosted glass"]'));
    expect(preview()?.dataset["motion"]).toBe("subtle");
    expect(preview()?.dataset["glass"]).toBeUndefined();
    expect(settings.writes).toEqual([]);
    expect(mounted.kit.appearance.get()).toEqual(DEFAULT_APPEARANCE);

    await click(button(page, "Save"));
    expect(settings.writes).toEqual([
      [
        { op: "set", path: ["glass"], value: false },
        { op: "set", path: ["motion"], value: "subtle" },
      ],
    ]);
    expect(mounted.kit.appearance.get()).toMatchObject({ glass: false, motion: "subtle" });
    expect(button(page, "Save")?.disabled).toBe(true);
  });

  test("replay restarts the preview animations", async () => {
    mounted = mountKit(createSettings({}));
    const page = await mounted.openSettings();
    const before = page.querySelector("[data-dsh-history-panel]");
    await click(button(page, "Replay"));
    const after = page.querySelector("[data-dsh-history-panel]");
    expect(after).not.toBe(before);
    expect(after?.getAttribute("data-fresh")).toBe("");
  });

  test("a refused write keeps the staged value and says so", async () => {
    const settings = createSettings({});
    settings.accept = false;
    mounted = mountKit(settings);
    const page = await mounted.openSettings();
    await click(tab(page, "Compact"));
    await click(button(page, "Save"));
    expect(page.textContent).toContain("Saving failed. The settings are unchanged.");
    expect(tab(page, "Compact")?.getAttribute("aria-selected")).toBe("true");
  });

  test("a read-only profile locks every control", async () => {
    mounted = mountKit(createSettings({}, false));
    const page = await mounted.openSettings();
    expect(page.textContent).toContain("This profile does not accept changes from the page.");
    const controls = [...page.querySelectorAll<HTMLButtonElement>('[role="switch"], [role="tab"]')];
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.every((control) => control.disabled)).toBe(true);
  });
});
