import { requiredEnv } from "./env";

/** 部署前缀，不带结尾斜杠；由 `site.config.ts` 经 `next.config.mjs` 设置。 */
export const basePath = requiredEnv("NEXT_PUBLIC_BASE_PATH", process.env["NEXT_PUBLIC_BASE_PATH"]);
export const siteOrigin = requiredEnv(
  "NEXT_PUBLIC_SITE_ORIGIN",
  process.env["NEXT_PUBLIC_SITE_ORIGIN"],
);
export const siteName = "Agent Stash";

export { repository, repositoryUrl } from "./repository";

interface PageRef {
  slugs: string[];
  locale?: string | undefined;
}

function localePath(page: PageRef): string[] {
  if (page.locale === undefined) throw new Error(`Page /${page.slugs.join("/")} has no locale.`);
  return [page.locale, ...page.slugs];
}

/** 页面的 Markdown 副本，给“复制 Markdown”和 LLM 工具使用。Next.js 不给 route handler 的地址加前缀。 */
export function pageMarkdownPath(page: PageRef): string {
  return `/md/${[...localePath(page), "content.md"].join("/")}`;
}

/** 页面的 Open Graph 图片，构建时渲染。 */
export function pageImagePath(page: PageRef): string {
  return `/og/${[...localePath(page), "image.png"].join("/")}`;
}

/**
 * 内容链接带公开路径（`/agent-stash/zh/…`），Markdown 副本里的链接因此仍然有效；路由链接取去掉 `basePath`
 * 的路径，由 Next.js 加回。
 */
export function routeHref(href: string): string {
  return basePath !== "" && href.startsWith(`${basePath}/`) ? href.slice(basePath.length) : href;
}

/** 页面的公开路径：页面导出为目录索引（`trailingSlash`），所以以斜杠结尾。 */
export function pagePath(url: string): string {
  return url.endsWith("/") ? url : `${url}/`;
}

/** 发布站点上的绝对地址，用于元数据和 Markdown 输出。 */
export function absoluteUrl(path: string): string {
  return `${siteOrigin}${basePath}${path}`;
}

/** `public/` 下静态文件的地址：`<img>`、`<video>` 的字符串地址不会自动加 `basePath`。 */
export function assetPath(path: string): string {
  return `${basePath}${path}`;
}
