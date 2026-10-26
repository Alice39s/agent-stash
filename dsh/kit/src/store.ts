import { useSyncExternalStore } from "react";
import { DEFAULT_APPEARANCE, sameAppearance, type Appearance } from "./appearance.ts";
import type { AppearanceStore } from "./service.ts";

/** 可写的外观订阅源；值不变时不通知。 */
export interface WritableAppearanceStore extends AppearanceStore {
  readonly set: (next: Appearance) => void;
}

export function createAppearanceStore(
  initial: Appearance = DEFAULT_APPEARANCE,
): WritableAppearanceStore {
  let current = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => current,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      if (sameAppearance(current, next)) return;
      current = next;
      for (const listener of listeners) listener();
    },
  };
}

/** 在组件里读取外观，配置变化时重新渲染。 */
export function useAppearance(store: AppearanceStore): Appearance {
  return useSyncExternalStore(store.subscribe, store.get);
}
