// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  createEnhanceSettings,
  createShortcuts,
  mountEnhance,
  type EnhanceHarness,
} from "./harness.tsx";
import { BUSY } from "./styles.ts";

interface Pending {
  readonly url: string;
  readonly body: unknown;
  readonly signal: AbortSignal;
  respond(status: number, body: unknown): Promise<void>;
}

let harness: EnhanceHarness | undefined;
const pending: Pending[] = [];
const contextReads: string[] = [];

beforeEach(() => {
  vi.stubGlobal("fetch", (url: string, init?: RequestInit) => {
    if (url.startsWith("dsh-enhance/context")) {
      contextReads.push(url);
      return Promise.resolve(Response.json({ turns: 2 }));
    }
    return new Promise<Response>((resolve, reject) => {
      const signal = init?.signal ?? new AbortController().signal;
      signal.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
      pending.push({
        url,
        body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
        signal,
        async respond(status, body) {
          await act(async () => {
            resolve(Response.json(body, { status }));
            await new Promise((done) => setTimeout(done, 0));
          });
        },
      });
    });
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(0), 0),
  );
});

afterEach(() => {
  harness?.unmount();
  harness = undefined;
  pending.length = 0;
  contextReads.length = 0;
  vi.unstubAllGlobals();
});

async function mount(options: Parameters<typeof mountEnhance>[0] = {}): Promise<EnhanceHarness> {
  harness = await mountEnhance(options);
  return harness;
}

const button = (h: EnhanceHarness) =>
  h.slot().querySelector<HTMLButtonElement>(".dsh-enhance-button:not([data-state=done])");
const undoButton = (h: EnhanceHarness) =>
  h.slot().querySelector<HTMLButtonElement>('.dsh-enhance-button[data-state="done"]');
const status = (h: EnhanceHarness) => h.slot().querySelector(".dsh-enhance-status");
const menuItems = (h: EnhanceHarness) => [...h.slot().querySelectorAll('[role="menuitem"]')];

async function click(element: Element | null | undefined): Promise<void> {
  if (!(element instanceof HTMLElement)) throw new Error("nothing to click");
  await act(async () => element.click());
}

/** 等 requestAnimationFrame 里排队的焦点移动执行完。 */
async function nextFrame(): Promise<void> {
  await act(async () => {
    await new Promise((done) => setTimeout(done, 0));
  });
}

async function openMenu(h: EnhanceHarness): Promise<void> {
  await click(button(h));
}

async function choose(h: EnhanceHarness, title: string): Promise<Pending> {
  await openMenu(h);
  await click(menuItems(h).find((item) => item.textContent?.startsWith(title)));
  const request = pending.at(-1);
  if (request === undefined) throw new Error("no rewrite request");
  return request;
}

describe("enhance button", () => {
  test("stays hidden while the draft is empty", async () => {
    const h = await mount();
    expect(button(h)).toBeNull();
    await h.type("   ");
    expect(button(h)).toBeNull();
    await h.type("fix the login page");
    expect(button(h)?.getAttribute("aria-label")).toBe("Enhance prompt");
  });

  test("names the linked turns in its tooltip and menu", async () => {
    const h = await mount();
    await h.type("do what we planned");
    await act(async () => {});
    expect(contextReads).toEqual(["dsh-enhance/context?session=s1"]);
    expect(button(h)?.parentElement?.dataset["tooltip"]).toBe(
      "Enhance prompt · Linked to the last 2 turns",
    );
    await openMenu(h);
    expect(h.slot().querySelector('[role="menu"]')?.textContent).toContain(
      "Linked to the last 2 turns",
    );
  });

  test("lists the three built-in presets with their descriptions", async () => {
    const h = await mount();
    await h.type("x");
    await openMenu(h);
    expect(menuItems(h).map((item) => item.textContent)).toEqual([
      "Polish promptFuller wording that opens up the solution space",
      "Structure onlyReorganize for the AI without changing the meaning",
      "Make it conciseKeep the key points, good for dictated text",
      "Manage presets…",
    ]);
    expect(menuItems(h)[2]?.getAttribute("aria-keyshortcuts")).toBe("3");
  });

  test("opens the plugin details from the menu", async () => {
    const h = await mount();
    await h.type("x");
    await openMenu(h);
    await click(menuItems(h).at(-1));
    expect(h.navigated).toEqual(["@agent-stash/dsh-enhance"]);
  });

  test("locks the draft while rewriting and writes the result in place", async () => {
    const h = await mount();
    await h.selectModel({ provider: "deepseek", model: "flash", reasoningEffort: "high" });
    await h.type("um fix the login thing");
    const request = await choose(h, "Make it concise");
    expect(request.url).toBe("dsh-enhance/rewrite");
    expect(request.body).toEqual({
      session: "s1",
      preset: "concise",
      draft: "um fix the login thing",
      model: { provider: "deepseek", model: "flash", reasoningEffort: "high" },
    });
    expect(h.editable.inert).toBe(true);
    expect(h.card.hasAttribute(BUSY)).toBe(true);
    expect(button(h)?.getAttribute("aria-label")).toBe("Stop enhancing");
    expect(status(h)?.textContent).toBe("Enhancing…");

    await request.respond(200, { text: "Fix the login page.", unchanged: false, turns: 2 });
    expect(h.draft()).toBe("Fix the login page.");
    expect(h.editable.inert).toBe(false);
    expect(h.card.hasAttribute(BUSY)).toBe(false);
    expect(undoButton(h)?.getAttribute("aria-label")).toBe("Undo enhancement");
  });

  test("undoes the rewrite with one click", async () => {
    const h = await mount();
    await h.type("um fix the login thing");
    const request = await choose(h, "Polish prompt");
    await request.respond(200, { text: "Fix the login page.", unchanged: false, turns: 0 });
    await click(undoButton(h));
    expect(h.draft()).toBe("um fix the login thing");
    expect(undoButton(h)).toBeNull();
  });

  test("undoes a chain of rewrites back to the draft the user wrote", async () => {
    const h = await mount();
    await h.type("um fix the login thing");
    await (
      await choose(h, "Polish prompt")
    ).respond(200, { text: "Fix the login page.", unchanged: false, turns: 0 });
    await (
      await choose(h, "Make it concise")
    ).respond(200, { text: "Fix login.", unchanged: false, turns: 0 });
    expect(h.draft()).toBe("Fix login.");
    await click(undoButton(h));
    expect(h.draft()).toBe("um fix the login thing");
  });

  test("drops the undo once the user edits the result", async () => {
    const h = await mount();
    await h.type("um fix the login thing");
    await (
      await choose(h, "Polish prompt")
    ).respond(200, { text: "Fix the login page.", unchanged: false, turns: 0 });
    await h.type("Fix the login page and the signup page.");
    expect(undoButton(h)).toBeNull();
  });

  test("stops a running rewrite with Escape and keeps the draft", async () => {
    const h = await mount();
    await h.type("fix login");
    const request = await choose(h, "Polish prompt");
    await act(async () => {
      h.editable.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(request.signal.aborted).toBe(true);
    expect(h.editable.inert).toBe(false);
    expect(h.draft()).toBe("fix login");
    expect(status(h)).toBeNull();
    await nextFrame();
    expect(document.activeElement).toBe(h.editable);
  });

  test("stops a running rewrite from the button", async () => {
    const h = await mount();
    await h.type("fix login");
    const request = await choose(h, "Polish prompt");
    await click(button(h));
    expect(request.signal.aborted).toBe(true);
    expect(button(h)?.getAttribute("aria-label")).toBe("Enhance prompt");
  });

  test("abandons the rewrite when the draft is sent meanwhile", async () => {
    const h = await mount();
    await h.type("fix login");
    const request = await choose(h, "Polish prompt");
    await h.type("");
    expect(request.signal.aborted).toBe(true);
    expect(button(h)).toBeNull();
  });

  test("shows a failure inline with the provider's reason in a tooltip", async () => {
    const h = await mount();
    await h.type("fix login");
    const request = await choose(h, "Polish prompt");
    await request.respond(502, { reason: "model", message: "deepseek/flash: 429 rate limited" });
    const alert = h.slot().querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("The model request failed");
    expect(alert?.querySelector("[data-tooltip]")?.getAttribute("data-tooltip")).toBe(
      "deepseek/flash: 429 rate limited",
    );
    expect(h.draft()).toBe("fix login");
    await click(alert?.querySelector('[aria-label="Dismiss"]'));
    expect(h.slot().querySelector('[role="alert"]')).toBeNull();
  });

  test("names the timeout without repeating it in a tooltip", async () => {
    const h = await mount({ settings: createEnhanceSettings({ timeout: 30 }) });
    await h.type("fix login");
    const request = await choose(h, "Polish prompt");
    await request.respond(504, { reason: "timeout", message: "no result within 30 s" });
    const alert = h.slot().querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("No result within 30 s");
    expect(alert?.querySelector("[data-tooltip]")).toBeNull();
  });

  test("clears a failure when the draft changes", async () => {
    const h = await mount();
    await h.type("fix login");
    await (
      await choose(h, "Polish prompt")
    ).respond(502, { reason: "model", message: "deepseek/flash: 401" });
    expect(h.slot().querySelector('[role="alert"]')?.textContent).toBe("The model request failed");
    await h.type("fix login now");
    expect(h.slot().querySelector('[role="alert"]')).toBeNull();
  });

  test("tells the user when the draft needs no change", async () => {
    const h = await mount();
    await h.type("Run the tests.");
    await (
      await choose(h, "Make it concise")
    ).respond(200, { text: "Run the tests.", unchanged: true, turns: 0 });
    expect(status(h)?.textContent).toBe("Already clear, nothing changed");
    expect(undoButton(h)).toBeNull();
  });

  test("explains why a draft with reference chips cannot be enhanced", async () => {
    const h = await mount();
    await h.type("compare these");
    await h.references(1);
    expect(button(h)?.getAttribute("aria-disabled")).toBe("true");
    expect(button(h)?.parentElement?.dataset["tooltip"]).toBe(
      "Remove the reference chips to enhance this draft",
    );
    await openMenu(h);
    expect(h.slot().querySelector('[role="menu"]')).toBeNull();
  });

  test("runs a preset by its number key", async () => {
    const h = await mount();
    await h.type("x");
    await openMenu(h);
    await act(async () => {
      h.slot()
        .querySelector('[role="menu"]')
        ?.dispatchEvent(new KeyboardEvent("keydown", { key: "2", bubbles: true }));
    });
    expect(pending.at(-1)?.body).toMatchObject({ preset: "structure" });
  });

  test("lists custom presets from the settings", async () => {
    const settings = createEnhanceSettings({
      presets: [
        { id: "custom-1", title: "Translate", description: "Into English", prompt: "Translate." },
      ],
    });
    const h = await mount({ settings });
    await h.type("x");
    await openMenu(h);
    expect(menuItems(h)[0]?.textContent).toBe("TranslateInto English");
  });
});

describe("enhance shortcut", () => {
  test("registers no command while the shortcut is off", async () => {
    const shortcuts = createShortcuts();
    await mount({ settings: createEnhanceSettings(), shortcuts });
    expect(shortcuts.commands).toEqual([]);
  });

  test("binds ⇧⌘E / Ctrl+Shift+E once the shortcut is on", async () => {
    const shortcuts = createShortcuts();
    const settings = createEnhanceSettings();
    await mount({ settings, shortcuts });
    await settings.publish({ shortcut: true });
    expect(shortcuts.commands.map((command) => command.id)).toEqual(["dsh-enhance.enhance"]);
    expect(shortcuts.commands[0]?.defaults["web:macos"]).toEqual({
      code: "KeyE",
      modifiers: ["primary", "shift"],
    });
    expect(shortcuts.commands[0]?.defaults["web:linux"]).toBeUndefined();
    await settings.publish({ shortcut: false });
    expect(shortcuts.commands).toEqual([]);
  });

  test("registers the command without keys when the default overlaps another command", async () => {
    const shortcuts = createShortcuts();
    shortcuts.overlap = true;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await mount({ settings: createEnhanceSettings({ shortcut: true }), shortcuts });
    expect(shortcuts.commands[0]?.defaults).toEqual({});
    expect(warn).toHaveBeenCalledOnce();
  });

  test("opens the menu, stops a rewrite, and undoes the result", async () => {
    const shortcuts = createShortcuts();
    const h = await mount({ settings: createEnhanceSettings({ shortcut: true }), shortcuts });
    expect(await shortcuts.press(h.editable)).toBe("pass");
    await h.type("fix login");
    expect(await shortcuts.press(h.editable)).toBe("handled");
    expect(h.slot().querySelector('[role="menu"]')).not.toBeNull();
    await click(menuItems(h)[0]);
    const request = pending.at(-1);
    await shortcuts.press(h.editable);
    expect(request?.signal.aborted).toBe(true);
    await (
      await choose(h, "Polish prompt")
    ).respond(200, { text: "Fix the login page.", unchanged: false, turns: 0 });
    await shortcuts.press(h.editable);
    expect(h.draft()).toBe("fix login");
  });

  test("moves the keyboard to the menu so a number key picks a preset", async () => {
    const shortcuts = createShortcuts();
    const h = await mount({ settings: createEnhanceSettings({ shortcut: true }), shortcuts });
    await h.type("fix login");
    h.editable.focus();
    await shortcuts.press(h.editable);
    expect(document.activeElement).toBe(button(h));
    await act(async () => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "2", bubbles: true, cancelable: true }),
      );
    });
    expect(pending.at(-1)?.body).toMatchObject({ preset: "structure" });
  });

  test("hands the keyboard back to the draft when the shortcut closes the menu", async () => {
    const shortcuts = createShortcuts();
    const h = await mount({ settings: createEnhanceSettings({ shortcut: true }), shortcuts });
    await h.type("fix login");
    h.editable.focus();
    await shortcuts.press(h.editable);
    await shortcuts.press(h.slot());
    await nextFrame();
    expect(h.slot().querySelector('[role="menu"]')).toBeNull();
    expect(document.activeElement).toBe(h.editable);
  });

  test("leaves the keys to another menu on top", async () => {
    const shortcuts = createShortcuts();
    const h = await mount({ settings: createEnhanceSettings({ shortcut: true }), shortcuts });
    await h.type("fix login");
    const other = document.createElement("div");
    other.setAttribute("role", "menu");
    document.body.append(other);
    expect(await shortcuts.press(h.editable)).toBe("pass");
    expect(h.slot().querySelector('[role="menu"]')).toBeNull();
    other.remove();
  });

  test("shows the bound keys in the tooltip", async () => {
    const shortcuts = createShortcuts();
    const h = await mount({ settings: createEnhanceSettings({ shortcut: true }), shortcuts });
    await h.type("x");
    expect(button(h)?.parentElement?.dataset["tooltipKeys"]).toBe("⇧ ⌘ E");
  });
});
