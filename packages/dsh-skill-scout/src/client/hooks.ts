/** 订阅 Observable、读取 Host 路由、读取时钟、分栏宽度与「减少动态效果」偏好的 React Hook。 */
import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import type { Action, ActionResult } from "../shared.ts";
import type { Observable } from "./dsh.ts";
import type { ScoutTranslate } from "./locale.ts";
import type { InboxStore, Notice } from "./store.ts";
import { useElementWidth } from "./ui/charts/primitives.tsx";

/** 分栏容器窄于这个宽度时只显示一栏，与 layout.module.css 的 `@container scout-split (max-width: 759px)` 一致。 */
export const SINGLE_PANE_WIDTH = 760;

/** 测量分栏容器（layout.module.css 的 `.page` 或 `.split`），返回它是否窄到只显示一栏。 */
export function useSinglePane<E extends HTMLElement>(): readonly [RefObject<E>, boolean] {
  const [ref, width] = useElementWidth<E>(undefined);
  return [ref, width < SINGLE_PANE_WIDTH];
}

export function useSnapshot<T>(source: Observable<T>): T {
  return useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
}

/** 一次读取的结果。 */
export type Loaded<T> =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly value: T }
  | { readonly status: "error"; readonly error: string };

/** 错误的说明文字。 */
export function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 读取一次，`load` 或 `revision` 变化时重新读取；重新读取期间保留上一次的结果，界面不闪回加载中。
 * `revision` 标识数据可能变了的时机（例如收件箱里的工作状态），原样传给 `load`。
 * 组件卸载或换了读取时，进行中的请求随 AbortSignal 取消。
 */
export function useLoaded<T>(
  load: (revision: string, signal: AbortSignal) => Promise<T>,
  revision: string,
): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ status: "loading" });
  useEffect(() => {
    const controller = new AbortController();
    load(revision, controller.signal).then(
      (value) => {
        if (!controller.signal.aborted) setState({ status: "ready", value });
      },
      (reason: unknown) => {
        if (!controller.signal.aborted) setState({ status: "error", error: errorText(reason) });
      },
    );
    return () => controller.abort();
  }, [load, revision]);
  return state;
}

/** 当前时间，每隔 `interval` 毫秒更新一次。 */
export function useNow(interval: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval);
    return () => clearInterval(timer);
  }, [interval]);
  return now;
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeMotion(listener: () => void): () => void {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
}

/** 系统设置了减少动态效果。 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}

/** 提交操作的忙碌状态与失败说明；操作被拒绝或请求失败时把原因翻译成界面文案。 */
export function useAction(inbox: InboxStore, t: ScoutTranslate) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (action: Action, notice?: Notice): Promise<ActionResult | null> => {
    setBusy(true);
    setError(null);
    try {
      const result = await inbox.act(action, notice);
      if (!result.ok) setError(t(`error.${result.error.kind}`));
      return result;
    } catch (reason) {
      setError(t("error.request", { error: errorText(reason) }));
      return null;
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}
