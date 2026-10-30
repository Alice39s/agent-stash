/**
 * 注入到各个 Slot 组件的共享对象：收件箱、页面位置、Host 路由与宿主动作。
 * 标题栏入口、会话 Tab 与「历史回溯提炼」页拿到的是同一份。
 */
import type { DetailView, SearchView, SessionView, StatsView } from "../shared.ts";
import type { SearchQuery } from "./api.ts";
import type { ScoutTranslate } from "./locale.ts";
import type { PageStore } from "./navigation.ts";
import type { SeenStore } from "./seen.ts";
import type { InboxStore } from "./store.ts";

export interface ScoutFace {
  readonly inbox: InboxStore;
  readonly page: PageStore;
  readonly seen: SeenStore;
  readonly loadDetail: (id: string, signal: AbortSignal) => Promise<DetailView>;
  readonly loadSession: (sessionId: string, signal: AbortSignal) => Promise<SessionView>;
  readonly search: (query: SearchQuery, signal: AbortSignal) => Promise<SearchView>;
  readonly loadStats: (signal: AbortSignal) => Promise<StatsView>;
  readonly openSession: ((sessionId: string) => void) | null;
  /** 在主区域打开「历史回溯提炼」页。 */
  readonly openPage: () => void;
}

/** Slot 组件收到的属性：共享对象加翻译函数。 */
export type FaceProps = ScoutFace & { readonly t: ScoutTranslate };

/** 打开页面的「建议」分栏并选中一张卡片，页面把它滚到可见处并高亮一次。 */
export function showItem(face: Pick<ScoutFace, "page" | "openPage">, id: string | null): void {
  face.page.update({ tab: "suggestions", selected: id, reveal: id });
  face.openPage();
}
