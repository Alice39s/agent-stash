/**
 * 最小的快照 store：快照不可变，更新即替换引用，订阅者在每次替换后收到通知。
 * 组件经 `useSnapshot`（`hooks.ts`）订阅。
 */
import type { Observable } from "./dsh.ts";

/** 可写的快照 store。 */
export interface SnapshotStore<T> extends Observable<T> {
  /** 用 `next` 根据当前快照算出新快照；返回同一个引用时不通知订阅者。 */
  update(next: (current: T) => T): void;
}

export function createSnapshotStore<T>(initial: T): SnapshotStore<T> {
  let snapshot = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(next) {
      const value = next(snapshot);
      if (Object.is(value, snapshot)) return;
      snapshot = value;
      for (const listener of listeners) listener();
    },
  };
}
