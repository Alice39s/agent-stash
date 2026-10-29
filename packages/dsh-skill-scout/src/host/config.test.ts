import { expect, test } from "vitest";
import { Config, currentSettings } from "./config.ts";

test("keeps model review off and suggestions in the project by default", () => {
  const settings = currentSettings(Config({}));
  expect(settings).toMatchObject({
    discovery: true,
    review: false,
    scope: "project",
    notify: "badge",
  });
  expect(settings.redactPatterns).toEqual([]);
});
