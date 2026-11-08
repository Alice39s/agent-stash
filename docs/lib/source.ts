import { llms, loader } from "fumadocs-core/source";
import { renderMarkdownUrl } from "fumadocs-extras/llms";
import { defineDocs } from "fumadocs-mdx/macro";
import { i18n } from "./i18n";
import { resolveIcon } from "./icons";
import { absoluteUrl, pageMarkdownPath, pagePath } from "./shared";

export const docs = defineDocs({
  dir: "content/docs",
  docs: {
    lastModified: true,
    postprocess: { includeProcessedMarkdown: true },
  },
});

export const source = loader({
  source: docs.toFumadocsSource(),
  baseUrl: "/",
  i18n,
  icon: resolveIcon,
});

export type DocsPage = (typeof source)["$inferPage"];

/** 同一批页面的公开地址（含源地址与 `basePath`），给站外读取的 `llms.txt` 与 Markdown 副本使用。 */
const publicSource = loader({
  source: docs.toFumadocsSource(),
  baseUrl: "/",
  i18n,
  url: (slugs, locale) =>
    absoluteUrl(
      pagePath(`/${[locale, ...slugs].filter((segment) => segment !== undefined).join("/")}`),
    ),
});

/**
 * 给 LLM 读的 Markdown。静态站点不能按 `Accept: text/markdown` 在页面地址上返回 Markdown，所以 `llms.txt` 的条目
 * 链接到 Markdown 副本，`remarkContentLinks` 对站内链接也这样处理。标题行带页面的绝对地址。
 */
export const docsLlms = llms(publicSource, {
  renderUrl: renderMarkdownUrl(publicSource, (page) => absoluteUrl(pageMarkdownPath(page))),
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
});

/** 站内页面对应的公开地址版本，给 Markdown 路由使用。 */
export function publicPage(page: DocsPage): (typeof publicSource)["$inferPage"] {
  const twin = publicSource.getPage(page.slugs, page.locale);
  if (!twin) throw new Error(`No public twin for ${page.url}`);
  return twin;
}
