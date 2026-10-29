/**
 * 浏览器半部入口：注册文案、会话标题栏里的收件箱入口，以及插件页里的配置页。
 * 收件箱状态全局共用一份，所有会话的标题栏入口订阅同一个 store。
 */
import { PACKAGE_NAME, ROW_ID } from "../shared.ts";
import { fetchDetail, fetchInbox, postAction } from "./api.ts";
import type { ClientContext } from "./dsh.ts";
import { createSeenStore, InboxEntry, type InboxFace } from "./inbox.tsx";
import { registerLocale, SCOUT_LOCALE } from "./locale.ts";
import { createSettingsPage, type CatalogState } from "./settings.tsx";
import { createInboxStore } from "./store.ts";
import { createSnapshotSource } from "./source.ts";

/** 宿主提醒入口的 order 是 20；本入口排在它后面。 */
const HEADER_ORDER = 30;

export const inject = ["slots", "locale", "remote", "remote.session"];

export function apply(ctx: ClientContext): void {
  ctx.effect(() => registerLocale(ctx.locale), "skill-scout: locale");

  const inbox = createInboxStore({ fetchInbox: () => fetchInbox(), postAction });
  ctx.effect(() => () => inbox.dispose(), "skill-scout: inbox");
  ctx.on("connection/reset", () => void inbox.refresh());

  const face: InboxFace = {
    inbox,
    seen: createSeenStore(window.localStorage),
    loadDetail: (id, _version, signal) => fetchDetail(id, signal),
    openSession: (sessionId) => ctx.get("uiWorkspace")?.openSession(sessionId),
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
