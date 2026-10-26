/** 回溯面板的界面文案。 */
export const en = {
  title: "Prompt history",
  today: "Today",
  yesterday: "Yesterday",
  browse: "Browse",
  send: "Send",
  edit: "Edit",
  restore: "Restore draft",
} as const;

export type RecallKey = keyof typeof en;

export const zh: Readonly<Record<RecallKey, string>> = {
  title: "历史记录",
  today: "今天",
  yesterday: "昨天",
  browse: "切换提示词",
  send: "发送",
  edit: "编辑",
  restore: "返回编辑",
};
