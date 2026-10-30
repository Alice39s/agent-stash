/**
 * 「历史回溯提炼」页的「统计」分栏：覆盖率与分析失败的会话、任务结果分布、线索与 idea 的漏斗、
 * 跨会话的高频动作与反复出现的错误（点开在「搜索」里查）、近 7 天的模型用量与最近的模型调用（点开对应卡片）。
 * 图表都是按比例宽度的横条，不依赖图表库。
 */
import { Button } from "@deepseek-ai/dsh-client-ui-primitives";
import { useCallback, type ReactNode } from "react";
import type { CallLogView, InboxView, StatsView } from "../shared.ts";
import type { ScoutFace } from "./face.ts";
import { ago, compact, counted, duration } from "./format.ts";
import { useLoaded, useNow } from "./hooks.ts";
import type { ScoutKey, ScoutTranslate } from "./locale.ts";
import layout from "./layout.module.css";
import styles from "./stats.module.css";

interface TabProps {
  readonly face: ScoutFace;
  readonly view: InboxView;
  readonly t: ScoutTranslate;
}

/** 占比，0 到 100。 */
function percent(value: number, total: number): string {
  return total <= 0 ? "0%" : `${String(Math.min(100, (value / total) * 100))}%`;
}

/** 一条按比例分段的横条；每段一个 data-segment 便于样式着色。 */
function Bar({
  segments,
  total,
}: {
  readonly segments: readonly { readonly key: string; readonly value: number }[];
  readonly total: number;
}): ReactNode {
  return (
    <span className={styles.bar} aria-hidden="true">
      {segments
        .filter((segment) => segment.value > 0)
        .map((segment) => (
          <span
            key={segment.key}
            className={styles.segment}
            data-segment={segment.key}
            style={{ width: percent(segment.value, total) }}
          />
        ))}
    </span>
  );
}

/** 统计里的一块卡片；`wide` 时占满整行。 */
function Section({
  title,
  wide = false,
  children,
}: {
  readonly title: string;
  readonly wide?: boolean;
  readonly children: ReactNode;
}): ReactNode {
  return (
    <section className={styles.card} aria-label={title} data-wide={wide || undefined}>
      <h3 className={styles.title}>{title}</h3>
      {children}
    </section>
  );
}

const OUTCOMES = ["verified", "succeeded", "unverified", "disputed", "failed", "aborted"] as const;

const FUNNEL = [
  "leads",
  "summarized",
  "skipped",
  "ideas",
  "drafted",
  "written",
  "dismissed",
] as const;

const USAGE = ["inputTokens", "cacheReadTokens", "cacheWriteTokens", "outputTokens"] as const;

const USAGE_KEYS: Readonly<Record<(typeof USAGE)[number], ScoutKey>> = {
  inputTokens: "usage.input",
  cacheReadTokens: "usage.cacheRead",
  cacheWriteTokens: "usage.cacheWrite",
  outputTokens: "usage.output",
};

/** 一次调用的结论：idea 数、理由或失败原因。 */
function callResult(t: ScoutTranslate, call: CallLogView): string {
  const result = t(`call.${call.result}`);
  if (call.detail === null) return result;
  if (call.result === "proposed") {
    return t(call.detail === "1" ? "call.ideas.one" : "call.ideas.other", { count: call.detail });
  }
  return t("call.detail", { result, detail: call.detail });
}

function Coverage({
  stats,
  face,
  t,
  now,
}: {
  readonly stats: StatsView;
  readonly face: ScoutFace;
  readonly t: ScoutTranslate;
  readonly now: number;
}): ReactNode {
  const { coverage } = stats;
  const base = coverage.total ?? coverage.inRange ?? coverage.analyzed;
  const figures: readonly [ScoutKey, number | null][] = [
    ["stats.coverage.analyzed", coverage.analyzed],
    ["stats.coverage.inRange", coverage.inRange],
    ["stats.coverage.total", coverage.total],
    ["stats.coverage.backfilled", coverage.backfilled],
  ];
  return (
    <Section title={t("stats.coverage")}>
      <dl className={styles.figures}>
        {figures.map(([key, value]) => (
          <div key={key} className={styles.figure}>
            <dt>{t(key)}</dt>
            <dd>{value === null ? t("stats.unknown") : value}</dd>
          </div>
        ))}
      </dl>
      <Bar segments={[{ key: "analyzed", value: coverage.analyzed }]} total={base} />
      {coverage.failed.length > 0 && (
        <>
          <h4 className={styles.subtitle}>{t("stats.failed")}</h4>
          <ul className={styles.rows}>
            {coverage.failed.map((entry) => (
              <li key={entry.sessionId} className={styles.row} data-session={entry.sessionId}>
                <span className={styles.rowMain}>
                  <code className={styles.mono}>{entry.sessionId}</code>
                  <span className={styles.rowNote}>{entry.message}</span>
                </span>
                <span className={styles.rowMeta}>{ago(t, entry.at, now)}</span>
                {face.openSession !== null && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => face.openSession?.(entry.sessionId)}
                  >
                    {t("detail.openSession")}
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  );
}

function Outcomes({
  stats,
  t,
}: {
  readonly stats: StatsView;
  readonly t: ScoutTranslate;
}): ReactNode {
  const total = OUTCOMES.reduce((sum, outcome) => sum + stats.outcomes[outcome], 0);
  return (
    <Section title={t("stats.outcomes")}>
      <Bar
        segments={OUTCOMES.map((outcome) => ({ key: outcome, value: stats.outcomes[outcome] }))}
        total={total}
      />
      <ul className={styles.legend}>
        {OUTCOMES.map((outcome) => (
          <li key={outcome} data-segment={outcome}>
            <span className={styles.swatch} aria-hidden="true" />
            <span>{t(`outcome.${outcome}`)}</span>
            <span className={styles.count}>{stats.outcomes[outcome]}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Funnel({
  stats,
  t,
}: {
  readonly stats: StatsView;
  readonly t: ScoutTranslate;
}): ReactNode {
  const top = Math.max(stats.funnel.leads, stats.funnel.ideas);
  return (
    <Section title={t("stats.funnel")}>
      <ul className={styles.funnel}>
        {FUNNEL.map((step) => (
          <li key={step} className={styles.step} data-step={step}>
            <span className={styles.stepLabel}>{t(`funnel.${step}`)}</span>
            <Bar segments={[{ key: step, value: stats.funnel[step] }]} total={top} />
            <span className={styles.count}>{stats.funnel[step]}</span>
          </li>
        ))}
      </ul>
    </Section>
  );
}

/** 高频动作与反复出现的错误：点开后在「搜索」里查这段文字。 */
function Patterns({
  stats,
  face,
  t,
}: {
  readonly stats: StatsView;
  readonly face: ScoutFace;
  readonly t: ScoutTranslate;
}): ReactNode {
  const find = (text: string): void => face.page.update({ tab: "search", query: text });
  const list = (
    entries: readonly { readonly key: string; readonly text: string; readonly sessions: number }[],
  ): ReactNode =>
    entries.length === 0 ? (
      <p className={layout.note}>{t("stats.empty")}</p>
    ) : (
      <ul className={styles.rows}>
        {entries.map((entry) => (
          <li key={entry.key}>
            <button
              type="button"
              className={styles.rowButton}
              aria-label={t("stats.searchFor", { text: entry.text })}
              onClick={() => find(entry.text)}
            >
              <code className={styles.mono}>{entry.text}</code>
              <span className={styles.rowMeta}>{counted(t, "meta.sessions", entry.sessions)}</span>
            </button>
          </li>
        ))}
      </ul>
    );
  return (
    <>
      <Section title={t("stats.actions")}>
        {list(
          stats.actions.map((action) => ({
            key: action.key,
            text: action.label,
            sessions: action.sessions,
          })),
        )}
      </Section>
      <Section title={t("stats.errors")}>
        {list(
          stats.errors.map((error) => ({
            key: error.signature,
            text: error.example,
            sessions: error.sessions,
          })),
        )}
      </Section>
    </>
  );
}

function Usage({ stats, t }: { readonly stats: StatsView; readonly t: ScoutTranslate }): ReactNode {
  const totals = stats.usage.map((day) => USAGE.reduce((sum, key) => sum + day[key], 0));
  const top = Math.max(0, ...totals);
  return (
    <Section title={t("stats.usage")}>
      <ul className={styles.legend}>
        {USAGE.map((key) => (
          <li key={key} data-segment={key}>
            <span className={styles.swatch} aria-hidden="true" />
            <span>{t(USAGE_KEYS[key])}</span>
          </li>
        ))}
      </ul>
      <ul className={styles.days}>
        {stats.usage.map((day, index) => (
          <li key={day.day} className={styles.day} data-day={day.day}>
            <span className={styles.dayLabel}>{day.day.slice(5)}</span>
            <Bar segments={USAGE.map((key) => ({ key, value: day[key] }))} total={top} />
            {/* 没有请求的日子只留日期与空条。 */}
            {totals[index] === 0 && day.summaries + day.requested + day.failures === 0 ? null : (
              <>
                <span className={styles.dayFigures}>
                  {USAGE.map((key) => `${t(USAGE_KEYS[key])} ${compact(day[key])}`).join(" · ")}
                </span>
                <span className={styles.rowMeta}>
                  {t("usage.requests", {
                    summaries: day.summaries,
                    requested: day.requested,
                    failures: day.failures,
                  })}
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

function Calls({
  stats,
  face,
  t,
  now,
}: {
  readonly stats: StatsView;
  readonly face: ScoutFace;
  readonly t: ScoutTranslate;
  readonly now: number;
}): ReactNode {
  return (
    <Section title={t("stats.calls")} wide>
      {stats.calls.length === 0 ? (
        <p className={layout.note}>{t("stats.empty")}</p>
      ) : (
        <ul className={styles.rows}>
          {stats.calls.map((call) => (
            <li key={`${String(call.at)}:${call.itemId}:${call.stage}`}>
              <button
                type="button"
                className={styles.rowButton}
                data-result={call.result}
                onClick={() => face.page.update({ tab: "suggestions", selected: call.itemId })}
              >
                <span className={styles.rowMain}>
                  <span className={styles.callTitle}>{call.title}</span>
                  <span className={styles.rowNote}>{callResult(t, call)}</span>
                </span>
                <span className={styles.rowMeta}>
                  {[
                    t(`stage.${call.stage}`),
                    call.model,
                    duration(t, call.durationMs),
                    t("call.tokens", {
                      input: compact(
                        call.inputTokens + call.cacheReadTokens + call.cacheWriteTokens,
                      ),
                      output: compact(call.outputTokens),
                    }),
                    ago(t, call.at, now),
                  ].join(" · ")}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

export function StatsTab({ face, view, t }: TabProps): ReactNode {
  const { status } = view;
  // 分析、回溯或模型调用有进展时重新读取。
  const revision = [
    status.analyzed.sessions,
    status.analyzed.episodes,
    status.working,
    status.usage.summaries,
    status.usage.requested,
    status.backfill?.done ?? 0,
  ].join(":");
  const { loadStats } = face;
  const load = useCallback(
    (_revision: string, signal: AbortSignal) => loadStats(signal),
    [loadStats],
  );
  const stats = useLoaded(load, revision);
  const now = useNow(60_000);
  if (stats.status === "loading") {
    return (
      <p className={layout.note} role="status">
        {t("panel.loading")}
      </p>
    );
  }
  if (stats.status === "error") {
    return (
      <p className={layout.error} role="alert">
        {t("stats.error", { error: stats.error })}
      </p>
    );
  }
  const value = stats.value;
  return (
    <div className={styles.grid} data-view="stats">
      <Coverage stats={value} face={face} t={t} now={now} />
      <Outcomes stats={value} t={t} />
      <Funnel stats={value} t={t} />
      <Patterns stats={value} face={face} t={t} />
      <Usage stats={value} t={t} />
      <Calls stats={value} face={face} t={t} now={now} />
    </div>
  );
}
