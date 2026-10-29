import { expect, test } from "vitest";
import { Config, currentSettings } from "./config.ts";

test("keeps background summaries off and suggestions in the project by default", () => {
  const settings = currentSettings(Config({}));
  expect(settings).toMatchObject({
    discovery: true,
    summarize: false,
    summaryModel: "",
    draftModel: "",
    scope: "project",
    notify: "badge",
  });
  expect(settings.draftTimeout).toBeGreaterThan(settings.summaryTimeout);
  expect(settings.redactPatterns).toEqual([]);
});
