import { VFile } from "vfile";
import { matter } from "vfile-matter";
import type { InitPreset, InitRegistry } from "./registry.ts";

/** `/init` 生成的说明文件，Crush 模板里的 `{{.Config.Options.InitializeAs}}` 也换成它。 */
const INSTRUCTIONS_FILE = "AGENTS.md";

export interface PromptFile {
  /** 开头 YAML frontmatter 的内容，没有时为空对象。 */
  matter: unknown;
  body: string;
}

export interface InitRequest {
  preset: InitPreset;
  /** 预设名之后的额外指令；第一个词不是预设名时为整段参数。 */
  extra: string;
}

const LEADING_WORD = /^(\S+)\s*([\s\S]*)$/;

/** 解析 `/init [preset] [extra prompt]`，第一个词不是预设名时整段参数都算额外指令。 */
export function parseInitArgs(args: string, registry: InitRegistry): InitRequest {
  const trimmed = args.trim();
  const [, head = "", rest = ""] = LEADING_WORD.exec(trimmed) ?? [];
  const named = registry.presets.get(head);
  if (named) {
    return { preset: named, extra: rest.trim() };
  }
  const preset = registry.presets.get(registry.defaultPreset);
  if (!preset) {
    throw new Error(`/init default preset "${registry.defaultPreset}" is not defined`);
  }
  return { preset, extra: trimmed };
}

/** 拆出 prompt 文件开头的 YAML frontmatter。 */
export function parsePromptFile(text: string): PromptFile {
  const file = new VFile(text);
  matter(file, { strip: true });
  return { matter: file.data.matter, body: String(file.value).trimStart() };
}

/**
 * 去掉开头的 YAML frontmatter，再填充上游模板的占位符：`${path}` 换成项目目录，
 * `{{.Config.Options.InitializeAs}}` 换成 `AGENTS.md`，`$ARGUMENTS` 换成额外指令。
 * 模板里没有 `$ARGUMENTS` 时，额外指令追加到末尾。
 */
export function renderInitPrompt(template: string, extra: string, projectDir: string): string {
  const prompt = parsePromptFile(template)
    .body.replaceAll("${path}", projectDir)
    .replaceAll("{{.Config.Options.InitializeAs}}", INSTRUCTIONS_FILE);
  if (prompt.includes("$ARGUMENTS")) {
    return prompt.replaceAll("$ARGUMENTS", extra);
  }
  if (!extra) {
    return prompt;
  }
  return `${prompt.trimEnd()}\n\n## Additional instructions from the user\n\n${extra}\n`;
}
