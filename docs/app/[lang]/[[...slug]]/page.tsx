import {
  DocsBody,
  DocsPage,
  MarkdownCopyButton,
  PageLastUpdate,
  ViewOptionsPopover,
} from "fumadocs-ui/layouts/docs/page";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/components/mdx";
import { htmlLang, i18n } from "@/lib/i18n";
import { siteText } from "@/lib/layout.shared";
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

export default async function DocPage(props: PageProps) {
  const page = await resolvePage(props);
  const MDX = page.data.body;
  // Fumadocs 的页面操作会给地址加上 basePath，这里传不带前缀的路径。
  const markdownUrl = pageMarkdownPath(page);
  return (
    <DocsPage
      toc={page.data.toc}
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
        <MarkdownCopyButton markdownUrl={markdownUrl} />
        <ViewOptionsPopover
          markdownUrl={markdownUrl}
          githubUrl={`${repositoryUrl}/blob/${repository.branch}/${repository.contentDir}/${page.path}`}
        />
      </div>
      <DocsBody>
        <MDX components={getMDXComponents()} />
      </DocsBody>
      {page.data.lastModified && <PageLastUpdate date={page.data.lastModified} />}
    </DocsPage>
  );
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const page = await resolvePage(props);
  const locale = page.locale === "en" ? "en" : i18n.defaultLanguage;
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
