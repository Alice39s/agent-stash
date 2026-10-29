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

/** 卡片标题：模型标题，未复核时用用户请求。 */
export function titleOf(item: ItemView): string {
  return item.title ?? item.goal;
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
  readonly ready: readonly ItemView[];
  readonly found: readonly ItemView[];
  readonly history: readonly ItemView[];
}

/** 按状态分组：可保存、本地发现（含复核中与失败）、历史。 */
export function groupItems(items: readonly ItemView[]): Groups {
  return {
    ready: items.filter((item) => item.state === "ready"),
    found: items.filter(
      (item) => item.state === "detected" || item.state === "reviewing" || item.state === "failed",
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
