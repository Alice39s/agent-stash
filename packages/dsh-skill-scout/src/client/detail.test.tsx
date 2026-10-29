// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ItemView } from "../shared.ts";
import { Detail } from "./detail.tsx";
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
  type FakeHost,
} from "./testing.tsx";

const t = translator("en");
let unmount: (() => void) | undefined;
let closed = 0;

async function render(view: ItemView, host: FakeHost, modelName: string | null = "deepseek-flash") {
  const mounted = await mount(
    <Detail
      id={view.id}
      item={view}
      inbox={host.store}
      loadDetail={async () => detailOf(view)}
      modelName={modelName}
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

describe("Detail", () => {
  test("opens as a modal native dialog with the evidence first", async () => {
    const view = item();
    await render(view, fakeHost(inboxOf([view])));
    expect(dialog().open).toBe(true);
    expect(dialog().getAttribute("aria-label")).toBe("Cut a local patch release");
    const text = dialog().textContent ?? "";
    expect(text).toContain("Repeated workflow · 2 sessions · Reviewed by deepseek-flash");
    expect(text).toContain("The same release steps ran in 2 sessions");
    expect(text).toContain("npm test");
    expect(text).toContain("2 reads not shown");
    expect(text).toContain("exit 1");
    expect(text).toContain("Error: Cannot find build config");
    const cited = dialog().querySelectorAll("li[data-cited]");
    expect([...cited].map((li) => li.textContent)).toEqual([
      expect.stringContaining("npm test"),
      expect.stringContaining("npm version patch"),
    ]);
  });

  test("previews the Skill and the new file, then saves to the chosen scope with an undo notice", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    await click(tab("Skill"));
    expect(dialog().textContent).toContain("local-patch-release");
    expect(dialog().querySelector("[data-markdown]")?.textContent).toContain(
      "# Cut a local patch release",
    );

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

  test("blocks saving an edited draft with an invalid name", async () => {
    const view = item();
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    await click(tab("Skill"));
    await click(button("Edit", dialog()));
    await type(dialog().querySelector("input"), "Not Valid");
    expect(dialog().querySelector("[role=alert]")?.textContent).toContain("Name must be lowercase");
    expect(button("Save Skill", dialog()).disabled).toBe(true);
  });

  test("asks before sending local findings to the model and says where they go", async () => {
    const view = item({
      state: "detected",
      title: null,
      decision: null,
      reason: null,
      skill: null,
    });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    const text = dialog().textContent ?? "";
    expect(text).toContain("Found by local rules from tool results. Not reviewed yet.");
    expect(text).toContain("Review sends a redacted summary of 2 tasks to deepseek-flash");
    await click(button("Review with model", dialog()));
    expect(host.actions).toEqual([{ action: "analyze", id: view.id }]);
  });

  test("disables review without a model", async () => {
    const view = item({
      state: "detected",
      title: null,
      decision: null,
      reason: null,
      skill: null,
    });
    await render(view, fakeHost(inboxOf([view])), null);
    expect(dialog().textContent).toContain("No review model is available.");
    expect(button("Review with model", dialog()).disabled).toBe(true);
  });

  test("shows why a review failed and offers a retry in place", async () => {
    const view = item({
      state: "failed",
      title: null,
      decision: null,
      reason: null,
      skill: null,
      failure: { kind: "format", message: "回复不是 JSON", at: NOW, attempts: 1 },
    });
    const host = fakeHost(inboxOf([view]));
    await render(view, host);
    expect(dialog().querySelector("[role=alert]")?.textContent).toContain(
      "Review failed: the reply did not match the expected format",
    );
    await click(button("Review again", dialog()));
    expect(host.actions).toEqual([{ action: "analyze", id: view.id }]);
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
    await click(tab("Skill"));
    expect(dialog().textContent).toContain("Section added to release");
    await click(tab("Changes"));
    await settle();
    expect(dialog().querySelector("[data-old]")?.textContent).toBe("# Release\n");
    await click(button("Add to release", dialog()));
    expect(host.actions.at(-1)).toEqual({ action: "write", id: view.id, baseHash: "abc" });
  });
});
