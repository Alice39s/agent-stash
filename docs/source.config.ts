import { remarkMdxFiles } from "fumadocs-core/mdx-plugins";
import { type ContentLinksOptions, remarkContentLinks } from "fumadocs-extras/llms";
import { defineConfig } from "fumadocs-mdx/config";
import { i18n } from "./lib/i18n.ts";
import { markdownPath } from "./lib/markdown-path.ts";
import { rehypeCodeLabels } from "./lib/rehype-code-labels.ts";
import { remarkLabelColumns } from "./lib/remark-label-columns.ts";
import { basePath, siteOrigin } from "./site.config.ts";

/** 被链接页面的语言段加 slug；每个地址都带语言段。 */
function localeSlugs(slugs: string[], locale: string | undefined): string[] {
  if (locale === undefined) throw new Error(`指向 /${slugs.join("/")} 的链接没有语言。`);
  return [locale, ...slugs];
}

/**
 * 内容文件之间的链接。Markdown 副本与 `llms-full.txt` 在站外读取，其中的链接写成对应 Markdown 副本的绝对地址；
 * 站点页面链接到页面。
 */
const contentLinks: ContentLinksOptions = {
  dir: "content/docs",
  i18n,
  markdownUrl: (slugs, locale) =>
    `${siteOrigin}${basePath}${markdownPath(localeSlugs(slugs, locale))}`,
  pageUrl: (slugs, locale) =>
    `${basePath}/${localeSlugs(slugs, locale)
      .map((segment) => `${segment}/`)
      .join("")}`,
};

// 集合在 lib/source.ts 里用宏 API 声明；这里只放共用的 MDX 处理流程。
export default defineConfig({
  mdxOptions: {
    // 远程图片保持原始尺寸，构建不访问网络。
    remarkImageOptions: { external: false },
    // GitHub 默认主题的注释在两种主题的代码块表面上都达到 4.5:1。
    rehypeCodeOptions: { themes: { light: "github-light-default", dark: "github-dark-default" } },
    // 内容链接在 Fumadocs 自带插件之前改写，给 LLM 读的 Markdown 链接到 Markdown 副本；文件树在它们之后变成组件，
    // Markdown 里保留源码。步骤只用显式的 <Steps> 组件。
    remarkPlugins: (defaults) => [
      [remarkContentLinks, contentLinks],
      remarkLabelColumns,
      ...defaults,
      remarkMdxFiles,
    ],
    // 在语法高亮之后运行，高亮会从代码围栏读取标题。
    rehypePlugins: (defaults) => [...defaults, rehypeCodeLabels],
  },
});
