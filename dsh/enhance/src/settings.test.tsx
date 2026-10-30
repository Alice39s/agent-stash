// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, describe, expect, test, vi } from "vitest";
import {
  createEnhanceSettings,
  createShortcuts,
  mountEnhance,
  type EnhanceHarness,
} from "./harness.tsx";
import type { CatalogGroup } from "./dsh.ts";
import { BUILTIN_INSTRUCTIONS } from "./presets.ts";

const CATALOG: CatalogGroup[] = [
  {
    id: "deepseek",
    name: "DeepSeek",
    models: [
      {
        id: "flash",
        name: "DeepSeek Flash",
        reasoning: {
          efforts: [
            { id: "off", name: "Off" },
            { id: "high", name: "High" },
          ],
          defaultEffort: "high",
        },
      },
      { id: "chat", name: "DeepSeek Chat" },
    ],
  },
];

let harness: EnhanceHarness | undefined;

afterEach(() => {
  harness?.unmount();
  harness = undefined;
});

async function open(
  value: Readonly<Record<string, unknown>> = {},
  catalog: () => Promise<readonly CatalogGroup[]> = async () => CATALOG,
) {
  const settings = createEnhanceSettings(value);
  const shortcuts = createShortcuts();
  harness = await mountEnhance({ settings, shortcuts, catalog });
  const page = await harness.openSettings();
  await act(async () => {});
  return { settings, page };
}

async function click(element: Element | null | undefined): Promise<void> {
  if (!(element instanceof HTMLElement)) throw new Error("nothing to click");
  await act(async () => element.click());
}

async function input(element: Element | null | undefined, value: string): Promise<void> {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
    throw new Error("not a text field");
  }
  // React 记录着输入框上一次的值，经原型上的 setter 写入才会被当作用户输入。
  const prototype =
    element instanceof HTMLInputElement
      ? HTMLInputElement.prototype
      : HTMLTextAreaElement.prototype;
  await act(async () => {
    Reflect.set(prototype, "value", value, element);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

const save = (page: HTMLElement) =>
  [...page.querySelectorAll("button")].find((button) => button.textContent === "Save");
const radio = (page: HTMLElement, name: string) =>
  [...page.querySelectorAll("label")]
    .find((label) => label.textContent?.startsWith(name))
    ?.querySelector<HTMLInputElement>('input[type="radio"]');

describe("enhance settings page", () => {
  test("follows the session model by default and lists the catalog", async () => {
    const { page } = await open();
    expect(radio(page, "Follow the session")?.checked).toBe(true);
    expect(page.textContent).toContain("DeepSeek Flashdeepseek/flash");
    expect(page.querySelector('[role="tablist"][aria-label="Reasoning effort"]')).toBeNull();
  });

  test("saves one chosen model with its reasoning effort", async () => {
    const { page, settings } = await open();
    await click(radio(page, "DeepSeek Flash"));
    const efforts = page.querySelector('[role="tablist"][aria-label="Reasoning effort"]');
    expect(
      [...(efforts?.querySelectorAll('[role="tab"]') ?? [])].map((tab) => tab.textContent),
    ).toEqual(["Model default", "Off", "High"]);
    await click([...(efforts?.querySelectorAll('[role="tab"]') ?? [])].at(1));
    await click(save(page));
    expect(settings.writes).toEqual([
      [
        { op: "set", path: ["provider"], value: "deepseek" },
        { op: "set", path: ["model"], value: "flash" },
        { op: "set", path: ["effort"], value: "off" },
      ],
    ]);
  });

  test("hides the effort choice for a model without reasoning efforts", async () => {
    const { page } = await open({ provider: "deepseek", model: "chat" });
    expect(radio(page, "DeepSeek Chat")?.checked).toBe(true);
    expect(page.querySelector('[role="tablist"][aria-label="Reasoning effort"]')).toBeNull();
  });

  test("keeps a configured model that the catalog no longer lists", async () => {
    const { page } = await open({ provider: "gone", model: "old" });
    expect(radio(page, "old (unavailable)")?.checked).toBe(true);
  });

  test("offers a retry when the model list cannot load", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    let calls = 0;
    const { page } = await open({}, async () => {
      calls += 1;
      if (calls === 1) throw new Error("offline");
      return CATALOG;
    });
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(
      "Could not load the model list.",
    );
    await click(
      [...page.querySelectorAll("button")].find((button) => button.textContent === "Retry"),
    );
    await act(async () => {});
    expect(page.textContent).toContain("DeepSeek Flash");
    expect(logged).toHaveBeenCalledOnce();
    logged.mockRestore();
  });

  test("saves the timeout, session context, and shortcut", async () => {
    const { page, settings } = await open();
    await input(page.querySelector('input[type="number"]'), "30");
    await click(page.querySelector('[role="switch"][aria-label="Include recent turns"]'));
    expect(page.textContent).not.toContain("Turns to include");
    await click(page.querySelector('[role="switch"][aria-label="Keyboard shortcut"]'));
    await click(save(page));
    expect(settings.writes).toEqual([
      [
        { op: "set", path: ["timeout"], value: 30 },
        { op: "set", path: ["context"], value: false },
        { op: "set", path: ["shortcut"], value: true },
      ],
    ]);
  });

  test("clamps numbers to their range", async () => {
    const { page, settings } = await open();
    const [timeout, turns] = page.querySelectorAll('input[type="number"]');
    await input(timeout, "9000");
    await input(turns, "0");
    await click(save(page));
    expect(settings.writes[0]).toEqual([
      { op: "set", path: ["timeout"], value: 600 },
      { op: "set", path: ["contextTurns"], value: 1 },
    ]);
  });

  test("names the default keys of the shortcut", async () => {
    const { page } = await open();
    expect(page.textContent).toMatch(/(⇧⌘E|Ctrl\+Shift\+E) opens the menu/u);
  });

  test("reorders, edits, and removes presets", async () => {
    const { page, settings } = await open();
    const buttons = (label: string) => [...page.querySelectorAll(`[aria-label="${label}"]`)];
    await click(buttons("Move down")[0]);
    await click(buttons("Remove")[2]);
    await click(
      [...page.querySelectorAll("button")].find((button) => button.textContent === "Edit"),
    );
    await input(page.querySelector("textarea"), "Rewrite as a numbered list.");
    await click(save(page));
    expect(settings.writes).toEqual([
      [
        {
          op: "set",
          path: ["presets"],
          value: [
            {
              id: "structure",
              title: "",
              description: "",
              prompt: "Rewrite as a numbered list.",
              icon: "",
            },
            { id: "polish", title: "", description: "", prompt: "", icon: "" },
          ],
        },
      ],
    ]);
  });

  test("shows the built-in instructions in the editor until they are changed", async () => {
    const { page, settings } = await open();
    await click(
      [...page.querySelectorAll("button")].find((button) => button.textContent === "Edit"),
    );
    const textarea = page.querySelector("textarea");
    expect(textarea?.value).toBe(BUILTIN_INSTRUCTIONS.polish);
    expect(page.querySelector(".dsh-enhance-preset-tag")?.textContent).toBe("Built-in");
    await input(textarea, `${BUILTIN_INSTRUCTIONS.polish}\nKeep it under 200 words.`);
    expect(page.querySelector(".dsh-enhance-preset-tag")?.textContent).toBe("Built-in, edited");
    await input(textarea, BUILTIN_INSTRUCTIONS.polish);
    expect(page.querySelector(".dsh-enhance-preset-tag")?.textContent).toBe("Built-in");
    expect(save(page)?.disabled).toBe(true);
    await input(textarea, "");
    expect(textarea?.value).toBe(BUILTIN_INSTRUCTIONS.polish);
    await input(textarea, "Polish it.");
    await click(save(page));
    expect(settings.writes[0]?.[0]).toMatchObject({
      path: ["presets"],
      value: [{ id: "polish", prompt: "Polish it." }, { id: "structure" }, { id: "concise" }],
    });
  });

  test("requires instructions before a custom preset can be saved", async () => {
    const { page, settings } = await open();
    await click(
      [...page.querySelectorAll("button")].find((button) =>
        button.textContent?.endsWith("Add preset"),
      ),
    );
    expect(page.textContent).toContain("A custom preset needs instructions.");
    expect(save(page)?.disabled).toBe(true);
    const [title] = page.querySelectorAll(".dsh-enhance-preset-form input");
    await input(title, "Translate");
    await input(page.querySelector("textarea"), "Translate the draft into English.");
    await click(save(page));
    const presets = settings.writes[0]?.[0];
    expect(presets).toMatchObject({ path: ["presets"] });
    expect(presets?.op === "set" ? presets.value : undefined).toEqual([
      { id: "polish", title: "", description: "", prompt: "", icon: "" },
      { id: "structure", title: "", description: "", prompt: "", icon: "" },
      { id: "concise", title: "", description: "", prompt: "", icon: "" },
      {
        id: expect.stringMatching(/^custom-/u),
        title: "Translate",
        description: "",
        prompt: "Translate the draft into English.",
        icon: "",
      },
    ]);
  });

  test("picks a preset icon from the DSH icon library", async () => {
    const { page, settings } = await open();
    const glyphs = () =>
      [...page.querySelectorAll(".dsh-enhance-preset-glyph svg")].map((svg) =>
        svg.getAttribute("data-icon"),
      );
    expect(glyphs()).toEqual(["sparkle", "flat-list-outline", "compact-outline"]);
    await click(
      [...page.querySelectorAll("button")].find((button) => button.textContent === "Edit"),
    );
    const group = page.querySelector('.dsh-enhance-icon-grid[role="radiogroup"]');
    expect(group?.getAttribute("aria-labelledby")).toBe(
      page.querySelector(".dsh-enhance-preset-form > .dsh-enhance-preset-label")?.id,
    );
    const radios = () => [...page.querySelectorAll<HTMLButtonElement>('[role="radio"]')];
    const checked = () => radios().find((option) => option.getAttribute("aria-checked") === "true");
    expect(radios()).toHaveLength(36);
    expect(checked()?.getAttribute("aria-label")).toBe("sparkle");
    expect(radios().filter((option) => option.tabIndex === 0)).toEqual([checked()]);
    await click(radios().find((option) => option.getAttribute("aria-label") === "globe"));
    expect(glyphs()[0]).toBe("globe-outline");
    expect(page.querySelector(".dsh-enhance-preset-tag")?.textContent).toBe("Built-in, edited");
    await click(save(page));
    expect(settings.writes[0]?.[0]).toMatchObject({
      value: [{ id: "polish", icon: "globe-outline" }, { icon: "" }, { icon: "" }],
    });
  });

  test("moves the icon choice with the arrow keys", async () => {
    const { page } = await open();
    await click(
      [...page.querySelectorAll("button")].find((button) => button.textContent === "Edit"),
    );
    const checked = () =>
      page.querySelector('[role="radio"][aria-checked="true"]')?.getAttribute("aria-label");
    const press = async (key: string): Promise<void> => {
      const target = page.querySelector<HTMLElement>('[role="radio"][aria-checked="true"]');
      await act(async () => {
        target?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      });
    };
    await press("ArrowRight");
    expect(checked()).toBe("enhance");
    expect(document.activeElement?.getAttribute("aria-label")).toBe("enhance");
    await press("ArrowDown");
    expect(checked()).toBe("light");
    await press("ArrowLeft");
    expect(checked()).toBe("think");
    await press("ArrowUp");
    expect(checked()).toBe("sparkle");
    await press("ArrowUp");
    expect(checked()).toBe("sparkle");
    await press("End");
    expect(checked()).toBe("paper plane");
    await press("Home");
    expect(checked()).toBe("sparkle");
    expect(page.querySelector(".dsh-enhance-preset-tag")?.textContent).toBe("Built-in");
  });

  test("restores a customized built-in preset", async () => {
    const { page, settings } = await open({
      presets: [
        {
          id: "polish",
          title: "Expand",
          description: "",
          prompt: "Expand it.",
          icon: "code-outline",
        },
      ],
    });
    await click(
      [...page.querySelectorAll("button")].find((button) => button.textContent === "Edit"),
    );
    await click(
      [...page.querySelectorAll("button")].find(
        (button) => button.textContent === "Restore built-in",
      ),
    );
    await click(save(page));
    expect(settings.writes[0]).toEqual([
      {
        op: "set",
        path: ["presets"],
        value: [{ id: "polish", title: "", description: "", prompt: "", icon: "" }],
      },
    ]);
  });

  test("keeps the staged changes when the write is refused", async () => {
    const { page, settings } = await open();
    settings.accept = false;
    await click(page.querySelector('[role="switch"][aria-label="Keyboard shortcut"]'));
    await click(save(page));
    expect(page.textContent).toContain("Saving failed. Your changes are kept, try again.");
    expect(
      page
        .querySelector('[role="switch"][aria-label="Keyboard shortcut"]')
        ?.getAttribute("aria-checked"),
    ).toBe("true");
  });
});
