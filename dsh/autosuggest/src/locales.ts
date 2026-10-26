/** 补全浮层的界面文案。 */
export const en = {
  title: "History suggestions",
  today: "Today",
  yesterday: "Yesterday",
  untitled: "Untitled session",
  switch: "Switch",
  fill: "Fill",
  dismiss: "Close",
} as const;

export type SuggestKey = keyof typeof en;

export const zh: Readonly<Record<SuggestKey, string>> = {
  title: "全局历史补全",
  today: "今天",
  yesterday: "昨天",
  untitled: "未命名会话",
  switch: "切换建议",
  fill: "填充",
  dismiss: "关闭",
};
