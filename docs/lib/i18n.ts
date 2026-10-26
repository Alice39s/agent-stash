import { defineI18n } from "fumadocs-core/i18n";

/**
 * 中文是主要语言。静态导出没有服务器改写不带语言段的路径，所以每个地址都带语言段（`/zh/…`、`/en/…`）。
 * 没有英文文件的页面回退到中文页。
 */
export const i18n = defineI18n({
  defaultLanguage: "zh",
  languages: ["zh", "en"],
  hideLocale: "never",
  parser: "dot",
});

export type Locale = (typeof i18n.languages)[number];

/** `<html lang>`、`hreflang` 与 Open Graph 用的 BCP 47 标签。 */
export const htmlLang = {
  zh: "zh-CN",
  en: "en",
} as const satisfies Record<Locale, string>;

export function isLocale(value: string): value is Locale {
  return i18n.languages.some((language) => language === value);
}
