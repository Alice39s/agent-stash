import Schema from "@deepseek-ai/schemastery";
import { BUILTIN_PRESETS } from "./presets.ts";
import {
  DEFAULT_SETTINGS,
  MAX_CONTEXT_TURNS,
  MAX_TIMEOUT,
  MIN_TIMEOUT,
  type EnhanceSettings,
} from "./settings-value.ts";

const PresetSchema = Schema.object({
  id: Schema.string().required(),
  title: Schema.string().default(""),
  description: Schema.string().default(""),
  prompt: Schema.string().default(""),
});

/**
 * 插件配置。字段都标记为 volatile：设置服务只开放这类字段，配置页保存后立即生效，
 * 不需要重新挂载插件。
 */
export const Config = Schema.object({
  provider: Schema.string()
    .default(DEFAULT_SETTINGS.provider)
    .description(
      "Provider route of the rewriting model. Leave it and model empty to follow the session's model.",
    )
    .volatile(),
  model: Schema.string()
    .default(DEFAULT_SETTINGS.model)
    .description(
      "Model id of the rewriting model. Leave it and provider empty to follow the session's model.",
    )
    .volatile(),
  effort: Schema.string()
    .default(DEFAULT_SETTINGS.effort)
    .description("Reasoning effort id of the chosen model. Empty uses the model's default.")
    .volatile(),
  timeout: Schema.natural()
    .min(MIN_TIMEOUT)
    .max(MAX_TIMEOUT)
    .default(DEFAULT_SETTINGS.timeout)
    .description("Seconds one rewrite may take before it is abandoned.")
    .volatile(),
  context: Schema.boolean()
    .default(DEFAULT_SETTINGS.context)
    .description(
      "Send the latest turns of the session so the rewriter understands what the draft refers to.",
    )
    .volatile(),
  contextTurns: Schema.natural()
    .min(1)
    .max(MAX_CONTEXT_TURNS)
    .default(DEFAULT_SETTINGS.contextTurns)
    .description("How many of the latest turns to send.")
    .volatile(),
  shortcut: Schema.boolean()
    .default(DEFAULT_SETTINGS.shortcut)
    .description("Bind ⇧⌘E / Ctrl+Shift+E to the enhance button.")
    .volatile(),
  presets: Schema.array(PresetSchema)
    .default(BUILTIN_PRESETS.map((id) => ({ id, title: "", description: "", prompt: "" })))
    .description("Rewrite presets shown in the menu, in order.")
    .volatile(),
});

/** 运行中的配置：每个字段都是可读取最新值的引用。 */
export type ConfigValue = ReturnType<typeof Config>;

/** 读取配置引用此刻的值。 */
export function currentSettings(config: ConfigValue): EnhanceSettings {
  return {
    provider: config.provider.get(),
    model: config.model.get(),
    effort: config.effort.get(),
    timeout: config.timeout.get(),
    context: config.context.get(),
    contextTurns: config.contextTurns.get(),
    shortcut: config.shortcut.get(),
    presets: config.presets.get(),
  };
}
