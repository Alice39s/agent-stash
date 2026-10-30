import { isBuiltin, type BuiltinPreset, type Preset } from "./presets.ts";

/**
 * 预设可选的图标，取 DSH 图标库里的图标名，按用途分四行：写作与整理、思考与提问、代码与工程、
 * 人、语言与文档。配置页的图标选择器按这个顺序排成每行 9 个的网格。
 */
export const PRESET_ICON_NAMES = [
  "sparkle",
  "enhance-outline",
  "flat-list-outline",
  "list-pen-outline",
  "checklist-outline",
  "compact-outline",
  "wrap-lines-outline",
  "edit-outline",
  "microphone-outline",
  "think-outline",
  "light-outline",
  "goal-outline",
  "plan-outline",
  "question-outline",
  "info-outline",
  "search-outline",
  "inspect-outline",
  "compare-split-outline",
  "code-outline",
  "api-outline",
  "database-outline",
  "branch-outline",
  "warning-triangle-outline",
  "shield-outline",
  "gauge-outline",
  "clock-outline",
  "link-outline",
  "globe-outline",
  "user-outline",
  "users-outline",
  "skill-outline",
  "agent-preset-outline",
  "personalization-outline",
  "deliver-doc",
  "folder-open-outline",
  "paper-plane-outline",
] as const;

export type PresetIconName = (typeof PRESET_ICON_NAMES)[number];

/** 内置预设的图标：润色用星光，结构化整理用列表，精炼用 DSH 压缩上下文的图标。 */
const BUILTIN_ICONS: Readonly<Record<BuiltinPreset, PresetIconName>> = {
  polish: "sparkle",
  structure: "flat-list-outline",
  concise: "compact-outline",
};

/** 自定义预设没选图标时的图标。 */
const CUSTOM_ICON: PresetIconName = "list-pen-outline";

export function isPresetIcon(name: string): name is PresetIconName {
  return (PRESET_ICON_NAMES as readonly string[]).includes(name);
}

/** 预设没选图标时显示的图标。 */
export function defaultIcon(id: string): PresetIconName {
  return isBuiltin(id) ? BUILTIN_ICONS[id] : CUSTOM_ICON;
}

/** 预设显示的图标：选过且 DSH 图标库里有的图标优先，否则用默认图标。 */
export function presetIcon(preset: Preset): PresetIconName {
  return isPresetIcon(preset.icon) ? preset.icon : defaultIcon(preset.id);
}

/** 选中的图标要存下的值：与默认图标相同时存空，继续跟随默认图标。 */
export function storedIcon(id: string, name: PresetIconName): string {
  return name === defaultIcon(id) ? "" : name;
}
