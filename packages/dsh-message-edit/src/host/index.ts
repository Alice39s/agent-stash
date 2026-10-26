/**
 * Message Edit 的 Host 半边：把消息编辑、重新生成与重试做成可撤销的会话版本分支。
 *
 * 同一份产物运行在 DSH 0.1.0-rc.3 与 DSH Desktop 0.2.1-rc.3 上：`inject` 只列两版都有的 Service，
 * 版本记录存在 storageDomain 里，会话日志只含 DSH 内置事件。
 */
import { MESSAGE_EDIT_VERSIONS_TABLE } from "../shared.ts";
import type { MessageEditContext } from "./dsh.ts";
import { messageEditRoute } from "./route.ts";
import { VERSION_DOMAIN } from "./version-store.ts";

export const name = "agent-stash-message-edit";

/** `agentPresets` 不在这里：两版由不同的包提供，部署也可能没有它，用到时经 `ctx.get` 读取。 */
export const inject = [
  "sessions",
  "agents",
  "sessionQuery",
  "workspaceRegistry",
  "webServer",
  "storageDomain",
  "connection",
];

export async function apply(ctx: MessageEditContext): Promise<void> {
  await ctx.effect(async function* () {
    const domain = await ctx.storageDomain.open(VERSION_DOMAIN);
    yield () => domain.close();
    yield ctx.webServer.register(messageEditRoute(ctx, domain.table(MESSAGE_EDIT_VERSIONS_TABLE)));
  }, "message-edit: version domain and HTTP route");
}
