/** 界面上的时间、数量与状态文案，以及卡片的分组与查找。 */
import type { ItemView, ProgressView } from "../shared.ts";
import type { ScoutTranslate } from "./locale.ts";

const SECOND = 1_000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** 相对时间：刚刚、N 分钟前、N 小时前、N 天前。 */
export function ago(t: ScoutTranslate, at: number, now: number): string {
  const elapsed = Math.max(0, now - at);
  if (elapsed < MINUTE) return t("time.now");
  if (elapsed < HOUR) return t("time.minutes", { count: Math.floor(elapsed / MINUTE) });
  if (elapsed < DAY) return t("time.hours", { count: Math.floor(elapsed / HOUR) });
  return t("time.days", { count: Math.floor(elapsed / DAY) });
}

/** 一段时长：N 秒、N 分 N 秒。 */
export function duration(t: ScoutTranslate, ms: number): string {
  const seconds = Math.floor(Math.max(0, ms) / SECOND);
  if (seconds < 60) return t("duration.seconds", { seconds });
  return t("duration.minutes", {
    minutes: Math.floor(seconds / 60),
    seconds: String(seconds % 60).padStart(2, "0"),
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
export function stateLabel(t: ScoutTranslate, item: ItemView): string {
  return item.state === "failed" && item.failure?.stage === "draft"
    ? t("state.draftFailed")
    : t(`state.${item.state}`);
}

/** 模型正在处理这张卡片。 */
export function inFlight(item: ItemView): boolean {
  return item.state === "summarizing" || item.state === "drafting";
}

/** 来源与规模：线索来源 · 会话数 · 同名折叠数。 */
export function sourceOf(t: ScoutTranslate, item: ItemView): string {
  return [
    t(`kind.${item.kind}`),
    counted(t, "meta.sessions", item.occurrences),
    ...(item.merged > 0 ? [t("meta.merged", { count: item.merged })] : []),
  ].join(" · ");
}

/** 一行元信息：来源与规模 · 时间。 */
export function metaOf(t: ScoutTranslate, item: ItemView, now: number): string {
  return `${sourceOf(t, item)} · ${ago(t, item.updatedAt, now)}`;
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

/** 证据里有这个会话的卡片。 */
export function citing(items: readonly ItemView[], sessionId: string): ItemView[] {
  return items.filter((item) => item.sessions.some((ref) => ref.sessionId === sessionId));
}

/** 把 `~` 开头之外的长路径缩短到末尾几段。 */
export function shortPath(path: string): string {
  const parts = path.split("/");
  return parts.length <= 4 ? path : `…/${parts.slice(-4).join("/")}`;
}
