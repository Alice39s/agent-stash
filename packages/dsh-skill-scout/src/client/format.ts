/** 界面上的时间、数量与状态文案，以及卡片的分组与查找。 */
import type { StateDotState } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ItemView, ProgressView, TaskView } from "../shared.ts";
import type { ScoutTranslate } from "./locale.ts";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 绝对时间的格式：中等日期与短时间，统计表格与行的 `title` 共用。 */
const DATE_TIME = { dateStyle: "medium", timeStyle: "short" } as const;

/** 相对时间：刚刚、N 分钟前、N 小时前、N 天前。 */
export function ago(t: ScoutTranslate, at: number, now: number): string {
  const elapsed = Math.max(0, now - at);
  if (elapsed < MINUTE) return t("time.now");
  if (elapsed < HOUR) return t("time.minutes", { count: Math.floor(elapsed / MINUTE) });
  if (elapsed < DAY) return t("time.hours", { count: Math.floor(elapsed / HOUR) });
  return t("time.days", { count: Math.floor(elapsed / DAY) });
}

/** 一段时长：N 秒、N 分 N 秒，秒数不补零（design 6 的 `{s}s`、`{m}m {s}s`）。 */
export function duration(t: ScoutTranslate, ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / SECOND);
  if (seconds < 60) return t("duration.seconds", { seconds });
  return t("duration.minutes", {
    minutes: Math.floor(seconds / 60),
    seconds: seconds % 60,
  });
}

const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });

/** token 数一类的大数：1.2K、3.4M。 */
export function compact(value: number): string {
  return COMPACT.format(value);
}

/** 按单复数取词的数量文案。 */
export type Countable = "meta.sessions" | "task.commands" | "task.edits" | "task.recoveries";

/** 「N 个会话」「N 条命令」一类的数量。 */
export function counted(t: ScoutTranslate, key: Countable, count: number): string {
  return t(`${key}.${count === 1 ? "one" : "other"}`, { count });
}

/** 卡片标题：摘要里的标题，还没有摘要时用用户请求。 */
export function titleOf(item: ItemView): string {
  return item.title ?? item.goal;
}

/** 状态文案；失败按阶段区分。 */
export function stateLabel(t: ScoutTranslate, item: Pick<ItemView, "state" | "failure">): string {
  return item.state === "failed" && item.failure?.stage === "draft"
    ? t("state.draftFailed")
    : t(`state.${item.state}`);
}

/** 模型正在处理这张卡片。 */
export function inFlight(item: ItemView): boolean {
  return item.state === "summarizing" || item.state === "drafting";
}

/** 状态词的墨色：次要、更淡，或错误色。 */
export type StatusInk = "secondary" | "tertiary" | "error";
/** 行标题的墨色。 */
export type TitleInk = "primary" | "secondary" | "tertiary";

/** 一行的状态：标记列的状态点、元信息行开头的状态词与它的墨色、标题的墨色。 */
export interface RowStatus {
  readonly dot: StateDotState;
  readonly word: string;
  readonly ink: StatusInk;
  /** 进行中：状态词带扫光。 */
  readonly shimmer: boolean;
  readonly title: TitleInk;
}

/**
 * 状态类别：待你决定、进行中、失败、完成、未开始、已结束，以及结果不明（未验证、已取消）。
 * 每一类对应一种状态点、状态词墨色与标题墨色。
 */
type StatusClass = "decision" | "working" | "failed" | "done" | "notStarted" | "closed" | "unknown";

const CLASS_STYLE: Readonly<Record<StatusClass, Omit<RowStatus, "word">>> = {
  decision: { dot: "warning", ink: "secondary", shimmer: false, title: "primary" },
  working: { dot: "ongoing", ink: "tertiary", shimmer: true, title: "primary" },
  failed: { dot: "error", ink: "error", shimmer: false, title: "primary" },
  done: { dot: "done", ink: "secondary", shimmer: false, title: "primary" },
  notStarted: { dot: "idle", ink: "tertiary", shimmer: false, title: "secondary" },
  closed: { dot: "idle", ink: "tertiary", shimmer: false, title: "tertiary" },
  unknown: { dot: "idle", ink: "tertiary", shimmer: false, title: "primary" },
};

/** 卡片：摘要或草稿等你同意、模型在写、失败、已保存、尚未摘要、不值得保存或已忽略。 */
const ITEM_CLASS: Readonly<Record<ItemView["state"], StatusClass>> = {
  proposed: "decision",
  ready: "decision",
  summarizing: "working",
  drafting: "working",
  failed: "failed",
  written: "done",
  detected: "notStarted",
  skipped: "closed",
  dismissed: "closed",
};

/** 任务结果：检查通过与已完成算正面，用户表示不对算有争议，失败算负面，未验证与已取消不明。 */
const OUTCOME_CLASS: Readonly<Record<TaskView["outcome"], StatusClass>> = {
  verified: "done",
  succeeded: "done",
  disputed: "decision",
  failed: "failed",
  unverified: "unknown",
  aborted: "unknown",
};

export function itemStatus(
  t: ScoutTranslate,
  item: Pick<ItemView, "state" | "failure">,
): RowStatus {
  return { ...CLASS_STYLE[ITEM_CLASS[item.state]], word: stateLabel(t, item) };
}

export function taskStatus(t: ScoutTranslate, outcome: TaskView["outcome"]): RowStatus {
  return { ...CLASS_STYLE[OUTCOME_CLASS[outcome]], word: t(`outcome.${outcome}`) };
}

/** 命令序列在列表行里只显示的前几步。 */
export const SEQUENCE_SHOWN = 3;

/** 命令序列的一行写法：前三步，以及其余步数。 */
export function sequenceOf(steps: readonly string[]): {
  readonly shown: readonly string[];
  readonly more: number;
} {
  return {
    shown: steps.slice(0, SEQUENCE_SHOWN),
    more: Math.max(0, steps.length - SEQUENCE_SHOWN),
  };
}

/** 绝对时间，放在相对时间的 `title` 里：按界面语言（`chart.locale`）写，与统计表格同一套格式。 */
export function absolute(at: number, locale: string): string {
  return new Date(at).toLocaleString(locale, DATE_TIME);
}

/** 来源与规模：线索来源 · 会话数 · 同名折叠数。 */
export function sourceOf(t: ScoutTranslate, item: ItemView): string {
  return [
    t(`kind.${item.kind}`),
    counted(t, "meta.sessions", item.occurrences),
    ...(item.merged > 0 ? [t("meta.merged", { count: item.merged })] : []),
  ].join(" · ");
}

/** 元信息的各项：来源、会话数、同名折叠数、时间；界面用「 · 」隔开。 */
export function metaItems(t: ScoutTranslate, item: ItemView, now: number): string[] {
  return [
    t(`kind.${item.kind}`),
    counted(t, "meta.sessions", item.occurrences),
    ...(item.merged > 0 ? [t("meta.merged", { count: item.merged })] : []),
    ago(t, item.updatedAt, now),
  ];
}

/** 模型请求此刻在做什么。 */
export function phaseLabel(t: ScoutTranslate, progress: ProgressView): string {
  return progress.phase === "writing"
    ? t(progress.chars === 1 ? "phase.writing.one" : "phase.writing.other", {
        count: progress.chars,
      })
    : t(`phase.${progress.phase}`);
}

/** 收件箱分组。 */
export interface Groups {
  /** 等用户决定的：摘要等待同意、草稿生成中、草稿可以保存。 */
  readonly review: readonly ItemView[];
  /** 本地规则发现、还没有摘要的，含摘要进行中与失败。 */
  readonly found: readonly ItemView[];
  readonly history: readonly ItemView[];
}

/** 失败在草稿阶段的 idea 仍有摘要，留在待决定的分组里。 */
function draftFailed(item: ItemView): boolean {
  return item.state === "failed" && item.failure?.stage === "draft";
}

/** 等用户决定的卡片：标题栏的数字只数这些。 */
export function needsReview(item: ItemView): boolean {
  return (
    item.state === "proposed" ||
    item.state === "drafting" ||
    item.state === "ready" ||
    draftFailed(item)
  );
}

/** 按状态分组：待决定、本地发现、历史。 */
export function groupItems(items: readonly ItemView[]): Groups {
  return {
    review: items.filter(needsReview),
    found: items.filter(
      (item) =>
        item.state === "detected" ||
        item.state === "summarizing" ||
        (item.state === "failed" && !draftFailed(item)),
    ),
    history: items.filter(
      (item) => item.state === "written" || item.state === "skipped" || item.state === "dismissed",
    ),
  };
}

/**
 * 找到选中的卡片。线索的摘要给出 idea 后，线索卡片换成 idea 卡片，选中落到它的第一个 idea；
 * idea 被重新摘要、回到线索卡片时，落到线索上。
 */
export function resolveItem(items: readonly ItemView[], id: string | null): ItemView | undefined {
  if (id === null) return undefined;
  const exact = items.find((item) => item.id === id);
  if (exact !== undefined) return exact;
  const lead = id.split("~")[0];
  return (
    items.find((item) => item.leadId === lead && item.ideaIndex !== null) ??
    items.find((item) => item.id === lead)
  );
}

/** 卡片的证据里有这个会话。 */
export function cites(item: ItemView, sessionId: string): boolean {
  return item.sessions.some((ref) => ref.sessionId === sessionId);
}

/** 证据里有这个会话的卡片。 */
export function citing(items: readonly ItemView[], sessionId: string): ItemView[] {
  return items.filter((item) => cites(item, sessionId));
}

/** 把 `~` 开头之外的长路径缩短到末尾几段。 */
export function shortPath(path: string): string {
  const parts = path.split("/");
  return parts.length <= 4 ? path : `…/${parts.slice(-4).join("/")}`;
}
