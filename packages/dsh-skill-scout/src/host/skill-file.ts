/**
 * 把模型的 Skill 草稿渲染成 SKILL.md：YAML frontmatter 加 Markdown 正文。
 * 标题语言跟随草稿正文：草稿里有汉字时用中文标题，否则用英文标题。
 */
import { stringify } from "yaml";
import type { DraftStep, SkillDraft } from "./review.ts";

/** frontmatter 里标记本插件写入的 Skill；改进已有 Skill 时据此区分归属。 */
export const OWNER_KEY = "skill-scout";

/** 用户在预览里可以编辑的部分。 */
export interface SkillFields {
  readonly name: string;
  readonly description: string;
  readonly whenToUse: string;
  readonly body: string;
}

const HEADINGS = {
  zh: {
    when: "适用场景",
    prerequisites: "前提",
    steps: "步骤",
    verify: "验证",
    limits: "不适用的情况",
  },
  en: {
    when: "When to use",
    prerequisites: "Prerequisites",
    steps: "Steps",
    verify: "Verify",
    limits: "Limits",
  },
} as const;

/** 草稿文本里有汉字时用中文标题。 */
export function languageOf(texts: readonly string[]): keyof typeof HEADINGS {
  return texts.some((text) => /\p{Script=Han}/u.test(text)) ? "zh" : "en";
}

/** 选一个比内容里最长的反引号串更长的代码块围栏。 */
function fence(code: string): string {
  const longest = Math.max(2, ...(code.match(/`+/gu) ?? []).map((run) => run.length));
  return "`".repeat(longest + 1);
}

function codeBlock(code: string, indent: string): string {
  const marks = fence(code);
  const lines = code.split("\n").map((line) => `${indent}${line}`);
  return [`${indent}${marks}bash`, ...lines, `${indent}${marks}`].join("\n");
}

/**
 * 把步骤渲染成编号列表，命令放在步骤下的代码块里。
 * @param steps - 草稿里的步骤或改进说明。
 * @param ordered - 为 false 时渲染成无序列表。
 */
export function renderSteps(steps: readonly DraftStep[], ordered = true): string {
  return steps
    .map((step, index) => {
      const marker = ordered ? `${String(index + 1)}. ` : "- ";
      const indent = " ".repeat(marker.length);
      const command = step.command?.trim() ?? "";
      return command === ""
        ? `${marker}${step.text}`
        : `${marker}${step.text}\n\n${codeBlock(command, indent)}`;
    })
    .join("\n");
}

function bullets(items: readonly string[]): string {
  return items.map((item) => `- ${item}`).join("\n");
}

/**
 * 把模型草稿转换成可编辑的字段。
 * @param draft - 校验过的草稿。
 * @param title - 建议标题，作为正文一级标题。
 */
export function fieldsOfDraft(draft: SkillDraft, title: string): SkillFields {
  const lang = languageOf([title, draft.description, ...draft.steps.map((step) => step.text)]);
  const h = HEADINGS[lang];
  const sections = [
    `# ${title}`,
    `## ${h.when}\n\n${draft.whenToUse}`,
    ...(draft.prerequisites.length > 0
      ? [`## ${h.prerequisites}\n\n${bullets(draft.prerequisites)}`]
      : []),
    `## ${h.steps}\n\n${renderSteps(draft.steps)}`,
    `## ${h.verify}\n\n${bullets(draft.verification)}`,
    ...(draft.limits.length > 0 ? [`## ${h.limits}\n\n${bullets(draft.limits)}`] : []),
  ];
  return {
    name: draft.name,
    description: draft.description,
    whenToUse: draft.whenToUse,
    body: sections.join("\n\n"),
  };
}

/**
 * 渲染完整的 SKILL.md。
 * @param fields - 名称、描述、触发条件与正文。
 * @param suggestionId - 生成它的建议，写进 frontmatter 的 metadata。
 * @param day - 写入日期（YYYY-MM-DD）。
 */
export function renderSkillFile(fields: SkillFields, suggestionId: string, day: string): string {
  const frontmatter = stringify(
    {
      name: fields.name,
      description: fields.description,
      ...(fields.whenToUse.trim() === "" ? {} : { whenToUse: fields.whenToUse }),
      metadata: { [OWNER_KEY]: { suggestion: suggestionId, created: day } },
    },
    { lineWidth: 0 },
  );
  return `---\n${frontmatter}---\n\n${fields.body.trim()}\n`;
}

/**
 * 在已有 Skill 末尾追加一节改进说明。
 * @param existing - 现有文件内容。
 * @param section - 追加的 Markdown，含二级标题。
 */
export function appendSection(existing: string, section: string): string {
  return `${existing.trimEnd()}\n\n${section.trim()}\n`;
}

/**
 * 把改进说明渲染成追加到已有 Skill 的一节。
 * @param title - 建议标题。
 * @param notes - 补充的步骤或注意事项。
 */
export function renderImprovement(title: string, notes: readonly DraftStep[]): string {
  return `## ${title}\n\n${renderSteps(notes, false)}`;
}
