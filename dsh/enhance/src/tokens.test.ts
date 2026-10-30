import { afterEach, describe, expect, test } from "vitest";
import { estimateTokens, freeTokenEncoder } from "./tokens.ts";
import { formatTokens } from "./token-format.ts";

afterEach(freeTokenEncoder);

describe("token estimate", () => {
  test("counts English, CJK, code and multiline input with o200k_base", () => {
    expect(estimateTokens("")).toBe(0);
    expect(estimateTokens("hello world")).toBe(2);
    expect(estimateTokens("登录页太慢")).toBe(4);
    expect(estimateTokens("修改 config.ts")).toBe(3);
    expect(estimateTokens("const x = 1;\nconsole.log(x);")).toBe(10);
    expect(estimateTokens("line one\nline two")).toBe(5);
  });

  test("counts characters outside the Basic Multilingual Plane once", () => {
    expect(estimateTokens("😀😀😀😀😀😀😀😀😀😀")).toBe(10);
  });

  test("treats special token literals as text and recreates after disposal", () => {
    expect(estimateTokens("<|endoftext|>")).toBe(7);
    freeTokenEncoder();
    freeTokenEncoder();
    expect(estimateTokens("hello world")).toBe(2);
  });

  test("groups thousands", () => {
    expect(formatTokens(114_515_911)).toBe("114,515,911");
    expect(formatTokens(980)).toBe("980");
  });
});
