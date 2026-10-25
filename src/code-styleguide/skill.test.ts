import { readFile } from "node:fs/promises";
import { toString as mdastText } from "mdast-util-to-string";
import { join } from "pathe";
import remarkParse from "remark-parse";
import { unified } from "unified";
import * as v from "valibot";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { MANIFEST_FILE, ManifestSchema, SKILL_DIR, SKILL_NAME, renderSkill } from "./skill.ts";

const read = (file: string): Promise<string> => readFile(join(SKILL_DIR, file), "utf8");
const manifest = v.parse(ManifestSchema, JSON.parse(await read(MANIFEST_FILE)));

describe("generated code-styleguide skill", () => {
  test("SKILL.md matches the manifest and has valid frontmatter", async () => {
    const skill = await read("SKILL.md");
    expect(skill).toBe(renderSkill(manifest));
    const [, frontmatter = ""] = /^---\n([\s\S]*?)\n---\n/.exec(skill) ?? [];
    const meta = v.parse(
      v.object({
        name: v.literal(SKILL_NAME),
        description: v.pipe(v.string(), v.maxLength(1024)),
        license: v.string(),
        metadata: v.record(v.string(), v.string()),
      }),
      parse(frontmatter),
    );
    expect(meta.metadata.updated).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  test.each(manifest.references)("$file index points at its headings", async (record) => {
    const lines = (await read(record.file)).split("\n");
    expect(lines.length - 1).toBe(record.lines);
    expect(lines[0]).toBe(`# ${record.title}`);
    const entries = lines.slice(0, record.indexEnd).flatMap((line) => {
      const match = /^\s*- L(\d+) (.+)$/.exec(line);
      return match ? [{ line: Number(match[1]), title: match[2] ?? "" }] : [];
    });
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      const [heading] = unified()
        .use(remarkParse)
        .parse(lines[entry.line - 1] ?? "").children;
      expect(heading?.type === "heading" ? mdastText(heading) : heading).toBe(entry.title);
    }
  });
});
