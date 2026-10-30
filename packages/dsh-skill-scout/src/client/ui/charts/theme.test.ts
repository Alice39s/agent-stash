import { describe, expect, test } from "vitest";
import {
  COVERAGE_COLORS,
  IDEA_COLORS,
  LEAD_COLORS,
  OUTCOME_COLORS,
  USAGE_COLORS,
} from "./theme.ts";

const WARN = "var(--dsw-alias-state-warn-primary)";
const ERROR = "var(--dsw-alias-state-error-primary)";
const SUCCESS = "var(--dsw-alias-state-success-primary)";
const IDLE = "var(--dsw-alias-state-idle-primary)";
const CLOSED = "var(--dsw-alias-border-l3)";
const ACCENT = "var(--dsw-alias-state-business-primary)";

function half(color: string): string {
  return `color-mix(in srgb, ${color} 50%, transparent)`;
}

describe("chart colors", () => {
  test("color lead states by status class, the earlier closed stage at 50%", () => {
    expect(LEAD_COLORS).toEqual({
      summarized: SUCCESS,
      detected: IDLE,
      failed: ERROR,
      skipped: CLOSED,
      dismissed: half(CLOSED),
    });
  });

  test("color idea states by status class, the earlier decision stage at 50%", () => {
    expect(IDEA_COLORS).toEqual({
      written: SUCCESS,
      ready: WARN,
      proposed: half(WARN),
      failed: ERROR,
      dismissed: CLOSED,
    });
  });

  test("color the analysis states of sessions by status class", () => {
    expect(COVERAGE_COLORS).toEqual({ analyzed: SUCCESS, failed: ERROR, pending: IDLE });
  });

  test("color task outcomes on the result scale", () => {
    expect(OUTCOME_COLORS).toEqual({
      verified: SUCCESS,
      succeeded: half(SUCCESS),
      unverified: IDLE,
      disputed: WARN,
      failed: ERROR,
      aborted: CLOSED,
    });
  });

  test("color token kinds as neutral quantities with falling contrast: accent, tertiary ink, half accent, l3 border", () => {
    expect(USAGE_COLORS).toEqual({
      inputTokens: ACCENT,
      cacheReadTokens: "var(--dsw-alias-label-tertiary)",
      cacheWriteTokens: half(ACCENT),
      outputTokens: CLOSED,
    });
  });
});
