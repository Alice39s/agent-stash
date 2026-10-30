/**
 * 「历史回溯提炼」页的「搜索」分区（design 3.5）：在插件存的脱敏任务索引里搜索命令、错误行、文件路径、
 * 请求与插话。输入停顿后自动搜索，回车立即搜索；结果按结果筛选，可勾选 1 到 12 个任务交给发现模型提炼，
 * 勾选后底部出现固定的选择栏。索引默认只含已分析的会话，「回溯 90 天」「回溯全部」在后台读入更早的会话。
 */
import {
  Button,
  IconCloseOutlineRegular,
  IconSearchOutlineRegular,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { InboxView, SearchView, StatusView, TaskView } from "../shared.ts";
import type { ScoutFace } from "./face.ts";
import { useAction, useLoaded, useNow, useSnapshot } from "./hooks.ts";
import type { ScoutTranslate } from "./locale.ts";
import { TaskRow, termsOf } from "./tasks.tsx";
import { ActionButton } from "./ui/action-button.tsx";
import { EmptyState } from "./ui/empty-state.tsx";
import { IconButton } from "./ui/icon-button.tsx";
import { RowList } from "./ui/list-row.tsx";
import { ErrorNotice } from "./ui/notice.tsx";
import { SkeletonRows } from "./ui/skeleton.tsx";
import styles from "./search.module.css";

/** 一次读入的任务数；「显示更多」每次再读这么多。 */
const PAGE = 50;
/** Host 一次最多返回的任务数。 */
const MAX_LIMIT = 200;
/** 一次最多提炼的任务数，与 Host 的校验一致。 */
export const PICK_LIMIT = 12;
/** 输入停顿多久后搜索。 */
const DEBOUNCE = 250;

const OUTCOMES: readonly TaskView["outcome"][] = [
  "verified",
  "succeeded",
  "unverified",
  "disputed",
  "failed",
  "aborted",
];

interface TabProps {
  readonly face: ScoutFace;
  readonly view: InboxView;
  readonly t: ScoutTranslate;
}

/** 索引覆盖的范围，以及回溯更早会话的进度与操作。 */
function Scope({
  face,
  status,
  indexed,
  t,
}: {
  readonly face: ScoutFace;
  readonly status: StatusView;
  readonly indexed: SearchView["indexed"];
  readonly t: ScoutTranslate;
}): ReactNode {
  const { busy, error, run } = useAction(face.inbox, t);
  const backfill = status.backfill;
  const active = backfill !== null && backfill.state !== "done";
  const scope = t("search.scope", {
    sessions: t(
      indexed.sessions === 1 ? "search.scope.sessions.one" : "search.scope.sessions.other",
      { count: indexed.sessions },
    ),
    tasks: t(indexed.episodes === 1 ? "search.scope.tasks.one" : "search.scope.tasks.other", {
      count: indexed.episodes,
    }),
  });
  const progress =
    backfill === null
      ? null
      : backfill.state === "listing"
        ? t("backfill.listing")
        : backfill.state === "done"
          ? t(backfill.done === 1 ? "backfill.done.one" : "backfill.done.other", {
              done: backfill.done,
            })
          : t(backfill.state === "paused" ? "backfill.paused" : "backfill.running", {
              done: backfill.done,
              total: backfill.total,
            });
  return (
    <div className={styles.scope}>
      <div className={styles.scopeLine}>
        <p className={styles.scopeText} role="status">
          <span className={styles.scopeItem}>{scope}</span>
          {progress !== null && <span className={styles.scopeItem}>{progress}</span>}
          {backfill !== null && backfill.failed > 0 && (
            <span className={styles.scopeItem} data-ink="error">
              {t("backfill.failed", { count: backfill.failed })}
            </span>
          )}
        </p>
        <span className={styles.scopeActions}>
          {active ? (
            backfill.state === "paused" ? (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void run({ action: "backfill", range: backfill.range })}
              >
                {t("backfill.resume")}
              </Button>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void run({ action: "backfill-pause" })}
              >
                {t("backfill.pause")}
              </Button>
            )
          ) : (
            <>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void run({ action: "backfill", range: "90d" })}
              >
                {t("backfill.90d")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void run({ action: "backfill", range: "all" })}
              >
                {t("backfill.all")}
              </Button>
            </>
          )}
        </span>
      </div>
      {/* 列出会话阶段还不知道总数：不给 now 与 max，按不确定进度处理，避免 max 等于 min。 */}
      {active && (
        <div
          className={styles.meter}
          role="progressbar"
          aria-label={t("backfill.progress")}
          {...(backfill.total > 0
            ? {
                "aria-valuemin": 0,
                "aria-valuemax": backfill.total,
                "aria-valuenow": backfill.done,
              }
            : {})}
        >
          <span
            className={styles.meterFill}
            style={{
              width:
                backfill.total === 0 ? "0%" : `${String((backfill.done / backfill.total) * 100)}%`,
            }}
          />
        </div>
      )}
      {error !== null && <ErrorNotice text={error} />}
    </div>
  );
}

export function SearchTab({ face, view, t }: TabProps): ReactNode {
  const { page, search } = face;
  const nav = useSnapshot(page);
  const now = useNow(60_000);
  const { busy, error, run } = useAction(face.inbox, t);

  // 输入停顿后才搜索；回车直接把当前输入定下来。
  const [settled, setSettled] = useState(nav.query);
  useEffect(() => {
    if (nav.query === settled) return undefined;
    const timer = setTimeout(() => setSettled(nav.query), DEBOUNCE);
    return () => clearTimeout(timer);
  }, [nav.query, settled]);

  const q = settled.trim();
  /** 「显示更多」读到的条数，只对同一组条件有效。 */
  const [more, setMore] = useState({ key: "", limit: PAGE });
  const conditions = `${q}\n${nav.outcome ?? ""}`;
  const limit = more.key === conditions ? more.limit : PAGE;
  const [retried, setRetried] = useState(0);
  const load = useCallback(
    (_revision: string, signal: AbortSignal): Promise<SearchView | null> =>
      q === "" ? Promise.resolve(null) : search({ q, outcome: nav.outcome, limit }, signal),
    [search, q, nav.outcome, limit],
  );
  // 回溯读入新任务后、或用户重试时重新搜索；新的搜索进行中保留上一次的结果。
  const result = useLoaded(load, `${String(view.status.analyzed.episodes)}:${String(retried)}`);
  const found = result.status === "ready" ? result.value : null;
  const terms = termsOf(q);
  const indexed = found?.indexed ?? view.status.analyzed;

  /** 勾选或取消一个任务；按 store 里最新的勾选计算，连续点击不会丢。 */
  const toggle = (episodeId: string, checked: boolean): void => {
    const { picked } = page.getSnapshot();
    page.update({
      picked: checked ? [...picked, episodeId] : picked.filter((id) => id !== episodeId),
    });
  };
  const extract = async (): Promise<void> => {
    const sent = await run({ action: "extract-selected", episodeIds: [...nav.picked] });
    if (sent?.ok !== true) return;
    // 打开 Host 返回的线索；它已有 idea 时，页面按线索 id 落到第一个 idea。
    const lead = sent.leadId ?? null;
    page.update({ picked: [], tab: "suggestions", selected: lead, reveal: lead });
  };
  const full = nav.picked.length >= PICK_LIMIT;

  return (
    <div className={styles.search} data-view="search">
      <div className={styles.query}>
        <div className={styles.field}>
          <IconSearchOutlineRegular size={14} />
          <input
            type="search"
            className={styles.input}
            aria-label={t("search.label")}
            placeholder={t("search.placeholder")}
            value={nav.query}
            onChange={(event) => page.update({ query: event.target.value })}
            onKeyDown={(event) => {
              if (event.key === "Enter") setSettled(nav.query);
            }}
          />
          {nav.query !== "" && (
            <IconButton
              label={t("search.clearQuery")}
              onClick={() => {
                page.update({ query: "" });
                setSettled("");
              }}
            >
              <IconCloseOutlineRegular size={14} />
            </IconButton>
          )}
        </div>
        <div className={styles.chips} role="group" aria-label={t("search.outcome")}>
          {[null, ...OUTCOMES].map((outcome) => (
            <button
              key={outcome ?? "all"}
              type="button"
              className={styles.chip}
              aria-pressed={nav.outcome === outcome}
              onClick={() => page.update({ outcome })}
            >
              {outcome === null ? t("search.outcome.all") : t(`outcome.${outcome}`)}
            </button>
          ))}
        </div>
      </div>
      <Scope face={face} status={view.status} indexed={indexed} t={t} />
      {error !== null && <ErrorNotice text={error} />}
      {result.status === "error" && (
        <ErrorNotice
          text={t("search.error", { error: result.error })}
          retry={{ label: t("panel.retry"), onClick: () => setRetried((count) => count + 1) }}
        />
      )}
      {q !== "" && found === null && result.status === "loading" && <SkeletonRows />}
      {found !== null && found.hits.length === 0 && (
        <EmptyState text={t("search.empty", { query: found.query })} />
      )}
      {found !== null && found.hits.length > 0 && (
        <section
          className={styles.results}
          aria-label={t("search.results")}
          aria-busy={result.status === "loading" || undefined}
        >
          <p className={styles.count} role="status">
            {found.total > found.hits.length
              ? t("search.totalShown", { total: found.total, count: found.hits.length })
              : t(found.total === 1 ? "search.total.one" : "search.total.other", {
                  total: found.total,
                })}
          </p>
          <RowList>
            {found.hits.map((task) => {
              const checked = nav.picked.includes(task.episodeId);
              return (
                <TaskRow
                  key={task.episodeId}
                  task={task}
                  now={now}
                  t={t}
                  terms={terms}
                  pick={{
                    checked,
                    disabled: !checked && full,
                    onChange: (next) => toggle(task.episodeId, next),
                  }}
                  openSession={face.openSession}
                />
              );
            })}
          </RowList>
          {found.total > found.hits.length && limit < MAX_LIMIT && (
            <button
              type="button"
              className={styles.more}
              onClick={() => setMore({ key: conditions, limit: Math.min(MAX_LIMIT, limit + PAGE) })}
            >
              {t("search.more")}
            </button>
          )}
        </section>
      )}
      {nav.picked.length > 0 && (
        <div className={styles.selection} role="region" aria-label={t("search.selection")}>
          <p className={styles.selectionCount}>
            <span>{t("search.picked", { count: nav.picked.length })}</span>
            {full && (
              <span className={styles.selectionLimit}>
                {t("search.limit", { count: PICK_LIMIT })}
              </span>
            )}
          </p>
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => page.update({ picked: [] })}
          >
            {t("search.clear")}
          </Button>
          <ActionButton
            variant="primary"
            label={t("search.extract")}
            busyLabel={t("search.extracting")}
            busy={busy}
            unavailable={view.status.models.summary === null ? t("detail.noSummaryModel") : null}
            onClick={() => void extract()}
          />
        </div>
      )}
    </div>
  );
}
