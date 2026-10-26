import { useEffect, useState } from "react";
import { promptDay, type PromptDay } from "../prompts.ts";

/** 远端列表与它加载完成的时刻，日期标签以此为“今天”。 */
export interface RemoteList<T> {
  readonly items: readonly T[];
  readonly loadedAt: number;
}

/**
 * 读取远端列表：`key` 变化时重新加载，组件卸载或重新加载时取消旧请求。
 * 失败时保留上一次的列表，并把带来源的错误写进控制台。
 */
export function useRemoteList<T>(
  label: string,
  load: (signal: AbortSignal) => Promise<readonly T[]>,
  key: string,
): RemoteList<T> {
  const [list, setList] = useState<RemoteList<T>>({ items: [], loadedAt: 0 });
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal).then(
      (items) => setList({ items, loadedAt: Date.now() }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error(`[${label}] loading prompt history failed:`, error);
      },
    );
    return () => controller.abort();
    // `load` 随渲染重建，刷新时机只由 `key` 决定。
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return list;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** 24 小时制的 `HH:MM`。 */
export function clockTime(time: number): string {
  const date = new Date(time);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 日期标签：今天、昨天或 `MM-DD`。 */
export function dayLabel(
  day: PromptDay,
  words: { readonly today: string; readonly yesterday: string },
): string {
  if (day.kind === "today") return words.today;
  if (day.kind === "yesterday") return words.yesterday;
  const date = new Date(day.time);
  return `${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** 相对现在的日期标签。 */
export function relativeDay(
  time: number,
  now: number,
  words: { readonly today: string; readonly yesterday: string },
): string {
  return dayLabel(promptDay(time, now), words);
}

/** 两位数补零的 `当前 / 总数` 计数。 */
export function counter(current: number, total: number): string {
  return `${pad(current)} / ${pad(total)}`;
}
