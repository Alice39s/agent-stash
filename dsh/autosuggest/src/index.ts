import { fileURLToPath } from "node:url";
import { requireStashKit, type DshKitHost } from "../../shared/host/kit.ts";
import { HOST_INJECT, registerPromptRoute, type DshHostContext } from "../../shared/host/plugin.ts";

export const name = "dsh-autosuggest";
export const inject = HOST_INJECT;

/**
 * 注册全局 Prompt 历史的读取路由，供输入框里的前缀补全使用；
 * 同时确保界面依赖的 Agent Stash 框架已安装并启用。
 */
export function apply(ctx: DshHostContext & DshKitHost): void {
  registerPromptRoute(
    ctx,
    "/dsh-autosuggest/prompts",
    "dsh-autosuggest: GET /dsh-autosuggest/prompts",
  );
  requireStashKit(ctx, name, fileURLToPath(import.meta.url));
}
