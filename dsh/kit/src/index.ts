import type { Appearance } from "./appearance.ts";
import { currentAppearance, type ConfigValue } from "./config.ts";

export { Config } from "./config.ts";
export const name = "dsh-stash-kit";

/** Host 侧的 `stashKit` 服务：Agent Stash 系列插件以它作为前置依赖。 */
export interface StashKitHost {
  /** 当前的外观配置。 */
  appearance(): Appearance;
}

/** 本插件用到的 Host 上下文。 */
export interface KitHostContext {
  provide(name: "stashKit", value: StashKitHost): void;
}

/** 提供 `stashKit` 服务，配置引用随设置页的修改更新。 */
export function apply(ctx: KitHostContext, config: ConfigValue): void {
  ctx.provide("stashKit", { appearance: () => currentAppearance(config) });
}
