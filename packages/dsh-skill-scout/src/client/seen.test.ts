// @vitest-environment happy-dom
import { beforeEach, describe, expect, test } from "vitest";
import { createSeenStore } from "./seen.ts";

beforeEach(() => {
  window.localStorage.clear();
});

describe("createSeenStore", () => {
  test("treats a damaged record as empty", () => {
    window.localStorage.setItem("agent-stash-skill-scout:seen", "{not json");
    const seen = createSeenStore(window.localStorage);
    expect(seen.has("a")).toBe(false);
    seen.add(["a"]);
    expect(seen.has("a")).toBe(true);
  });

  test("remembers seen suggestions in memory when storage refuses writes", () => {
    const writes: string[] = [];
    const seen = createSeenStore({
      getItem: () => null,
      setItem: (key: string) => {
        writes.push(key);
        throw new DOMException("full", "QuotaExceededError");
      },
    });
    seen.add(["a", "b"]);
    expect(writes).toEqual(["agent-stash-skill-scout:seen"]);
    expect(seen.has("b")).toBe(true);
  });
});
