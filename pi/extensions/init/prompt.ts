import type { InitPreset, InitRegistry } from "./registry.ts";

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

/**
 * 填充上游模板的占位符：`${path}` 换成项目目录，`$ARGUMENTS` 换成额外指令。
 * 模板里没有 `$ARGUMENTS` 时，额外指令追加到末尾。
 */
export function renderInitPrompt(template: string, extra: string, projectDir: string): string {
  const prompt = template.replaceAll("${path}", projectDir);
  if (prompt.includes("$ARGUMENTS")) {
    return prompt.replaceAll("$ARGUMENTS", extra);
  }
  if (!extra) {
    return prompt;
  }
  return `${prompt.trimEnd()}\n\n## Additional instructions from the user\n\n${extra}\n`;
}
