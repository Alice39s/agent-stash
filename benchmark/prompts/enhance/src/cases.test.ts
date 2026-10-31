import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join } from "pathe";
import { afterEach, describe, expect, test } from "vitest";
import { CATEGORIES, loadCases } from "./cases.ts";

const ROOT = join(import.meta.dirname, "../../../../.test-output");
let dir: string | undefined;

/** 在仓库忽略的 `.test-output/` 下建一个只含给定用例文件的目录。 */
function casesDir(files: Record<string, string>): string {
  mkdirSync(ROOT, { recursive: true });
  dir = mkdtempSync(join(ROOT, "cases-"));
  for (const [name, content] of Object.entries(files)) writeFileSync(join(dir, name), content);
  return dir;
}

afterEach(() => {
  if (dir !== undefined) rmSync(dir, { recursive: true });
  dir = undefined;
});

const CASE = `- id: sample-case
  category: speech
  draft: 改成 3 次，不对，5 次
  intent: 改成 5 次
  presets:
    concise: changed
`;

describe("golden set", () => {
  test("loads every committed case", () => {
    const cases = loadCases();
    expect(cases.length).toBeGreaterThanOrEqual(40);
    expect(new Set(cases.map((benchCase) => benchCase.category))).toEqual(new Set(CATEGORIES));
  });

  test("fills in an empty context and empty text lists", () => {
    expect(loadCases(casesDir({ "a.yaml": CASE }))).toEqual([
      {
        id: "sample-case",
        category: "speech",
        draft: "改成 3 次，不对，5 次",
        context: [],
        intent: "改成 5 次",
        presets: { concise: "changed" },
        keep: [],
        avoid: [],
      },
    ]);
  });

  test("rejects a case id used twice", () => {
    const path = casesDir({ "a.yaml": CASE, "b.yaml": CASE });
    expect(() => loadCases(path)).toThrow(/case id "sample-case" appears twice/u);
  });

  test("rejects a case that runs under no preset", () => {
    const path = casesDir({ "a.yaml": CASE.replace("    concise: changed\n", "    {}\n") });
    expect(() => loadCases(path)).toThrow(/a\.yaml: .*at least one preset/u);
  });

  test("rejects text to keep that neither the draft nor the context contains", () => {
    const path = casesDir({ "a.yaml": `${CASE}  keep:\n    - 7 次\n` });
    expect(() => loadCases(path)).toThrow(/keeps "7 次"/u);
  });

  test("rejects text to avoid that the draft contains when a preset may return the draft", () => {
    const either = CASE.replace("concise: changed", "concise: either");
    expect(() => loadCases(casesDir({ "a.yaml": `${either}  avoid:\n    - 3 次\n` }))).toThrow(
      /avoids "3 次"/u,
    );
  });

  test("accepts text to avoid from the draft when every preset must rewrite it", () => {
    const [benchCase] = loadCases(casesDir({ "a.yaml": `${CASE}  avoid:\n    - 3 次\n` }));
    expect(benchCase?.avoid).toEqual(["3 次"]);
  });
});
