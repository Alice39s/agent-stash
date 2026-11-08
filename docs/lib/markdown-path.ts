/** 每个 Markdown 副本路径结尾的文件名，由 `app/md/[lang]/[...slug]/route.ts` 提供。 */
export const MARKDOWN_FILE = "content.md";

/** 页面 Markdown 副本的路径，不带 `basePath`；`segments` 是语言段加页面 slug。 */
export function markdownPath(segments: readonly string[]): string {
  return `/md/${[...segments, MARKDOWN_FILE].join("/")}`;
}
