// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { SessionView } from "../shared.ts";
import type { ScoutFace } from "./face.ts";
import { SessionTab } from "./session.tsx";
import { driveResize } from "./ui/charts/testing.tsx";
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
  task,
  translator,
  UNSUMMARIZED,
  type FakeHost,
} from "./testing.tsx";

const t = translator("en");
let unmount: (() => void) | undefined;
let root: HTMLElement;

async function render(host: FakeHost, face: ScoutFace = host.face) {
  const mounted = await mount(<SessionTab {...face} sessionId="s1" t={t} />);
  unmount = mounted.unmount;
  root = mounted.container;
  await settle();
}

function section(name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`section[aria-label='${name}']`);
  if (found === null) throw new Error(`没有分组 ${name}`);
  return found;
}

/** 视图第一行的状态点、状态标题与元信息。 */
function header(): { readonly dot: string | null; readonly parts: string[] } {
  const status = root.querySelector("[data-view=session] > header [role=status]");
  return {
    dot: status?.querySelector("[data-state]")?.getAttribute("data-state") ?? null,
    parts: [...(status?.children ?? [])]
      .map((part) => part.textContent ?? "")
      .filter((part) => part !== ""),
  };
}

/** 右栏的详情面板：标题是面板里的 h2，面板是带 aria-label 的 section。 */
function detail(): HTMLElement | null {
  return root.querySelector("section[data-state][aria-label]");
}

function split(): HTMLElement | null {
  return root.querySelector("[data-view=session] > header ~ div:last-child");
}

/** 七个任务的会话。 */
function longSession(): SessionView {
  return {
    ...SESSION,
    tasks: Array.from({ length: 7 }, (_, index) =>
      task({ episodeId: `s1:${String(index)}`, goal: `Task ${String(index)}` }),
    ),
  };
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
  vi.unstubAllGlobals();
});

describe("SessionTab", () => {
  test("shows the analysis state, the suggestions citing the session, its tasks as one-line records, and the first suggestion in place", async () => {
    const elsewhere = item({
      id: "complex:9",
      title: "Elsewhere",
      sessions: [{ sessionId: "s3", episodeId: "s3:1", at: NOW, goal: "x", outcome: "verified" }],
    });
    const host = fakeHost(inboxOf([item(), elsewhere]));
    await render(host);
    expect(header()).toEqual({ dot: "done", parts: ["2 tasks analyzed", "2 min ago"] });
    expect(root.querySelectorAll("h1")).toHaveLength(0);
    const cards = [...section("Needs your decision").querySelectorAll("[data-item]")];
    expect(cards.map((card) => card.getAttribute("data-item"))).toEqual(["repeated:1~0"]);
    expect(cards[0]?.getAttribute("aria-current")).toBe("true");
    const tasks = section("Tasks in this session");
    const text = tasks.textContent ?? "";
    expect(text).toContain("Release a patch version");
    expect(text).toContain("Check passed");
    expect(text).toContain("3 commands");
    expect(text).toContain("Fix the build config");
    expect(text).toContain("1 fix");
    const records = [...tasks.querySelectorAll("li[data-episode]")];
    expect(
      records.map((record) => record.querySelector("[data-state]")?.getAttribute("data-state")),
    ).toEqual(["done", "error"]);
    expect(
      [...(records[0]?.querySelectorAll("code") ?? [])].map((code) => code.textContent),
    ).toEqual(["npm test", "npm version patch", "git push --tags"]);
    expect(detail()?.getAttribute("aria-label")).toBe("Cut a local patch release");
  });

  test("uses the singular for a session with one task", async () => {
    const host = fakeHost(inboxOf([item()]));
    const [first] = SESSION.tasks;
    if (first === undefined) throw new Error("没有任务");
    host.session = { ...SESSION, tasks: [first] };
    await render(host);
    expect(header().parts[0]).toBe("1 task analyzed");
  });

  test("asks DSH to float the composer over the view instead of scrolling past it", async () => {
    await render(fakeHost(inboxOf([item()])));
    expect(
      root.querySelector("[data-view=session]")?.hasAttribute("data-conversation-composer-overlay"),
    ).toBe(true);
  });

  test("shows skeleton rows until the first inbox arrives", async () => {
    const host = fakeHost(inboxOf([item()]));
    host.gate = new Promise(() => undefined);
    await render(host);
    expect(root.querySelectorAll("[data-skeleton]").length).toBeGreaterThan(0);
    expect(root.querySelector("[data-item]")).toBeNull();
  });

  test("switches the detail to another card citing the session and back to the list", async () => {
    const host = fakeHost(
      inboxOf([item(), item({ id: "recovery:2~0", kind: "recovery", title: "Reinstall deps" })]),
    );
    await render(host);
    expect(split()?.hasAttribute("data-open")).toBe(false);
    await click(root.querySelector("[data-item='recovery:2~0']"));
    await settle();
    expect(detail()?.getAttribute("aria-label")).toBe("Reinstall deps");
    expect(split()?.hasAttribute("data-open")).toBe(true);
    await click(button("Back to the list", detail() ?? root));
    expect(split()?.hasAttribute("data-open")).toBe(false);
  });

  test("leads the detail with a back button only while the split is one pane wide", async () => {
    const width = driveResize();
    await render(fakeHost(inboxOf([item()])));
    expect(width.observed()).toBe(1);
    await width.resize(1200);
    expect(detail()?.querySelector("[aria-label='Back to the list']")).toBeNull();
    await width.resize(759);
    expect(button("Back to the list", detail() ?? root)).toBeDefined();
    await width.resize(760);
    expect(detail()?.querySelector("[aria-label='Back to the list']")).toBeNull();
  });

  test("analyzes the session now and rereads it", async () => {
    const host = fakeHost(inboxOf([]));
    host.session = { ...SESSION, state: "pending", scannedAt: null, tasks: [] };
    await render(host);
    expect(header()).toEqual({ dot: "idle", parts: ["Not analyzed yet"] });
    expect(button("Extract from this session", root).getAttribute("aria-disabled")).toBe("true");
    host.session = SESSION;
    await click(button("Analyze now", root));
    await settle();
    expect(host.actions).toEqual([{ action: "analyze-session", sessionId: "s1" }]);
    expect(header().parts).toEqual(["2 tasks analyzed", "2 min ago"]);
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
    expect(detail()?.querySelector("[data-tone=outline]")?.textContent).toBe("Session extract");
    expect(detail()?.textContent).toContain("1 session");
    expect(detail()?.textContent).toContain("Preparing the evidence");
    expect(split()?.hasAttribute("data-open")).toBe(true);
  });

  test("reports a refused extraction under the header", async () => {
    const host = fakeHost(inboxOf([]));
    host.answer = () => ({
      ok: false,
      error: { kind: "empty", message: "没有任务" },
      inbox: host.inbox,
    });
    await render(host);
    await click(button("Extract from this session", root));
    expect(root.querySelector("[role=alert]")?.textContent).toBe("There are no tasks to extract");
  });

  test("retries reading the session after an error and keeps the view usable", async () => {
    const host = fakeHost(inboxOf([item()]));
    let fail = true;
    const face: ScoutFace = {
      ...host.face,
      loadSession: async () => {
        if (fail) throw new Error("boom");
        return host.session;
      },
    };
    await render(host, face);
    expect(header()).toEqual({ dot: "error", parts: ["Session not loaded"] });
    const alert = root.querySelector("[role=alert]");
    expect(alert?.textContent).toContain("Could not load this session: boom");
    expect(detail()?.getAttribute("aria-label")).toBe("Cut a local patch release");
    fail = false;
    await click(button("Retry", alert ?? root));
    await settle();
    expect(header().parts).toEqual(["2 tasks analyzed", "2 min ago"]);
  });

  test.each([
    [{ state: "waiting" }, "idle", ["Waiting to analyze"], false],
    [
      { state: "failed", error: "日志无法解析" },
      "error",
      ["Analysis failed", "日志无法解析"],
      false,
    ],
    [
      { state: "subagent", tasks: [] },
      "idle",
      ["Subagent session", "Not analyzed on its own"],
      true,
    ],
    [{ state: "missing", tasks: [] }, "idle", ["Session not found"], true],
  ] satisfies [Partial<SessionView>, string, string[], boolean][])(
    "states %o and offers the actions that apply",
    async (fields, dot, parts, closed) => {
      const host = fakeHost(inboxOf([]));
      host.session = { ...SESSION, ...fields };
      await render(host);
      expect(header()).toEqual({ dot, parts });
      expect(button("Analyze now", root).disabled).toBe(closed);
      expect(button("Extract from this session", root).disabled).toBe(closed);
    },
  );

  test("keeps extraction unavailable without a discovery model and says why", async () => {
    const host = fakeHost(
      inboxOf([item(UNSUMMARIZED)], { models: { summary: null, draft: STATUS.models.draft } }),
    );
    await render(host);
    const extract = button("Extract from this session", root);
    expect(extract.getAttribute("aria-disabled")).toBe("true");
    expect(extract.closest("[data-tooltip]")?.getAttribute("data-tooltip")).toBe(
      "No discovery model is available",
    );
    await click(extract);
    expect(host.actions).toEqual([]);
    expect(root.textContent).toContain(
      "No discovery model is available. Choose one in Skill Scout settings",
    );
  });

  test("says when no suggestion cites the session", async () => {
    const host = fakeHost(inboxOf([]));
    await render(host);
    expect(section("Suggestions citing this session").textContent).toContain(
      "No suggestion cites this session",
    );
    expect(root.querySelector("[data-empty]")?.textContent).toBe("No suggestion selected");
  });

  test("starts a long task list collapsed when suggestions need attention and expands it", async () => {
    const host = fakeHost(inboxOf([item()]));
    host.session = longSession();
    await render(host);
    const tasks = section("Tasks in this session");
    const toggle = button("Expand Tasks in this session", tasks);
    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(tasks.querySelectorAll("li[data-episode]")).toHaveLength(0);
    await click(toggle);
    expect(tasks.querySelectorAll("li[data-episode]")).toHaveLength(7);
    expect(button("Collapse Tasks in this session", tasks).getAttribute("aria-expanded")).toBe(
      "true",
    );
  });

  test("keeps a long task list open when no suggestion cites the session", async () => {
    const host = fakeHost(inboxOf([]));
    host.session = longSession();
    await render(host);
    expect(section("Tasks in this session").querySelectorAll("li[data-episode]")).toHaveLength(7);
  });

  test("shows the result of an action at the top of the view with its undo", async () => {
    const host = fakeHost(inboxOf([item()]));
    await render(host);
    await click(button("Dismiss: Cut a local patch release", root));
    const notice = root.querySelector("[data-notice=result]");
    expect(notice?.textContent).toContain("Dismissed");
    expect(host.actions.at(-1)).toEqual({ action: "dismiss", id: "repeated:1~0", similar: false });
    await click(button("Close", notice ?? root));
    expect(root.querySelector("[data-notice=result]")).toBeNull();

    await click(button("Dismiss: Cut a local patch release", root));
    await click(button("Undo", root.querySelector("[data-notice=result]") ?? root));
    expect(host.actions.at(-1)).toEqual({ action: "restore", id: "repeated:1~0" });
  });
});
