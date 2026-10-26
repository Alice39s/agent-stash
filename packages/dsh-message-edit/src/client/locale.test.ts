import { describe, expect, test } from "vitest";
import { MESSAGE_EDIT_DICTIONARIES } from "./locale.ts";

const { en, zh } = MESSAGE_EDIT_DICTIONARIES;

function parameters(dictionary: Readonly<Record<string, string>>): Record<string, string[]> {
  return Object.fromEntries(
    Object.entries(dictionary).map(([key, text]) => [
      key,
      [...text.matchAll(/\{(\w+)\}/gu)].map((match) => match[1] ?? "").toSorted(),
    ]),
  );
}

/** 以句号结尾的键。 */
function sentences(dictionary: Readonly<Record<string, string>>): string[] {
  return Object.entries(dictionary)
    .filter(([, text]) => /[.。]$/u.test(text))
    .map(([key]) => key)
    .toSorted();
}

describe("message edit dictionaries", () => {
  test("en and zh define exactly the same keys", () => {
    expect(Object.keys(zh).toSorted()).toEqual(Object.keys(en).toSorted());
  });

  test("each key uses the same template parameters in both languages", () => {
    expect(parameters(zh)).toEqual(parameters(en));
  });

  test("copy carries no ellipsis", () => {
    for (const text of [...Object.values(en), ...Object.values(zh)]) {
      expect(text).not.toMatch(/…|\.\.\./u);
    }
  });

  test("only descriptions and helper lines end with a sentence mark", () => {
    const expected = [
      "dialog.hint.last",
      "dialog.hint.preserve",
      "dialog.hint.truncate",
      "dialog.pick",
    ];
    expect(sentences(en)).toEqual(expected);
    expect(sentences(zh)).toEqual(expected);
  });

  test("every counted string has one and other forms", () => {
    const keys = Object.keys(en);
    for (const key of keys.filter((candidate) => candidate.endsWith(".one"))) {
      expect(keys).toContain(key.replace(/\.one$/u, ".other"));
    }
  });

  test("zh copy avoids the honorific you and exclamation marks", () => {
    for (const text of Object.values(zh)) {
      expect(text).not.toMatch(/您|!|！/u);
    }
  });

  test("format.locale names the dictionary language", () => {
    expect(en["format.locale"]).toBe("en");
    expect(zh["format.locale"]).toBe("zh");
  });
});
