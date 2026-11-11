import { readFile } from "node:fs/promises";
import { join } from "pathe";
import * as v from "valibot";
import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import {
  MANIFEST_FILE,
  ManifestSchema,
  SKILL_DIR,
  SKILL_NAME,
  categories,
  guideFile,
  indexFile,
  renderCategoryIndex,
  renderSkill,
} from "./skill.ts";

const read = (file: string): Promise<string> => readFile(join(SKILL_DIR, file), "utf8");
const manifest = v.parse(ManifestSchema, JSON.parse(await read(MANIFEST_FILE)));

describe("generated modern-web-guidance skill", () => {
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
    expect(meta.metadata.updated).toBe(manifest.published);
  });

  test("guide ids are unique across categories", () => {
    const ids = manifest.guides.map((guide) => guide.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  test.each([...categories(manifest)])("%s index lists its guides", async (category, guides) => {
    expect(await read(indexFile(category))).toBe(renderCategoryIndex(category, guides));
  });

  test.each(manifest.guides)("$category/$id is a Markdown guide", async (guide) => {
    const text = await read(guideFile(guide));
    expect(text).toMatch(/^# \S/);
  });
});
