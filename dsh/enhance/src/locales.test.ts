import { describe, expect, test } from "vitest";
import { en, zh } from "./locales.ts";
import { FAILURE_REASONS } from "./wire.ts";

describe("dictionaries", () => {
  test("name every failure reason in both languages", () => {
    for (const reason of FAILURE_REASONS) {
      for (const [language, dictionary] of [
        ["en", en],
        ["zh", zh],
      ] as const) {
        expect(`error.${reason}` in dictionary, `${language} has no error.${reason}`).toBe(true);
      }
    }
  });

  test("keeps the placeholders of the estimate labels", () => {
    for (const dictionary of [en, zh]) {
      expect(dictionary.estimate).toContain("{tokens}");
      expect(dictionary.estimateLinked).toContain("{tokens}");
      expect(dictionary.estimateLinked).toContain("{n}");
    }
  });
});
