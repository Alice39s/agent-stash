import { describe, expect, test } from "vitest";
import { formatCompact, formatDay, formatNumber, formatPercent } from "./format.ts";

describe("chart number formats", () => {
  test("groups thousands in counts", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  test("writes ratios as whole percentages with one decimal below ten percent", () => {
    expect(formatPercent(0)).toBe("0%");
    expect(formatPercent(40 / 48)).toBe("83%");
    expect(formatPercent(1.04)).toBe("104%");
    expect(formatPercent(1 / 12)).toBe("8.3%");
    expect(formatPercent(0.1)).toBe("10%");
  });

  test("abbreviates token counts on axes", () => {
    expect(formatCompact(950)).toBe("950");
    expect(formatCompact(12_300)).toBe("12.3K");
    expect(formatCompact(4_500_000)).toBe("4.5M");
  });

  test("writes ISO days as month and day without leading zeros", () => {
    expect(formatDay("2026-10-30")).toBe("10/30");
    expect(formatDay("2026-01-05")).toBe("1/5");
  });
});
