import type { Root } from "hast";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import { i18n } from "./i18n.ts";

const LOCALE_SUFFIX = /\.([a-z]{2})\.mdx$/u;

/** 内容文件的语言，取自 `.en.mdx` 这样的后缀；默认语言没有后缀。 */
function localeOf(file: string): string {
  const suffix = LOCALE_SUFFIX.exec(file)?.[1];
  if (suffix === undefined) return i18n.defaultLanguage;
  if (!i18n.languages.some((language) => language === suffix)) {
    throw new Error(`${file}: unknown locale "${suffix}"`);
  }
  return suffix;
}

const codeWord: Record<string, { word: string; separator: string }> = {
  zh: { word: "代码", separator: "：" },
  en: { word: "Code", separator: ": " },
};

/**
 * 给一页的代码块编号。每个代码块在可聚焦的滚动区域里，同一页的区域需要不同的名字：名字是序号，代码块有标题时
 * 后接标题。
 */
export function rehypeCodeLabels() {
  return (tree: Root, file: VFile) => {
    const locale = localeOf(file.path);
    const text = codeWord[locale];
    if (text === undefined) throw new Error(`${file.path}: no code block label for "${locale}"`);
    let count = 0;
    visit(tree, "element", (node) => {
      if (node.tagName !== "pre") return;
      count += 1;
      const title = node.properties["title"];
      const suffix = typeof title === "string" && title !== "" ? `${text.separator}${title}` : "";
      node.properties["dataLabel"] = `${text.word} ${String(count)}${suffix}`;
    });
  };
}
