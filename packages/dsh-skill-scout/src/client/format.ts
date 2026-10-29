/** 界面上的时间、数量与状态文案。 */
import type { ItemView } from "../shared.ts";
import type { ScoutTranslate } from "./locale.ts";

const MINUTE = 60_000;
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

/** 「N 个会话」。 */
export function sessionCount(t: ScoutTranslate, count: number): string {
  return t(count === 1 ? "meta.sessions.one" : "meta.sessions.other", { count });
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

/** 模型正在处理这条建议。 */
export function inFlight(item: ItemView): boolean {
  return item.state === "summarizing" || item.state === "drafting";
}

/** 一行元信息：信号类型 · 会话数 · 时间。 */
export function metaOf(t: ScoutTranslate, item: ItemView, now: number): string {
  return [
    t(`kind.${item.kind}`),
    sessionCount(t, item.occurrences),
    ago(t, item.updatedAt, now),
  ].join(" · ");
}

/** 收件箱分组。 */
export interface Groups {
  /** 等用户决定的：摘要等待同意、草稿生成中、草稿可以保存。 */
  readonly review: readonly ItemView[];
  /** 本地规则发现、还没有摘要的，含摘要进行中与失败。 */
  readonly found: readonly ItemView[];
  readonly history: readonly ItemView[];
}

/** 失败在草稿阶段的建议仍有摘要，留在待决定的分组里。 */
function draftFailed(item: ItemView): boolean {
  return item.state === "failed" && item.failure?.stage === "draft";
}

/** 等用户决定的建议：标题栏的数字只数这些。 */
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

/** 把 `~` 开头之外的长路径缩短到末尾几段。 */
export function shortPath(path: string): string {
  const parts = path.split("/");
  return parts.length <= 4 ? path : `…/${parts.slice(-4).join("/")}`;
}
