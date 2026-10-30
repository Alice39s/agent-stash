// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ItemView } from "../shared.ts";
import { DetailPanel, type StageModels } from "./detail.tsx";
import {
  button,
  click,
  detailOf,
  fakeHost,
  inboxOf,
  item,
  mount,
  NOW,
  progress,
  settle,
  translator,
  type,
  UNSUMMARIZED,
  type FakeHost,
} from "./testing.tsx";

const t = translator("en");
let unmount: (() => void) | undefined;
let root: HTMLElement;
let selected: string[] = [];

const MODELS: StageModels = { summary: "deepseek-flash", draft: "deepseek-pro" };

async function render(view: ItemView, host: FakeHost, models: StageModels = MODELS) {
  const mounted = await mount(
    <DetailPanel
      item={view}
      inbox={host.store}
      loadDetail={host.face.loadDetail}
      models={models}
      defaultScope="project"
      openSession={null}
      t={t}
      onSelect={(id) => selected.push(id)}
    />,
  );
  unmount = mounted.unmount;
  const panel = mounted.container.firstElementChild;
  if (!(panel instanceof HTMLElement)) throw new Error("没有详情面板");
  root = panel;
  await settle();
}

function tab(name: string): HTMLButtonElement {
  return button(name, root.querySelector("[role=tablist]") ?? root);
}

function tabs(): string[] {
  return [...(root.querySelector("[role=tablist]")?.querySelectorAll("button") ?? [])].map(
    (element) => element.textContent ?? "",
  );
}

beforeEach(() => {
  selected = [];
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("DetailPanel before a summary", () => {
  test("asks before sending local findings to the discovery model and says where they go", async () => {
    const view = item(UNSUMMARIZED);
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(root.tagName).toBe("SECTION");
    expect(root.getAttribute("aria-label")).toBe("Release a patch version");
    expect(tabs()).toEqual(["Summary", "Evidence"]);
    const text = root.textContent ?? "";
    expect(text).toContain("Local rules found this in tool results. No model has read it yet.");
    expect(text).toContain("A summary sends redacted evidence from 2 tasks to deepseek-flash");
    expect(text).toContain("It returns a few lines, not a Skill.");
    expect([...root.querySelectorAll("ol code")].map((code) => code.textContent)).toEqual([
      "npm test",
      "npm version",
      "git push",
    ]);
    await click(button("Summarize", root));
    expect(host.actions).toEqual([{ action: "summarize", id: "repeated:1" }]);
  });

  test("disables summarizing without a discovery model", async () => {
    const view = item(UNSUMMARIZED);
    await render(view, fakeHost(inboxOf([view])), { summary: null, draft: "deepseek-pro" });
    expect(root.textContent).toContain("No discovery model is available.");
    expect(button("Summarize", root).disabled).toBe(true);
  });

  test("shows why a summary failed and offers a retry in place", async () => {
    const view = item({
      ...UNSUMMARIZED,
      state: "failed",
      failure: { stage: "summary", kind: "format", message: "回复不是 JSON", at: NOW, attempts: 1 },
    });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(root.querySelector("[role=alert]")?.textContent).toContain(
      "Summary failed: the reply did not match the expected format",
    );
    await click(button("Summarize again", root));
    expect(host.actions).toEqual([{ action: "summarize", id: "repeated:1" }]);
  });

  test("shows the phase, the elapsed time, and the bars lit so far while the summary is written", async () => {
    const view = item({ ...UNSUMMARIZED, state: "summarizing", progress: progress() });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(root.querySelector("[role=status]")?.textContent).toBe(
      "Writing (450 characters received)",
    );
    expect(root.textContent).toContain("deepseek-flash");
    expect(root.textContent).toContain("12s elapsed");
    const bars = [...root.querySelectorAll<HTMLElement>("[data-bar]")];
    expect(bars).toHaveLength(5);
    expect(bars.map((bar) => bar.hasAttribute("data-lit"))).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(button("Summarizing", root).disabled).toBe(true);
  });
});

describe("DetailPanel with a summary", () => {
  test("shows what was found and the plan, and drafts only after the user approves", async () => {
    const view = item({ state: "proposed" });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(tabs()).toEqual(["Summary", "Evidence"]);
    const text = root.textContent ?? "";
    expect(text).toContain("Repeated workflow · 2 sessions · Summary by deepseek-flash");
    expect(text).toContain("Two sessions ran the tests, bumped the patch version");
    expect(text).toContain("Release a patch version of an npm package after the tests pass.");
    expect(root.querySelector("dd code")?.textContent).toBe("local-patch-release");
    expect(text).toContain("Create");
    expect([...root.querySelectorAll("dd ol li")].map((li) => li.textContent)).toEqual([
      "Run the tests",
      "Bump the patch version",
      "Push the tag",
    ]);
    const terms = [...root.querySelectorAll("dt")].map((dt) => dt.textContent);
    expect(terms).toEqual(["Found", "Purpose", "When to use", "Plan", "Risks", "Verify"]);
    expect([...root.querySelectorAll("dd ul li")].map((li) => li.textContent)).toEqual([
      "Pushes a tag to the remote",
    ]);
    expect(text).toContain("The new tag is on the remote and the tests passed before the bump.");
    expect(text).toContain("Drafting sends the same evidence and this plan to deepseek-pro");
    expect(host.actions).toEqual([]);
    await click(button("Draft Skill", root));
    expect(host.actions).toEqual([{ action: "draft", id: "repeated:1~0" }]);
  });

  test("names the existing Skill a summary would add to and leaves out empty risks", async () => {
    const view = item({
      state: "proposed",
      decision: "suggest_improve",
      skill: "release",
      risks: [],
    });
    await render(view, fakeHost(inboxOf([view])));
    const target = [...root.querySelectorAll("dd p > *")].map((part) => part.textContent);
    expect(target).toEqual(["Add to", "release"]);
    expect([...root.querySelectorAll("dt")].map((dt) => dt.textContent)).not.toContain("Risks");
    expect(button("Draft addition", root)).toBeDefined();
  });

  test("disables drafting without a drafting model", async () => {
    const view = item({ state: "proposed" });
    await render(view, fakeHost(inboxOf([view])), { summary: "deepseek-flash", draft: null });
    expect(root.textContent).toContain("No drafting model is available.");
    expect(button("Draft Skill", root).disabled).toBe(true);
  });

  test("shows a staggered skeleton in the Skill tab while the drafting model thinks", async () => {
    const view = item({
      state: "drafting",
      progress: progress({ stage: "draft", phase: "thinking", chars: 0, expected: 1600 }),
    });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(tabs()).toEqual(["Summary", "Skill", "Evidence"]);
    expect(tab("Skill").getAttribute("aria-selected")).toBe("true");
    expect(root.querySelector("[role=status]")?.textContent).toBe("The model is thinking");
    const bars = [...root.querySelectorAll<HTMLElement>("[data-bar]")];
    expect(bars).toHaveLength(8);
    expect(bars.filter((bar) => bar.hasAttribute("data-lit"))).toHaveLength(0);
    expect(bars.map((bar) => bar.style.animationDelay).slice(0, 3)).toEqual([
      "0ms",
      "70ms",
      "140ms",
    ]);
    expect(button("Drafting", root).disabled).toBe(true);
    expect(host.actions).toEqual([]);
  });

  test("keeps the summary when drafting fails and offers to draft again", async () => {
    const view = item({
      state: "failed",
      failure: {
        stage: "draft",
        kind: "evidence",
        message: "步骤命令没有记录",
        at: NOW,
        attempts: 1,
      },
    });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(root.querySelector("[role=alert]")?.textContent).toContain(
      "Drafting failed: the reply was not supported by the evidence",
    );
    expect(root.textContent).toContain("Run the tests");
    await click(button("Draft again", root));
    expect(host.actions).toEqual([{ action: "draft", id: "repeated:1~0" }]);
  });
});

describe("DetailPanel with several ideas", () => {
  test("lists the other ideas from the same summary and switches between them", async () => {
    const view = item({ ideaCount: 2, state: "proposed" });
    const host = fakeHost(inboxOf([view]));
    host.detail = (entry) => ({
      ...detailOf(entry),
      siblings: [
        { id: "repeated:1~0", title: "Cut a local patch release", state: "proposed" },
        { id: "repeated:1~1", title: "Publish the docs site", state: "ready" },
      ],
    });
    await render(view, host);
    const nav = root.querySelector("nav[aria-label='Other ideas from this summary']");
    const ideas = [...(nav?.querySelectorAll("button") ?? [])];
    expect(ideas.map((idea) => idea.textContent)).toEqual([
      "Cut a local patch releaseSummary ready",
      "Publish the docs siteDraft ready",
    ]);
    expect(ideas[0]?.getAttribute("aria-current")).toBe("true");
    await click(ideas[1]);
    expect(selected).toEqual(["repeated:1~1"]);
  });

  test("leaves out the switcher for a single idea and names the source and same-name ideas", async () => {
    const view = item({ kind: "session", occurrences: 1, merged: 2, state: "proposed" });
    await render(view, fakeHost(inboxOf([view])));
    expect(root.querySelector("nav")).toBeNull();
    expect(root.textContent).toContain(
      "Session extract · 1 session · 2 more with this name · Summary by deepseek-flash",
    );
  });

  test("marks its idea as on screen while it is shown", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(host.store.getSnapshot().viewing).toEqual(["repeated:1~0"]);
    unmount?.();
    unmount = undefined;
    expect(host.store.getSnapshot().viewing).toEqual([]);
  });
});

describe("DetailPanel with a draft", () => {
  test("opens on the Skill tab and keeps the cited evidence one tab away", async () => {
    const view = item();
    await render(view, fakeHost(inboxOf([view])));
    expect(root.getAttribute("aria-label")).toBe("Cut a local patch release");
    expect(root.textContent).toContain("Repeated workflow · 2 sessions · Draft by deepseek-pro");
    expect(tabs()).toEqual(["Summary", "Skill", "Changes", "Evidence"]);
    expect(root.querySelector("[data-markdown]")?.textContent).toContain(
      "# Cut a local patch release",
    );
    await click(tab("Evidence"));
    const text = root.textContent ?? "";
    expect(text).toContain("2 reads not shown");
    expect(text).toContain("exit 1");
    expect(text).toContain("Error: Cannot find build config");
    expect(text).toContain("During the task: Use a patch bump, not minor");
    const cited = root.querySelectorAll("li[data-cited]");
    expect([...cited].map((li) => li.textContent)).toEqual([
      expect.stringContaining("npm test"),
      expect.stringContaining("npm version patch"),
    ]);
  });

  test("previews the new file, then saves to the chosen scope with an undo notice", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(root.textContent).toContain("local-patch-release");

    await click(tab("Changes"));
    await settle();
    expect(host.actions).toContainEqual({ action: "preview", id: view.id, scope: "project" });
    expect(root.querySelector("[data-path]")?.getAttribute("data-path")).toBe(
      "~/work/widget/.agents/skills/local-patch-release/SKILL.md",
    );

    await click(button("User", root));
    await settle();
    expect(host.actions.at(-1)).toEqual({ action: "preview", id: view.id, scope: "user" });
    await click(button("Save Skill", root));
    expect(host.actions.at(-1)).toEqual({ action: "write", id: view.id, scope: "user" });
    expect(host.store.getSnapshot().notice).toEqual({
      key: "notice.written",
      params: { skill: "local-patch-release" },
      undo: { action: "undo", id: view.id },
      view: null,
    });
  });

  test("drafts again from the same summary", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    await click(button("Draft again", root));
    expect(host.actions.at(-1)).toEqual({ action: "draft", id: view.id });
  });

  test("blocks saving an edited draft with an invalid name", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    await click(button("Edit", root));
    await type(root.querySelector("input"), "Not Valid");
    expect(root.querySelector("[role=alert]")?.textContent).toContain("Name must be lowercase");
    expect(button("Save Skill", root).disabled).toBe(true);
  });

  test("reports a refused write inside the panel", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    host.answer = (action) =>
      action.action === "write"
        ? { ok: false, error: { kind: "exists", message: "已经存在" }, inbox: host.inbox }
        : {
            ok: true,
            inbox: host.inbox,
            preview: {
              kind: "create",
              scope: "project",
              path: "~/x/SKILL.md",
              content: "x",
              exists: true,
            },
          };
    await render(view, host);
    await click(button("Save Skill", root));
    expect(root.querySelector("[role=alert]")?.textContent).toBe(
      "A Skill file already exists at that path.",
    );
    expect(host.store.getSnapshot().notice).toBeNull();
  });

  test("offers undo for a saved Skill and states whether DSH lists it", async () => {
    const view = item({
      state: "written",
      write: {
        at: NOW,
        scope: "project",
        skill: "local-patch-release",
        path: "~/work/widget/.agents/skills/local-patch-release/SKILL.md",
        discovered: false,
        checking: true,
      },
    });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(root.textContent).toContain("Waiting for DSH to list the Skill.");
    await click(button("Undo", root));
    expect(host.actions).toEqual([{ action: "undo", id: view.id }]);
  });

  test("dismisses similar suggestions with an undo notice and keeps the panel open", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    await click(button("Dismiss similar", root));
    expect(host.actions.at(-1)).toEqual({ action: "dismiss", id: view.id, similar: true });
    expect(host.store.getSnapshot().notice).toEqual({
      key: "notice.dismissedSimilar",
      params: {},
      undo: { action: "restore", id: view.id },
      view: null,
    });
    expect(root.isConnected).toBe(true);
  });

  test("shows an existing Skill's added section and its diff", async () => {
    const view = item({ decision: "suggest_improve", skill: "release" });
    const host = fakeHost(inboxOf([view]));
    host.answer = () => ({
      ok: true,
      inbox: host.inbox,
      preview: {
        kind: "improve",
        skill: "release",
        path: "~/.agents/skills/release/SKILL.md",
        writable: true,
        before: "# Release\n",
        after: "# Release\n\n## Pitfalls\n",
        baseHash: "abc",
      },
    });
    await render(view, host);
    expect(root.textContent).toContain("Section added to release");
    await click(tab("Changes"));
    await settle();
    expect(root.querySelector("[data-old]")?.textContent).toBe("# Release\n");
    await click(button("Add to release", root));
    expect(host.actions.at(-1)).toEqual({ action: "write", id: view.id, baseHash: "abc" });
  });
});
