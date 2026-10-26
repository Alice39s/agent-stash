import { ViewOptionsPopover } from "fumadocs-extras/page-actions";
import { GitChangelog } from "fumadocs-page-history/ui";
import {
  DocsBody,
  DocsPage,
  MarkdownCopyButton,
  PageLastUpdate,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import { htmlLang, i18n, type Locale } from "@/lib/i18n";
import { siteText } from "@/lib/layout.shared";
import { PAGE_HISTORY_IDS, pageHistoryToc, readPageHistory } from "@/lib/page-history";
import {
  absoluteUrl,
  pageImagePath,
  pageMarkdownPath,
  pagePath,
  repository,
  repositoryUrl,
  siteName,
} from "@/lib/shared";
import { type DocsPage as Page, source } from "@/lib/source";

export const dynamicParams = false;

export function generateStaticParams() {
  return source.generateParams("slug", "lang");
}

interface PageProps {
  params: Promise<{ lang: string; slug?: string[] }>;
}

async function resolvePage({ params }: PageProps): Promise<Page> {
  const { lang, slug } = await params;
  const page = source.getPage(slug, lang);
  if (!page) notFound();
  return page;
}

function pageLocale(page: Page): Locale {
  return page.locale === "en" ? "en" : i18n.defaultLanguage;
}

export default async function DocPage(props: PageProps) {
  const page = await resolvePage(props);
  const MDX = page.data.body;
  const locale = pageLocale(page);
  const markdownUrl = pageMarkdownPath(page);
  const commits = await readPageHistory(page.path);
  return (
    <DocsPage
      toc={commits.length > 0 ? [...page.data.toc, ...pageHistoryToc] : page.data.toc}
      full={page.data.full}
      // 本页目录是页面的分节导航，名字取自“本页目录”标题。
      tableOfContent={{
        style: "clerk",
        container: { role: "navigation", "aria-labelledby": "toc-title" },
      }}
      // 层级由侧栏的页面树表达；面包屑里不可点击的目录名会占用 primary 色。
      breadcrumb={{ enabled: false }}
      className="sm:px-6 md:px-8 md:pt-8 xl:pt-8"
    >
      {/* Fumadocs 的标题与描述组件自带字号，类名合并时会压过字号角色，所以直接写元素。 */}
      <h1 className="text-h1">{page.data.title}</h1>
      {page.data.description !== undefined && (
        <p className="text-body text-fd-muted-foreground">{page.data.description}</p>
      )}
      <div className="flex flex-row flex-wrap items-center gap-2 border-b pb-6">
        {/* 两个页面操作都经 Next.js 的链接加上 basePath，这里传不带前缀的路径。 */}
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`${repositoryUrl}/blob/${repository.branch}/${repository.contentDir}/${page.path}`}
          // 发给 AI 的 Prompt 里用发布站点上的地址，本地预览时也一样。
          pageUrl={absoluteUrl(pagePath(page.url))}
          locale={htmlLang[locale]}
        />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
      {commits.length > 0 ? (
        <GitChangelog
          commits={commits}
          locale={htmlLang[locale]}
          repository={{ url: repositoryUrl }}
          id={PAGE_HISTORY_IDS.history}
          contributorsId={PAGE_HISTORY_IDS.contributors}
          className="as-page-history"
        />
      ) : (
        page.data.lastModified && <PageLastUpdate date={page.data.lastModified} />
      )}
    </DocsPage>
  );
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const page = await resolvePage(props);
  const locale = pageLocale(page);
  const section = siteText[locale].byline;
  const image = absoluteUrl(pageImagePath(page));
  const url = absoluteUrl(pagePath(page.url));
  const languages = Object.fromEntries(
    i18n.languages.map((language) => [
      htmlLang[language],
      absoluteUrl(pagePath(source.getPage(page.slugs, language)?.url ?? page.url)),
    ]),
  );
  return {
    title: `${page.data.title} · ${siteName} ${section}`,
    description: page.data.description,
    alternates: { canonical: url, languages },
    openGraph: {
      type: "article",
      siteName: `${siteName} ${section}`,
      title: page.data.title,
      description: page.data.description,
      url,
      locale: htmlLang[locale],
      images: [{ url: image, width: 1200, height: 630 }],
    },
    twitter: { card: "summary_large_image", images: [image] },
  };
}
