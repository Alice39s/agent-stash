import { describe, expect, test } from "vitest";
import { createCompositionGuard } from "./composition.ts";

const KEY = { isComposing: false };

describe("createCompositionGuard", () => {
  test("lets ordinary keys through", () => {
    expect(createCompositionGuard().guards(KEY)).toBe(false);
  });

  test("guards keys while composing and keys the engine marks as composing", () => {
    const guard = createCompositionGuard();
    guard.start();
    expect(guard.guards(KEY)).toBe(true);
    expect(createCompositionGuard().guards({ isComposing: true })).toBe(true);
  });

  test("guards the confirming key that arrives after compositionend", () => {
    const guard = createCompositionGuard();
    guard.start();
    guard.end();
    expect(guard.guards(KEY)).toBe(true);
    expect(guard.guards(KEY)).toBe(false);
  });

  test("releases the confirming key on keyup", () => {
    const guard = createCompositionGuard();
    guard.start();
    guard.end();
    guard.release();
    expect(guard.guards(KEY)).toBe(false);
  });
});
