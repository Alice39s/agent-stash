import { join } from "pathe";
import { describe, expect, test } from "vitest";
import { insideRoots, newSkillPath } from "./writer.ts";

describe("insideRoots", () => {
  const roots = ["/w/project/.agents/skills"];

  test("accepts <root>/<name>/SKILL.md only", () => {
    expect(insideRoots("/w/project/.agents/skills/release/SKILL.md", roots)).toBe(true);
    expect(insideRoots("/w/project/.agents/skills/release/notes.md", roots)).toBe(false);
    expect(insideRoots("/w/project/.agents/skills/a/b/SKILL.md", roots)).toBe(false);
    expect(insideRoots("/w/project/.agents/skills/../../SKILL.md", roots)).toBe(false);
    expect(insideRoots("/w/project/.agents/skills/Bad_Name/SKILL.md", roots)).toBe(false);
  });
});

describe("newSkillPath", () => {
  test("rejects names that are not kebab-case", async () => {
    await expect(newSkillPath("user", "../evil", null)).rejects.toMatchObject({ kind: "invalid" });
  });

  test("needs a working directory for project Skills", async () => {
    await expect(newSkillPath("project", "release", null)).rejects.toMatchObject({
      kind: "invalid",
    });
  });

  test("uses the user Skill root for user scope", async () => {
    const path = await newSkillPath("user", "release", null);
    expect(path.endsWith(join("skills", "release", "SKILL.md"))).toBe(true);
  });
});
