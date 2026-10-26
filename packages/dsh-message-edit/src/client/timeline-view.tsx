/**
 * 时间线视图（`conversation.view`）：工具栏放后续回合策略、版本步进与重新生成；主栏按回合列出
 * 可编辑块，编辑在对话框里进行；副栏是版本树，点击非当前版本切换过去。
 */
import { useEffect, useId, useState, type ReactNode } from "react";
import type {
  CascadePolicy,
  EditableMessageBlock,
  MessageEditTimeline,
  VersionSummary,
} from "../shared.ts";
import { cx } from "./class-names.ts";
import type { MessageEditProps, MessageEditState } from "./controller.ts";
import {
  Button,
  CascadeToggle,
  Glyph,
  GLYPH_SIZE,
  IconButton,
  ListRow,
  QuietAction,
  StateDot,
} from "./controls.tsx";
import { EditDialog } from "./edit-dialog.tsx";
import { formatClock, formatLocale, formatPlural, shortId, type FormatLocale } from "./format.ts";
import { IconChevronLeft, IconChevronRight, IconEdit, IconRefresh } from "./icons.tsx";
import type { MessageEditTranslate } from "./locale.ts";
import surface from "./surface.module.css";
import styles from "./timeline-view.module.css";
import {
  BLOCK_LABEL_KEYS,
  canReroll,
  lastTurn,
  operationsBlocked,
  selectState,
  stepper,
  turnGroups,
  versionRows,
  versionTitle,
  type TurnGroup,
  type VersionRow,
} from "./view-model.ts";

export type TimelineViewProps = MessageEditProps & { readonly t: MessageEditTranslate };

/** 载入骨架每栏的行数。 */
const SKELETON_ROWS = [0, 1, 2] as const;

interface ToolbarProps {
  readonly t: MessageEditTranslate;
  readonly state: MessageEditState;
  readonly locale: FormatLocale;
  readonly cascade: CascadePolicy;
  readonly onCascade: (value: CascadePolicy) => void;
  readonly onReroll: () => void;
  readonly openVersion: (sessionId: string) => void;
}

/** 控件在前侧，刷新状态在后侧。 */
function Toolbar({
  t,
  state,
  locale,
  cascade,
  onCascade,
  onReroll,
  openVersion,
}: ToolbarProps): ReactNode {
  const timeline = state.timeline;
  const steps = timeline === null ? undefined : stepper(timeline);
  const rerolling = state.pending === "reroll";
  const rerollable = timeline !== null && canReroll(timeline);
  const open = (target: string | undefined): void => {
    if (target === undefined) throw new Error("no version to open in this direction");
    openVersion(target);
  };
  return (
    <div className={styles.toolbar}>
      <CascadeToggle t={t} value={cascade} disabled={timeline === null} onChange={onCascade} />
      <div className={styles.toolbarActions}>
        <QuietAction
          variant="toolbar"
          disabled={steps?.previous === undefined}
          onClick={() => {
            open(steps?.previous);
          }}
        >
          <IconChevronLeft size={GLYPH_SIZE} />
          {t("action.undo")}
        </QuietAction>
        <QuietAction
          variant="toolbar"
          disabled={steps?.next === undefined}
          tooltip={
            steps !== undefined && steps.branches > 1
              ? formatPlural(t, "action.redoBranches", steps.branches, locale)
              : undefined
          }
          onClick={() => {
            open(steps?.next);
          }}
        >
          {t("action.redo")}
          <IconChevronRight size={GLYPH_SIZE} />
        </QuietAction>
        <QuietAction
          variant="toolbar"
          aria-busy={rerolling || undefined}
          disabled={!rerolling && (!rerollable || operationsBlocked(state))}
          onClick={rerolling ? undefined : onReroll}
        >
          <Glyph icon={IconRefresh} size={GLYPH_SIZE} busy={rerolling} />
          {rerolling ? t("pending.reroll") : t("action.reroll")}
        </QuietAction>
      </div>
      {timeline !== null && state.status === "loading" && (
        <span className={styles.refreshing}>
          <StateDot state="ongoing" size={GLYPH_SIZE} />
          <span className={surface.visuallyHidden} role="status">
            {t("status.refreshing")}
          </span>
        </span>
      )}
    </div>
  );
}

interface TurnGroupViewProps {
  readonly t: MessageEditTranslate;
  readonly group: TurnGroup;
  readonly now: number;
  /** 这个视图发起的重试正在本回合进行。 */
  readonly retrying: boolean;
  readonly retryBlocked: boolean;
  readonly editBlocked: boolean;
  readonly onRetry: (turn: number) => void;
  readonly onEdit: (block: EditableMessageBlock) => void;
}

function TurnGroupView({
  t,
  group,
  now,
  retrying,
  retryBlocked,
  editBlocked,
  onRetry,
  onEdit,
}: TurnGroupViewProps): ReactNode {
  const titleId = useId();
  const retry = group.retry;
  return (
    <section aria-labelledby={titleId}>
      <div className={styles.groupHeader}>
        <div className={styles.groupInner}>
          <h3 id={titleId} className={styles.groupTitle}>
            {t("turn.title", { turn: group.turn })}
          </h3>
          {retry !== undefined && (
            <>
              <span className={cx(styles.groupPreview, retry.preview === "" && styles.placeholder)}>
                {retry.preview === "" ? t("turn.emptyInput") : retry.preview}
              </span>
              <Button
                variant="outline"
                size="sm"
                aria-busy={retrying || undefined}
                disabled={!retrying && retryBlocked}
                onClick={
                  retrying
                    ? undefined
                    : () => {
                        onRetry(group.turn);
                      }
                }
              >
                <Glyph icon={IconRefresh} size={GLYPH_SIZE} busy={retrying} />
                {retrying ? t("pending.retry") : t("action.retry")}
              </Button>
            </>
          )}
        </div>
      </div>
      <ol className={styles.items}>
        {group.blocks.map((block) => (
          <li key={block.key} className={styles.item}>
            <div className={styles.itemHeader}>
              <span className={styles.itemKind}>{t(BLOCK_LABEL_KEYS[block.kind])}</span>
              <span className={styles.itemTime}>{formatClock(block.time, t, now)}</span>
              {retry !== undefined && (
                <IconButton
                  variant="row"
                  label={t("action.edit")}
                  icon={IconEdit}
                  disabled={editBlocked}
                  onClick={() => {
                    onEdit(block);
                  }}
                />
              )}
            </div>
            <p className={cx(styles.itemText, block.text === "" && styles.placeholder)}>
              {block.text === "" ? t("block.empty") : block.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** 修改前或修改后的一行文字，空值显示占位文案。 */
function DiffLine({
  label,
  text,
  t,
  className,
}: {
  readonly label: string;
  readonly text: string;
  readonly t: MessageEditTranslate;
  readonly className: string | undefined;
}): ReactNode {
  return (
    <span className={cx(styles.diffLine, className)}>
      <span className={styles.diffLabel}>{label}</span>
      <span className={cx(text === "" && styles.placeholder)}>
        {text === "" ? t("block.empty") : text}
      </span>
    </span>
  );
}

function VersionContent({
  t,
  version,
  tone,
  now,
}: {
  readonly t: MessageEditTranslate;
  readonly version: VersionSummary;
  readonly tone: VersionRow["tone"];
  readonly now: number;
}): ReactNode {
  const effect = version.effect;
  return (
    <>
      <span className={styles.markerSlot}>
        <StateDot state={tone} />
      </span>
      <span className={styles.versionMain}>
        <span className={styles.versionTitle}>
          {versionTitle(version, t)}
          {tone === "current" && (
            <span className={surface.visuallyHidden}>{` ${t("version.current")}`}</span>
          )}
          {tone === "ancestor" && (
            <span className={surface.visuallyHidden}>{` ${t("version.ancestor")}`}</span>
          )}
        </span>
        <span className={styles.versionMeta}>
          {formatClock(version.createdAt, t, now)}
          <span className={styles.versionId} title={version.sessionId}>
            {shortId(version.sessionId)}
          </span>
        </span>
        {effect?.before !== undefined && (
          <DiffLine
            label={t("version.before")}
            text={effect.before}
            t={t}
            className={styles.diffBefore}
          />
        )}
        {effect?.after !== undefined && (
          <DiffLine
            label={t("version.after")}
            text={effect.after}
            t={t}
            className={styles.diffAfter}
          />
        )}
      </span>
    </>
  );
}

function SkeletonRows(): ReactNode {
  return (
    <div aria-hidden="true">
      {SKELETON_ROWS.map((row) => (
        <div key={row} className={styles.skeletonRow}>
          <span className={cx(styles.skeletonBar, styles.skeletonShort)} />
          <span className={styles.skeletonBar} />
        </div>
      ))}
    </div>
  );
}

interface PrimaryContentProps {
  readonly t: MessageEditTranslate;
  readonly timeline: MessageEditTimeline;
  readonly state: MessageEditState;
  /** 这个视图发起、仍在进行的重试所在的回合。 */
  readonly retryingTurn: number | null;
  readonly onRetry: (turn: number) => void;
  readonly onEdit: (block: EditableMessageBlock) => void;
}

function PrimaryContent({
  t,
  timeline,
  state,
  retryingTurn,
  onRetry,
  onEdit,
}: PrimaryContentProps): ReactNode {
  const groups = turnGroups(timeline);
  if (groups.length === 0) return <p className={styles.statusLine}>{t("status.empty")}</p>;
  const now = Date.now();
  return groups.map((group) => (
    <TurnGroupView
      key={group.turn}
      t={t}
      group={group}
      now={now}
      retrying={retryingTurn === group.turn}
      retryBlocked={operationsBlocked(state)}
      editBlocked={state.pending !== null}
      onRetry={onRetry}
      onEdit={onEdit}
    />
  ));
}

export function TimelineView({
  t,
  useMessageEdit,
  acquire,
  load,
  edit,
  retry,
  reroll,
  openVersion,
}: TimelineViewProps): ReactNode {
  useEffect(() => acquire(), [acquire]);
  const state = useMessageEdit(selectState);
  const [cascade, setCascade] = useState<CascadePolicy>("truncate");
  /** 这个视图发起、仍在进行的重试所在的回合。 */
  const [retryingTurn, setRetryingTurn] = useState<number | null>(null);
  const [editing, setEditing] = useState<EditableMessageBlock | null>(null);
  const versionsTitleId = useId();
  const locale = formatLocale(t);
  const timeline = state.timeline;
  const loading = state.status === "idle" || state.status === "loading";
  const now = Date.now();

  const primary =
    timeline !== null ? (
      <PrimaryContent
        t={t}
        timeline={timeline}
        state={state}
        retryingTurn={state.pending === "retry" ? retryingTurn : null}
        onRetry={(turn) => {
          setRetryingTurn(turn);
          void retry(turn, cascade).finally(() => {
            setRetryingTurn(null);
          });
        }}
        onEdit={setEditing}
      />
    ) : state.error !== null ? (
      <div className={styles.failure}>
        <p className={styles.failureText} role="alert">
          {t("error.load", { error: state.error })}
        </p>
        <Button variant="outline" size="sm" onClick={load}>
          {t("status.reload")}
        </Button>
      </div>
    ) : (
      <>
        <p className={surface.visuallyHidden} role="status">
          {t("status.loading")}
        </p>
        <SkeletonRows />
      </>
    );

  const secondary =
    timeline !== null ? (
      <ol className={styles.tree}>
        {versionRows(timeline).map(({ version, tone, indent }) => (
          <li key={version.sessionId}>
            <ListRow
              variant="tree"
              indent={indent}
              current={version.current}
              onClick={() => {
                openVersion(version.sessionId);
              }}
            >
              <VersionContent t={t} version={version} tone={tone} now={now} />
            </ListRow>
          </li>
        ))}
      </ol>
    ) : (
      loading && <SkeletonRows />
    );

  return (
    <div className={cx(surface.root, styles.root)} data-conversation-composer-overlay="">
      <Toolbar
        t={t}
        state={state}
        locale={locale}
        cascade={cascade}
        onCascade={setCascade}
        onReroll={() => {
          void reroll();
        }}
        openVersion={openVersion}
      />
      {timeline !== null && state.error !== null && (
        <p className={styles.notice} role="alert">
          {state.status === "error"
            ? t("error.refresh", { error: state.error })
            : t("error.operation", { error: state.error })}
        </p>
      )}
      <div className={styles.split}>
        <div className={styles.primary} aria-busy={loading || undefined}>
          {primary}
        </div>
        <section
          className={styles.secondary}
          aria-labelledby={versionsTitleId}
          aria-busy={loading || undefined}
        >
          <div className={styles.paneHeader}>
            <h2 id={versionsTitleId} className={styles.paneTitle}>
              {t("section.versions")}
            </h2>
            {timeline !== null && (
              <span className={styles.paneCount}>
                {formatPlural(t, "versions.count", timeline.versions.length, locale)}
              </span>
            )}
          </div>
          <div className={styles.treeScroll}>{secondary}</div>
        </section>
      </div>
      {editing !== null && timeline !== null && (
        <EditDialog
          t={t}
          useMessageEdit={useMessageEdit}
          edit={edit}
          choices={[editing]}
          hasLaterTurns={lastTurn(timeline) !== editing.turn}
          initialCascade={cascade}
          onClose={() => {
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
