import { describe, expect, test } from "vitest";
import { followDraft, IDLE, type EnhanceState } from "./state.ts";

const running: EnhanceState = {
  kind: "running",
  source: "fix login",
  original: "fix login",
  controller: new AbortController(),
};
const done: EnhanceState = {
  kind: "done",
  original: "fix login",
  before: "fix login",
  applied: undefined,
};

describe("enhance state following the draft", () => {
  test("keeps a running rewrite while the draft stays the same", () => {
    expect(followDraft(running, "fix login")).toBeUndefined();
  });

  test("drops a running rewrite when the draft changes elsewhere", () => {
    expect(followDraft(running, "")).toBe(IDLE);
  });

  test("records the draft published after the result was written", () => {
    expect(followDraft(done, "fix login")).toBeUndefined();
    expect(followDraft(done, "Fix the login page.")).toEqual({
      ...done,
      applied: "Fix the login page.",
    });
  });

  test("ends the undo once the user edits the rewritten draft", () => {
    const applied: EnhanceState = { ...done, applied: "Fix the login page." };
    expect(followDraft(applied, "Fix the login page.")).toBeUndefined();
    expect(followDraft(applied, "Fix the login page!")).toBe(IDLE);
  });

  test("clears a note when its draft changes", () => {
    const note: EnhanceState = {
      kind: "note",
      draft: "fix login",
      note: { tone: "info", reason: "unchanged" },
    };
    expect(followDraft(note, "fix login")).toBeUndefined();
    expect(followDraft(note, "fix login now")).toBe(IDLE);
  });

  test("leaves the idle state alone", () => {
    expect(followDraft(IDLE, "anything")).toBeUndefined();
  });
});
