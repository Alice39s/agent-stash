/** 中日韩文字：按中文字符计价。 */
const WIDE = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;

/**
 * 估算一段文字的 token 数。按 DeepSeek API 文档给出的换算：1 个英文字符约 0.3 token，
 * 1 个中文字符约 0.6 token；中日韩文字按中文算，其余字符按英文算。实际用量以模型返回为准。
 */
export function estimateTokens(text: string): number {
  const wide = text.match(WIDE)?.length ?? 0;
  const all = text.match(/[\s\S]/gu)?.length ?? 0;
  return Math.ceil(wide * 0.6 + (all - wide) * 0.3);
}

const GROUPED = new Intl.NumberFormat("en-US");

/** 带千位分隔符的 token 数，例如 `12,345`。 */
export function formatTokens(tokens: number): string {
  return GROUPED.format(tokens);
}
