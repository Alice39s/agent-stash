import type { Element, Root as HastRoot, RootContent as HastContent } from "hast";
import { select } from "hast-util-select";
import { defaultHandlers, toMdast, type State } from "hast-util-to-mdast";
import { toString as hastText } from "hast-util-to-string";
import type { Code, Heading } from "mdast";
import { toString as mdastText } from "mdast-util-to-string";
import rehypeParse from "rehype-parse";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { CONTINUE, SKIP, visit } from "unist-util-visit";

export type SourceFormat = "html" | "markdown";

export interface GuideSource {
  format: SourceFormat;
  content: string;
  /** Published page URL. Relative links resolve against it. */
  url: string;
  /** Adjusts every resolved link and image URL. */
  rewriteUrl?: (url: URL) => URL;
}

export interface Guide {
  title: string | undefined;
  /** Markdown without the title heading. */
  body: string;
}

export interface Reference {
  text: string;
  /** Last line of the section index at the top of the file. */
  indexEnd: number;
  lines: number;
}

const markdownParser = unified().use(remarkParse).use(remarkGfm);
const markdownToHtml = unified().use(remarkRehype, { allowDangerousHtml: true }).use(rehypeRaw);
const htmlParser = unified().use(rehypeParse);
const markdownWriter = unified().use(remarkGfm, { tablePipeAlign: false }).use(remarkStringify, {
  bullet: "-",
  emphasis: "_",
  fences: true,
  listItemIndent: "one",
  rule: "-",
});

const VERDICTS = new Map([
  ["good", "good"],
  ["goodcode", "good"],
  ["prefer", "good"],
  ["bad", "bad"],
  ["badcode", "bad"],
  ["avoid", "bad"],
]);

/** Site-generator directives such as kramdown `{:toc}`, Liquid `{% raw %}`, and Gitiles `[TOC]`. */
const DIRECTIVE = /^(?:\[TOC\]|\{%[^%]*%\}|(?:TOC\s*)?\{:[^}]*\})$/;

function verdictOf(tokens: string[]): string | undefined {
  return tokens.map((token) => VERDICTS.get(token)).find((verdict) => verdict !== undefined);
}

function classesOf(node: HastContent): string[] {
  if (node.type !== "element" || !Array.isArray(node.properties.className)) return [];
  return node.properties.className.map(String);
}

function langOf(classes: string[]): string | undefined {
  const match = classes.map((name) => /^(?:language|lang)-\.?(.+)$/.exec(name)).find(Boolean);
  return match?.[1];
}

function pre(state: State, node: Element): Code {
  const result = defaultHandlers.pre?.(state, node);
  if (result === undefined || Array.isArray(result) || result.type !== "code") {
    throw new Error("hast-util-to-mdast did not turn <pre> into a code block");
  }
  const classes = [node, ...node.children].flatMap(classesOf);
  return { ...result, lang: langOf(classes) ?? null, meta: verdictOf(classes) ?? null };
}

async function parseMarkdown(content: string): Promise<HastRoot> {
  const tree = markdownParser.parse(content);
  visit(tree, "code", (node) => {
    const verdict = verdictOf(node.meta?.split(/[\s{}.]+/) ?? []);
    if (verdict === undefined) return;
    const language = node.lang ? [`language-${node.lang}`] : [];
    node.data = { ...node.data, hProperties: { className: [...language, verdict] } };
  });
  return markdownToHtml.run(tree);
}

function parseHtml(content: string): HastRoot {
  const document = htmlParser.parse(content);
  const main = select("#content", document) ?? select("body", document);
  if (main === undefined) throw new Error("HTML guide has no #content or <body> element");
  return { type: "root", children: main.children };
}

function isNoise(node: Element): boolean {
  if (["script", "style"].includes(node.tagName) || node.properties.id === "tocDiv") return true;
  return ["p", "ul"].includes(node.tagName) && DIRECTIVE.test(hastText(node).trim());
}

function cleanHtml(tree: HastRoot, source: GuideSource): void {
  visit(tree, (node, index, parent) => {
    if (parent === undefined || index === undefined) return CONTINUE;
    const siblings = parent.children as HastContent[];
    if (node.type === "comment" || (node.type === "element" && isNoise(node))) {
      siblings.splice(index, 1);
      return [SKIP, index];
    }
    if (node.type !== "element") return CONTINUE;
    if (node.tagName === "a" && node.properties.href === undefined) {
      siblings.splice(index, 1, ...node.children);
      return [SKIP, index];
    }
    for (const key of ["href", "src"]) {
      const value = node.properties[key];
      if (typeof value !== "string" || value.startsWith("#")) continue;
      const url = new URL(value, source.url);
      node.properties[key] = (source.rewriteUrl?.(url) ?? url).href;
    }
    return CONTINUE;
  });
}

/** Converts a published HTML or Markdown style guide into normalized Markdown. */
export async function convertGuide(source: GuideSource): Promise<Guide> {
  const html =
    source.format === "html" ? parseHtml(source.content) : await parseMarkdown(source.content);
  cleanHtml(html, source);
  const markdown = toMdast(html, { handlers: { pre } });
  if (markdown.type !== "root") throw new Error("hast-util-to-mdast did not return a root");
  const titleIndex = markdown.children.findIndex(
    (node) => node.type === "heading" && node.depth === 1,
  );
  const [title] = titleIndex === -1 ? [] : markdown.children.splice(titleIndex, 1);
  return {
    title: title === undefined ? undefined : mdastText(title),
    body: markdownWriter.stringify(markdown),
  };
}

/** Prepends the title, a source line, and an index of level 2 and 3 headings with line numbers. */
export function renderReference(title: string, sourceLine: string, body: string): Reference {
  const headings: Heading[] = [];
  visit(markdownParser.parse(body), "heading", (node) => {
    if (node.depth === 2 || node.depth === 3) headings.push(node);
  });
  const head = [`# ${title}`, "", sourceLine, "", "## Index", ""];
  const tail = ["", "---", "", ""];
  const offset = head.length + headings.length + tail.length - 1;
  const index = headings.map((heading) => {
    const indent = "  ".repeat(heading.depth - 2);
    return `${indent}- L${offset + (heading.position?.start.line ?? 0)} ${mdastText(heading)}`;
  });
  const text = [...head, ...index, ...tail].join("\n") + body;
  return {
    text,
    indexEnd: head.length + index.length,
    lines: text.split("\n").length - 1,
  };
}
