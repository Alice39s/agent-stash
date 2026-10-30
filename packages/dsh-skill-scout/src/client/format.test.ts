import { describe, expect, test } from "vitest";
import { absolute, duration } from "./format.ts";
import { SCOUT_DICTIONARIES, type ScoutTranslate } from "./locale.ts";

/** 与宿主 `locale.bind` 相同的 `{name}` 插值。 */
function translator(locale: "en" | "zh"): ScoutTranslate {
  const dictionary = SCOUT_DICTIONARIES[locale];
  return (key, params = {}) =>
    dictionary[key].replaceAll(/\{(\w+)\}/gu, (_match, name: string) => String(params[name]));
}

const AT = Date.UTC(2026, 9, 30, 9);
const DATE_TIME = { dateStyle: "medium", timeStyle: "short" } as const;

describe("duration", () => {
  test("writes seconds below a minute in both languages", () => {
    expect(duration(translator("en"), 42_000)).toBe("42s");
    expect(duration(translator("zh"), 42_000)).toBe("42 秒");
  });

  test("writes minutes and seconds without padding the seconds", () => {
    expect(duration(translator("en"), 185_000)).toBe("3m 5s");
    expect(duration(translator("zh"), 185_000)).toBe("3 分 5 秒");
  });
});

describe("absolute", () => {
  test("writes the time in the locale the charts use", () => {
    expect(absolute(AT, "en-US")).toBe(new Date(AT).toLocaleString("en-US", DATE_TIME));
    expect(absolute(AT, "zh-CN")).toBe(new Date(AT).toLocaleString("zh-CN", DATE_TIME));
    expect(absolute(AT, "en-US")).not.toBe(absolute(AT, "zh-CN"));
  });
});
