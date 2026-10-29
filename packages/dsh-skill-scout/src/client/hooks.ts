/** 订阅 Observable 的 React Hook。 */
import { useSyncExternalStore } from "react";
import type { Observable } from "./dsh.ts";

export function useSnapshot<T>(source: Observable<T>): T {
  return useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
}
