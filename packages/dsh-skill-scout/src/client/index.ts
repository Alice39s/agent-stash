/**
 * 浏览器半部入口：注册文案、会话标题栏里的收件箱入口、会话 Tab「经验提炼」、侧栏入口与主区域的
 * 「历史回溯提炼」页，以及插件页里的配置页。收件箱与页面位置全局共用一份，各处订阅同一个 store。
 */
import { PACKAGE_NAME, ROW_ID, VIEW_ID } from "../shared.ts";
import { fetchDetail, fetchInbox, fetchSession, fetchStats, postAction, search } from "./api.ts";
import type { ClientContext } from "./dsh.ts";
import type { ScoutFace } from "./face.ts";
import { InboxEntry } from "./inbox.tsx";
import { registerLocale, SCOUT_LOCALE } from "./locale.ts";
import { createPageStore } from "./navigation.ts";
import { HistoryPage, PageIcon } from "./page.tsx";
import { createSeenStore } from "./seen.ts";
import { SessionTab } from "./session.tsx";
import { createSettingsPage, type CatalogState } from "./settings.tsx";
import { createSnapshotSource } from "./source.ts";
import { createInboxStore } from "./store.ts";

/** 宿主提醒入口的 order 是 20；本入口排在它后面。 */
const HEADER_ORDER = 30;
/** 会话 Tab 排在「上下文」「编队」之后。 */
const VIEW_ORDER = 40;
/** 侧栏入口排在「上下文洞察」之后。 */
const PANEL_ORDER = 30;

export const inject = ["slots", "locale", "remote", "remote.session"];

export function apply(ctx: ClientContext): void {
  ctx.effect(() => registerLocale(ctx.locale), "skill-scout: locale");
  const t = ctx.locale.bind(SCOUT_LOCALE);

  const inbox = createInboxStore({ fetchInbox: () => fetchInbox(), postAction });
  ctx.effect(() => () => inbox.dispose(), "skill-scout: inbox");
  ctx.on("connection/reset", () => void inbox.refresh());

  const face: ScoutFace = {
    inbox,
    page: createPageStore(),
    seen: createSeenStore(window.localStorage),
    loadDetail: fetchDetail,
    loadSession: fetchSession,
    search,
    loadStats: fetchStats,
    openSession: (sessionId) => ctx.get("uiWorkspace")?.openSession(sessionId),
    openPage: () => ctx.get("layout")?.selectPanel(VIEW_ID),
  };
  ctx.slots.inject("conversation.session.header.utilities", () =>
    ctx.slots.register(
      {
        name: "conversation.session.header.utilities",
        id: "skill-scout-inbox",
        order: HEADER_ORDER,
        locale: SCOUT_LOCALE,
        inject: () => face,
      },
      InboxEntry,
    ),
  );
  ctx.slots.inject("conversation.view", () =>
    ctx.slots.register(
      {
        name: "conversation.view",
        id: VIEW_ID,
        order: VIEW_ORDER,
        locale: SCOUT_LOCALE,
        label: () => t("view.label"),
        inject: (sessionId) => ({ sessionId, ...face }),
      },
      SessionTab,
    ),
  );
  ctx.slots.inject("sidebar.panellist", () =>
    ctx.slots.register(
      {
        name: "sidebar.panellist",
        id: VIEW_ID,
        order: PANEL_ORDER,
        locale: SCOUT_LOCALE,
        label: () => t("page.title"),
      },
      PageIcon,
    ),
  );
  ctx.slots.inject("main", () =>
    ctx.slots.register(
      { name: "main", key: VIEW_ID, locale: SCOUT_LOCALE, inject: () => face },
      HistoryPage,
    ),
  );

  // 模型目录：配置页打开时读取，模型或 provider 变化时重读。
  const catalog = createSnapshotSource<CatalogState>({ status: "loading" }, async (set) => {
    const response = await ctx.remote.session.modelCatalog();
    set(response.ok ? { status: "ready", catalog: response.value } : { status: "error" });
  });
  ctx.effect(
    () => ctx.remote.$on("llm/adapters-updated", () => catalog.reload()),
    "skill-scout: adapters",
  );
  ctx.effect(
    () => ctx.remote.$on("llm/models-updated", () => catalog.reload()),
    "skill-scout: models",
  );
  ctx.slots.inject("plugins.row.config", () =>
    ctx.slots.register(
      { name: "plugins.row.config", key: `${PACKAGE_NAME}#${ROW_ID}`, locale: SCOUT_LOCALE },
      createSettingsPage(catalog),
    ),
  );
}
