/** 图表刻度、图例、提示与读屏表格里的数字与日期格式（design.md 第 6 章）。 */
export { compact as formatCompact } from "../../format.ts";

const INTEGER = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });
const PERCENT = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 0 });
const SMALL_PERCENT = new Intl.NumberFormat("en", { style: "percent", maximumFractionDigits: 1 });

/** 计数，千位分组：1,234。 */
export function formatNumber(value: number): string {
  return INTEGER.format(value);
}

/** 比例（1 为全部）写成百分比：整数，低于 10% 时保留一位小数（0.833 → 83%，0.083 → 8.3%）。 */
export function formatPercent(ratio: number): string {
  return ratio > 0 && ratio < 0.1 ? SMALL_PERCENT.format(ratio) : PERCENT.format(ratio);
}

/** `YYYY-MM-DD` 写成 `{m}/{d}`（10/30）；页面按语言传入自己的日期格式。 */
export function formatDay(day: string): string {
  const [, month = "", date = ""] = day.split("-");
  return `${String(Number(month))}/${String(Number(date))}`;
}
