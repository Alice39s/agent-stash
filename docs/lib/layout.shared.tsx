import { zhCN } from "@fumadocs/language/zh-cn";
import { uiTranslations } from "fumadocs-ui/i18n";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { i18n, type Locale } from "./i18n";

export const translations = i18n
  .translations()
  .extend(uiTranslations())
  .preset("zh", zhCN())
  .add({ zh: { displayName: "简体中文" }, en: { displayName: "English" } });

/** Fumadocs 自带翻译之外，站点外壳需要的文案。 */
export const siteText = {
  zh: {
    byline: "文档",
    repository: "GitHub 仓库：Alice39s/agent-stash",
    switchLanguage: "Switch to English",
    theme: "主题",
    themeCurrent: "切换主题，当前：{theme}",
    themeLight: "浅色",
    themeDark: "深色",
    themeSystem: "跟随系统",
    pages: "目录",
    notFoundTitle: "页面不存在",
    notFoundBody: "链接可能已经失效，或者这一页换了位置。",
    backToDocs: "返回文档首页",
    chooseLanguage: "选择文档语言",
  },
  en: {
    byline: "Docs",
    repository: "GitHub repository: Alice39s/agent-stash",
    switchLanguage: "切换到中文",
    theme: "Theme",
    themeCurrent: "Change theme, current: {theme}",
    themeLight: "Light",
    themeDark: "Dark",
    themeSystem: "System",
    pages: "Pages",
    notFoundTitle: "Page not found",
    notFoundBody: "The link may be outdated, or the page has moved.",
    backToDocs: "Back to the docs",
    chooseLanguage: "Choose a language",
  },
} satisfies Record<Locale, Record<string, string>>;

/**
 * 品牌、语言、主题与仓库入口都在顶栏，侧栏只保留搜索和页面树。导航保持启用：Fumadocs 只在启用导航时渲染
 * `slots.header`，768px 以下打开页面树与搜索的 `DocsBar` 就挂在这个槽上；侧栏标题由 `NoSidebarTitle` 置空。
 */
export const layoutOptions: BaseLayoutProps = {
  nav: { enabled: true },
  i18n: false,
  themeSwitch: { enabled: false },
};
