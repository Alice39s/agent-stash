/**
 * 聊天区一行里的编辑与重试按钮，助手消息动作行与回合末尾的动作行共用：编辑在前，重试在后。
 * 编辑打开对话框，选项是目标回合里可以编辑的块；重试以截断策略重跑这一回合。
 *
 * 时间线还没到时按钮显示为不可用；首次载入失败时按钮不可用，后面跟一行失败提示。
 */
import { useState, type ReactNode } from "react";
import styles from "./action-buttons.module.css";
import type { MessageEditFace, MessageEditState } from "./controller.ts";
import { IconButton } from "./controls.tsx";
import { EditDialog } from "./edit-dialog.tsx";
import { IconEdit, IconRefresh } from "./icons.tsx";
import type { MessageEditTranslate } from "./locale.ts";
import { operationsBlocked, type TurnTarget } from "./view-model.ts";

export interface ActionButtonsProps {
  readonly t: MessageEditTranslate;
  readonly store: MessageEditFace["store"];
  readonly edit: MessageEditFace["edit"];
  readonly retry: MessageEditFace["retry"];
  readonly state: MessageEditState;
  /** null：时间线还没到。 */
  readonly target: TurnTarget | null;
  /** 编辑按钮的无障碍名称与 tooltip。 */
  readonly editLabel: string;
}

function noop(): void {}

/** 按钮后面的一行状态，过长时省略，完整文字放在 `title` 里。 */
function StatusLine({ text }: { readonly text: string }): ReactNode {
  return (
    <span className={styles.failure} role="status" title={text}>
      {text}
    </span>
  );
}

export function ActionButtons({
  t,
  store,
  edit,
  retry,
  state,
  target,
  editLabel,
}: ActionButtonsProps): ReactNode {
  const [editing, setEditing] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [failed, setFailed] = useState(false);

  if (target === null) {
    return (
      <>
        <IconButton variant="row" label={editLabel} icon={IconEdit} disabled onClick={noop} />
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
      {target.choices.length > 0 && (
        <IconButton
          variant="row"
          label={editLabel}
          icon={IconEdit}
          disabled={state.pending !== null}
          onClick={() => {
            setFailed(false);
            setEditing(true);
          }}
        />
      )}
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
          store={store}
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
