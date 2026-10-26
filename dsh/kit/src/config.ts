import Schema from "@deepseek-ai/schemastery";
import {
  DEFAULT_APPEARANCE,
  DENSITIES,
  GHOST_EFFECTS,
  HIGHLIGHTS,
  MOTIONS,
  type Appearance,
} from "./appearance.ts";

/**
 * Agent Stash 系列面板的外观配置。字段都标记为 volatile：设置服务只开放这类字段，
 * 插件页里改动后浏览器立即生效，不需要重新挂载插件。
 */
export const Config = Schema.object({
  glass: Schema.boolean()
    .default(DEFAULT_APPEARANCE.glass)
    .description("Blur what is behind the panels. The panel background stays opaque.")
    .volatile(),
  motion: Schema.union([...MOTIONS])
    .default(DEFAULT_APPEARANCE.motion)
    .description("Panel and draft animations: lively, subtle, or off.")
    .volatile(),
  ghost: Schema.union([...GHOST_EFFECTS])
    .default(DEFAULT_APPEARANCE.ghost)
    .description("How completion ghost text appears: wave, fade, or none.")
    .volatile(),
  highlight: Schema.union([...HIGHLIGHTS])
    .default(DEFAULT_APPEARANCE.highlight)
    .description("How the highlight moves between rows: glide or instant.")
    .volatile(),
  density: Schema.union([...DENSITIES])
    .default(DEFAULT_APPEARANCE.density)
    .description("Row height: comfortable (34px) or compact (28px).")
    .volatile(),
  hints: Schema.boolean()
    .default(DEFAULT_APPEARANCE.hints)
    .description("Show the key hints at the foot of the panels.")
    .volatile(),
});

/** 运行中的配置：每个字段都是可读取最新值的引用。 */
export type ConfigValue = ReturnType<typeof Config>;

/** 读取配置引用此刻的值。 */
export function currentAppearance(config: ConfigValue): Appearance {
  return {
    glass: config.glass.get(),
    motion: config.motion.get(),
    ghost: config.ghost.get(),
    highlight: config.highlight.get(),
    density: config.density.get(),
    hints: config.hints.get(),
  };
}
