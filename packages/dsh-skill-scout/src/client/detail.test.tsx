// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ItemView } from "../shared.ts";
import { DetailPanel, withoutTitle, type StageModels } from "./detail.tsx";
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
let backs = 0;

const MODELS: StageModels = { summary: "deepseek-flash", draft: "deepseek-pro" };

async function render(
  view: ItemView,
  host: FakeHost,
  models: StageModels = MODELS,
  openSession: ((sessionId: string) => void) | null = null,
  back = true,
) {
  const mounted = await mount(
    <DetailPanel
      item={view}
      inbox={host.store}
      loadDetail={host.face.loadDetail}
      models={models}
      defaultScope="project"
      openSession={openSession}
      t={t}
      onSelect={(id) => selected.push(id)}
      size="page"
      onBack={
        back
          ? () => {
              backs += 1;
            }
          : undefined
      }
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

/** 标题区的元信息各项。 */
function meta(): string[] {
  return [...(root.querySelector("header > p")?.children ?? [])].map(
    (entry) => entry.textContent ?? "",
  );
}

/** 生命周期步骤的读屏名称。 */
function steps(): string[] {
  return [...root.querySelectorAll("ol[aria-label='Progress'] > li[aria-label]")].map(
    (step) => step.getAttribute("aria-label") ?? "",
  );
}

/** 步骤条下面的下一步说明。 */
function nextLine(): HTMLElement | null {
  return root.querySelector("ol[aria-label='Progress'] + p");
}

/** 带标签的正文段落的标签。 */
function blocks(): string[] {
  return [...root.querySelectorAll("section[aria-label] > h3")].map((h3) => h3.textContent ?? "");
}

/** 按钮外层提示的文字。 */
function tooltip(element: Element): string | null {
  return element.closest("[data-tooltip]")?.getAttribute("data-tooltip") ?? null;
}

beforeEach(() => {
  selected = [];
  backs = 0;
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
    expect(root.querySelector("h2")?.textContent).toBe("Release a patch version");
    expect(tabs()).toEqual(["Summary", "Evidence"]);
    expect(steps()).toEqual([
      "Found: done",
      "Summary: not started",
      "Draft: not started",
      "Save: not started",
    ]);
    expect(nextLine()?.textContent).toBe(
      "Summarize to have deepseek-flash read the redacted evidence",
    );
    const text = root.textContent ?? "";
    expect(text).toContain("Local rules found this in tool results. No model has read it yet.");
    expect(text).toContain("A summary sends redacted evidence from 2 tasks to deepseek-flash");
    expect(
      [...root.querySelectorAll("section[aria-label='Steps the rules matched'] code")].map(
        (code) => code.textContent,
      ),
    ).toEqual(["npm test", "npm version", "git push"]);
    await click(button("Summarize", root));
    expect(host.actions).toEqual([{ action: "summarize", id: "repeated:1" }]);
  });

  test("keeps summarizing focusable but unavailable without a discovery model and names the reason", async () => {
    const view = item(UNSUMMARIZED);
    const host = fakeHost(inboxOf([view]));
    await render(view, host, { summary: null, draft: "deepseek-pro" });
    expect(nextLine()?.textContent).toBe("No discovery model is available");
    const summarize = button("Summarize", root);
    expect(summarize.disabled).toBe(false);
    expect(summarize.getAttribute("aria-disabled")).toBe("true");
    expect(tooltip(summarize)).toBe("No discovery model is available");
    await click(summarize);
    expect(host.actions).toEqual([]);
  });

  test("states why a summary failed in the step row, shows the raw detail, and retries", async () => {
    const view = item({
      ...UNSUMMARIZED,
      state: "failed",
      failure: { stage: "summary", kind: "format", message: "回复不是 JSON", at: NOW, attempts: 1 },
    });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(steps()).toContain("Summary: failed");
    expect(nextLine()?.getAttribute("role")).toBe("alert");
    expect(nextLine()?.textContent).toBe(
      "Summary failed: the reply did not match the expected format",
    );
    expect(root.querySelector("section[aria-label='Details']")?.textContent).toContain(
      "回复不是 JSON",
    );
    await click(button("Retry", root));
    expect(host.actions).toEqual([{ action: "summarize", id: "repeated:1" }]);
  });

  test("shows the phase, the elapsed time, and the bars lit so far while the summary is written", async () => {
    const view = item({ ...UNSUMMARIZED, state: "summarizing", progress: progress() });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(steps()).toContain("Summary: in progress");
    expect(nextLine()?.textContent).toBe("Produces the findings and a Skill plan");
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
    const running = button("Summarizing", root);
    expect(running.disabled).toBe(true);
    expect(running.querySelector("[data-state=ongoing]")).not.toBeNull();
  });
});

describe("DetailPanel with a summary", () => {
  test("shows what was found and the plan, and drafts only after the user approves", async () => {
    const view = item({ state: "proposed" });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(tabs()).toEqual(["Summary", "Evidence"]);
    expect(root.querySelector("[data-tone=outline]")?.textContent).toBe("Repeated workflow");
    expect(meta()).toEqual(["2 sessions", "Summary by deepseek-flash", "1 min ago"]);
    expect(steps()).toEqual([
      "Found: done",
      "Summary: needs you",
      "Draft: not started",
      "Save: not started",
    ]);
    expect(nextLine()?.textContent).toBe(
      "Draft the Skill with deepseek-pro, then review it before saving",
    );
    expect(blocks()).toEqual(["Found", "Purpose", "When to use", "Plan", "Risks", "Verify"]);
    const text = root.textContent ?? "";
    expect(text).toContain("Two sessions ran the tests, bumped the patch version");
    expect(text).toContain("Release a patch version of an npm package after the tests pass.");
    const plan = root.querySelector("section[aria-label='Plan']");
    expect(plan?.querySelector("p")?.textContent).toBe("Create local-patch-release");
    expect([...(plan?.querySelectorAll("ol li") ?? [])].map((li) => li.textContent)).toEqual([
      "Run the tests",
      "Bump the patch version",
      "Push the tag",
    ]);
    expect(
      [...root.querySelectorAll("section[aria-label='Risks'] li")].map((li) => li.textContent),
    ).toEqual(["Pushes a tag to the remote"]);
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
    expect(root.querySelector("section[aria-label='Plan'] p")?.textContent).toBe("Add to release");
    expect(blocks()).not.toContain("Risks");
    expect(button("Draft addition", root)).toBeDefined();
  });

  test("keeps drafting unavailable without a drafting model", async () => {
    const view = item({ state: "proposed" });
    const host = fakeHost(inboxOf([view]));
    await render(view, host, { summary: "deepseek-flash", draft: null });
    expect(nextLine()?.textContent).toBe("No drafting model is available");
    const draft = button("Draft Skill", root);
    expect(draft.getAttribute("aria-disabled")).toBe("true");
    await click(draft);
    expect(host.actions).toEqual([]);
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
    expect(steps()).toContain("Draft: in progress");
    expect(nextLine()?.textContent).toBe("Produces a SKILL.md draft to review");
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

  test("keeps the summary when drafting fails and offers to retry the draft", async () => {
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
    expect(steps()).toContain("Draft: failed");
    expect(nextLine()?.textContent).toBe(
      "Drafting failed: the reply was not supported by the evidence",
    );
    expect(root.textContent).toContain("步骤命令没有记录");
    expect(root.textContent).toContain("Run the tests");
    await click(button("Retry", root));
    expect(host.actions).toEqual([{ action: "draft", id: "repeated:1~0" }]);
  });
});

describe("DetailPanel with several ideas", () => {
  test("pages through the ideas of one summary and lists them in a menu", async () => {
    const view = item({ ideaCount: 3, state: "proposed" });
    const host = fakeHost(inboxOf([view]));
    host.detail = (entry) => ({
      ...detailOf(entry),
      siblings: [
        { id: "repeated:1~0", title: "Cut a local patch release", state: "proposed" },
        { id: "repeated:1~1", title: "Publish the docs site", state: "ready" },
        { id: "repeated:1~2", title: "Tag the release", state: "dismissed" },
      ],
    });
    await render(view, host);
    const pager = root.querySelector("[role=group][aria-label='Other ideas from this summary']");
    if (pager === null) throw new Error("没有分页器");
    const position = button("Idea 1 of 3", pager);
    expect(position.textContent).toBe("1 / 3");
    expect(button("Previous idea", pager).disabled).toBe(true);
    await click(button("Next idea", pager));
    expect(selected).toEqual(["repeated:1~1"]);

    await click(position);
    const rows = [...pager.querySelectorAll("[role=menuitem]")];
    expect(rows.map((row) => row.textContent)).toEqual([
      "Cut a local patch releaseSummary ready",
      "Publish the docs siteDraft ready",
      "Tag the releaseDismissed",
    ]);
    expect(rows.map((row) => row.getAttribute("data-selected"))).toEqual([
      "true",
      "false",
      "false",
    ]);
    expect(
      rows.map((row) => row.querySelector("[data-state]")?.getAttribute("data-state")),
    ).toEqual(["warning", "warning", "idle"]);
    await click(rows[2]);
    expect(selected).toEqual(["repeated:1~1", "repeated:1~2"]);
  });

  test("leaves out the pager for a single idea and names the source and same-name ideas", async () => {
    const view = item({ kind: "session", occurrences: 1, merged: 2, state: "proposed" });
    await render(view, fakeHost(inboxOf([view])));
    expect(root.querySelector("[aria-label='Other ideas from this summary']")).toBeNull();
    expect(root.querySelector("[data-tone=outline]")?.textContent).toBe("Session extract");
    expect(meta()).toEqual([
      "1 session",
      "2 more with this name",
      "Summary by deepseek-flash",
      "1 min ago",
    ]);
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
  test("opens on the Skill tab with the front matter and the document without its repeated title", async () => {
    const view = item();
    const opened: string[] = [];
    await render(view, fakeHost(inboxOf([view])), MODELS, (sessionId) => opened.push(sessionId));
    expect(root.getAttribute("aria-label")).toBe("Cut a local patch release");
    expect(meta()).toEqual(["2 sessions", "Draft by deepseek-pro", "1 min ago"]);
    expect(steps()).toEqual([
      "Found: done",
      "Summary: done",
      "Draft: needs you",
      "Save: not started",
    ]);
    expect(nextLine()?.textContent).toBe("Save to write the Skill file");
    expect(tabs()).toEqual(["Summary", "Skill", "Changes", "Evidence"]);
    expect([...root.querySelectorAll("dl dt")].map((dt) => dt.textContent)).toEqual([
      "Name",
      "Description",
      "When to use",
    ]);
    expect(root.querySelector("dl dd code")?.textContent).toBe("local-patch-release");
    const document = root.querySelector("[data-markdown]")?.textContent ?? "";
    expect(document).not.toContain("# Cut a local patch release");
    expect(document.startsWith("## Steps")).toBe(true);

    await click(tab("Evidence"));
    const text = root.textContent ?? "";
    expect(text).toContain("2 reads not shown");
    expect(text).toContain("exit 1");
    expect(text).toContain("Error: Cannot find build config");
    expect(text).toContain("During the task");
    expect(text).toContain("Use a patch bump, not minor");
    const cited = root.querySelectorAll("li[data-cited]");
    expect([...cited].map((li) => li.textContent)).toEqual([
      expect.stringContaining("npm test"),
      expect.stringContaining("npm version patch"),
    ]);
    const failed = root.querySelector("li[data-ok=false] [data-state]");
    expect(failed?.getAttribute("data-state")).toBe("error");
    await click(
      button(
        "Open session",
        root.querySelector("section[aria-label='Release another patch']") ?? root,
      ),
    );
    expect(opened).toEqual(["s2"]);
  });

  test("previews the new file, then saves to the target chosen in the split button with an undo notice", async () => {
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

    const split = root.querySelector("[role=group][aria-label='Save to']");
    if (split === null) throw new Error("没有保存按钮组");
    expect(button("Save to project", split)).toBeDefined();
    await click(button("Choose where to save", split));
    const choices = [...split.querySelectorAll("[role=menuitem]")];
    expect(choices.map((choice) => choice.textContent)).toEqual(["Project", "User"]);
    expect(choices[0]?.getAttribute("data-selected")).toBe("true");
    await click(choices[1]);
    await settle();
    expect(host.actions.at(-1)).toEqual({ action: "preview", id: view.id, scope: "user" });
    await click(button("Save to user folder", split));
    expect(host.actions.at(-1)).toEqual({ action: "write", id: view.id, scope: "user" });
    expect(host.store.getSnapshot().notice).toEqual({
      key: "notice.written",
      params: { skill: "local-patch-release" },
      undo: { action: "undo", id: view.id },
      view: null,
    });
  });

  test("drafts again from the icon at the end of the tab strip", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    const strip = root.querySelector("[role=tablist]")?.parentElement ?? root;
    await click(button("Draft again", strip));
    expect(host.actions.at(-1)).toEqual({ action: "draft", id: view.id });
  });

  test("blocks saving an edited draft with an invalid name and discards the edit from the menu", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    const edit = button("Edit", root);
    await click(edit);
    expect(edit.getAttribute("aria-pressed")).toBe("true");
    await type(root.querySelector("input"), "Not Valid");
    expect(root.querySelector("[role=alert]")?.textContent).toContain("Name must be lowercase");
    const save = button("Save to project", root);
    expect(save.getAttribute("aria-disabled")).toBe("true");
    await click(save);
    expect(host.actions.some((action) => action.action === "write")).toBe(false);

    await click(button("More actions", root));
    const reset = [...root.querySelectorAll("[role=menuitem]")].find(
      (row) => row.textContent === "Reset",
    );
    expect(reset?.hasAttribute("data-danger")).toBe(true);
    await click(reset);
    expect(root.querySelector<HTMLInputElement>("input")?.value).toBe("local-patch-release");
    expect(root.querySelector("[role=alert]")).toBeNull();
  });

  test("reports a refused write above the footer actions", async () => {
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
    await click(button("Save to project", root));
    const alert = root.querySelector("footer [role=alert]");
    expect(alert?.textContent).toBe("A Skill file already exists at that path");
    expect(host.store.getSnapshot().notice).toBeNull();
  });

  test("states where a saved Skill went and whether DSH lists it, and offers undo", async () => {
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
    expect(steps()).toEqual(["Found: done", "Summary: done", "Draft: done", "Save: done"]);
    expect(nextLine()?.textContent).toBe(
      "Saved to ~/work/widget/.agents/skills/local-patch-release/SKILL.md · Waiting for DSH to list the Skill",
    );
    expect(() => button("Dismiss", root)).toThrow("没有按钮 Dismiss");
    await click(button("Undo", root));
    expect(host.actions).toEqual([{ action: "undo", id: view.id }]);
  });

  test("dismisses similar suggestions from the overflow menu with an undo notice", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    await click(button("More actions", root));
    const similar = [...root.querySelectorAll("[role=menuitem]")].find(
      (row) => row.textContent === "Dismiss similar",
    );
    await click(similar);
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
    expect(nextLine()?.textContent).toBe("Add the section to release");
    await click(tab("Changes"));
    await settle();
    expect(root.querySelector("[data-old]")?.textContent).toBe("# Release\n");
    await click(button("Add to release", root));
    expect(host.actions.at(-1)).toEqual({ action: "write", id: view.id, baseHash: "abc" });
  });
});

describe("DetailPanel for a closed suggestion", () => {
  test("shows every step quiet and offers only to restore it", async () => {
    const view = item({ state: "dismissed" });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(root.querySelector("ol[aria-label='Progress']")?.hasAttribute("data-closed")).toBe(true);
    expect(steps()).toEqual(["Found: closed", "Summary: closed", "Draft: closed", "Save: closed"]);
    expect(
      [...root.querySelectorAll("ol[aria-label='Progress'] [data-appearance=step]")].map((dot) =>
        dot.getAttribute("data-state"),
      ),
    ).toEqual(["idle", "idle", "idle", "idle"]);
    expect(() => button("Dismiss", root)).toThrow("没有按钮 Dismiss");
    await click(button("Restore", root));
    expect(host.actions).toEqual([{ action: "restore", id: view.id }]);
  });

  test("goes back to the list from the header", async () => {
    const view = item();
    await render(view, fakeHost(inboxOf([view])));
    await click(button("Back to the list", root));
    expect(backs).toBe(1);
  });

  test("renders no back button when the list is beside it", async () => {
    const view = item();
    await render(view, fakeHost(inboxOf([view])), MODELS, null, false);
    expect(() => button("Back to the list", root)).toThrow("没有按钮 Back to the list");
  });
});

describe("DetailPanel next-step line", () => {
  const failure = { stage: "summary", kind: "format", message: "", at: NOW, attempts: 1 } as const;
  test.each([
    ["detected", item(UNSUMMARIZED), "Summarize to have deepseek-flash read the redacted evidence"],
    [
      "summarizing",
      item({ ...UNSUMMARIZED, state: "summarizing", progress: progress() }),
      "Produces the findings and a Skill plan",
    ],
    [
      "skipped",
      item({ state: "skipped", decision: "skip" }),
      "Summarize again to have deepseek-flash reread the evidence",
    ],
    [
      "proposed",
      item({ state: "proposed" }),
      "Draft the Skill with deepseek-pro, then review it before saving",
    ],
    ["drafting", item({ state: "drafting" }), "Produces a SKILL.md draft to review"],
    [
      "drafting an addition",
      item({ state: "drafting", decision: "suggest_improve", skill: "release" }),
      "Produces a section to add to release",
    ],
    ["ready", item(), "Save to write the Skill file"],
    [
      "failed",
      item({ ...UNSUMMARIZED, state: "failed", failure }),
      "Summary failed: the reply did not match the expected format",
    ],
    [
      "failed without a recorded failure",
      item({ ...UNSUMMARIZED, state: "failed" }),
      "Summary failed",
    ],
    ["dismissed", item({ state: "dismissed" }), "Restore to return it to the suggestions"],
    [
      "written without a recorded path",
      item({ state: "written", write: null }),
      "Save path not recorded",
    ],
  ] satisfies [string, ItemView, string][])(
    "keeps the line under the steps when %s",
    async (_state, view, text) => {
      await render(view, fakeHost(inboxOf([view])));
      expect(nextLine()?.textContent).toBe(text);
      expect(nextLine()?.getAttribute("role")).toBe(view.state === "failed" ? "alert" : null);
    },
  );
});

describe("withoutTitle", () => {
  test("drops a leading heading that repeats the title or the Skill name", () => {
    expect(
      withoutTitle("# Cut a local patch release\n\n## Steps\n", ["Cut a Local Patch Release"]),
    ).toBe("## Steps\n");
    expect(withoutTitle("## local-patch-release\nBody", ["x", "local patch release"])).toBe("Body");
  });

  test("keeps a document whose first heading says something else", () => {
    const body = "# Release checklist\n\nBody";
    expect(withoutTitle(body, ["Cut a local patch release"])).toBe(body);
    expect(withoutTitle("Body first\n# Cut", ["Cut"])).toBe("Body first\n# Cut");
  });
});
