import { describe, expect, test } from "vitest";
import { expandIncludes, loadReferences, type WritingReference } from "./references.ts";

const NOTE: WritingReference = {
  name: "note",
  source: "https://github.com/o/r/blob/abc/NOTE.md",
  license: "MIT",
  text: "Be brief.\n",
};

describe("writing references", () => {
  test("loads every bundled reference with its pinned source", async () => {
    const references = await loadReferences();
    expect([...references.keys()]).toEqual(["humanizer", "no-ai-slop", "no-negative-echo"]);
    for (const reference of references.values()) {
      expect(reference.source).toMatch(
        /^https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/blob\/[0-9a-f]{40}\//u,
      );
      expect(reference.license).toBe("MIT");
      expect(reference.text.startsWith("---\nname: ")).toBe(true);
    }
  });

  test("replaces each include with the reference text and its source", () => {
    const references = new Map([["note", NOTE]]);
    expect(
      expandIncludes('A\n<include ref="note" />\nB <include ref="note"/>', references),
    ).toEqual({
      ok: true,
      text: 'A\n<reference name="note" source="https://github.com/o/r/blob/abc/NOTE.md" license="MIT">\nBe brief.\n</reference>\nB <reference name="note" source="https://github.com/o/r/blob/abc/NOTE.md" license="MIT">\nBe brief.\n</reference>',
    });
  });

  test("lists each unknown name once", () => {
    expect(
      expandIncludes(
        '<include ref="x" /> <include ref="note" /> <include ref="x" />',
        new Map([["note", NOTE]]),
      ),
    ).toEqual({ ok: false, missing: ["x"] });
  });

  test("leaves text without includes alone", () => {
    expect(expandIncludes("Plain.", new Map())).toEqual({ ok: true, text: "Plain." });
  });
});
