import { describe, expect, test } from "vitest";
import type { ItemView } from "../shared.ts";
import { lifecycleOf } from "./lifecycle.ts";
import { item, NOW, translator, UNSUMMARIZED } from "./testing.tsx";

const t = translator("en");

/** 每一步的「id:状态」，当前一步后面带 `*`。 */
function steps(view: ItemView): string[] {
  return lifecycleOf(t, view).steps.map(
    (step) => `${step.id}:${step.state}${step.current ? "*" : ""}`,
  );
}

function failed(stage: "summary" | "draft"): ItemView {
  return item({
    ...(stage === "summary" ? UNSUMMARIZED : {}),
    state: "failed",
    failure: { stage, kind: "format", message: "", at: NOW, attempts: 1 },
  });
}

describe("lifecycleOf", () => {
  test.each([
    ["detected", item(UNSUMMARIZED), ["found:done", "summary:idle*", "draft:idle", "save:idle"]],
    [
      "summarizing",
      item({ ...UNSUMMARIZED, state: "summarizing" }),
      ["found:done", "summary:ongoing*", "draft:idle", "save:idle"],
    ],
    [
      "proposed",
      item({ state: "proposed" }),
      ["found:done", "summary:warning*", "draft:idle", "save:idle"],
    ],
    [
      "drafting",
      item({ state: "drafting" }),
      ["found:done", "summary:done", "draft:ongoing*", "save:idle"],
    ],
    ["ready", item(), ["found:done", "summary:done", "draft:warning*", "save:idle"]],
    [
      "failed while summarizing",
      failed("summary"),
      ["found:done", "summary:error*", "draft:idle", "save:idle"],
    ],
    [
      "failed while drafting",
      failed("draft"),
      ["found:done", "summary:done", "draft:error*", "save:idle"],
    ],
    [
      "written",
      item({ state: "written" }),
      ["found:done", "summary:done", "draft:done", "save:done"],
    ],
  ] satisfies [string, ItemView, string[]][])(
    "makes the step that %s names current with the item's status class",
    (_state, view, expected) => {
      expect(lifecycleOf(t, view).closed).toBe(false);
      expect(steps(view)).toEqual(expected);
    },
  );

  test.each([
    ["skipped", item({ state: "skipped", decision: "skip" })],
    ["dismissed", item({ state: "dismissed" })],
  ] satisfies [string, ItemView][])("shows every step of a %s item quiet", (_state, view) => {
    const lifecycle = lifecycleOf(t, view);
    expect(lifecycle.closed).toBe(true);
    expect(steps(view)).toEqual(["found:idle", "summary:idle", "draft:idle", "save:idle"]);
    expect(lifecycle.steps.map((step) => step.word)).toEqual([
      "closed",
      "closed",
      "closed",
      "closed",
    ]);
  });

  test("names each step and its state for screen readers", () => {
    expect(
      lifecycleOf(t, item({ state: "proposed" })).steps.map((step) => [step.label, step.word]),
    ).toEqual([
      ["Found", "done"],
      ["Summary", "needs you"],
      ["Draft", "not started"],
      ["Save", "not started"],
    ]);
  });
});
