/** 框架的词典键：配置页与预览用到的全部文案。 */
export type KitKey =
  | "summary"
  | "unavailable"
  | "readOnly"
  | "saveFailed"
  | "save"
  | "saving"
  | "preview"
  | "replay"
  | "previewTitle"
  | "previewDraft"
  | "previewGhost"
  | "previewRow1"
  | "previewRow2"
  | "previewRow3"
  | "previewHintBrowse"
  | "previewHintFill"
  | "glass"
  | "glassHint"
  | "motion"
  | "motionHint"
  | "motion.lively"
  | "motion.subtle"
  | "motion.off"
  | "ghost"
  | "ghostHint"
  | "ghost.wave"
  | "ghost.fade"
  | "ghost.none"
  | "highlight"
  | "highlightHint"
  | "highlight.glide"
  | "highlight.instant"
  | "density"
  | "densityHint"
  | "density.comfortable"
  | "density.compact"
  | "hints"
  | "hintsHint";

export const en: Readonly<Record<KitKey, string>> = {
  summary: "Appearance and motion for the Agent Stash panels",
  unavailable: "This profile does not expose these settings to the page.",
  readOnly: "This profile does not accept changes from the page.",
  saveFailed: "Saving failed. The settings are unchanged.",
  save: "Save",
  saving: "Saving…",
  preview: "Preview",
  replay: "Replay",
  previewTitle: "Prompt history",
  previewDraft: "Summarize the meeting",
  previewGhost: " notes and list the action items.",
  previewRow1: "Analyze the cache hit rate of this project.",
  previewRow2: "Write unit tests for the parser.",
  previewRow3: "Summarize the meeting notes and list the action items.",
  previewHintBrowse: "Browse",
  previewHintFill: "Fill",
  glass: "Frosted glass",
  glassHint: "Blur what is behind the panels. The panel background stays opaque.",
  motion: "Motion",
  motionHint: "Lively panels rise from the composer and rows appear one by one.",
  "motion.lively": "Lively",
  "motion.subtle": "Subtle",
  "motion.off": "Off",
  ghost: "Ghost text",
  ghostHint: "How a completion appears after the caret.",
  "ghost.wave": "Wave",
  "ghost.fade": "Fade",
  "ghost.none": "Instant",
  highlight: "Highlight",
  highlightHint: "How the highlight moves when you browse with ↑ and ↓.",
  "highlight.glide": "Glide",
  "highlight.instant": "Instant",
  density: "Row height",
  densityHint: "Comfortable matches the / menu.",
  "density.comfortable": "Comfortable",
  "density.compact": "Compact",
  hints: "Key hints",
  hintsHint: "Show the keys at the foot of the panels.",
};

export const zh: Readonly<Record<KitKey, string>> = {
  summary: "Agent Stash 面板的外观与动画",
  unavailable: "当前 profile 没有向页面开放这些配置。",
  readOnly: "当前 profile 不接受页面修改配置。",
  saveFailed: "保存失败，配置没有变化。",
  save: "保存",
  saving: "正在保存…",
  preview: "预览",
  replay: "重播",
  previewTitle: "Prompt 回溯",
  previewDraft: "总结会议纪要",
  previewGhost: "，并提取待办事项。",
  previewRow1: "帮我分析这个项目的缓存命中率。",
  previewRow2: "给解析器补上单元测试。",
  previewRow3: "总结会议纪要，并提取待办事项。",
  previewHintBrowse: "浏览",
  previewHintFill: "填入",
  glass: "毛玻璃效果",
  glassHint: "模糊面板后面的内容，面板底色保持不透明。",
  motion: "动画",
  motionHint: "灵动：面板从输入框浮起，各行依次出现。",
  "motion.lively": "灵动",
  "motion.subtle": "轻柔",
  "motion.off": "关闭",
  ghost: "补全灰字",
  ghostHint: "补全建议在光标后出现的方式。",
  "ghost.wave": "波浪",
  "ghost.fade": "淡入",
  "ghost.none": "直接显示",
  highlight: "高亮移动",
  highlightHint: "用 ↑ ↓ 浏览时高亮块的移动方式。",
  "highlight.glide": "滑动",
  "highlight.instant": "即时",
  density: "行高",
  densityHint: "舒适与 / 菜单一致。",
  "density.comfortable": "舒适",
  "density.compact": "紧凑",
  hints: "按键提示",
  hintsHint: "在面板底部显示可用的按键。",
};
