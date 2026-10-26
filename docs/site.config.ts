/**
 * 文档站的发布位置。GitHub Pages 把项目站点放在 `/<仓库名>` 下，所以 `DOCS_BASE_PATH` 默认 `/agent-stash`；
 * 设为空字符串即从域名根路径提供。`SITE_ORIGIN` 给 Open Graph、Markdown 副本与 `llms.txt` 里的绝对地址使用。
 */
export const basePath = normalizeBasePath(process.env["DOCS_BASE_PATH"] ?? "/agent-stash");
export const siteOrigin = normalizeOrigin(
  process.env["SITE_ORIGIN"] ?? "https://alice39s.github.io",
);

function normalizeBasePath(value: string): string {
  const base = value.replace(/\/+$/u, "");
  if (base !== "" && !/^(\/[\w.-]+)+$/u.test(base)) {
    throw new Error(
      `DOCS_BASE_PATH must be empty or an absolute path such as "/agent-stash", got "${value}".`,
    );
  }
  return base;
}

/** 接受任意大小写的源地址，例如 Pages 工作流给出的 `https://Alice39s.github.io`。 */
function normalizeOrigin(value: string): string {
  const url = new URL(value);
  if (url.origin !== value.replace(/\/+$/u, "").toLowerCase()) {
    throw new Error(`SITE_ORIGIN must be an origin without a path, got "${value}".`);
  }
  return url.origin;
}
