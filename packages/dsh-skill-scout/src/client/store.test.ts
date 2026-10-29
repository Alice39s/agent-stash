import { describe, expect, test } from "vitest";
import { pollInterval } from "./store.ts";
import { inboxOf, item } from "./testing.tsx";

describe("pollInterval", () => {
  test("polls every second while a model writes a summary or draft", () => {
    expect(pollInterval(inboxOf([item({ state: "drafting" })], { working: 1 }))).toBe(1_000);
  });

  test("polls every few seconds while sessions are analyzed or a write is being checked", () => {
    expect(pollInterval(inboxOf([], { scanning: true }))).toBe(3_000);
    const checking = item({
      state: "written",
      write: {
        at: 0,
        scope: "project",
        skill: "x",
        path: "~/x/SKILL.md",
        discovered: false,
        checking: true,
      },
    });
    expect(pollInterval(inboxOf([checking]))).toBe(3_000);
  });

  test("polls rarely when nothing is in progress", () => {
    expect(pollInterval(inboxOf([item()]))).toBe(45_000);
    expect(pollInterval(null)).toBe(45_000);
  });
});
