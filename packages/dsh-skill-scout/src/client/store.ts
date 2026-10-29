/**
 * 收件箱的浏览器端状态：所有会话标题栏里的入口共用一份。
 * Host 没有向插件推送事件的通道，状态靠读取刷新：有订阅者时定时读取（复核或分析进行中更频繁），
 * 页面重新获得焦点、连接重建与每次操作之后立即读取。页面隐藏时暂停定时读取。
 */
import type { Action, ActionResult, InboxView } from "../shared.ts";
import type { Observable } from "./dsh.ts";
import type { ScoutKey } from "./locale.ts";

/** 进行中时的读取间隔。 */
const BUSY_INTERVAL = 3_000;
/** 空闲时的读取间隔。 */
const IDLE_INTERVAL = 45_000;
/** 操作提示停留的时间。 */
const NOTICE_TTL = 8_000;

/** 一次操作之后的提示，可选带一个撤销操作。 */
export interface Notice {
  readonly key: ScoutKey;
  readonly params: Readonly<Record<string, string>>;
  readonly undo: Action | null;
}

export interface InboxState {
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly inbox: InboxView | null;
  readonly error: string | null;
  readonly notice: Notice | null;
}

/** 收件箱依赖的读取与写入；测试里换成本地实现。 */
export interface InboxTransport {
  readonly fetchInbox: () => Promise<InboxView>;
  readonly postAction: (action: Action) => Promise<ActionResult>;
}

export interface InboxStore extends Observable<InboxState> {
  /** 立即读取一次。 */
  refresh(): Promise<void>;
  /** 提交操作；成功时可附带提示。返回 Host 的结果。 */
  act(action: Action, notice?: Notice): Promise<ActionResult>;
  /** 关闭提示。 */
  clearNotice(): void;
  /** 停止计时器与监听。 */
  dispose(): void;
}

const INITIAL: InboxState = { status: "idle", inbox: null, error: null, notice: null };

/** 有后台工作正在进行：分析、复核，或写入后核对 DSH 能否发现。 */
function busy(inbox: InboxView | null): boolean {
  return (
    inbox !== null &&
    (inbox.status.scanning ||
      inbox.status.reviewing !== null ||
      inbox.items.some((item) => item.write?.checking === true))
  );
}

/**
 * 创建收件箱状态。
 * @param transport - 读取与写入 Host 路由的函数。
 */
export function createInboxStore(transport: InboxTransport): InboxStore {
  let state = INITIAL;
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let noticeTimer: ReturnType<typeof setTimeout> | undefined;
  let generation = 0;

  const set = (next: InboxState): void => {
    state = next;
    for (const listener of listeners) listener();
  };

  const schedule = (): void => {
    clearTimeout(timer);
    if (listeners.size === 0) return;
    timer = setTimeout(
      () => {
        if (document.visibilityState === "hidden") schedule();
        else void refresh();
      },
      busy(state.inbox) ? BUSY_INTERVAL : IDLE_INTERVAL,
    );
  };

  async function refresh(): Promise<void> {
    const current = ++generation;
    if (state.inbox === null) set({ ...state, status: "loading", error: null });
    try {
      const inbox = await transport.fetchInbox();
      if (current === generation) set({ ...state, status: "ready", inbox, error: null });
    } catch (error) {
      if (current === generation) {
        set({
          ...state,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      if (current === generation) schedule();
    }
  }

  const onFocus = (): void => {
    if (listeners.size > 0) void refresh();
  };

  const showNotice = (notice: Notice | null): void => {
    clearTimeout(noticeTimer);
    set({ ...state, notice });
    if (notice !== null)
      noticeTimer = setTimeout(() => set({ ...state, notice: null }), NOTICE_TTL);
  };

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener);
      if (listeners.size === 1) {
        window.addEventListener("focus", onFocus);
        void refresh();
      }
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          window.removeEventListener("focus", onFocus);
          clearTimeout(timer);
        }
      };
    },
    refresh,
    async act(action, notice) {
      const result = await transport.postAction(action);
      generation += 1;
      set({ ...state, status: "ready", inbox: result.inbox, error: null });
      if (result.ok && notice !== undefined) showNotice(notice);
      schedule();
      return result;
    },
    clearNotice() {
      showNotice(null);
    },
    dispose() {
      clearTimeout(timer);
      clearTimeout(noticeTimer);
      window.removeEventListener("focus", onFocus);
      listeners.clear();
    },
  };
}
