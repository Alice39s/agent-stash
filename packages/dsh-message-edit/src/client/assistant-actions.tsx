/**
 * 助手消息动作行里的按钮（`conversation.chat.assistant-actions`）：编辑在前，重试在后。
 * 编辑打开对话框，可以选择本回合的用户消息或这条消息的思考与回复；重试以截断策略重跑本回合。
 *
 * 时间线还没到时按钮显示为不可用；首次载入失败时按钮不可用，后面跟一行失败提示。这条消息不在
 * 时间线里，或所在回合没有用户输入时不渲染。
 */
import { useEffect, useMemo, useState, type ReactNode } from "react";
import styles from "./assistant-actions.module.css";
import type { MessageEditProps } from "./controller.ts";
import { IconButton } from "./controls.tsx";
import { EditDialog } from "./edit-dialog.tsx";
import { IconEdit, IconRefresh } from "./icons.tsx";
import type { MessageEditTranslate } from "./locale.ts";
import { messageTarget, operationsBlocked, selectState } from "./view-model.ts";

export type AssistantActionsProps = MessageEditProps & {
  readonly t: MessageEditTranslate;
  /** 宿主动作行的 owner prop：这条助手消息的 id。 */
  readonly messageId: string;
};

function noop(): void {}

/** 按钮后面的一行状态，过长时省略，完整文字放在 `title` 里。 */
function StatusLine({ text }: { readonly text: string }): ReactNode {
  return (
    <span className={styles.failure} role="status" title={text}>
      {text}
    </span>
  );
}

export function AssistantActions({
  t,
  messageId,
  useMessageEdit,
  acquire,
  edit,
  retry,
}: AssistantActionsProps): ReactNode {
  useEffect(() => acquire(), [acquire]);
  const state = useMessageEdit(selectState);
  const timeline = state.timeline;
  const target = useMemo(
    () => (timeline === null ? undefined : messageTarget(timeline, messageId)),
    [timeline, messageId],
  );
  const [editing, setEditing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [failed, setFailed] = useState(false);

  if (timeline === null) {
    return (
      <>
        <IconButton
          variant="row"
          label={t("action.edit")}
          icon={IconEdit}
          disabled
          onClick={noop}
        />
        <IconButton
          variant="row"
          label={t("action.retry")}
          icon={IconRefresh}
          disabled
          onClick={noop}
        />
        {state.status === "error" && state.error !== null && (
          <StatusLine text={t("error.load", { error: state.error })} />
        )}
      </>
    );
  }
  if (target === undefined) return null;

  const busy = retrying && state.pending === "retry";
  const onRetry = (): void => {
    setRetrying(true);
    setFailed(false);
    void retry(target.retry.turn, "truncate").then((applied) => {
      setRetrying(false);
      setFailed(!applied);
    });
  };

  return (
    <>
      <IconButton
        variant="row"
        label={t("action.edit")}
        icon={IconEdit}
        disabled={state.pending !== null}
        onClick={() => {
          setFailed(false);
          setEditing(true);
        }}
      />
      <IconButton
        variant="row"
        label={busy ? t("pending.retry") : t("action.retry")}
        icon={IconRefresh}
        busy={busy}
        disabled={!busy && operationsBlocked(state)}
        onClick={onRetry}
      />
      {failed && state.error !== null && (
        <StatusLine text={t("error.retry", { error: state.error })} />
      )}
      {editing && (
        <EditDialog
          t={t}
          useMessageEdit={useMessageEdit}
          edit={edit}
          choices={target.choices}
          hasLaterTurns={target.hasLaterTurns}
          initialCascade="truncate"
          onClose={() => {
            setEditing(false);
          }}
        />
      )}
    </>
  );
}
