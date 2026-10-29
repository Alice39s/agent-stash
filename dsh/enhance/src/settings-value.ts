import * as v from "valibot";
import { DEFAULT_PRESETS, type Preset } from "./presets.ts";

/** 默认超时（秒）。 */
export const DEFAULT_TIMEOUT = 60;
/** 超时的取值范围（秒）。 */
export const MIN_TIMEOUT = 5;
export const MAX_TIMEOUT = 600;
/** 默认关联的对话轮数。 */
export const DEFAULT_CONTEXT_TURNS = 3;
/** 可关联的最多轮数。 */
export const MAX_CONTEXT_TURNS = 10;

/** 插件的全部设置，Host 半部与浏览器半部读同一组字段。 */
export interface EnhanceSettings {
  /** 改写用的模型路由；`provider` 与 `model` 都为空时跟随当前会话的模型。 */
  readonly provider: string;
  readonly model: string;
  /** 推理强度；为空时用模型自己的默认值，跟随会话时沿用会话的推理强度。 */
  readonly effort: string;
  /** 一次改写的超时，单位秒。 */
  readonly timeout: number;
  /** 是否附带当前会话最近几轮对话。 */
  readonly context: boolean;
  readonly contextTurns: number;
  /** 是否为增强提示词绑定默认快捷键。 */
  readonly shortcut: boolean;
  readonly presets: readonly Preset[];
}

export const DEFAULT_SETTINGS: EnhanceSettings = {
  provider: "",
  model: "",
  effort: "",
  timeout: DEFAULT_TIMEOUT,
  context: true,
  contextTurns: DEFAULT_CONTEXT_TURNS,
  shortcut: false,
  presets: DEFAULT_PRESETS,
};

const PresetSchema = v.object({
  id: v.pipe(v.string(), v.minLength(1)),
  title: v.fallback(v.string(), ""),
  description: v.fallback(v.string(), ""),
  prompt: v.fallback(v.string(), ""),
});

const SettingsSchema = v.object({
  provider: v.fallback(v.string(), DEFAULT_SETTINGS.provider),
  model: v.fallback(v.string(), DEFAULT_SETTINGS.model),
  effort: v.fallback(v.string(), DEFAULT_SETTINGS.effort),
  timeout: v.fallback(
    v.pipe(v.number(), v.integer(), v.minValue(MIN_TIMEOUT), v.maxValue(MAX_TIMEOUT)),
    DEFAULT_TIMEOUT,
  ),
  context: v.fallback(v.boolean(), DEFAULT_SETTINGS.context),
  contextTurns: v.fallback(
    v.pipe(v.number(), v.integer(), v.minValue(1), v.maxValue(MAX_CONTEXT_TURNS)),
    DEFAULT_CONTEXT_TURNS,
  ),
  shortcut: v.fallback(v.boolean(), DEFAULT_SETTINGS.shortcut),
  presets: v.fallback(v.array(PresetSchema), [...DEFAULT_PRESETS]),
});

/**
 * 读取设置服务给出的配置值。缺失或不认识的字段取默认值，
 * Host 没有开放配置时按默认设置工作。
 */
export function parseSettings(value: unknown): EnhanceSettings {
  const source = typeof value === "object" && value !== null ? value : {};
  return v.parse(SettingsSchema, source);
}
