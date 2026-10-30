// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { SessionView } from "../shared.ts";
import { SessionTab } from "./session.tsx";
import {
  button,
  click,
  fakeHost,
  inboxOf,
  item,
  mount,
  NOW,
  progress,
  SESSION,
  settle,
  STATUS,
  translator,
  UNSUMMARIZED,
  type FakeHost,
} from "./testing.tsx";

const t = translator("en");
let unmount: (() => void) | undefined;
let root: HTMLElement;

async function render(host: FakeHost) {
  const mounted = await mount(<SessionTab {...host.face} sessionId="s1" t={t} />);
  unmount = mounted.unmount;
  root = mounted.container;
  await settle();
}

function section(name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`section[aria-label='${name}']`);
  if (found === null) throw new Error(`没有分组 ${name}`);
  return found;
}

/** 右栏的详情面板：标题是面板里唯一的 h2。 */
function detail(): HTMLElement | null {
  return root.querySelector("h2")?.closest("section") ?? null;
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

describe("SessionTab", () => {
  test("shows the analysis state, the suggestions citing the session, its tasks, and the first suggestion in place", async () => {
    const elsewhere = item({
      id: "complex:9",
      title: "Elsewhere",
      sessions: [{ sessionId: "s3", episodeId: "s3:1", at: NOW, goal: "x", outcome: "verified" }],
    });
    const host = fakeHost(inboxOf([item(), elsewhere]));
    await render(host);
    expect(root.querySelector("[role=status]")?.textContent).toBe("2 tasks analyzed · 2 min ago");
    const cards = [...section("Suggestions citing this session").querySelectorAll("[data-item]")];
    expect(cards.map((card) => card.getAttribute("data-item"))).toEqual(["repeated:1~0"]);
    expect(cards[0]?.getAttribute("aria-current")).toBe("true");
    const tasks = section("Tasks in this session").textContent ?? "";
    expect(tasks).toContain("Release a patch version");
    expect(tasks).toContain("Check passed");
    expect(tasks).toContain("3 commands");
    expect(tasks).toContain("Fix the build config");
    expect(tasks).toContain("1 fix");
    expect(detail()?.getAttribute("aria-label")).toBe("Cut a local patch release");
  });

  test("uses the singular for a session with one task", async () => {
    const host = fakeHost(inboxOf([item()]));
    const [task] = SESSION.tasks;
    if (task === undefined) throw new Error("没有任务");
    host.session = { ...SESSION, tasks: [task] };
    await render(host);
    expect(root.querySelector("[role=status]")?.textContent).toBe("1 task analyzed · 2 min ago");
  });

  test("asks DSH to float the composer over the view instead of scrolling past it", async () => {
    await render(fakeHost(inboxOf([item()])));
    expect(
      root.querySelector("[data-view=session]")?.hasAttribute("data-conversation-composer-overlay"),
    ).toBe(true);
  });

  test("switches the detail to another card citing the session", async () => {
    const host = fakeHost(
      inboxOf([item(), item({ id: "recovery:2~0", kind: "recovery", title: "Reinstall deps" })]),
    );
    await render(host);
    await click(root.querySelector("[data-item='recovery:2~0']"));
    await settle();
    expect(detail()?.getAttribute("aria-label")).toBe("Reinstall deps");
  });

  test("analyzes the session now and rereads it", async () => {
    const host = fakeHost(inboxOf([]));
    host.session = { ...SESSION, state: "pending", scannedAt: null, tasks: [] };
    await render(host);
    expect(root.querySelector("[role=status]")?.textContent).toBe("Not analyzed yet");
    expect(button("Extract from this session", root).disabled).toBe(true);
    host.session = SESSION;
    await click(button("Analyze now", root));
    await settle();
    expect(host.actions).toEqual([{ action: "analyze-session", sessionId: "s1" }]);
    expect(root.querySelector("[role=status]")?.textContent).toBe("2 tasks analyzed · 2 min ago");
  });

  test("extracts from the session and opens the new lead with its progress", async () => {
    const host = fakeHost(inboxOf([item()]));
    const lead = item({
      ...UNSUMMARIZED,
      id: "session:s1",
      kind: "session",
      goal: "Ship widget 1.2",
      occurrences: 1,
      state: "summarizing",
      progress: progress({ phase: "preparing", chars: 0, expected: 2000 }),
    });
    host.answer = (action) => {
      if (action.action !== "extract-session") return { ok: true, inbox: host.inbox };
      host.inbox = inboxOf([item(), lead], { working: 1 });
      return { ok: true, inbox: host.inbox, leadId: lead.id };
    };
    await render(host);
    await click(button("Extract from this session", root));
    await settle();
    expect(host.actions).toContainEqual({ action: "extract-session", sessionId: "s1" });
    expect(root.querySelector("[aria-current=true]")?.getAttribute("data-item")).toBe("session:s1");
    expect(detail()?.getAttribute("aria-label")).toBe("Ship widget 1.2");
    expect(detail()?.textContent).toContain("Session extract · 1 session");
    expect(detail()?.textContent).toContain("Preparing the evidence");
  });

  test("reports a refused extraction", async () => {
    const host = fakeHost(inboxOf([]));
    host.answer = () => ({
      ok: false,
      error: { kind: "empty", message: "没有任务" },
      inbox: host.inbox,
    });
    await render(host);
    await click(button("Extract from this session", root));
    expect(root.querySelector("[role=alert]")?.textContent).toBe("There are no tasks to extract.");
  });

  test.each([
    [{ state: "waiting" }, "Analyzed after the quiet period", false],
    [{ state: "failed", error: "日志无法解析" }, "Analysis failed: 日志无法解析", false],
    [{ state: "subagent", tasks: [] }, "Subagent sessions are not analyzed on their own.", true],
    [{ state: "missing", tasks: [] }, "DSH has no record of this session.", true],
  ] satisfies [Partial<SessionView>, string, boolean][])(
    "states %o and offers the actions that apply",
    async (fields, text, closed) => {
      const host = fakeHost(inboxOf([]));
      host.session = { ...SESSION, ...fields };
      await render(host);
      expect(root.querySelector("[role=status]")?.textContent).toBe(text);
      expect(button("Analyze now", root).disabled).toBe(closed);
      expect(button("Extract from this session", root).disabled).toBe(closed);
    },
  );

  test("disables extraction without a discovery model and says so", async () => {
    const host = fakeHost(
      inboxOf([item(UNSUMMARIZED)], { models: { summary: null, draft: STATUS.models.draft } }),
    );
    await render(host);
    expect(button("Extract from this session", root).disabled).toBe(true);
    expect(root.textContent).toContain("No discovery model is available.");
  });

  test("says when no suggestion cites the session", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host);
    expect(section("Suggestions citing this session").textContent).toContain(
      "No suggestion cites this session.",
    );
    expect(root.textContent).toContain("Select a suggestion.");
  });
});
