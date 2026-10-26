"use client";

import { useI18n } from "fumadocs-ui/contexts/i18n";
import { useDocsLayout } from "fumadocs-ui/layouts/docs";
import { PanelLeft } from "lucide-react";
import { iconButton } from "./icon-button";
import { isLocale } from "@/lib/i18n";
import { siteText } from "@/lib/layout.shared";

/** 品牌在顶栏里，侧栏不再显示自己的标题链接。 */
export function NoSidebarTitle() {
  return null;
}

/**
 * 768px 以下页面树变成抽屉时，顶栏下方打开它和搜索的条。断点与 Fumadocs 侧栏切换抽屉的媒体查询
 * `(width < 768px)` 一致。它替代 Fumadocs 自带的小屏页头，布局的行偏移保持一致。
 */
export function DocsBar() {
  const { locale } = useI18n();
  const { slots } = useDocsLayout();
  if (locale === undefined || !isLocale(locale)) {
    throw new Error(`The docs bar renders outside a docs language: ${String(locale)}`);
  }
  const SidebarTrigger = slots.sidebar?.trigger;
  const SearchTrigger = slots.searchTrigger === false ? undefined : slots.searchTrigger?.sm;
  return (
    <div className="sticky top-(--fd-docs-row-1) z-30 flex h-(--fd-header-height) items-center justify-between border-b bg-fd-background px-2 [grid-area:header] sm:px-4 md:hidden max-md:layout:[--fd-header-height:--spacing(12)]">
      {SidebarTrigger && (
        <SidebarTrigger className={`${iconButton} w-auto px-2 text-sm hover:text-fd-foreground`}>
          <PanelLeft aria-hidden="true" />
          {siteText[locale].pages}
        </SidebarTrigger>
      )}
      {SearchTrigger && <SearchTrigger className={iconButton} />}
    </div>
  );
}
