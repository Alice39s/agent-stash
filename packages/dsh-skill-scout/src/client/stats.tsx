/**
 * 「历史回溯提炼」页的「统计」分栏（design.md 4.11）：先是一行 KPI（已分析的会话、近 30 天的任务、待你决定的 idea、
 * 已保存的 Skill），然后是全宽的近 30 天每日任务图，两列各自往下排的次要卡片，最后是全宽的最近模型调用表。
 * 两列按同样的顺序排：占比卡（线索、idea 的状态），排行卡（高频动作、反复出现的错误），卡内图表（每天的新线索、
 * 近 7 天的模型用量）；有分析失败的会话时，第二列的排行卡后面多一张列表卡。
 * 每天的新线索与任务数单位不同，按 4.8「一个图只画一个单位」单独画一张图。
 * 高频动作与错误点开后在「搜索」里查；模型调用点开对应的卡片；分析失败的会话可以打开。
 */
import { StateDot, type StateDotState } from "@deepseek-ai/dsh-client-ui-primitives";
import { useCallback, type ReactNode } from "react";
import type { CallLogView, InboxView, StatsView } from "../shared.ts";
import type { ScoutFace } from "./face.ts";
import { absolute, ago, counted, duration } from "./format.ts";
import { useLoaded, useNow } from "./hooks.ts";
import type { ScoutKey, ScoutTranslate } from "./locale.ts";
import {
  ACCENT_COLOR,
  COVERAGE_COLORS,
  formatNumber,
  formatPercent,
  IDEA_COLORS,
  IDEA_ORDER,
  LEAD_COLORS,
  LEAD_ORDER,
  OUTCOME_COLORS,
  OUTCOME_ORDER,
  RankedList,
  ShareBar,
  Sparkline,
  StackedBarArea,
  USAGE_COLORS,
  USAGE_ORDER,
} from "./ui/charts/index.ts";
import { DashCard } from "./ui/dash-card.tsx";
import { DataTable, type DataColumn } from "./ui/data-table.tsx";
import { KpiTile } from "./ui/kpi-tile.tsx";
import { ListRow, RowList } from "./ui/list-row.tsx";
import { Skeleton } from "./ui/skeleton.tsx";
import styles from "./stats.module.css";

interface TabProps {
  readonly face: ScoutFace;
  readonly view: InboxView;
  readonly t: ScoutTranslate;
}

/** 统计页上的图表高度：主图 180，卡片里的图 140。 */
const PRIMARY_HEIGHT = 180;
const CARD_HEIGHT = 140;
/** 带图例的占比条的高度：一行图例与横条。 */
const SHARE_HEIGHT = 36;
/** 表格首次加载时的占位：表头与三行。 */
const TABLE_SKELETON = 30 + 3 * 34;

const DAY = 86_400_000;

/** 自由文字列的最大宽度：模型名与结论。 */
const MODEL_MAX = 160;
const RESULT_MAX = 240;

const USAGE_KEYS = {
  inputTokens: "usage.input",
  cacheReadTokens: "usage.cacheRead",
  cacheWriteTokens: "usage.cacheWrite",
  outputTokens: "usage.output",
} as const satisfies Readonly<Record<(typeof USAGE_ORDER)[number], ScoutKey>>;

/** 按单复数取词的统计文案。 */
type Plural =
  | "kpi.ideas.ready"
  | "kpi.skills.of"
  | "stats.tasks.count"
  | "stats.leads.count"
  | "stats.ideas.count"
  | "stats.failed.count"
  | "stats.usage.total";

/** 按 `count` 取单复数，数字千位分组。 */
function plural(t: ScoutTranslate, key: Plural, count: number): string {
  return t(`${key}.${count === 1 ? "one" : "other"}`, { count: formatNumber(count) });
}

/** `YYYY-MM-DD` 按界面语言写成「10/30」或「10月30日」。 */
function dayLabel(t: ScoutTranslate, day: string): string {
  const [, month = "", date = ""] = day.split("-");
  return t("chart.day", { m: Number(month), d: Number(date) });
}

/** 行里的时间：30 天内写相对时间，更早的写日期。 */
function when(t: ScoutTranslate, at: number, now: number): string {
  return now - at > 30 * DAY
    ? dayLabel(t, new Date(at).toISOString().slice(0, 10))
    : ago(t, at, now);
}

/** 一次调用的结论：idea 数、理由或失败原因。 */
function callResult(t: ScoutTranslate, call: CallLogView): string {
  const result = t(`call.${call.result}`);
  if (call.detail === null) return result;
  if (call.result === "proposed") {
    return t(call.detail === "1" ? "call.ideas.one" : "call.ideas.other", { count: call.detail });
  }
  return t("call.detail", { result, detail: call.detail });
}

/** 调用结论的状态点：给出 idea 与生成草稿是完成，不值得保存是关闭，失败是出错。 */
const CALL_STATE = {
  proposed: "done",
  drafted: "done",
  skipped: "idle",
  failed: "error",
} as const satisfies Readonly<Record<CallLogView["result"], StateDotState>>;

/** 一段只在数据到了以后才画的内容；加载中画同样高度的骨架块。 */
function Loaded({
  stats,
  height,
  children,
}: {
  readonly stats: StatsView | null;
  readonly height: number;
  readonly children: (stats: StatsView) => ReactNode;
}): ReactNode {
  return stats === null ? <Skeleton height={height} shape="block" /> : children(stats);
}

/** 每天结束的任务数。 */
function dailyTotal(day: StatsView["daily"][number]): number {
  return OUTCOME_ORDER.reduce((total, outcome) => total + day[outcome], 0);
}

function sum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** 「已分析的会话」的上下文：全部会话数；还没列出会话时说明尚未列出。 */
function coverageContext(t: ScoutTranslate, coverage: StatsView["coverage"]): string {
  return coverage.total === null
    ? t("stats.unknown")
    : t("kpi.analyzed.of", { total: formatNumber(coverage.total) });
}

/** 「已分析的会话」上下文的提示：历史范围内的会话数、回溯读入的会话数。 */
function coverageDetail(t: ScoutTranslate, coverage: StatsView["coverage"]): string {
  return [
    ...(coverage.inRange === null
      ? []
      : [t("kpi.analyzed.inRange", { count: formatNumber(coverage.inRange) })]),
    t("kpi.analyzed.backfilled", { count: formatNumber(coverage.backfilled) }),
  ].join(" · ");
}

/** 全部会话按分析状态的占比；还没列出会话时没有整体，不画。 */
function CoverageShare({
  coverage,
  t,
}: {
  readonly coverage: StatsView["coverage"];
  readonly t: ScoutTranslate;
}): ReactNode {
  if (coverage.total === null || coverage.total === 0) return null;
  const failed = coverage.failed.length;
  return (
    <ShareBar
      label={t("kpi.analyzed.share")}
      empty={t("stats.unknown")}
      legend={false}
      segments={[
        {
          key: "analyzed",
          label: t("stats.coverage.analyzed"),
          value: coverage.analyzed,
          color: COVERAGE_COLORS.analyzed,
        },
        {
          key: "failed",
          label: t("stats.coverage.failed"),
          value: failed,
          color: COVERAGE_COLORS.failed,
        },
        {
          key: "pending",
          label: t("stats.coverage.pending"),
          value: Math.max(0, coverage.total - coverage.analyzed - failed),
          color: COVERAGE_COLORS.pending,
        },
      ]}
    />
  );
}

function Kpis({
  stats,
  t,
}: {
  readonly stats: StatsView | null;
  readonly t: ScoutTranslate;
}): ReactNode {
  const coverage = stats?.coverage;
  const totals = stats?.daily.map(dailyTotal) ?? [];
  const tasks = sum(totals);
  const verified = sum(stats?.daily.map((day) => day.verified) ?? []);
  const ideas = stats?.funnel.ideas;
  const allIdeas = ideas === undefined ? 0 : sum(IDEA_ORDER.map((state) => ideas[state]));
  const waiting = ideas === undefined ? 0 : ideas.proposed + ideas.ready;

  return (
    <div className={styles.kpis}>
      <KpiTile
        label={t("kpi.analyzed")}
        value={coverage === undefined ? null : formatNumber(coverage.analyzed)}
        {...(coverage === undefined
          ? {}
          : { context: coverageContext(t, coverage), detail: coverageDetail(t, coverage) })}
      >
        {coverage === undefined ? undefined : <CoverageShare coverage={coverage} t={t} />}
      </KpiTile>
      <KpiTile
        label={t("kpi.tasks")}
        value={stats === null ? null : formatNumber(tasks)}
        {...(tasks > 0
          ? { context: t("kpi.tasks.verified", { percent: formatPercent(verified / tasks) }) }
          : {})}
        trend={
          stats === null ? undefined : (
            <Sparkline
              points={stats.daily.map((day, index) => ({
                label: dayLabel(t, day.day),
                value: totals[index] ?? 0,
              }))}
              label={t("stats.tasks")}
              empty={t("chart.trend.empty")}
              width={80}
              height={24}
            />
          )
        }
      />
      <KpiTile
        label={t("kpi.ideas")}
        value={ideas === undefined ? null : formatNumber(waiting)}
        {...(ideas === undefined ? {} : { context: plural(t, "kpi.ideas.ready", ideas.ready) })}
      />
      <KpiTile
        label={t("kpi.skills")}
        value={ideas === undefined ? null : formatNumber(ideas.written)}
        {...(ideas === undefined ? {} : { context: plural(t, "kpi.skills.of", allIdeas) })}
      />
    </div>
  );
}

/** 近 8 周的会话数，最早的在前：每个点是截至 `back` 周前那天的 7 天窗口，最后一个是最近 7 天。 */
function weekPoints(t: ScoutTranslate, weeks: readonly number[]) {
  return weeks.map((value, index) => {
    const back = weeks.length - 1 - index;
    return {
      label:
        back === 0
          ? t("stats.week.current")
          : t("stats.week.range", { from: back * 7, to: back * 7 + 6 }),
      value,
    };
  });
}

interface CardProps {
  readonly stats: StatsView | null;
  readonly face: ScoutFace;
  readonly t: ScoutTranslate;
}

/** 卡片标题行尾侧的数量；加载中不显示。 */
function countOf(
  t: ScoutTranslate,
  stats: StatsView | null,
  key: Plural,
  count: (stats: StatsView) => number,
): { readonly summary?: string } {
  return stats === null ? {} : { summary: plural(t, key, count(stats)) };
}

function LeadShare({ stats, t }: CardProps): ReactNode {
  return (
    <DashCard
      title={t("stats.leads")}
      busy={stats === null}
      {...countOf(t, stats, "stats.leads.count", (loaded) =>
        sum(LEAD_ORDER.map((state) => loaded.funnel.leads[state])),
      )}
    >
      <Loaded stats={stats} height={SHARE_HEIGHT}>
        {(loaded) => (
          <ShareBar
            label={t("stats.leads")}
            empty={t("stats.leads.empty")}
            segments={LEAD_ORDER.map((state) => ({
              key: state,
              label: t(`funnel.lead.${state}`),
              value: loaded.funnel.leads[state],
              color: LEAD_COLORS[state],
            }))}
          />
        )}
      </Loaded>
    </DashCard>
  );
}

function IdeaShare({ stats, t }: CardProps): ReactNode {
  return (
    <DashCard
      title={t("stats.ideas")}
      busy={stats === null}
      {...countOf(t, stats, "stats.ideas.count", (loaded) =>
        sum(IDEA_ORDER.map((state) => loaded.funnel.ideas[state])),
      )}
    >
      <Loaded stats={stats} height={SHARE_HEIGHT}>
        {(loaded) => (
          <ShareBar
            label={t("stats.ideas")}
            empty={t("stats.ideas.empty")}
            segments={IDEA_ORDER.map((state) => ({
              key: state,
              label: t(`funnel.idea.${state}`),
              value: loaded.funnel.ideas[state],
              color: IDEA_COLORS[state],
            }))}
          />
        )}
      </Loaded>
    </DashCard>
  );
}

/** 排行里点一行：在「搜索」里查这段文字。 */
function searchFor(face: ScoutFace, t: ScoutTranslate) {
  return {
    label: (item: { readonly label: string }) => t("stats.searchFor", { text: item.label }),
    onSelect: (item: { readonly label: string }) =>
      face.page.update({ tab: "search", query: item.label }),
  };
}

function Actions({ stats, face, t }: CardProps): ReactNode {
  return (
    <DashCard title={t("stats.actions")} busy={stats === null}>
      <Loaded stats={stats} height={CARD_HEIGHT}>
        {(loaded) => (
          <RankedList
            label={t("stats.actions")}
            empty={t("stats.actions.empty")}
            code
            formatValue={(value) => counted(t, "meta.sessions", value)}
            items={loaded.actions.map((action) => ({
              key: action.key,
              label: action.label,
              value: action.sessions,
              trend: {
                label: t("stats.actions.trend", { label: action.label }),
                points: weekPoints(t, action.weeks),
              },
            }))}
            select={searchFor(face, t)}
          />
        )}
      </Loaded>
    </DashCard>
  );
}

function Errors({ stats, face, t }: CardProps): ReactNode {
  return (
    <DashCard title={t("stats.errors")} busy={stats === null}>
      <Loaded stats={stats} height={CARD_HEIGHT}>
        {(loaded) => (
          <RankedList
            label={t("stats.errors")}
            empty={t("stats.errors.empty")}
            code
            formatValue={(value) => counted(t, "meta.sessions", value)}
            items={loaded.errors.map((error) => ({
              key: error.signature,
              label: error.example,
              value: error.sessions,
            }))}
            select={searchFor(face, t)}
          />
        )}
      </Loaded>
    </DashCard>
  );
}

/** 分析失败的会话：状态点、会话 id、错误与时间，点开打开这个会话；没有失败时不显示。 */
function FailedSessions({ stats, face, t, now }: CardProps & { readonly now: number }): ReactNode {
  const failed = stats?.coverage.failed ?? [];
  if (failed.length === 0) return null;
  const { openSession } = face;
  return (
    <DashCard title={t("stats.failed")} summary={plural(t, "stats.failed.count", failed.length)}>
      <RowList>
        {failed.map((entry) => (
          <ListRow
            key={entry.sessionId}
            variant="item"
            size="pane"
            rowData={{ "data-session": entry.sessionId }}
            marker={<StateDot state="error" />}
            title={entry.sessionId}
            summary={entry.message}
            status={{ word: t("stats.coverage.failed"), ink: "error", shimmer: false }}
            metadata={[
              <span key="time" title={absolute(entry.at, t("chart.locale"))}>
                {when(t, entry.at, now)}
              </span>,
            ]}
            onOpen={openSession === null ? undefined : () => openSession(entry.sessionId)}
          />
        ))}
      </RowList>
    </DashCard>
  );
}

function NewLeads({ stats, t }: CardProps): ReactNode {
  return (
    <DashCard
      title={t("stats.newLeads")}
      busy={stats === null}
      {...countOf(t, stats, "stats.leads.count", (loaded) =>
        sum(loaded.daily.map((day) => day.leads)),
      )}
    >
      <Loaded stats={stats} height={CARD_HEIGHT}>
        {(loaded) => (
          <StackedBarArea
            data={loaded.daily}
            bars={[{ key: "leads", label: t("stats.newLeads.series"), color: ACCENT_COLOR }]}
            label={t("stats.newLeads")}
            empty={t("stats.newLeads.empty")}
            height={CARD_HEIGHT}
            formatDay={(day) => dayLabel(t, day)}
          />
        )}
      </Loaded>
    </DashCard>
  );
}

function Usage({ stats, t }: CardProps): ReactNode {
  return (
    <DashCard
      title={t("stats.usage")}
      busy={stats === null}
      {...countOf(t, stats, "stats.usage.total", (loaded) =>
        sum(loaded.usage.flatMap((day) => USAGE_ORDER.map((kind) => day[kind]))),
      )}
    >
      <Loaded stats={stats} height={CARD_HEIGHT}>
        {(loaded) => {
          const requests = {
            summaries: sum(loaded.usage.map((day) => day.summaries)),
            requested: sum(loaded.usage.map((day) => day.requested)),
            failures: sum(loaded.usage.map((day) => day.failures)),
          };
          return (
            <>
              <StackedBarArea
                data={loaded.usage}
                bars={USAGE_ORDER.map((kind) => ({
                  key: kind,
                  label: t(USAGE_KEYS[kind]),
                  color: USAGE_COLORS[kind],
                }))}
                label={t("stats.usage")}
                empty={t("stats.usage.empty")}
                totalLabel={t("chart.total")}
                height={CARD_HEIGHT}
                formatDay={(day) => dayLabel(t, day)}
              />
              {requests.summaries + requests.requested + requests.failures > 0 && (
                <p className={styles.note}>{t("usage.requests", requests)}</p>
              )}
            </>
          );
        }}
      </Loaded>
    </DashCard>
  );
}

/** 最近的模型调用：条目、阶段、模型、耗时、输入、输出、结论、时间；窄宽度下隐藏阶段、模型与输入。 */
function callColumns(
  t: ScoutTranslate,
  now: number,
): readonly [DataColumn<CallLogView>, ...DataColumn<CallLogView>[]] {
  return [
    {
      key: "item",
      header: t("call.column.item"),
      cell: (call) => (
        <span className={styles.name}>
          <StateDot state={CALL_STATE[call.result]} />
          <span className={styles.nameText}>{call.title}</span>
        </span>
      ),
      text: (call) => call.title,
    },
    {
      key: "stage",
      header: t("call.column.stage"),
      optional: true,
      cell: (call) => <span className={styles.secondary}>{t(`stage.${call.stage}`)}</span>,
      text: (call) => t(`stage.${call.stage}`),
    },
    {
      key: "model",
      header: t("call.column.model"),
      optional: true,
      maxWidth: MODEL_MAX,
      cell: (call) => <span className={styles.secondary}>{call.model}</span>,
      text: (call) => call.model,
      title: (call) => `${call.provider} · ${call.model}`,
    },
    {
      key: "duration",
      header: t("call.column.duration"),
      numeric: true,
      cell: (call) => duration(t, call.durationMs),
      text: (call) => duration(t, call.durationMs),
    },
    {
      key: "input",
      header: t("call.column.input"),
      numeric: true,
      optional: true,
      cell: (call) => formatNumber(inputOf(call)),
      text: (call) => formatNumber(inputOf(call)),
    },
    {
      key: "output",
      header: t("call.column.output"),
      numeric: true,
      cell: (call) => formatNumber(call.outputTokens),
      text: (call) => formatNumber(call.outputTokens),
    },
    {
      key: "result",
      header: t("call.column.result"),
      maxWidth: RESULT_MAX,
      cell: (call) => <span className={styles.secondary}>{callResult(t, call)}</span>,
      text: (call) => callResult(t, call),
    },
    {
      key: "time",
      header: t("call.column.time"),
      cell: (call) => <span className={styles.tertiary}>{when(t, call.at, now)}</span>,
      text: (call) => when(t, call.at, now),
      title: (call) => absolute(call.at, t("chart.locale")),
    },
  ];
}

/** 一次调用读入的全部输入 token：未命中缓存的、缓存读与缓存写。 */
function inputOf(call: CallLogView): number {
  return call.inputTokens + call.cacheReadTokens + call.cacheWriteTokens;
}

function Calls({ stats, face, t, now }: CardProps & { readonly now: number }): ReactNode {
  return (
    <DashCard title={t("stats.calls")} busy={stats === null}>
      <Loaded stats={stats} height={TABLE_SKELETON}>
        {({ calls }) =>
          calls.length === 0 ? (
            <p className={styles.note}>{t("stats.calls.empty")}</p>
          ) : (
            <DataTable
              label={t("stats.calls")}
              rows={calls}
              rowKey={(call) => `${String(call.at)}:${call.itemId}:${call.stage}`}
              onOpen={(call) => face.page.update({ tab: "suggestions", selected: call.itemId })}
              columns={callColumns(t, now)}
            />
          )
        }
      </Loaded>
    </DashCard>
  );
}

export function StatsTab({ face, view, t }: TabProps): ReactNode {
  const { status } = view;
  // 分析、回溯或模型调用有进展时重新读取；重新读取期间保留上一次的结果。
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
  const loaded = useLoaded(load, revision);
  const now = useNow(60_000);
  if (loaded.status === "error") {
    return (
      <p className={styles.error} role="alert">
        {t("stats.error", { error: loaded.error })}
      </p>
    );
  }
  const stats = loaded.status === "ready" ? loaded.value : null;
  const card = { stats, face, t };
  return (
    <div className={styles.dashboard} data-view="stats" aria-busy={stats === null || undefined}>
      <Kpis stats={stats} t={t} />
      <DashCard
        title={t("stats.tasks")}
        busy={stats === null}
        {...countOf(t, stats, "stats.tasks.count", (ready) => sum(ready.daily.map(dailyTotal)))}
      >
        <Loaded stats={stats} height={PRIMARY_HEIGHT}>
          {(ready) => (
            <StackedBarArea
              data={ready.daily}
              bars={OUTCOME_ORDER.map((outcome) => ({
                key: outcome,
                label: t(`outcome.${outcome}`),
                color: OUTCOME_COLORS[outcome],
              }))}
              label={t("stats.tasks")}
              empty={t("stats.tasks.empty")}
              totalLabel={t("chart.total")}
              height={PRIMARY_HEIGHT}
              formatDay={(day) => dayLabel(t, day)}
            />
          )}
        </Loaded>
      </DashCard>
      <div className={styles.columns}>
        <div className={styles.column} data-column="1">
          <LeadShare {...card} />
          <Actions {...card} />
          <NewLeads {...card} />
        </div>
        <div className={styles.column} data-column="2">
          <IdeaShare {...card} />
          <Errors {...card} />
          <FailedSessions {...card} now={now} />
          <Usage {...card} />
        </div>
      </div>
      <Calls {...card} now={now} />
    </div>
  );
}
