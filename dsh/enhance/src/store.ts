import { useSyncExternalStore } from "react";

/** 一个可订阅的值；`same` 判断为相同时不通知。 */
export interface ValueStore<T> {
  readonly get: () => T;
  readonly set: (next: T) => void;
  readonly subscribe: (listener: () => void) => () => void;
}

export function createValueStore<T>(
  initial: T,
  same: (left: T, right: T) => boolean = Object.is,
): ValueStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set(next) {
      if (same(value, next)) return;
      value = next;
      for (const listener of listeners) listener();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** 在组件里读取一个订阅源的当前值。 */
export function useValue<T>(store: Pick<ValueStore<T>, "get" | "subscribe">): T {
  return useSyncExternalStore(store.subscribe, store.get);
}
