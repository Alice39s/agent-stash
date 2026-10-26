import { describe, expect, test } from "vitest";
import {
  DEFAULT_APPEARANCE,
  changedFields,
  ghostEffectOf,
  parseAppearance,
  sameAppearance,
} from "./appearance.ts";

describe("parseAppearance", () => {
  test("uses the defaults when the Host exposes no configuration", () => {
    expect(parseAppearance(undefined)).toEqual(DEFAULT_APPEARANCE);
    expect(parseAppearance(null)).toEqual(DEFAULT_APPEARANCE);
  });

  test("keeps every valid field", () => {
    const custom = {
      glass: false,
      motion: "subtle",
      ghost: "fade",
      highlight: "instant",
      density: "compact",
      hints: false,
    };
    expect(parseAppearance(custom)).toEqual(custom);
  });

  test("replaces an unknown or mistyped field with its default and keeps the rest", () => {
    expect(parseAppearance({ glass: "no", motion: "wild", density: "compact" })).toEqual({
      ...DEFAULT_APPEARANCE,
      density: "compact",
    });
  });
});

describe("appearance helpers", () => {
  test("lists the fields a draft changes", () => {
    const next = { ...DEFAULT_APPEARANCE, glass: false, hints: false };
    expect(changedFields(DEFAULT_APPEARANCE, next)).toEqual(["glass", "hints"]);
    expect(sameAppearance(DEFAULT_APPEARANCE, { ...DEFAULT_APPEARANCE })).toBe(true);
    expect(sameAppearance(DEFAULT_APPEARANCE, next)).toBe(false);
  });

  test("shows ghost text without animation when motion is off", () => {
    expect(ghostEffectOf({ ...DEFAULT_APPEARANCE, motion: "off" })).toBe("none");
    expect(ghostEffectOf({ ...DEFAULT_APPEARANCE, motion: "subtle", ghost: "fade" })).toBe("fade");
  });
});
