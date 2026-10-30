/**
 * 助手消息动作行里的按钮（`conversation.chat.assistant-actions`）。编辑可以选择本回合的用户消息，
 * 或这条消息的思考与回复。这条消息不在时间线里，或所在回合没有用户输入时不渲染。
 */
import { useEffect, useMemo, type ReactNode } from "react";
import { ActionButtons } from "./action-buttons.tsx";
import type { MessageEditFace } from "./controller.ts";
import { useSnapshot } from "./hooks.ts";
import type { MessageEditTranslate } from "./locale.ts";
import { messageTarget } from "./view-model.ts";

export type AssistantActionsProps = MessageEditFace & {
  readonly t: MessageEditTranslate;
  /** 宿主动作行的 owner prop：这条助手消息的 id。 */
  readonly messageId: string;
};

export function AssistantActions({
  t,
  messageId,
  store,
  acquire,
  edit,
  retry,
}: AssistantActionsProps): ReactNode {
  useEffect(() => acquire(), [acquire]);
  const state = useSnapshot(store);
  const timeline = state.timeline;
  const target = useMemo(
    () => (timeline === null ? null : messageTarget(timeline, messageId)),
    [timeline, messageId],
  );
  if (target === undefined) return null;
  return (
    <ActionButtons
      t={t}
      store={store}
      edit={edit}
      retry={retry}
      state={state}
      target={target}
      editLabel={t("action.edit")}
    />
  );
}
