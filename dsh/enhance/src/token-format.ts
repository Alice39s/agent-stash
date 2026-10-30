const GROUPED = new Intl.NumberFormat("en-US");

/** 带千位分隔符的 token 数，例如 `12,345`。 */
export function formatTokens(tokens: number): string {
  return GROUPED.format(tokens);
}
