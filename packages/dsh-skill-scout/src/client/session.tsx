/**
 * 会话视图「经验提炼」（design 3.2）：第一行是本会话的分析状态与「立即分析」「提炼本会话」；
 * 下面左栏是引用本会话的建议与本会话的任务记录，右栏就地显示选中建议的详情。
 * 会话的分析情况随收件箱的工作状态重新读取；窄时只显示一栏，打开建议后详情替换列表。
 * 视图开着时，引用本会话的建议的后台工作结束不再弹出提示，由行里的圆点和状态词表达（design 4.9）。
 */
import type { StateDotState } from "@deepseek-ai/dsh-client-ui-primitives";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { Action, SessionView } from "../shared.ts";
import { Banner, dismissItem, GroupedItems } from "./cards.tsx";
import { ItemDetail } from "./detail.tsx";
import type { FaceProps } from "./face.ts";
import { absolute, ago, cites, citing, groupItems, resolveItem } from "./format.ts";
import { useAction, useLoaded, useNow, useSinglePane, useSnapshot, type Loaded } from "./hooks.ts";
import type { ScoutTranslate } from "./locale.ts";
import { TaskRow } from "./tasks.tsx";
import { ActionButton } from "./ui/action-button.tsx";
import { EmptyState } from "./ui/empty-state.tsx";
import { Group, GroupHeader, GroupNote } from "./ui/group-header.tsx";
import { RowList } from "./ui/list-row.tsx";
import { ErrorNotice } from "./ui/notice.tsx";
import { SkeletonRows } from "./ui/skeleton.tsx";
import { ViewHeader } from "./ui/view-header.tsx";
import layout from "./layout.module.css";

export type SessionTabProps = FaceProps & { readonly sessionId: string };

/** 任务记录超过这个数、且列表里有建议时，任务分组先收起。 */
const RECORDS_SHOWN = 5;

interface ViewStatus {
  readonly dot: StateDotState;
  readonly title: string;
  readonly meta: ReactNode;
}

/** 视图第一行：本会话的分析状态。 */
function viewStatus(
  t: ScoutTranslate,
  session: Loaded<SessionView>,
  scanning: boolean,
  now: number,
): ViewStatus {
  const value = session.status === "ready" ? session.value : null;
  if (value === null) {
    return session.status === "error"
      ? { dot: "error", title: t("session.state.unread"), meta: null }
      : { dot: "ongoing", title: t("panel.loading"), meta: null };
  }
  if (value.state === "analyzed") {
    const count = value.tasks.length;
    return {
      dot: scanning ? "ongoing" : "done",
      title: t(count === 1 ? "session.state.analyzed.one" : "session.state.analyzed.other", {
        count,
      }),
      meta:
        value.scannedAt === null ? null : (
          <time title={absolute(value.scannedAt)}>{ago(t, value.scannedAt, now)}</time>
        ),
    };
  }
  if (value.state === "failed") {
    return { dot: "error", title: t("session.state.failed"), meta: value.error };
  }
  if (value.state === "waiting" || value.state === "pending") {
    return {
      dot: scanning ? "ongoing" : "idle",
      title: t(`session.state.${value.state}`),
      meta: null,
    };
  }
  if (value.state === "subagent") {
    return {
      dot: "idle",
      title: t("session.state.subagent"),
      meta: t("session.state.subagent.meta"),
    };
  }
  return { dot: "idle", title: t("session.state.missing"), meta: null };
}

export function SessionTab(props: SessionTabProps): ReactNode {
  const { inbox, sessionId, loadSession, t } = props;
  const state = useSnapshot(inbox);
  /** 用户打开的建议；为 null 时两栏显示第一条，单栏显示列表。 */
  const [selected, setSelected] = useState<string | null>(null);
  const [splitRef, single] = useSinglePane<HTMLDivElement>();
  const [acting, setActing] = useState<"analyze" | "extract" | null>(null);
  /** 用户展开或收起过任务分组；为 null 时按默认。 */
  const [recordsOpen, setRecordsOpen] = useState<boolean | null>(null);
  const { busy, error, run } = useAction(inbox, t);
  const now = useNow(60_000);

  useEffect(() => inbox.listing((item) => cites(item, sessionId)), [inbox, sessionId]);

  // 分析进度、已分析的会话与任务数变化，或本视图发起的操作结束、用户重试后，重新读取本会话的情况。
  const status = state.inbox?.status;
  const [acted, setActed] = useState(0);
  const revision = [
    status?.scanning,
    status?.waiting,
    status?.analyzed.sessions,
    status?.analyzed.episodes,
    acted,
  ].join(":");
  const load = useCallback(
    (_revision: string, signal: AbortSignal) => loadSession(sessionId, signal),
    [loadSession, sessionId],
  );
  const session = useLoaded(load, revision);

  const view = state.inbox;
  const items = citing(view?.items ?? [], sessionId);
  const groups = groupItems(items);
  const current = resolveItem(items, selected) ?? groups.review[0] ?? groups.found[0] ?? items[0];
  const value = session.status === "ready" ? session.value : null;
  const closed = value === null || value.state === "subagent" || value.state === "missing";
  const header = viewStatus(t, session, status?.scanning === true, now);

  /** 分析或提炼本会话；提炼成功后打开 Host 返回的线索，它已有 idea 时落到第一个 idea。 */
  const send = async (kind: "analyze" | "extract", action: Action): Promise<void> => {
    setActing(kind);
    const result = await run(action);
    setActing(null);
    setActed((count) => count + 1);
    if (result?.ok === true && result.leadId !== undefined) setSelected(result.leadId);
  };

  const tasks = value?.tasks ?? [];
  const collapsible = tasks.length > RECORDS_SHOWN;
  const recordsShown = recordsOpen ?? !(collapsible && items.length > 0);
  const extractBlocked =
    status?.models.summary == null
      ? t("detail.noSummaryModel")
      : value !== null && value.tasks.length === 0
        ? t("error.empty")
        : null;

  // data-conversation-composer-overlay：DSH 据此把视图区固定为可见高度，输入框浮在底部，视图自己留出它的高度。
  return (
    <div className={layout.view} data-view="session" data-conversation-composer-overlay="">
      <ViewHeader
        dot={header.dot}
        title={header.title}
        meta={header.meta}
        actions={
          <>
            <ActionButton
              variant="ghost"
              label={t("session.analyze")}
              busyLabel={t("session.analyzing")}
              busy={acting === "analyze"}
              disabled={closed || busy}
              onClick={() => void send("analyze", { action: "analyze-session", sessionId })}
            />
            <ActionButton
              variant="primary"
              label={t("session.extract")}
              busyLabel={t("session.extracting")}
              busy={acting === "extract"}
              disabled={closed || busy}
              unavailable={extractBlocked}
              onClick={() => void send("extract", { action: "extract-session", sessionId })}
            />
          </>
        }
      />
      {(view !== null || error !== null || session.status === "error") && (
        <div className={layout.viewNotices}>
          {view !== null && <Banner inbox={view} t={t} />}
          {error !== null && <ErrorNotice text={error} />}
          {session.status === "error" && (
            <ErrorNotice
              text={t("session.error", { error: session.error })}
              retry={{ label: t("panel.retry"), onClick: () => setActed((count) => count + 1) }}
            />
          )}
        </div>
      )}
      <div ref={splitRef} className={layout.split} data-open={selected !== null || undefined}>
        <div
          className={layout.pane}
          aria-label={t("session.list")}
          role="region"
          aria-busy={status?.scanning === true || undefined}
        >
          {view === null ? (
            <div className={layout.loading}>
              <SkeletonRows />
            </div>
          ) : items.length === 0 ? (
            <Group title={t("session.items")} size="pane">
              <GroupHeader title={t("session.items")} size="pane" sticky />
              <GroupNote>{t("session.items.empty")}</GroupNote>
            </Group>
          ) : (
            <GroupedItems
              items={items}
              now={now}
              t={t}
              size="pane"
              sticky
              selected={current?.id ?? null}
              onOpen={setSelected}
              onDismiss={(id) => dismissItem(inbox, id)}
            />
          )}
          <Group title={t("session.tasks")} size="pane">
            <GroupHeader
              title={t("session.tasks")}
              count={value === null ? undefined : tasks.length}
              size="pane"
              sticky
              toggle={
                collapsible
                  ? {
                      expanded: recordsShown,
                      label: t(recordsShown ? "group.collapse" : "group.expand", {
                        group: t("session.tasks"),
                      }),
                      onToggle: () => setRecordsOpen(!recordsShown),
                    }
                  : undefined
              }
            />
            {value === null && session.status === "loading" && <SkeletonRows />}
            {value !== null && tasks.length === 0 && (
              <GroupNote>{t("session.tasks.empty")}</GroupNote>
            )}
            {tasks.length > 0 && recordsShown && (
              <RowList>
                {tasks.map((task) => (
                  <TaskRow
                    key={task.episodeId}
                    task={task}
                    now={now}
                    t={t}
                    terms={[]}
                    pick={null}
                    openSession={null}
                  />
                ))}
              </RowList>
            )}
          </Group>
        </div>
        <div className={layout.paneDetail}>
          {view !== null && current !== undefined ? (
            <ItemDetail
              face={props}
              view={view}
              item={current}
              t={t}
              size="pane"
              onSelect={setSelected}
              onBack={single ? () => setSelected(null) : undefined}
            />
          ) : (
            <EmptyState text={t("detail.none")} />
          )}
        </div>
      </div>
    </div>
  );
}
