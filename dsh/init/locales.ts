/** `/init` 指令在 `/` 菜单与预设弹层里的文案。 */
export const en = {
  label: "Init",
  description: "Analyze the project and write AGENTS.md",
  hint: "[preset] [extra prompt]",
  searchPlaceholder: "Search presets…",
  searchEmpty: "No presets available",
  searchNoResults: "No matching presets",
  customGroup: "Custom",
} as const;

export type InitKey = keyof typeof en;

export const zh: Readonly<Record<InitKey, string>> = {
  label: "初始化",
  description: "分析项目并写出 AGENTS.md",
  hint: "[预设] [额外指令]",
  searchPlaceholder: "搜索预设…",
  searchEmpty: "没有可用的预设",
  searchNoResults: "没有匹配的预设",
  customGroup: "自定义",
};
