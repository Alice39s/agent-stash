import { describe, expect, test } from "vitest";
import { benchSettings } from "./settings.ts";

describe("bench settings", () => {
  test("rewrites and judges with DeepSeek V4.1 Flash and uses the plugin's timeout by default", () => {
    const settings = benchSettings({});
    expect(settings.rewriters.map((model) => model.id)).toEqual(["deepseek-v4.1-flash"]);
    expect(settings.judges.map((model) => model.id)).toEqual(["deepseek-v4.1-flash"]);
    expect(settings.concurrency).toBe(4);
    expect(settings.timeoutMs).toBe(60_000);
  });

  test("reads the models, concurrency, and timeout from the environment", () => {
    const settings = benchSettings({
      PROMPT_BENCH_MODELS: "gpt-6.1-terra,deepseek-v4.1-flash-low",
      PROMPT_BENCH_JUDGE: "deepseek-v4-flash-aigw",
      PROMPT_BENCH_CONCURRENCY: "8",
      PROMPT_BENCH_TIMEOUT: "180",
    });
    expect(settings.rewriters.map((model) => model.id)).toEqual([
      "gpt-6.1-terra",
      "deepseek-v4.1-flash-low",
    ]);
    expect(settings.judges.map((model) => model.id)).toEqual(["deepseek-v4-flash-aigw"]);
    expect(settings.concurrency).toBe(8);
    expect(settings.timeoutMs).toBe(180_000);
  });

  test("names the variable whose value is not a positive integer", () => {
    expect(() => benchSettings({ PROMPT_BENCH_CONCURRENCY: "0" })).toThrow(
      'PROMPT_BENCH_CONCURRENCY must be a positive integer, got "0"',
    );
    expect(() => benchSettings({ PROMPT_BENCH_TIMEOUT: "1.5" })).toThrow(/PROMPT_BENCH_TIMEOUT/u);
  });
});
