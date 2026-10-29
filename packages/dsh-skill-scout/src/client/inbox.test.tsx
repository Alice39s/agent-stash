// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { createSeenStore, InboxEntry } from "./inbox.tsx";
import {
  button,
  click,
  detailOf,
  fakeHost,
  inboxOf,
  item,
  mount,
  NOW,
  press,
  settle,
  translator,
  type FakeHost,
} from "./testing.tsx";

const t = translator("en");
let unmount: (() => void) | undefined;

async function render(host: FakeHost) {
  const view = await mount(
    <InboxEntry
      inbox={host.store}
      seen={createSeenStore(window.localStorage)}
      loadDetail={async (id) => {
        const found = host.inbox.items.find((entry) => entry.id === id);
        if (found === undefined) throw new Error(`no item ${id}`);
        return detailOf(found);
      }}
      openSession={null}
      t={t}
    />,
  );
  unmount = view.unmount;
  return view;
}

function trigger(): HTMLButtonElement {
  return button(/^Skill suggestions/u);
}

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[role=dialog][aria-label='Skill suggestions']");
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("createSeenStore", () => {
  test("treats a damaged record as empty", () => {
    window.localStorage.setItem("agent-stash-skill-scout:seen", "{not json");
    const seen = createSeenStore(window.localStorage);
    expect(seen.has("a")).toBe(false);
    seen.add(["a"]);
    expect(seen.has("a")).toBe(true);
  });

  test("remembers seen suggestions in memory when storage refuses writes", () => {
    const writes: string[] = [];
    const seen = createSeenStore({
      getItem: () => null,
      setItem: (key) => {
        writes.push(key);
        throw new DOMException("full", "QuotaExceededError");
      },
    });
    seen.add(["a", "b"]);
    expect(writes).toEqual(["agent-stash-skill-scout:seen"]);
    expect(seen.has("b")).toBe(true);
  });
});

describe("InboxEntry", () => {
  test("renders nothing until the first inbox arrives", async () => {
    const host = fakeHost(inboxOf([item()]));
    const gate = Promise.withResolvers<void>();
    host.gate = gate.promise;
    const { container } = await render(host);
    expect(container.innerHTML).toBe("");
    gate.resolve();
    await settle();
    expect(trigger().getAttribute("aria-label")).toBe("Skill suggestions, 1 new");
  });

  test("shows a quiet count for new suggestions and clears it once the inbox is opened", async () => {
    const host = fakeHost(
      inboxOf([
        item(),
        item({
          id: "recovery:1",
          kind: "recovery",
          state: "detected",
          title: null,
          decision: null,
        }),
      ]),
    );
    await render(host);
    expect(trigger().querySelector("span")?.textContent).toBe("1");

    await click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    const text = panel()?.textContent ?? "";
    expect(text).toContain("Ready to save");
    expect(text).toContain("Cut a local patch release");
    expect(text).toContain("Found locally");
    expect(text).toContain("Not reviewed");
    expect(text).toContain("Repeated workflow · 2 sessions · 1 min ago");
    expect(trigger().getAttribute("aria-label")).toBe("Skill suggestions");
    expect(trigger().querySelector("span")).toBeNull();
  });

  test("keeps the icon without a number when notifications are quiet", async () => {
    const host = fakeHost(inboxOf([item()], { notify: "quiet" }));
    await render(host);
    expect(trigger().getAttribute("aria-label")).toBe("Skill suggestions, 1 new");
    expect(trigger().querySelector("span")).toBeNull();
  });

  test("explains the empty inbox", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host);
    await click(trigger());
    const text = panel()?.textContent ?? "";
    expect(text).toContain("No suggestions");
    expect(text).toContain("4 sessions analyzed");
  });

  test("tells the user when no review model is available", async () => {
    const pending = item({ state: "detected", title: null, decision: null });
    const host = fakeHost(inboxOf([pending], { model: null }));
    await render(host);
    await click(trigger());
    expect(panel()?.textContent).toContain("No review model is available.");
  });

  test("dismisses a card with an undo that restores it", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(trigger());
    await click(button("Dismiss: Cut a local patch release"));
    expect(host.actions).toEqual([{ action: "dismiss", id: "repeated:1", similar: false }]);
    expect(panel()?.querySelector("[role=status]")?.textContent).toContain("Dismissed");

    await click(button("Undo", panel() ?? document));
    expect(host.actions.at(-1)).toEqual({ action: "restore", id: "repeated:1" });
  });

  test("closes on Escape and returns focus to the entry", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(trigger());
    await press(panel(), "Escape");
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  test("opens the detail dialog from a card and returns to the inbox when it closes", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(trigger());
    await click(panel()?.querySelector("li button"));
    await settle();
    const dialog = document.querySelector("dialog");
    expect(dialog?.open).toBe(true);
    expect(dialog?.getAttribute("aria-label")).toBe("Cut a local patch release");
    expect(panel()).toBeNull();

    await click(button("Close", dialog ?? document));
    expect(document.querySelector("dialog")).toBeNull();
    expect(panel()).not.toBeNull();
    expect(document.activeElement?.getAttribute("data-item")).toBe("repeated:1");

    await press(document.activeElement, "Escape");
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  test("keeps handled suggestions under a collapsed history", async () => {
    const host = fakeHost(
      inboxOf([item({ state: "dismissed" }), item({ id: "complex:1", state: "skipped" })]),
    );
    await render(host);
    await click(trigger());
    const toggle = button("History (2)");
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel()?.querySelectorAll("li")).toHaveLength(0);
    await click(toggle);
    expect(panel()?.querySelectorAll("li")).toHaveLength(2);
  });
});
