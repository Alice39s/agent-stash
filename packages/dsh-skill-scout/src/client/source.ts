/**
 * 按需加载的快照源：第一个订阅者出现时加载，之后只在 `reload` 时重新加载。
 * 加载失败由 `load` 自己写入错误状态；抛出的异常记为最后一次的失败。
 */
import type { Observable } from "./dsh.ts";

export interface SnapshotSource<T> extends Observable<T> {
  reload(): void;
}

export function createSnapshotSource<T>(
  initial: T,
  load: (set: (value: T) => void) => Promise<void>,
): SnapshotSource<T> {
  let value = initial;
  let loaded = false;
  let generation = 0;
  const listeners = new Set<() => void>();
  const run = (): void => {
    loaded = true;
    const current = ++generation;
    const set = (next: T): void => {
      if (current !== generation) return;
      value = next;
      for (const listener of listeners) listener();
    };
    load(set).catch(() => set(initial));
  };
  return {
    getSnapshot: () => value,
    subscribe(listener) {
      listeners.add(listener);
      if (!loaded) run();
      return () => {
        listeners.delete(listener);
      };
    },
    reload() {
      if (loaded) run();
    },
  };
}
