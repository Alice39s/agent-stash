import { describe, expect, test } from "vitest";
import type { KeyInput } from "../../shared/client/keys.ts";
import { suggestKey } from "./suggest.ts";

const key = (name: string, extra: Partial<KeyInput> = {}): KeyInput => ({
  key: name,
  shift: false,
  alt: false,
  ctrl: false,
  meta: false,
  composing: false,
  ...extra,
});

describe("suggestKey", () => {
  test("passes every key while nothing is suggested", () => {
    expect(suggestKey({ count: 0, index: 0 }, key("Tab"))).toEqual({
      action: { kind: "none" },
      consume: false,
    });
  });

  test("Tab and ArrowRight fill the highlighted suggestion", () => {
    expect(suggestKey({ count: 2, index: 1 }, key("Tab"))).toEqual({
      action: { kind: "accept", index: 1 },
      consume: true,
    });
    expect(suggestKey({ count: 1, index: 0 }, key("ArrowRight"))).toEqual({
      action: { kind: "accept", index: 0 },
      consume: true,
    });
  });

  test("modified Tab and ArrowRight keep their editor meaning", () => {
    expect(suggestKey({ count: 1, index: 0 }, key("Tab", { shift: true })).consume).toBe(false);
    expect(suggestKey({ count: 1, index: 0 }, key("ArrowRight", { alt: true })).consume).toBe(
      false,
    );
    expect(suggestKey({ count: 1, index: 0 }, key("Tab", { composing: true })).consume).toBe(false);
  });

  test("arrows move between several suggestions and stop at both ends", () => {
    expect(suggestKey({ count: 3, index: 0 }, key("ArrowDown"))).toEqual({
      action: { kind: "highlight", index: 1 },
      consume: true,
    });
    expect(suggestKey({ count: 3, index: 2 }, key("ArrowDown"))).toEqual({
      action: { kind: "none" },
      consume: true,
    });
    expect(suggestKey({ count: 3, index: 1 }, key("ArrowUp"))).toEqual({
      action: { kind: "highlight", index: 0 },
      consume: true,
    });
    expect(suggestKey({ count: 3, index: 0 }, key("ArrowUp"))).toEqual({
      action: { kind: "none" },
      consume: true,
    });
  });

  test("arrows keep moving the caret when there is a single suggestion", () => {
    expect(suggestKey({ count: 1, index: 0 }, key("ArrowUp")).consume).toBe(false);
    expect(suggestKey({ count: 1, index: 0 }, key("ArrowDown")).consume).toBe(false);
  });

  test("Escape dismisses the suggestion for the current draft", () => {
    expect(suggestKey({ count: 2, index: 0 }, key("Escape"))).toEqual({
      action: { kind: "dismiss" },
      consume: true,
    });
  });

  test("other keys keep typing", () => {
    expect(suggestKey({ count: 2, index: 0 }, key("a"))).toEqual({
      action: { kind: "none" },
      consume: false,
    });
  });
});
