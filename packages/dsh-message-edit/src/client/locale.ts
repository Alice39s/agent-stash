/**
 * 插件 UI 文案。注册到 DSH 的 locale 服务，Slot 登记声明 `locale: MESSAGE_EDIT_LOCALE` 后组件收到 `t`。
 * 两版 DSH 内置的界面语言都是 `en` 与 `zh`。
 */
import type { Locale } from "./dsh.ts";

export const MESSAGE_EDIT_LOCALE = "message-edit";

const EN = {
  "format.locale": "en",
  "clock.md": "{m}/{d}",
  "clock.ymd": "{y}-{m}-{d}",
  "view.label": "Timeline",
  "status.loading": "Loading timeline",
  "status.refreshing": "Refreshing",
  "status.reload": "Reload",
  "status.empty": "This session has no finished turns",
  "error.load": "Could not load the timeline: {error}",
  "error.refresh": "Could not refresh the timeline: {error}",
  "error.operation": "Could not create a new version; the current version is unchanged: {error}",
  "error.save": "Could not save the edit; the current version is unchanged: {error}",
  "error.retry": "Could not retry the turn: {error}",
  "header.failed": "Could not regenerate",
  "section.versions": "Versions",
  "versions.count.one": "{count} version",
  "versions.count.other": "{count} versions",
  "position.label": "{position} / {total}",
  "position.description": "Version {position} of {total}",
  "turn.title": "Turn {turn}",
  "turn.emptyInput": "No input",
  "block.user": "Message",
  "block.assistant.reasoning": "Reasoning",
  "block.assistant.response": "Reply",
  "block.empty": "No text",
  "action.edit": "Edit",
  "action.editMessage": "Edit message",
  "action.retry": "Retry turn",
  "action.reroll": "Regenerate last reply",
  "action.rerollShort": "Regenerate",
  "action.undo": "Previous version",
  "action.redo": "Next version",
  "action.redoBranches.one": "Newest of {count} next version",
  "action.redoBranches.other": "Newest of {count} next versions",
  "pending.edit": "Saving",
  "pending.reroll": "Regenerating",
  "pending.retry": "Retrying",
  "cascade.label": "Later turns",
  "cascade.truncate": "Drop",
  "cascade.preserve": "Replay",
  "cascade.truncate.hint": "Remove the turns after the changed one",
  "cascade.preserve.hint": "Send the later messages again in order",
  "dialog.title.pick": "Edit turn {turn}",
  "dialog.pick": "Choose the part of this turn to edit.",
  "dialog.title.user": "Edit message",
  "dialog.title.assistant.reasoning": "Edit reasoning",
  "dialog.title.assistant.response": "Edit reply",
  "dialog.hint.last":
    "Saving creates a new version from this turn. The current version stays unchanged.",
  "dialog.hint.truncate":
    "Saving creates a new version that ends at this turn. The current version stays unchanged.",
  "dialog.hint.preserve":
    "Saving creates a new version and sends the later messages again. The current version stays unchanged.",
  "dialog.save": "Save",
  "dialog.cancel": "Cancel",
  "dialog.back": "Back",
  "dialog.close": "Close",
  "version.original": "Original",
  "version.branch": "Branch",
  "version.edit": "Edited turn {turn}",
  "version.edit.user": "Edited message in turn {turn}",
  "version.edit.assistant.reasoning": "Edited reasoning in turn {turn}",
  "version.edit.assistant.response": "Edited reply in turn {turn}",
  "version.reroll": "Regenerated turn {turn}",
  "version.retry": "Retried turn {turn}",
  "version.current": "Current",
  "version.ancestor": "Earlier version",
  "version.before": "Before",
  "version.after": "After",
} as const;

export type MessageEditKey = keyof typeof EN;

const ZH: Record<MessageEditKey, string> = {
  "format.locale": "zh",
  "clock.md": "{m}月{d}日",
  "clock.ymd": "{y}年{m}月{d}日",
  "view.label": "时间线",
  "status.loading": "正在载入时间线",
  "status.refreshing": "正在刷新",
  "status.reload": "重新载入",
  "status.empty": "这个会话还没有已结束的回合",
  "error.load": "时间线载入失败：{error}",
  "error.refresh": "时间线刷新失败：{error}",
  "error.operation": "新版本创建失败，当前版本保持不变：{error}",
  "error.save": "修改保存失败，当前版本保持不变：{error}",
  "error.retry": "回合重试失败：{error}",
  "header.failed": "重新生成失败",
  "section.versions": "版本",
  "versions.count.one": "{count} 个版本",
  "versions.count.other": "{count} 个版本",
  "position.label": "{position} / {total}",
  "position.description": "第 {position} 个版本，共 {total} 个",
  "turn.title": "回合 {turn}",
  "turn.emptyInput": "无输入",
  "block.user": "消息",
  "block.assistant.reasoning": "思考",
  "block.assistant.response": "回复",
  "block.empty": "无内容",
  "action.edit": "编辑",
  "action.editMessage": "编辑消息",
  "action.retry": "重试本回合",
  "action.reroll": "重新生成最后的回复",
  "action.rerollShort": "重新生成",
  "action.undo": "上一版本",
  "action.redo": "下一版本",
  "action.redoBranches.one": "{count} 个下一版本中最新的一个",
  "action.redoBranches.other": "{count} 个下一版本中最新的一个",
  "pending.edit": "正在保存",
  "pending.reroll": "正在重新生成",
  "pending.retry": "正在重试",
  "cascade.label": "后续回合",
  "cascade.truncate": "丢弃",
  "cascade.preserve": "重放",
  "cascade.truncate.hint": "移除改动回合之后的回合",
  "cascade.preserve.hint": "按顺序重新发送之后的消息",
  "dialog.title.pick": "编辑回合 {turn}",
  "dialog.pick": "选择这一回合中要编辑的部分。",
  "dialog.title.user": "编辑消息",
  "dialog.title.assistant.reasoning": "编辑思考",
  "dialog.title.assistant.response": "编辑回复",
  "dialog.hint.last": "保存后从这一回合生成新版本，当前版本保持不变。",
  "dialog.hint.truncate": "保存后生成到这一回合为止的新版本，当前版本保持不变。",
  "dialog.hint.preserve": "保存后生成新版本并重新发送之后的消息，当前版本保持不变。",
  "dialog.save": "保存",
  "dialog.cancel": "取消",
  "dialog.back": "返回",
  "dialog.close": "关闭",
  "version.original": "原始版本",
  "version.branch": "分支",
  "version.edit": "编辑了回合 {turn}",
  "version.edit.user": "编辑了回合 {turn} 的消息",
  "version.edit.assistant.reasoning": "编辑了回合 {turn} 的思考",
  "version.edit.assistant.response": "编辑了回合 {turn} 的回复",
  "version.reroll": "重新生成了回合 {turn}",
  "version.retry": "重试了回合 {turn}",
  "version.current": "当前",
  "version.ancestor": "上游版本",
  "version.before": "修改前",
  "version.after": "修改后",
};

/** 两种语言的字典，键完全一致。 */
export const MESSAGE_EDIT_DICTIONARIES: Readonly<
  Record<"en" | "zh", Record<MessageEditKey, string>>
> = { en: EN, zh: ZH };

/** 组件收到的 `t`：键限定在本插件的字典里。 */
export type MessageEditTranslate = (
  key: MessageEditKey,
  params?: Record<string, string | number>,
) => string;

/** 注册两种语言的字典，返回注销函数。 */
export function registerLocale(locale: Locale): () => void {
  const disposers = [
    locale.register(MESSAGE_EDIT_LOCALE, "en", EN),
    locale.register(MESSAGE_EDIT_LOCALE, "zh", ZH),
  ];
  return () => {
    for (const dispose of disposers) dispose();
  };
}
