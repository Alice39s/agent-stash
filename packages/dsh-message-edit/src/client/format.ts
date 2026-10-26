/**
 * 界面上的时间、计数、位置与标识符格式，跟随字典声明的界面语言。
 * 时间规则取自宿主消息时钟（ui-chat `message-chrome.ts`）：同一天 `HH:mm`，同一年带月日，跨年带年月日。
 */
import * as v from "valibot";
import type { MessageEditKey, MessageEditTranslate } from "./locale.ts";

/** 两版 DSH 内置的界面语言。 */
const FormatLocaleSchema = v.picklist(["en", "zh"]);
export type FormatLocale = v.InferOutput<typeof FormatLocaleSchema>;

/** 标识符只显示前 8 个字符，完整值放在 tooltip 里。 */
const SHORT_ID_LENGTH = 8;

/** DSH 会话 id 的固定前缀，所有会话都一样，缩写时略去。 */
const SESSION_ID_PREFIX = "session-";

/** 当前字典对应的界面语言，取自字典键 `format.locale`。 */
export function formatLocale(t: MessageEditTranslate): FormatLocale {
  return v.parse(FormatLocaleSchema, t("format.locale"));
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** 本地时间的消息时钟：同一天 `HH:mm`，同一年加月日模板，跨年加年月日模板，不显示秒。 */
export function formatClock(time: number, t: MessageEditTranslate, now: number): string {
  const date = new Date(time);
  const today = new Date(now);
  const clock = `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  const sameYear = date.getFullYear() === today.getFullYear();
  if (sameYear && date.getMonth() === today.getMonth() && date.getDate() === today.getDate()) {
    return clock;
  }
  const params = { y: date.getFullYear(), m: date.getMonth() + 1, d: date.getDate() };
  return `${t(sameYear ? "clock.md" : "clock.ymd", params)} ${clock}`;
}

/** 按界面语言格式化的整数。 */
export function formatCount(count: number, locale: FormatLocale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(count);
}

/** 带数量的文案；字典里同时有 `.one` 与 `.other` 两个键，按界面语言的复数规则选择。 */
export type PluralKey = "versions.count" | "action.redoBranches";

export function formatPlural(
  t: MessageEditTranslate,
  key: PluralKey,
  count: number,
  locale: FormatLocale,
): string {
  const category = new Intl.PluralRules(locale).select(count) === "one" ? "one" : "other";
  const entry: MessageEditKey = `${key}.${category}`;
  return t(entry, { count: formatCount(count, locale) });
}

/** 会话 id 的短形式：去掉公共前缀后的前 8 个字符。 */
export function shortId(id: string): string {
  const body = id.startsWith(SESSION_ID_PREFIX) ? id.slice(SESSION_ID_PREFIX.length) : id;
  return body.slice(0, SHORT_ID_LENGTH);
}
