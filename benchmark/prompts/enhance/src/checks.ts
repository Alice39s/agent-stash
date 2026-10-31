import type { BuiltinPreset } from "../../../../dsh/enhance/src/presets.ts";
import type { Expectation } from "./cases.ts";

const FENCED_CODE = /```[\s\S]*?```/gu;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const WORD = /[\p{Script=Latin}\p{N}][\p{Script=Latin}\p{N}'’_-]*/gu;
const HEADING = /^#{1,6}\s/mu;

/** 篇幅上限之外的余量：补上标点、反引号之类带来的几个词。 */
const SLACK = 8;

/** 有会话上下文时再加的余量：解析指代时补上的名称、文件名和用户之前定下的决定。 */
const CONTEXT_SLACK = 16;

/**
 * 文字的篇幅，以英文单词计：一个英文单词或数字算 1，两个汉字算 1，
 * 与内置指令里「250 个英文单词或 500 个汉字」的换算一致。代码块不计。
 */
export function lengthUnits(text: string): number {
  const prose = text.replace(FENCED_CODE, "");
  return (prose.match(WORD)?.length ?? 0) + (prose.match(CJK)?.length ?? 0) / 2;
}

/**
 * 各预设允许的最长篇幅，与内置指令写的上限一致：精炼不比原稿长，整理与原稿差不多长，
 * 润色最多原稿的 3 倍（短稿可以到 80，任何时候不超过 250），另留一成余量。
 */
const LIMITS: Readonly<Record<BuiltinPreset, (draftUnits: number) => number>> = {
  concise: (draftUnits) => draftUnits,
  structure: (draftUnits) => draftUnits * 1.2,
  polish: (draftUnits) => Math.min(Math.max(draftUnits * 3, 80), 250) * 1.1,
};

export function lengthLimit(
  preset: BuiltinPreset,
  draftUnits: number,
  hasContext: boolean,
): number {
  return LIMITS[preset](draftUnits) + SLACK + (hasContext ? CONTEXT_SLACK : 0);
}

function hasHeading(text: string): boolean {
  return HEADING.test(text.replace(FENCED_CODE, ""));
}

/** 一次改写和它要满足的条件。`text` 是插件写回输入框的文字，原样返回时就是草稿。 */
export interface RewriteSample {
  readonly preset: BuiltinPreset;
  readonly expectation: Expectation;
  readonly draft: string;
  readonly text: string;
  readonly unchanged: boolean;
  /** 草稿之前有没有会话上下文。 */
  readonly hasContext: boolean;
  readonly keep: readonly string[];
  readonly avoid: readonly string[];
}

/** 用规则检查一次改写，返回没通过的各项；全部通过时为空。 */
export function checkRewrite(sample: RewriteSample): string[] {
  const failures: string[] = [];
  if (sample.expectation === "unchanged" && !sample.unchanged) {
    failures.push("expected the draft back unchanged");
  }
  if (sample.expectation === "changed" && sample.unchanged) {
    failures.push("expected a rewrite, got the draft back unchanged");
  }
  for (const text of sample.keep) {
    if (!sample.text.includes(text)) failures.push(`dropped "${text}"`);
  }
  for (const text of sample.avoid) {
    if (sample.text.includes(text)) failures.push(`contains "${text}"`);
  }
  const units = lengthUnits(sample.text);
  const limit = lengthLimit(sample.preset, lengthUnits(sample.draft), sample.hasContext);
  if (units > limit) {
    failures.push(
      `${String(units)} length units, over the ${sample.preset} limit of ${String(Math.floor(limit))}`,
    );
  }
  if (hasHeading(sample.text) && !hasHeading(sample.draft))
    failures.push("adds a Markdown heading");
  return failures;
}
