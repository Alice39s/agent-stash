/**
 * 「历史回溯提炼」页的「搜索」分栏：在插件存的脱敏任务索引里搜索命令、错误行、文件路径、请求与插话。
 * 输入停顿后自动搜索，回车立即搜索；结果可勾选 1 到 12 个任务交给发现模型提炼。
 * 索引默认只含已分析的会话，「回溯 90 天」「回溯全部」在后台读入更早的会话，可暂停。
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import type { InboxView, SearchView, StatusView, TaskView } from "../shared.ts";
import type { ScoutFace } from "./face.ts";
import { useAction, useLoaded, useNow, useSnapshot } from "./hooks.ts";
import type { ScoutTranslate } from "./locale.ts";
import { TaskRow, termsOf } from "./tasks.tsx";
import layout from "./layout.module.css";
import styles from "./search.module.css";

/** 一次搜索最多显示的任务数。 */
const LIMIT = 50;
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

/** 回溯更早的会话：两个范围的按钮，进行中显示真实进度与暂停、继续。 */
function Backfill({
  face,
  status,
  t,
}: {
  readonly face: ScoutFace;
  readonly status: StatusView;
  readonly t: ScoutTranslate;
}): ReactNode {
  const { busy, error, run } = useAction(face.inbox, t);
  const backfill = status.backfill;
  const failed =
    backfill !== null && backfill.failed > 0
      ? t("backfill.failed", { count: backfill.failed })
      : null;
  const active = backfill !== null && backfill.state !== "done";
  return (
    <div className={styles.backfill}>
      {active && (
        <div
          className={styles.meter}
          role="progressbar"
          aria-label={t("backfill.progress")}
          aria-valuemin={0}
          aria-valuemax={backfill.total}
          aria-valuenow={backfill.done}
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
      <p className={styles.backfillText} role="status">
        {backfill === null
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
                })}
        {failed !== null && <span className={styles.failed}>{failed}</span>}
      </p>
      <span className={layout.spacer} />
      {active ? (
        backfill.state === "paused" ? (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run({ action: "backfill", range: backfill.range })}
          >
            {t("backfill.resume")}
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
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
            variant="outline"
            disabled={busy}
            onClick={() => void run({ action: "backfill", range: "90d" })}
          >
            {t("backfill.90d")}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void run({ action: "backfill", range: "all" })}
          >
            {t("backfill.all")}
          </Button>
        </>
      )}
      {error !== null && (
        <p className={layout.error} role="alert">
          {error}
        </p>
      )}
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
  const load = useCallback(
    (_revision: string, signal: AbortSignal): Promise<SearchView | null> =>
      q === "" ? Promise.resolve(null) : search({ q, outcome: nav.outcome, limit: LIMIT }, signal),
    [search, q, nav.outcome],
  );
  // 回溯读入新任务后重新搜索。
  const result = useLoaded(load, String(view.status.analyzed.episodes));
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
    // 选中 Host 返回的线索；它已有 idea 时，页面按线索 id 落到第一个 idea。
    page.update({ picked: [], tab: "suggestions", selected: sent.leadId ?? null });
  };
  const full = nav.picked.length >= PICK_LIMIT;

  return (
    <div className={styles.search} data-view="search">
      <div className={styles.controls}>
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
        <select
          className={styles.select}
          aria-label={t("search.outcome")}
          value={nav.outcome ?? ""}
          onChange={(event) =>
            page.update({
              outcome: OUTCOMES.find((outcome) => outcome === event.target.value) ?? null,
            })
          }
        >
          <option value="">{t("search.outcome.all")}</option>
          {OUTCOMES.map((outcome) => (
            <option key={outcome} value={outcome}>
              {t(`outcome.${outcome}`)}
            </option>
          ))}
        </select>
      </div>
      <p className={layout.note}>
        {t("search.scope", {
          sessions: t(
            indexed.sessions === 1 ? "search.scope.sessions.one" : "search.scope.sessions.other",
            { count: indexed.sessions },
          ),
          tasks: t(indexed.episodes === 1 ? "search.scope.tasks.one" : "search.scope.tasks.other", {
            count: indexed.episodes,
          }),
        })}
      </p>
      <Backfill face={face} status={view.status} t={t} />
      {nav.picked.length > 0 && (
        <div className={styles.picked}>
          <span>{t("search.picked", { count: nav.picked.length })}</span>
          {full && <span className={layout.note}>{t("search.limit", { count: PICK_LIMIT })}</span>}
          <span className={layout.spacer} />
          <Button size="sm" variant="ghost" onClick={() => page.update({ picked: [] })}>
            {t("search.clear")}
          </Button>
          <Button
            size="sm"
            variant="primary"
            disabled={busy || view.status.models.summary === null}
            onClick={() => void extract()}
          >
            {t("search.extract")}
          </Button>
        </div>
      )}
      {error !== null && (
        <p className={layout.error} role="alert">
          {error}
        </p>
      )}
      {result.status === "error" && (
        <p className={layout.error} role="alert">
          {t("search.error", { error: result.error })}
        </p>
      )}
      {found !== null && (
        <section className={layout.group} aria-label={t("search.label")}>
          <p className={layout.note} role="status">
            {found.hits.length === 0
              ? t("search.empty")
              : found.total > found.hits.length
                ? t("search.totalShown", { total: found.total, count: found.hits.length })
                : t(found.total === 1 ? "search.total.one" : "search.total.other", {
                    total: found.total,
                  })}
          </p>
          {found.hits.length > 0 && (
            <ul className={layout.tasks}>
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
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
