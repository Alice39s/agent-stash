/**
 * 「历史回溯提炼」页的位置：哪个分栏、「建议」里选中哪张卡片、「搜索」的条件与勾选的任务。
 * 页面、标题栏入口、会话 Tab 与提示共用一份；页面关掉再打开时回到上次的位置。
 */
import type { TaskView } from "../shared.ts";
import type { Observable } from "./dsh.ts";

export type PageTab = "suggestions" | "search" | "stats";

export interface PageState {
  readonly tab: PageTab;
  /** 「建议」里选中的卡片。 */
  readonly selected: string | null;
  /** 从页面外选中、要滚到可见处并高亮一次的卡片；页面处理后清空。 */
  readonly reveal: string | null;
  readonly query: string;
  /** 只看某种结果的任务；null 是全部。 */
  readonly outcome: TaskView["outcome"] | null;
  /** 搜索结果里勾选、准备提炼的任务。 */
  readonly picked: readonly string[];
}

export interface PageStore extends Observable<PageState> {
  update(patch: Partial<PageState>): void;
}

export const INITIAL_PAGE: PageState = {
  tab: "suggestions",
  selected: null,
  reveal: null,
  query: "",
  outcome: null,
  picked: [],
};

export function createPageStore(initial: PageState = INITIAL_PAGE): PageStore {
  let state = initial;
  const listeners = new Set<() => void>();
  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(patch) {
      state = { ...state, ...patch };
      for (const listener of listeners) listener();
    },
  };
}
