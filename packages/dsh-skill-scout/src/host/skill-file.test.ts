import { describe, expect, test } from "vitest";
import { parse } from "yaml";
import { fieldsOfDraft, renderSkillFile, type SkillFields } from "./skill-file.ts";

/** 拆出 SKILL.md 的 frontmatter 与正文。 */
function split(file: string): { readonly front: unknown; readonly body: string } {
  const [before, front, ...rest] = file.split(/^---$/mu);
  expect(before).toBe("");
  return { front: parse(front ?? ""), body: rest.join("---").trim() };
}

describe("renderSkillFile", () => {
  test("keeps YAML special characters in the frontmatter intact", () => {
    const fields: SkillFields = {
      name: "npm-patch-release",
      description: 'Release: run the checks # then publish, "quoted" and: more',
      whenToUse: "- when asked: ship it",
      body: "# Cut a patch release\n\n1. Run the tests",
    };
    const { front, body } = split(renderSkillFile(fields, "repeated:1", "2026-10-30"));
    expect(front).toEqual({
      name: "npm-patch-release",
      description: fields.description,
      whenToUse: fields.whenToUse,
      metadata: { "skill-scout": { suggestion: "repeated:1", created: "2026-10-30" } },
    });
    expect(body).toBe(fields.body);
  });

  test("renders a draft into a named file with a description and a body", () => {
    const fields = fieldsOfDraft({
      name: "fix-missing-build-config",
      title: "修复缺少构建配置",
      draft: {
        kind: "create",
        description: "构建报找不到配置时：补齐 build.config.json",
        whenToUse: "npm run build 报 Cannot find build config",
        prerequisites: [],
        steps: [
          { text: "补齐配置", refs: [] },
          { text: "重新构建", command: "npm run build", refs: ["E1.5"] },
        ],
        verification: ["构建通过"],
        limits: [],
      },
    });
    const { front, body } = split(renderSkillFile(fields, "recovery:1", "2026-10-30"));
    expect(front).toMatchObject({
      name: "fix-missing-build-config",
      description: "构建报找不到配置时：补齐 build.config.json",
    });
    expect(body).toContain("## 步骤");
    expect(body).toContain("npm run build");
  });
});
