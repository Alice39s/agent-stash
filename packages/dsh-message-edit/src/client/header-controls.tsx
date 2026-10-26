/**
 * 标题栏控件组（`conversation.session.header.actions`）：上一版本、位置、下一版本与重新生成。
 * 数据到达之前、或没有任何控件可用时不渲染。重新生成失败时文字动作改为失败标签，4 秒后复原。
 */
import { useEffect, useState, type ReactNode } from "react";
import { cx } from "./class-names.ts";
import type { MessageEditProps } from "./controller.ts";
import { Glyph, GLYPH_SIZE, IconButton, QuietAction } from "./controls.tsx";
import { formatCount, formatLocale, formatPlural } from "./format.ts";
import styles from "./header-controls.module.css";
import { IconChevronLeft, IconChevronRight, IconRefresh } from "./icons.tsx";
import type { MessageEditTranslate } from "./locale.ts";
import surface from "./surface.module.css";
import { canReroll, operationsBlocked, selectState, stepper } from "./view-model.ts";

export type HeaderControlsProps = MessageEditProps & { readonly t: MessageEditTranslate };

/** 失败标签停留的时长，取自宿主 ui-jobs 的 `KILL_FAILED_MS`。 */
export const HEADER_FAILURE_MS = 4_000;

export function HeaderControls({
  t,
  useMessageEdit,
  acquire,
  reroll,
  openVersion,
}: HeaderControlsProps): ReactNode {
  useEffect(() => acquire(), [acquire]);
  const state = useMessageEdit(selectState);
  /** 每次失败一个新标记，重新开始计时。 */
  const [failure, setFailure] = useState<symbol | null>(null);
  useEffect(() => {
    const timer =
      failure === null
        ? undefined
        : setTimeout(() => {
            setFailure(null);
          }, HEADER_FAILURE_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [failure]);

  const timeline = state.timeline;
  if (timeline === null) return null;
  const steps = stepper(timeline);
  const stepping = steps.total > 1;
  const rerollable = canReroll(timeline);
  if (!stepping && !rerollable) return null;

  const locale = formatLocale(t);
  const rerolling = state.pending === "reroll";
  const failed = failure !== null && !rerolling;
  const open = (target: string | undefined): void => {
    if (target === undefined) throw new Error("no version to open in this direction");
    openVersion(target);
  };
  const onReroll = (): void => {
    setFailure(null);
    void reroll().then((applied) => {
      if (!applied) setFailure(Symbol("reroll failed"));
    });
  };
  const rerollName = rerolling
    ? t("pending.reroll")
    : failed
      ? t("header.failed")
      : t("action.reroll");
  const failureDetail =
    failed && state.error !== null ? t("error.operation", { error: state.error }) : undefined;
  const params = {
    position: formatCount(steps.position, locale),
    total: formatCount(steps.total, locale),
  };

  return (
    <div className={cx(surface.root, styles.root)}>
      {stepping && (
        <div className={styles.stepper}>
          <IconButton
            variant="header"
            label={t("action.undo")}
            icon={IconChevronLeft}
            disabled={steps.previous === undefined}
            onClick={() => {
              open(steps.previous);
            }}
          />
          <span className={styles.position} aria-hidden="true">
            {t("position.label", params)}
          </span>
          <span className={surface.visuallyHidden}>{t("position.description", params)}</span>
          <IconButton
            variant="header"
            label={
              steps.branches > 1
                ? formatPlural(t, "action.redoBranches", steps.branches, locale)
                : t("action.redo")
            }
            icon={IconChevronRight}
            disabled={steps.next === undefined}
            onClick={() => {
              open(steps.next);
            }}
          />
        </div>
      )}
      {rerollable && (
        <QuietAction
          variant="header"
          aria-label={rerollName}
          aria-busy={rerolling || undefined}
          tooltip={failureDetail ?? rerollName}
          failed={failed}
          disabled={!rerolling && operationsBlocked(state)}
          onClick={rerolling ? undefined : onReroll}
        >
          <Glyph icon={IconRefresh} size={GLYPH_SIZE} busy={rerolling} />
          <span className={styles.label}>
            {rerolling
              ? t("pending.reroll")
              : failed
                ? t("header.failed")
                : t("action.rerollShort")}
          </span>
        </QuietAction>
      )}
      {failed && (
        <span className={surface.visuallyHidden} role="status">
          {failureDetail ?? t("header.failed")}
        </span>
      )}
    </div>
  );
}
