/**
 * 编辑对话框，时间线视图与消息动作按钮共用；只在打开期间挂载。
 *
 * 有多个可编辑块时先显示选项行，选中后在同一张卡片里换成文本步骤；只有一个块时直接进入文本步骤。
 * 块所在回合之后还有回合时，文本步骤里可以切换后续回合策略。保存进行中文本框只读、所有关闭途径
 * 都不生效；保存成功后关闭，失败时保留草稿并显示错误。
 */
import { useState, type ReactNode } from "react";
import type { CascadePolicy, EditableMessageBlock } from "../shared.ts";
import { cx } from "./class-names.ts";
import type { MessageEditFace } from "./controller.ts";
import { Button, CascadeToggle, ListRow, TextField } from "./controls.tsx";
import { Dialog } from "./dialog.tsx";
import styles from "./edit-dialog.module.css";
import { useSnapshot } from "./hooks.ts";
import type { MessageEditTranslate } from "./locale.ts";
import {
  BLOCK_LABEL_KEYS,
  DIALOG_TITLE_KEYS,
  dialogHintKey,
  operationsBlocked,
} from "./view-model.ts";

export interface EditDialogProps {
  readonly t: MessageEditTranslate;
  readonly store: MessageEditFace["store"];
  readonly edit: MessageEditFace["edit"];
  /** 可以编辑的块，至少一个；只有一个时直接进入文本步骤。 */
  readonly choices: readonly EditableMessageBlock[];
  /** 块所在回合之后还有回合时，显示后续回合策略。 */
  readonly hasLaterTurns: boolean;
  readonly initialCascade: CascadePolicy;
  readonly onClose: () => void;
}

export function EditDialog({
  t,
  store,
  edit,
  choices,
  hasLaterTurns,
  initialCascade,
  onClose,
}: EditDialogProps): ReactNode {
  const first = choices[0];
  if (first === undefined) throw new Error("the edit dialog needs at least one block");
  const single = choices.length === 1;
  const state = useSnapshot(store);
  const [block, setBlock] = useState<EditableMessageBlock | undefined>(single ? first : undefined);
  const [draft, setDraft] = useState(single ? first.text : "");
  const [cascade, setCascade] = useState(initialCascade);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  const canSave =
    block !== undefined && !saving && !operationsBlocked(state) && draft !== block.text;

  const save = (): void => {
    if (block === undefined || !canSave) return;
    setSaving(true);
    setFailed(false);
    void edit(block, draft, cascade).then((applied) => {
      if (applied) {
        onClose();
        return;
      }
      setSaving(false);
      setFailed(true);
    });
  };

  if (block === undefined) {
    return (
      <Dialog
        title={t("dialog.title.pick", { turn: first.turn })}
        closeLabel={t("dialog.close")}
        description={t("dialog.pick")}
        step="pick"
        busy={false}
        onClose={onClose}
      >
        <div className={styles.options}>
          {choices.map((choice, index) => (
            <ListRow
              key={choice.key}
              variant="option"
              autofocus={index === 0}
              onClick={() => {
                setBlock(choice);
                setDraft(choice.text);
              }}
            >
              <span className={styles.optionTitle}>{t(BLOCK_LABEL_KEYS[choice.kind])}</span>
              <span className={cx(styles.optionPreview, choice.text === "" && styles.placeholder)}>
                {choice.text === "" ? t("block.empty") : choice.text}
              </span>
            </ListRow>
          ))}
        </div>
      </Dialog>
    );
  }

  return (
    <Dialog
      title={t(DIALOG_TITLE_KEYS[block.kind])}
      closeLabel={t("dialog.close")}
      step={block.key}
      busy={saving}
      onClose={onClose}
      onSubmit={save}
      footer={
        <>
          {!single && (
            <Button
              variant="outline"
              size="md"
              disabled={saving}
              onClick={() => {
                setBlock(undefined);
                setFailed(false);
              }}
            >
              {t("dialog.back")}
            </Button>
          )}
          <Button variant="outline" size="md" disabled={saving} onClick={onClose}>
            {t("dialog.cancel")}
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!saving && !canSave}
            aria-busy={saving || undefined}
            onClick={saving ? undefined : save}
          >
            {saving ? t("pending.edit") : t("dialog.save")}
          </Button>
        </>
      }
    >
      <TextField
        label={t(BLOCK_LABEL_KEYS[block.kind])}
        value={draft}
        readOnly={saving}
        onChange={setDraft}
      />
      {saving ? (
        <p className={styles.message} role="status">
          {t("pending.edit")}
        </p>
      ) : failed && state.error !== null ? (
        <p className={styles.message} role="alert">
          {t("error.save", { error: state.error })}
        </p>
      ) : (
        <p className={styles.message}>{t(dialogHintKey(hasLaterTurns, cascade))}</p>
      )}
      {hasLaterTurns && (
        <div className={styles.cascade}>
          <CascadeToggle t={t} value={cascade} disabled={saving} onChange={setCascade} />
        </div>
      )}
    </Dialog>
  );
}
