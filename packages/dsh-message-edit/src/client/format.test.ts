import { describe, expect, test } from "vitest";
import { formatClock, formatCount, formatLocale, formatPlural, shortId } from "./format.ts";
import { translator } from "./testing.ts";

const EN = translator("en");
const ZH = translator("zh");

describe("formatLocale", () => {
  test("reads the language from the active dictionary", () => {
    expect(formatLocale(EN)).toBe("en");
    expect(formatLocale(ZH)).toBe("zh");
  });

  test("throws when the dictionary does not resolve its language key", () => {
    expect(() => formatLocale((key) => key)).toThrow(/format\.locale/u);
  });
});

describe("formatClock", () => {
  const NOW = new Date(2026, 9, 26, 18, 30).getTime();

  test("shows only the zero-padded clock for the same local day", () => {
    expect(formatClock(new Date(2026, 9, 26, 9, 5, 42).getTime(), EN, NOW)).toBe("09:05");
  });

  test("adds the month and day earlier in the same year", () => {
    const time = new Date(2026, 2, 7, 23, 1).getTime();
    expect(formatClock(time, EN, NOW)).toBe("3/7 23:01");
    expect(formatClock(time, ZH, NOW)).toBe("3月7日 23:01");
  });

  test("adds the year for other years", () => {
    const time = new Date(2025, 11, 31, 0, 0).getTime();
    expect(formatClock(time, EN, NOW)).toBe("2025-12-31 00:00");
    expect(formatClock(time, ZH, NOW)).toBe("2025年12月31日 00:00");
  });
});

describe("counts", () => {
  test("formats integers for the active locale", () => {
    expect(formatCount(12345, "en")).toBe("12,345");
    expect(formatCount(3, "zh")).toBe("3");
  });

  test("selects the one and other forms in en", () => {
    expect(formatPlural(EN, "versions.count", 1, "en")).toBe("1 version");
    expect(formatPlural(EN, "versions.count", 4, "en")).toBe("4 versions");
  });

  test("uses a single form in zh with a space before the measure word", () => {
    expect(formatPlural(ZH, "versions.count", 1, "zh")).toBe("1 个版本");
    expect(formatPlural(ZH, "action.redoBranches", 3, "zh")).toBe("3 个下一版本中最新的一个");
  });
});

test("session ids shorten to the first 8 characters after the shared prefix", () => {
  expect(shortId("session-2062c129-aabd-4e55-8d14-a7f9d0cd882b")).toBe("2062c129");
  expect(shortId("0123456789abcdef")).toBe("01234567");
  expect(shortId("abc")).toBe("abc");
});
