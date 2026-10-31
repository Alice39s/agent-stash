import { describe, expect, test } from "vitest";
import { MODELS, PROVIDERS, providerBaseURL, selectModels } from "./models.ts";

describe("model selection", () => {
  test("picks the listed models in order and drops repeats", () => {
    expect(selectModels(" glm-5.3, grok-4.7 ,glm-5.3").map((model) => model.id)).toEqual([
      "glm-5.3",
      "grok-4.7",
    ]);
  });

  test("names the known models when an id is unknown", () => {
    expect(() => selectModels("gpt-x")).toThrow(
      /unknown model "gpt-x" \(known: deepseek-v4\.1-flash, /u,
    );
  });

  test("rejects an empty selection", () => {
    expect(() => selectModels(" , ")).toThrow(/no model selected/u);
  });

  test("gives every model a unique id", () => {
    expect(new Set(MODELS.map((model) => model.id)).size).toBe(MODELS.length);
  });
});

describe("provider address", () => {
  test("prefers the environment over the built-in address", () => {
    expect(providerBaseURL(PROVIDERS.zhipu, {})).toBe("https://open.bigmodel.cn/api/paas/v4/");
    expect(
      providerBaseURL(PROVIDERS.zhipu, {
        ZHIPU_BASE_URL: "https://open.bigmodel.cn/api/coding/paas/v4/",
      }),
    ).toBe("https://open.bigmodel.cn/api/coding/paas/v4/");
  });

  test("names the variable when a gateway has no address", () => {
    expect(() => providerBaseURL(PROVIDERS.aigw, {})).toThrow("AIGW_OPENAI_V1_ENDPOINT is not set");
  });
});
