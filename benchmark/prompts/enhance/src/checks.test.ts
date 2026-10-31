import { describe, expect, test } from "vitest";
import { checkRewrite, lengthLimit, lengthUnits, type RewriteSample } from "./checks.ts";

function sample(overrides: Partial<RewriteSample>): RewriteSample {
  return {
    preset: "polish",
    expectation: "either",
    draft: "把超时改成 60 秒",
    text: "把超时改成 60 秒",
    unchanged: true,
    hasContext: false,
    keep: [],
    avoid: [],
    ...overrides,
  };
}

describe("length units", () => {
  test("counts English words and numbers as one and two Chinese characters as one", () => {
    expect(lengthUnits("Fix the bug in v2")).toBe(5);
    expect(lengthUnits("修复登录页")).toBe(2.5);
    expect(lengthUnits("把 retry 改成 3 次")).toBe(4);
  });

  test("leaves fenced code out", () => {
    expect(lengthUnits("Run it:\n```sh\npnpm test --filter api\n```")).toBe(2);
  });
});

describe("length limit", () => {
  test("lets a short draft grow to 80 units under polish and caps every draft at 250", () => {
    expect(lengthLimit("polish", 5, false)).toBe(80 * 1.1 + 8);
    expect(lengthLimit("polish", 50, false)).toBe(150 * 1.1 + 8);
    expect(lengthLimit("polish", 200, false)).toBe(250 * 1.1 + 8);
  });

  test("keeps structure close to the draft and concise no longer than it", () => {
    expect(lengthLimit("structure", 10, false)).toBe(20);
    expect(lengthLimit("concise", 10, false)).toBe(18);
  });

  test("leaves room for the words that resolve a reference from the context", () => {
    expect(lengthLimit("concise", 10, true)).toBe(34);
  });
});

describe("rule checks", () => {
  test("passes a result that meets every rule", () => {
    expect(checkRewrite(sample({}))).toEqual([]);
  });

  test("flags a result that does not match the expected change", () => {
    expect(checkRewrite(sample({ expectation: "changed" }))).toEqual([
      "expected a rewrite, got the draft back unchanged",
    ]);
    expect(checkRewrite(sample({ expectation: "unchanged", unchanged: false }))).toEqual([
      "expected the draft back unchanged",
    ]);
  });

  test("flags dropped and forbidden text", () => {
    const failures = checkRewrite(
      sample({ text: "把超时改成 30 秒", unchanged: false, keep: ["60 秒"], avoid: ["30 秒"] }),
    );
    expect(failures).toEqual(['dropped "60 秒"', 'contains "30 秒"']);
  });

  test("flags a result over the preset's length limit", () => {
    const text = "Please refactor the module carefully. ".repeat(20);
    expect(
      checkRewrite(sample({ preset: "concise", draft: "refactor it", text, unchanged: false })),
    ).toEqual(["100 length units, over the concise limit of 10"]);
  });

  test("flags a Markdown heading the draft did not have, outside code", () => {
    const heading = "## 目标\n把超时改成 60 秒";
    expect(checkRewrite(sample({ text: heading, unchanged: false }))).toEqual([
      "adds a Markdown heading",
    ]);
    const comment = "把超时改成 60 秒\n```sh\n# set it\n```";
    expect(checkRewrite(sample({ text: comment, unchanged: false }))).toEqual([]);
  });
});
