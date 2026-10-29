/**
 * 回合末尾的编辑与重试（`conversation.chat.turnTail`）。宿主的消息动作行只挂在落盘的收尾助手消息下面，
 * 回合报错、被停止或没有文本回复时没有这一行，消息也就无法编辑或重发；插件在这样的回合末尾补一行按钮，
 * 编辑只改本回合的用户消息。回合不在时间线里，或没有用户输入时不渲染。
 */
import { useEffect, useMemo, type ReactNode } from "react";
import { ActionButtons } from "./action-buttons.tsx";
import type { MessageEditFace } from "./controller.ts";
import type { TurnTailOwner } from "./dsh.ts";
import { useSnapshot } from "./hooks.ts";
import type { MessageEditTranslate } from "./locale.ts";
import styles from "./turn-actions.module.css";
import { turnTarget, unansweredTurn } from "./view-model.ts";

export type TurnActionsProps = MessageEditFace &
  TurnTailOwner & {
    readonly t: MessageEditTranslate;
  };

type UnansweredTurnActionsProps = MessageEditFace & {
  readonly t: MessageEditTranslate;
  readonly turn: number;
};

function UnansweredTurnActions({
  t,
  turn,
  store,
  acquire,
  edit,
  retry,
}: UnansweredTurnActionsProps): ReactNode {
  useEffect(() => acquire(), [acquire]);
  const state = useSnapshot(store);
  const timeline = state.timeline;
  const target = useMemo(
    () => (timeline === null ? null : turnTarget(timeline, turn)),
    [timeline, turn],
  );
  if (target === undefined) return null;
  return (
    <div className={styles.row}>
      <ActionButtons
        t={t}
        store={store}
        edit={edit}
        retry={retry}
        state={state}
        target={target}
        editLabel={t("action.editMessage")}
      />
    </div>
  );
}

/** 只在回合没有落盘的收尾助手消息时挂载内层组件，其他回合不载入时间线。 */
export function TurnActions({ turn, seq, ...face }: TurnActionsProps): ReactNode {
  const unanswered = unansweredTurn({ turn, seq });
  return unanswered === null ? null : <UnansweredTurnActions {...face} turn={unanswered} />;
}
