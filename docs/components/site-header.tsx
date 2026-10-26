"use client";

import { GitBranch, Languages } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "./brand-mark";
import { iconButton } from "./icon-button";
import { ThemeMenu } from "./theme-menu";
import { i18n, type Locale } from "@/lib/i18n";
import { siteText } from "@/lib/layout.shared";
import { repositoryUrl, siteName } from "@/lib/shared";

/** 另一种语言的同一页：替换语言段，保留其余路径。 */
function switchLocalePath(pathname: string, target: Locale): string {
  const [, ...rest] = pathname.split("/").filter((segment) => segment.length > 0);
  return `/${[target, ...rest].join("/")}`;
}

/** design.md「站点外壳」的顶栏：左侧品牌标识，右侧仓库、语言与主题。 */
export function SiteHeader({ locale }: { locale: Locale }) {
  const text = siteText[locale];
  const pathname = usePathname();
  const other = i18n.languages.find((language) => language !== locale) ?? i18n.defaultLanguage;

  return (
    <header className="sticky top-0 z-40 h-(--as-header-height) border-b bg-fd-background/70 backdrop-blur-lg backdrop-saturate-150">
      <div className="mx-auto flex h-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        {/* 可见文字就是链接的名字；空格让朗读时词与词分开。 */}
        <Link
          href={`/${locale}`}
          className="flex min-w-0 items-center gap-2 rounded-(--radius) max-md:min-h-11"
        >
          <BrandMark className="size-6 shrink-0" />
          <span className="truncate font-bold">{siteName}</span>{" "}
          <span aria-hidden="true" className="h-4 w-px shrink-0 bg-fd-border" />{" "}
          <span className="shrink-0 text-sm text-fd-muted-foreground">{text.byline}</span>
        </Link>
        <nav className="flex items-center gap-1" aria-label={text.byline}>
          <a
            href={repositoryUrl}
            className={`${iconButton} sm:w-auto sm:px-2.5`}
            aria-label={text.repository}
            title={text.repository}
            target="_blank"
            rel="noreferrer"
          >
            <GitBranch aria-hidden="true" />
            <span className="hidden text-sm font-medium sm:inline">GitHub</span>
          </a>
          <Link
            href={switchLocalePath(pathname, other)}
            className={iconButton}
            aria-label={text.switchLanguage}
            title={text.switchLanguage}
            hrefLang={other}
          >
            <Languages aria-hidden="true" />
          </Link>
          <ThemeMenu locale={locale} />
        </nav>
      </div>
    </header>
  );
}
