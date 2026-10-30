// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ItemView } from "../shared.ts";
import { InboxEntry } from "./inbox.tsx";
import { HistoryPage } from "./page.tsx";
import { SessionTab } from "./session.tsx";
import {
  button,
  click,
  fakeHost,
  inboxOf,
  item,
  mount,
  NOW,
  press,
  progress,
  perform,
  setAnchoredPositionDelay,
  settle,
  STATUS,
  translator,
  UNSUMMARIZED,
  wait,
  type FakeHost,
} from "./testing.tsx";

const t = translator("en");
let unmounts: (() => void)[] = [];

async function render(host: FakeHost) {
  const view = await mount(<InboxEntry {...host.face} t={t} />);
  unmounts.push(view.unmount);
  return view;
}

function trigger(): HTMLButtonElement {
  return button(/^Skill suggestions/u);
}

function panel(): HTMLElement | null {
  return document.querySelector<HTMLElement>("[role=dialog][aria-label='Skill suggestions']");
}

/** 标题栏入口下方弹出的提示。 */
function toast(): HTMLElement | null {
  return document.body.querySelector<HTMLElement>(":scope > div > [data-notice=result]");
}

/** 一行的元信息各项，第一项是状态词。 */
function rowMeta(id: string): string[] {
  const status = panel()
    ?.querySelector(`[data-item='${id}']`)
    ?.closest("li")
    ?.querySelector("[data-status]");
  return [...(status?.parentElement?.children ?? [])].map((entry) => entry.textContent ?? "");
}

beforeEach(() => {
  window.localStorage.clear();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  for (const unmount of unmounts) unmount();
  unmounts = [];
  document.body.innerHTML = "";
  vi.useRealTimers();
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

  test("counts summaries and drafts that need a decision and clears the count once opened", async () => {
    const host = fakeHost(
      inboxOf([
        item(),
        item({ id: "repeated:2~0", state: "proposed", title: "Deploy the docs site" }),
        item({ ...UNSUMMARIZED, id: "recovery:1", kind: "recovery" }),
      ]),
    );
    await render(host);
    expect(trigger().querySelector("span")?.textContent).toBe("2");

    await click(trigger());
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    const sections = [...(panel()?.querySelectorAll("section") ?? [])];
    expect(sections.map((section) => section.getAttribute("aria-label"))).toEqual([
      "Needs your decision",
      "Found locally",
    ]);
    const decide = sections[0]?.textContent ?? "";
    expect(decide).toContain("Cut a local patch release");
    expect(decide).toContain("Release a patch version of an npm package after the tests pass.");
    expect(decide).toContain("Draft ready");
    expect(decide).toContain("Summary ready");
    expect(sections[1]?.textContent).toContain("No summary yet");
    expect(rowMeta("repeated:1~0")).toEqual([
      "Draft ready",
      "Repeated workflow",
      "2 sessions",
      "1 min ago",
    ]);
    expect(
      panel()
        ?.querySelector("[data-item='repeated:1~0']")
        ?.closest("li")
        ?.getAttribute("data-variant"),
    ).toBe("popover");
    expect(trigger().getAttribute("aria-label")).toBe("Skill suggestions");
    expect(trigger().querySelector("span")).toBeNull();
  });

  test("names the source of extracted ideas and the ideas folded into a card", async () => {
    const host = fakeHost(
      inboxOf([
        item({ kind: "session", occurrences: 1, merged: 2 }),
        item({ id: "selected:ab~0", kind: "selected", occurrences: 3, title: "Bump deps" }),
      ]),
    );
    await render(host);
    await click(trigger());
    expect(rowMeta("repeated:1~0")).toEqual([
      "Draft ready",
      "Session extract",
      "1 session",
      "2 more with this name",
      "1 min ago",
    ]);
    expect(rowMeta("selected:ab~0")).toEqual([
      "Draft ready",
      "Selected tasks",
      "3 sessions",
      "1 min ago",
    ]);
  });

  test("keeps a card in progress without a dismiss button and says which model is busy", async () => {
    const host = fakeHost(
      inboxOf(
        [
          item({ state: "drafting", progress: progress({ stage: "draft" }) }),
          item({ ...UNSUMMARIZED, id: "r:2", state: "summarizing", progress: progress() }),
        ],
        { working: 2 },
      ),
    );
    await render(host);
    expect(trigger().querySelector("span")).toBeNull();
    await click(trigger());
    const text = panel()?.textContent ?? "";
    expect(text).toContain("Asking the model");
    expect(text).toContain("Drafting");
    expect(text).toContain("Summarizing");
    expect(panel()?.querySelectorAll("button[aria-label^='Dismiss']")).toHaveLength(0);
  });

  test("keeps a summary whose draft failed among the decisions", async () => {
    const host = fakeHost(
      inboxOf([
        item({
          state: "failed",
          failure: { stage: "draft", kind: "timeout", message: "timed out", at: NOW, attempts: 1 },
        }),
      ]),
    );
    await render(host);
    await click(trigger());
    const section = panel()?.querySelector("section");
    expect(section?.getAttribute("aria-label")).toBe("Needs your decision");
    expect(section?.textContent).toContain("Draft failed");
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

  test("tells the user when no discovery model is available", async () => {
    const pending = item(UNSUMMARIZED);
    const host = fakeHost(
      inboxOf([pending], { models: { summary: null, draft: STATUS.models.draft } }),
    );
    await render(host);
    await click(trigger());
    expect(panel()?.textContent).toContain(
      "No discovery model is available. Choose one in Skill Scout settings",
    );
  });

  test("dismisses a card with an undo that restores it", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(trigger());
    await click(button("Dismiss: Cut a local patch release"));
    expect(host.actions).toEqual([{ action: "dismiss", id: "repeated:1~0", similar: false }]);
    expect(panel()?.querySelector("[data-notice=result]")?.textContent).toContain("Dismissed");

    await click(button("Undo", panel() ?? document));
    expect(host.actions.at(-1)).toEqual({ action: "restore", id: "repeated:1~0" });
  });

  test("closes on Escape and returns focus to the entry", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(trigger());
    await press(panel(), "Escape");
    expect(panel()).toBeNull();
    expect(document.activeElement).toBe(trigger());
  });

  test("moves focus into the panel when it opens", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(trigger());
    const dialog = panel();
    expect(dialog).not.toBeNull();
    expect(dialog?.contains(document.activeElement)).toBe(true);
    await press(dialog, "Escape");
    expect(document.activeElement).toBe(trigger());
  });

  test("takes focus only after the panel is placed, and gives it back to the entry on close", async () => {
    setAnchoredPositionDelay(30);
    try {
      const host = fakeHost(inboxOf([item()]));
      await render(host);
      await click(trigger());
      const dialog = panel();
      expect(dialog).not.toBeNull();
      // 首次测量前宿主没有坐标：面板隐藏，focus() 在浏览器里是空操作。
      expect(dialog?.style.visibility).toBe("hidden");
      expect(dialog?.contains(document.activeElement)).toBe(false);
      await wait(80);
      expect(panel()?.style.visibility).toBe("");
      expect(panel()?.contains(document.activeElement)).toBe(true);
      await press(panel(), "Escape");
      expect(document.activeElement).toBe(trigger());
    } finally {
      setAnchoredPositionDelay(null);
    }
  });

  test("closes once on a single Escape even though the panel's key event also reaches the header root", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(trigger());
    const entry = trigger();
    const focus = vi.spyOn(entry, "focus");
    await press(panel(), "Escape");
    expect(panel()).toBeNull();
    expect(focus).toHaveBeenCalledTimes(1);
    focus.mockRestore();
  });

  test("keeps Tab inside the panel and marks it as a modal dialog", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(trigger());
    const dialog = panel();
    expect(dialog?.getAttribute("aria-modal")).toBe("true");
    const controls = [...(dialog?.querySelectorAll<HTMLElement>("button") ?? [])];
    const first = controls[0];
    const last = controls.at(-1);
    expect(last).not.toBe(first);
    await press(dialog, "Tab");
    expect(document.activeElement).toBe(first);
    last?.focus();
    await press(dialog, "Tab");
    expect(document.activeElement).toBe(first);
    first?.focus();
    await press(dialog, "Tab", { shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  test("opens a card in the history page with the card selected", async () => {
    const host = fakeHost(inboxOf([item(), item({ id: "complex:2", state: "skipped" })]));
    await render(host);
    await click(trigger());
    await click(panel()?.querySelector("[data-item='repeated:1~0']"));
    expect(panel()).toBeNull();
    expect(host.pagesOpened).toBe(1);
    expect(document.activeElement).toBe(trigger());
    expect(host.face.page.getSnapshot()).toMatchObject({
      tab: "suggestions",
      selected: "repeated:1~0",
    });

    await click(trigger());
    await click(button("Skill Scout History", panel() ?? document));
    expect(host.pagesOpened).toBe(2);
    expect(document.activeElement).toBe(trigger());
    expect(host.face.page.getSnapshot().selected).toBeNull();
  });

  test("keeps closed suggestions in a collapsed last section with quiet titles", async () => {
    const host = fakeHost(
      inboxOf([item({ state: "dismissed" }), item({ id: "complex:1", state: "skipped" })]),
    );
    await render(host);
    await click(trigger());
    const label = panel()?.querySelector("section[aria-label='History'] h3");
    expect(label?.textContent).toBe("History");
    const toggle = button("Expand History", panel() ?? document);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(panel()?.querySelectorAll("li")).toHaveLength(0);
    await click(toggle);
    const rows = [...(panel()?.querySelectorAll("li") ?? [])];
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.querySelector("[data-ink]")?.getAttribute("data-ink"))).toEqual([
      "tertiary",
      "tertiary",
    ]);
  });
});

describe("InboxEntry notices", () => {
  test("pops up a notice with View when a summary finishes, and View opens the card", async () => {
    const host = fakeHost(
      inboxOf([item({ ...UNSUMMARIZED, state: "summarizing", progress: progress() })], {
        working: 1,
      }),
    );
    await render(host);
    expect(toast()).toBeNull();

    host.inbox = inboxOf([
      item({ state: "proposed", ideaCount: 2 }),
      item({ id: "repeated:1~1", state: "proposed", ideaCount: 2, title: "Publish the docs" }),
    ]);
    await perform(() => host.store.refresh());
    await settle();
    expect(toast()?.textContent).toContain("Summary proposed 2 ideas: Cut a local patch release");

    await click(button("View", toast() ?? document));
    expect(toast()).toBeNull();
    expect(host.pagesOpened).toBe(1);
    expect(host.face.page.getSnapshot().selected).toBe("repeated:1~0");
  });

  test("returns focus to the entry when View in the open panel opens the card", async () => {
    const host = fakeHost(inboxOf([item({ state: "drafting" })], { working: 1 }));
    await render(host);
    host.inbox = inboxOf([item()]);
    await perform(() => host.store.refresh());
    await settle();
    expect(toast()?.textContent).toContain("Draft ready");

    await click(trigger());
    const notice = panel()?.querySelector("[data-notice=result]");
    expect(notice?.textContent).toContain("Draft ready");
    await click(button("View", notice ?? document));
    expect(panel()).toBeNull();
    expect(host.pagesOpened).toBe(1);
    expect(document.activeElement).toBe(trigger());
  });

  test("keeps one copy of the result notice while the open panel covers the conversation view", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    const view = await mount(<SessionTab {...host.face} sessionId="s1" t={t} />);
    unmounts.push(view.unmount);
    await settle();

    await click(trigger());
    await click(button("Dismiss: Cut a local patch release", panel() ?? document));
    expect(panel()?.querySelector("[data-notice=result]")?.textContent).toContain("Dismissed");
    expect(view.container.querySelector("[data-notice=result]")).toBeNull();

    await press(panel(), "Escape");
    expect(view.container.querySelector("[data-notice=result]")?.textContent).toContain(
      "Dismissed",
    );
  });

  test("closes a popped-up notice", async () => {
    const host = fakeHost(inboxOf([item({ state: "drafting" })], { working: 1 }));
    await render(host);
    host.inbox = inboxOf([item({ state: "ready" })]);
    await perform(() => host.store.refresh());
    await settle();
    expect(toast()?.textContent).toContain("Draft ready: Cut a local patch release");
    await click(button("Close", toast() ?? document));
    expect(toast()).toBeNull();
  });

  test("lets the conversation view's rows carry finished work and hosts the other notice at its top", async () => {
    const elsewhere: Partial<ItemView> = {
      id: "complex:9~0",
      title: "Rotate the signing key",
      sessions: [{ sessionId: "s3", episodeId: "s3:1", at: NOW, goal: "x", outcome: "verified" }],
    };
    const host = fakeHost(
      inboxOf([item({ state: "drafting" }), item({ ...elsewhere, state: "drafting" })], {
        working: 2,
      }),
    );
    await render(host);
    const view = await mount(<SessionTab {...host.face} sessionId="s1" t={t} />);
    await settle();

    host.inbox = inboxOf([item(), item({ ...elsewhere, state: "drafting" })], { working: 1 });
    await perform(() => host.store.refresh());
    expect(toast()).toBeNull();
    expect(
      view.container.querySelector("[data-item='repeated:1~0']")?.closest("li")?.textContent,
    ).toContain("Draft ready");

    host.inbox = inboxOf([item(), item(elsewhere)]);
    await perform(() => host.store.refresh());
    expect(toast()).toBeNull();
    const notice = view.container.querySelector("[data-notice=result]");
    expect(notice?.textContent).toContain("Draft ready: Rotate the signing key");
    await click(button("Close", notice ?? view.container));

    // 切到对话 Tab：会话视图卸载，同一张卡片的工作结束时从标题栏入口下方弹出提示。
    view.unmount();
    host.inbox = inboxOf([item({ state: "drafting" })], { working: 1 });
    await perform(() => host.store.refresh());
    host.inbox = inboxOf([item()]);
    await perform(() => host.store.refresh());
    expect(toast()?.textContent).toContain("Draft ready: Cut a local patch release");
  });

  test("raises no popover while the open panel lists the finished card", async () => {
    const host = fakeHost(inboxOf([item({ state: "drafting" })], { working: 1 }));
    await render(host);
    await click(trigger());
    host.inbox = inboxOf([item()]);
    await perform(() => host.store.refresh());
    expect(toast()).toBeNull();
    expect(panel()?.querySelector("[data-notice=result]")).toBeNull();
    expect(rowMeta("repeated:1~0")[0]).toBe("Draft ready");
  });

  test("shows notices in the open history page instead of the header while its search section is open", async () => {
    const migrate = {
      ...UNSUMMARIZED,
      id: "complex:5",
      kind: "complex",
      goal: "Migrate the config",
    } as const;
    const host = fakeHost(
      inboxOf(
        [
          item({ ...UNSUMMARIZED, state: "summarizing", progress: progress() }),
          item({ ...migrate, state: "summarizing", progress: progress() }),
        ],
        { working: 2 },
      ),
    );
    await render(host);
    host.face.page.update({ selected: "repeated:1", tab: "search" });
    const page = await mount(<HistoryPage {...host.face} t={t} />);
    unmounts.push(page.unmount);
    await settle();

    host.inbox = inboxOf([
      item({ state: "proposed" }),
      item({ ...migrate, state: "skipped" }),
      item({ id: "recovery:4~0", kind: "recovery", state: "ready", title: "Reinstall deps" }),
    ]);
    await perform(() => host.store.refresh());
    await settle();
    await settle();
    expect(page.container.querySelector("[data-notice=result]")?.textContent).toContain(
      "2 requests finished",
    );
    expect(toast()).toBeNull();
    expect(trigger().getAttribute("aria-label")).toBe("Skill suggestions, 2 new");
  });

  test("lets the suggestions section's rows carry finished work without a notice", async () => {
    const host = fakeHost(
      inboxOf([item({ ...UNSUMMARIZED, state: "summarizing", progress: progress() })], {
        working: 1,
      }),
    );
    await render(host);
    host.face.page.update({ selected: "repeated:1" });
    const page = await mount(<HistoryPage {...host.face} t={t} />);
    unmounts.push(page.unmount);
    await settle();

    host.inbox = inboxOf([item({ state: "proposed" })]);
    await perform(() => host.store.refresh());
    await settle();
    expect(page.container.querySelector("[aria-label='Cut a local patch release']")).not.toBeNull();
    expect(page.container.querySelector("[data-notice=result]")).toBeNull();
    expect(toast()).toBeNull();
    expect(trigger().getAttribute("aria-label")).toBe("Skill suggestions");
  });
});
