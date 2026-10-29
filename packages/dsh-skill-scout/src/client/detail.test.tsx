// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ItemView } from "../shared.ts";
import { Detail, type StageModels } from "./detail.tsx";
import {
  button,
  click,
  detailOf,
  fakeHost,
  inboxOf,
  item,
  mount,
  NOW,
  settle,
  translator,
  type,
  UNSUMMARIZED,
  type FakeHost,
} from "./testing.tsx";

const t = translator("en");
let unmount: (() => void) | undefined;
let closed = 0;

const MODELS: StageModels = { summary: "deepseek-flash", draft: "deepseek-pro" };

async function render(view: ItemView, host: FakeHost, models: StageModels = MODELS) {
  const mounted = await mount(
    <Detail
      id={view.id}
      item={view}
      inbox={host.store}
      loadDetail={async () => detailOf(view)}
      models={models}
      defaultScope="project"
      openSession={null}
      t={t}
      onClose={() => {
        closed += 1;
      }}
    />,
  );
  unmount = mounted.unmount;
  await settle();
}

function dialog(): HTMLDialogElement {
  const found = document.querySelector("dialog");
  if (found === null) throw new Error("没有对话框");
  return found;
}

function tab(name: string): HTMLButtonElement {
  return button(name, dialog().querySelector("[role=tablist]") ?? dialog());
}

function tabs(): string[] {
  return [...(dialog().querySelector("[role=tablist]")?.querySelectorAll("button") ?? [])].map(
    (element) => element.textContent ?? "",
  );
}

beforeEach(() => {
  closed = 0;
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  unmount?.();
  unmount = undefined;
  document.body.innerHTML = "";
  vi.useRealTimers();
});

describe("Detail before a summary", () => {
  test("asks before sending local findings to the discovery model and says where they go", async () => {
    const view = item(UNSUMMARIZED);
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(tabs()).toEqual(["Summary", "Evidence"]);
    const text = dialog().textContent ?? "";
    expect(text).toContain("Local rules found this in tool results. No model has read it yet.");
    expect(text).toContain("A summary sends redacted evidence from 2 tasks to deepseek-flash");
    expect(text).toContain("It returns a few lines, not a Skill.");
    expect([...dialog().querySelectorAll("ol code")].map((code) => code.textContent)).toEqual([
      "npm test",
      "npm version",
      "git push",
    ]);
    await click(button("Summarize", dialog()));
    expect(host.actions).toEqual([{ action: "summarize", id: view.id }]);
  });

  test("disables summarizing without a discovery model", async () => {
    const view = item(UNSUMMARIZED);
    await render(view, fakeHost(inboxOf([view])), { summary: null, draft: "deepseek-pro" });
    expect(dialog().textContent).toContain("No discovery model is available.");
    expect(button("Summarize", dialog()).disabled).toBe(true);
  });

  test("shows why a summary failed and offers a retry in place", async () => {
    const view = item({
      ...UNSUMMARIZED,
      state: "failed",
      failure: { stage: "summary", kind: "format", message: "回复不是 JSON", at: NOW, attempts: 1 },
    });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(dialog().querySelector("[role=alert]")?.textContent).toContain(
      "Summary failed: the reply did not match the expected format",
    );
    await click(button("Summarize again", dialog()));
    expect(host.actions).toEqual([{ action: "summarize", id: view.id }]);
  });

  test("shows a skeleton while the discovery model writes the summary", async () => {
    const view = item({ ...UNSUMMARIZED, state: "summarizing" });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(dialog().querySelector("[role=status]")?.textContent).toBe(
      "deepseek-flash is writing the summary",
    );
    expect(dialog().querySelectorAll("[aria-hidden=true] span")).toHaveLength(3);
    expect(button("Summarizing", dialog()).disabled).toBe(true);
  });
});

describe("Detail with a summary", () => {
  test("shows what was found and the plan, and drafts only after the user approves", async () => {
    const view = item({ state: "proposed" });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(tabs()).toEqual(["Summary", "Evidence"]);
    const text = dialog().textContent ?? "";
    expect(text).toContain("Repeated workflow · 2 sessions · Summary by deepseek-flash");
    expect(text).toContain("Two sessions ran the tests, bumped the patch version");
    expect(text).toContain("Release a patch version of an npm package after the tests pass.");
    expect(dialog().querySelector("dd code")?.textContent).toBe("local-patch-release");
    expect(text).toContain("Create");
    expect([...dialog().querySelectorAll("dd ol li")].map((li) => li.textContent)).toEqual([
      "Run the tests",
      "Bump the patch version",
      "Push the tag",
    ]);
    const terms = [...dialog().querySelectorAll("dt")].map((dt) => dt.textContent);
    expect(terms).toEqual(["Found", "Purpose", "When to use", "Plan", "Risks", "Verify"]);
    expect([...dialog().querySelectorAll("dd ul li")].map((li) => li.textContent)).toEqual([
      "Pushes a tag to the remote",
    ]);
    expect(text).toContain("The new tag is on the remote and the tests passed before the bump.");
    expect(text).toContain("Drafting sends the same evidence and this plan to deepseek-pro");
    expect(host.actions).toEqual([]);
    await click(button("Draft Skill", dialog()));
    expect(host.actions).toEqual([{ action: "draft", id: view.id }]);
  });

  test("names the existing Skill a summary would add to and leaves out empty risks", async () => {
    const view = item({
      state: "proposed",
      decision: "suggest_improve",
      skill: "release",
      risks: [],
    });
    await render(view, fakeHost(inboxOf([view])));
    const target = [...dialog().querySelectorAll("dd p > *")].map((part) => part.textContent);
    expect(target).toEqual(["Add to", "release"]);
    expect([...dialog().querySelectorAll("dt")].map((dt) => dt.textContent)).not.toContain("Risks");
    expect(button("Draft addition", dialog())).toBeDefined();
  });

  test("disables drafting without a drafting model", async () => {
    const view = item({ state: "proposed" });
    await render(view, fakeHost(inboxOf([view])), { summary: "deepseek-flash", draft: null });
    expect(dialog().textContent).toContain("No drafting model is available.");
    expect(button("Draft Skill", dialog()).disabled).toBe(true);
  });

  test("shows a staggered skeleton in the Skill tab while the drafting model writes", async () => {
    const view = item({ state: "drafting" });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(tabs()).toEqual(["Summary", "Skill", "Evidence"]);
    expect(tab("Skill").getAttribute("aria-selected")).toBe("true");
    expect(dialog().querySelector("[role=status]")?.textContent).toBe(
      "deepseek-pro is drafting the Skill",
    );
    const bars = [...dialog().querySelectorAll<HTMLElement>("[aria-hidden=true] span")].filter(
      (bar) => bar.style.width !== "",
    );
    expect(bars).toHaveLength(8);
    expect(bars.map((bar) => bar.style.animationDelay).slice(0, 3)).toEqual([
      "0ms",
      "70ms",
      "140ms",
    ]);
    expect(button("Drafting", dialog()).disabled).toBe(true);
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
    expect(dialog().querySelector("[role=alert]")?.textContent).toContain(
      "Drafting failed: the reply was not supported by the evidence",
    );
    expect(dialog().textContent).toContain("Run the tests");
    await click(button("Draft again", dialog()));
    expect(host.actions).toEqual([{ action: "draft", id: view.id }]);
  });
});

describe("Detail with a draft", () => {
  test("opens on the Skill tab and keeps the cited evidence one tab away", async () => {
    const view = item();
    await render(view, fakeHost(inboxOf([view])));
    expect(dialog().open).toBe(true);
    expect(dialog().getAttribute("aria-label")).toBe("Cut a local patch release");
    expect(dialog().textContent).toContain(
      "Repeated workflow · 2 sessions · Draft by deepseek-pro",
    );
    expect(tabs()).toEqual(["Summary", "Skill", "Changes", "Evidence"]);
    expect(dialog().querySelector("[data-markdown]")?.textContent).toContain(
      "# Cut a local patch release",
    );
    await click(tab("Evidence"));
    const text = dialog().textContent ?? "";
    expect(text).toContain("2 reads not shown");
    expect(text).toContain("exit 1");
    expect(text).toContain("Error: Cannot find build config");
    expect(text).toContain("During the task: Use a patch bump, not minor");
    const cited = dialog().querySelectorAll("li[data-cited]");
    expect([...cited].map((li) => li.textContent)).toEqual([
      expect.stringContaining("npm test"),
      expect.stringContaining("npm version patch"),
    ]);
  });

  test("previews the new file, then saves to the chosen scope with an undo notice", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(dialog().textContent).toContain("local-patch-release");

    await click(tab("Changes"));
    await settle();
    expect(host.actions).toContainEqual({ action: "preview", id: view.id, scope: "project" });
    expect(dialog().querySelector("[data-path]")?.getAttribute("data-path")).toBe(
      "~/work/widget/.agents/skills/local-patch-release/SKILL.md",
    );

    await click(button("User", dialog()));
    await settle();
    expect(host.actions.at(-1)).toEqual({ action: "preview", id: view.id, scope: "user" });
    await click(button("Save Skill", dialog()));
    expect(host.actions.at(-1)).toEqual({ action: "write", id: view.id, scope: "user" });
    expect(host.store.getSnapshot().notice).toEqual({
      key: "notice.written",
      params: { skill: "local-patch-release" },
      undo: { action: "undo", id: view.id },
    });
  });

  test("drafts again from the same summary", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    await click(button("Draft again", dialog()));
    expect(host.actions.at(-1)).toEqual({ action: "draft", id: view.id });
  });

  test("blocks saving an edited draft with an invalid name", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    await click(button("Edit", dialog()));
    await type(dialog().querySelector("input"), "Not Valid");
    expect(dialog().querySelector("[role=alert]")?.textContent).toContain("Name must be lowercase");
    expect(button("Save Skill", dialog()).disabled).toBe(true);
  });

  test("reports a refused write inside the dialog", async () => {
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
    await click(button("Save Skill", dialog()));
    expect(dialog().querySelector("[role=alert]")?.textContent).toBe(
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
    expect(dialog().textContent).toContain("Waiting for DSH to list the Skill.");
    await click(button("Undo", dialog()));
    expect(host.actions).toEqual([{ action: "undo", id: view.id }]);
    await click(button("Done", dialog()));
    expect(closed).toBe(1);
  });

  test("dismisses similar suggestions and closes", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    await click(button("Dismiss similar", dialog()));
    expect(host.actions.at(-1)).toEqual({ action: "dismiss", id: view.id, similar: true });
    expect(closed).toBe(1);
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
    expect(dialog().textContent).toContain("Section added to release");
    await click(tab("Changes"));
    await settle();
    expect(dialog().querySelector("[data-old]")?.textContent).toBe("# Release\n");
    await click(button("Add to release", dialog()));
    expect(host.actions.at(-1)).toEqual({ action: "write", id: view.id, baseHash: "abc" });
  });
});
