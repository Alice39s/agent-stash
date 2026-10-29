import { fileURLToPath } from "node:url";
import { requireStashKit } from "../../shared/host/kit.ts";
import type { ConfigValue } from "./config.ts";
import { HOST_INJECT, registerRoutes, type EnhanceHostContext } from "./host.ts";

export { Config } from "./config.ts";
export const name = "dsh-enhance";
export const inject = HOST_INJECT;

/**
 * 注册改写与上下文两条路由，供输入框里的「增强提示词」按钮使用；
 * 同时确保界面依赖的 Agent Stash 框架已安装并启用。
 */
export function apply(ctx: EnhanceHostContext, config: ConfigValue): void {
  registerRoutes(ctx, config);
  requireStashKit(ctx, name, fileURLToPath(import.meta.url));
}
