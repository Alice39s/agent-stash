import { llms, loader } from "fumadocs-core/source";
import { defineDocs } from "fumadocs-mdx/macro";
import { i18n } from "./i18n";
import { resolveIcon } from "./icons";
import { absoluteUrl, pagePath } from "./shared";

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

/** 给 LLM 读的 Markdown。`remarkContentLinks` 已把站内链接改成公开路径；标题行带页面的绝对地址。 */
export const docsLlms = llms(publicSource, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText("processed")}`,
});

/** 站内页面对应的公开地址版本，给 Markdown 路由使用。 */
export function publicPage(page: DocsPage): (typeof publicSource)["$inferPage"] {
  const twin = publicSource.getPage(page.slugs, page.locale);
  if (!twin) throw new Error(`No public twin for ${page.url}`);
  return twin;
}
