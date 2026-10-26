/**
 * 组件共用的 React Hook。Hook 都定义在模块顶层，组件每次渲染调用的是同一个函数。
 */
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import type { Observable } from "./dsh.ts";

/** 订阅一份不可变快照；快照引用变化时组件重新渲染。服务端渲染（组件测试）读同一份快照。 */
export function useSnapshot<T>(store: Observable<T>): T {
  const subscribe = useCallback((listener: () => void) => store.subscribe(listener), [store]);
  const getSnapshot = useCallback(() => store.getSnapshot(), [store]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/** 每隔 `intervalMs` 更新一次的当前时间，供相对时间显示；渲染期间不直接读时钟。 */
export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}
