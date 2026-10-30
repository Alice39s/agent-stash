import { describe, expect, test } from "vitest";
import { estimateTokens, formatTokens } from "./tokens.ts";

describe("token estimate", () => {
  test("prices Latin and CJK characters at the DeepSeek ratios", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("abcdefghij")).toBe(3);
    expect(estimateTokens("登录页太慢")).toBe(3);
    expect(estimateTokens("修改 config.ts")).toBe(5);
  });

  test("counts characters outside the Basic Multilingual Plane once", () => {
    expect(estimateTokens("😀😀😀😀😀😀😀😀😀😀")).toBe(3);
  });

  test("groups thousands", () => {
    expect(formatTokens(114_515_911)).toBe("114,515,911");
    expect(formatTokens(980)).toBe("980");
  });
});
