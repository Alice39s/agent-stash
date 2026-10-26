import { describe, expect, test } from "vitest";
import type { KeyInput } from "../../shared/client/keys.ts";
import { CLOSED, recallKey, type RecallContext, type RecallState } from "./recall.ts";

const key = (name: string, extra: Partial<KeyInput> = {}): KeyInput => ({
  key: name,
  shift: false,
  alt: false,
  ctrl: false,
  meta: false,
  composing: false,
  ...extra,
});

const context = (extra: Partial<RecallContext> = {}): RecallContext => ({
  count: 3,
  draft: "half typed",
  caretAtStart: true,
  ready: true,
  ...extra,
});

const open = (index: number): RecallState => ({ open: true, index, original: "half typed" });

describe("recallKey while closed", () => {
  test("ArrowUp at the start of the draft opens the newest prompt and keeps the draft", () => {
    expect(recallKey(CLOSED, key("ArrowUp"), context())).toEqual({
      state: open(2),
      effect: { kind: "show", index: 2 },
      consume: true,
    });
  });

  test("leaves ArrowUp to the editor away from the draft start, without history, or while not ready", () => {
    for (const ctx of [
      context({ caretAtStart: false }),
      context({ count: 0 }),
      context({ ready: false }),
    ]) {
      expect(recallKey(CLOSED, key("ArrowUp"), ctx)).toEqual({
        state: CLOSED,
        effect: { kind: "none" },
        consume: false,
      });
    }
  });

  test("ignores ArrowUp with modifiers or during composition", () => {
    for (const input of [
      key("ArrowUp", { shift: true }),
      key("ArrowUp", { meta: true }),
      key("ArrowUp", { composing: true }),
    ]) {
      expect(recallKey(CLOSED, input, context()).consume).toBe(false);
    }
  });
});

describe("recallKey while open", () => {
  test("ArrowUp moves to older prompts and stops at the oldest", () => {
    expect(recallKey(open(2), key("ArrowUp"), context())).toEqual({
      state: open(1),
      effect: { kind: "show", index: 1 },
      consume: true,
    });
    expect(recallKey(open(0), key("ArrowUp"), context())).toEqual({
      state: open(0),
      effect: { kind: "none" },
      consume: true,
    });
  });

  test("ArrowDown moves to newer prompts and past the newest returns to the saved draft", () => {
    expect(recallKey(open(0), key("ArrowDown"), context())).toEqual({
      state: open(1),
      effect: { kind: "show", index: 1 },
      consume: true,
    });
    expect(recallKey(open(2), key("ArrowDown"), context())).toEqual({
      state: CLOSED,
      effect: { kind: "restore", text: "half typed" },
      consume: true,
    });
  });

  test("Escape restores the saved draft", () => {
    expect(recallKey(open(1), key("Escape"), context())).toEqual({
      state: CLOSED,
      effect: { kind: "restore", text: "half typed" },
      consume: true,
    });
  });

  test("Tab keeps the shown prompt for editing and Enter lets the composer send it", () => {
    expect(recallKey(open(1), key("Tab"), context())).toEqual({
      state: CLOSED,
      effect: { kind: "none" },
      consume: true,
    });
    expect(recallKey(open(1), key("Enter"), context())).toEqual({
      state: CLOSED,
      effect: { kind: "none" },
      consume: false,
    });
  });

  test("typing closes the panel and keeps the shown prompt; lone modifiers keep it open", () => {
    expect(recallKey(open(1), key("a"), context())).toEqual({
      state: CLOSED,
      effect: { kind: "none" },
      consume: false,
    });
    expect(recallKey(open(1), key("Shift", { shift: true }), context())).toEqual({
      state: open(1),
      effect: { kind: "none" },
      consume: false,
    });
  });

  test("keys pressed during composition pass through untouched", () => {
    expect(recallKey(open(1), key("ArrowUp", { composing: true }), context())).toEqual({
      state: open(1),
      effect: { kind: "none" },
      consume: false,
    });
  });
});
