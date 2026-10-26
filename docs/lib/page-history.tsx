import type { TOCItemType } from "fumadocs-core/toc";
import type { HistoryCommit } from "fumadocs-page-history";
import { createHistoryReader } from "fumadocs-page-history/git";
import { GitChangelogLabel } from "fumadocs-page-history/ui";
import { repository, repositoryUrl } from "./shared";

/** 在正文后显示贡献者与页面历史的页面：插件页与技能页。路径相对内容目录，例如 `plugins/dsh-recall.en.mdx`。 */
const HISTORY_PAGE = /^(?:plugins\/[^/]+|skills(?:\.[a-z]{2})?)\.mdx$/u;

/** 两个分节的锚点，`GitChangelog` 与本页目录共用。 */
export const PAGE_HISTORY_IDS = {
  contributors: "git-contributors",
  history: "git-history",
} as const;

/** 静态导出在一次构建里渲染全部页面，共用一个读取器，仓库信息只读一次。 */
const history = createHistoryReader({ repository: { url: repositoryUrl } });

/**
 * 页面源文件的提交记录，构建时从 Git 读取，需要完整的提交历史。其余页面和还没有提交的新页面返回空列表，
 * 它们显示最后更新时间。
 */
export async function readPageHistory(path: string): Promise<HistoryCommit[]> {
  if (!HISTORY_PAGE.test(path)) return [];
  return history.read(`${repository.contentDir}/${path}`);
}

/** 本页目录末尾的“贡献者”和“页面历史”，文案取自站点翻译。 */
export const pageHistoryToc: TOCItemType[] = [
  {
    title: <GitChangelogLabel section="contributors" />,
    url: `#${PAGE_HISTORY_IDS.contributors}`,
    depth: 2,
  },
  {
    title: <GitChangelogLabel section="history" />,
    url: `#${PAGE_HISTORY_IDS.history}`,
    depth: 2,
  },
];
