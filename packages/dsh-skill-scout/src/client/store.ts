/**
 * 收件箱的浏览器端状态：标题栏入口、会话 Tab 与「历史回溯提炼」页共用一份。
 * Host 没有向插件推送事件的通道，状态靠读取刷新：有订阅者时定时读取（模型调用、分析或回溯进行中更频繁），
 * 页面重新获得焦点与连接重建时立即读取，每次操作之后几秒内再读一次。页面隐藏时暂停定时读取。
 * 读取时发现某张卡片的模型请求结束了，而它不在任何打开的详情里，就发出带「查看」的提示。
 */
import type { Action, ActionResult, InboxView, ItemView } from "../shared.ts";
import type { Observable } from "./dsh.ts";
import { inFlight, titleOf } from "./format.ts";
import type { ScoutKey } from "./locale.ts";

/** 模型正在写摘要或草稿时的读取间隔：回复一到，界面在一秒内换掉进行中的占位。 */
const MODEL_INTERVAL = 1_000;
/** 分析会话、回溯或核对写入时的读取间隔。 */
const BUSY_INTERVAL = 3_000;
/** 空闲时的读取间隔。 */
const IDLE_INTERVAL = 45_000;
/** 提示停留的时间。 */
const NOTICE_TTL = 8_000;

/** 一条提示，可选带撤销操作或「查看」要打开的卡片。 */
export interface Notice {
  readonly key: ScoutKey;
  readonly params: Readonly<Record<string, string>>;
  readonly undo: Action | null;
  /** 「查看」打开的卡片 id。 */
  readonly view: string | null;
}

export interface InboxState {
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly inbox: InboxView | null;
  readonly error: string | null;
  readonly notice: Notice | null;
  /** 打开的详情正在显示的卡片。 */
  readonly viewing: readonly string[];
  /** 「历史回溯提炼」页开着：提示显示在页面里，标题栏不再弹出。 */
  readonly paged: boolean;
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
  /** 详情开始显示一张卡片；返回停止显示的函数。 */
  watch(id: string): () => void;
  /** 页面开始承接提示；返回交还的函数。 */
  hostNotices(): () => void;
  /** 停止计时器与监听。 */
  dispose(): void;
}

const INITIAL: InboxState = {
  status: "idle",
  inbox: null,
  error: null,
  notice: null,
  viewing: [],
  paged: false,
};

/**
 * 下一次读取的间隔：模型调用进行中最短；分析会话、回溯或写入后核对 DSH 能否发现时居中；其余时候最长。
 * @internal 导出供测试使用。
 */
export function pollInterval(inbox: InboxView | null): number {
  if (inbox === null) return IDLE_INTERVAL;
  if (inbox.status.working > 0) return MODEL_INTERVAL;
  const backfill = inbox.status.backfill?.state;
  if (
    inbox.status.scanning ||
    backfill === "listing" ||
    backfill === "running" ||
    inbox.items.some((item) => item.write?.checking === true)
  ) {
    return BUSY_INTERVAL;
  }
  return IDLE_INTERVAL;
}

/** 请求结束后会提示的状态。 */
const SETTLED = new Set<ItemView["state"]>(["proposed", "skipped", "ready", "failed"]);

/** 一次请求的结果：结束后的卡片，以及摘要给出的 idea 数。 */
interface Finished {
  readonly item: ItemView;
  readonly ideas: number;
}

/**
 * 上一份收件箱里在等模型、这一份里结束了的卡片。线索的摘要给出 idea 后，原来的线索卡片换成 idea 卡片，
 * 结果记在第一个 idea 上。正在详情里显示的卡片不算：用户就在看着它。
 * @internal 导出供测试使用。
 */
export function finishedItems(
  before: InboxView | null,
  after: InboxView,
  viewing: readonly string[],
): Finished[] {
  if (before === null) return [];
  const results: Finished[] = [];
  for (const previous of before.items) {
    if (!inFlight(previous) || viewing.includes(previous.id)) continue;
    const same = after.items.find((entry) => entry.id === previous.id);
    const ideas =
      same === undefined && previous.ideaIndex === null
        ? after.items.filter(
            (entry) => entry.leadId === previous.leadId && entry.ideaIndex !== null,
          )
        : [];
    const next = same ?? ideas[0];
    if (next === undefined || !SETTLED.has(next.state) || viewing.includes(next.id)) continue;
    results.push({ item: next, ideas: ideas.length });
  }
  return results;
}

/** 请求结束的提示；同时结束几条时只说条数，「查看」打开第一条。 */
function finishedNotice(results: readonly Finished[]): Notice | null {
  const [first] = results;
  if (first === undefined) return null;
  if (results.length > 1) {
    return {
      key: "notice.done.many",
      params: { count: String(results.length) },
      undo: null,
      view: first.item.id,
    };
  }
  const { item, ideas } = first;
  const title = titleOf(item);
  let key: ScoutKey;
  if (item.state === "proposed") key = ideas > 1 ? "notice.done.ideas" : "notice.done.proposed";
  else if (item.state === "skipped") key = "notice.done.skipped";
  else if (item.state === "ready") key = "notice.done.ready";
  else key = item.failure?.stage === "draft" ? "notice.done.draftFailed" : "notice.done.failed";
  return { key, params: { title, count: String(ideas) }, undo: null, view: item.id };
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
  /** 每张卡片被几个详情显示着。 */
  const watching = new Map<string, number>();
  let hosts = 0;

  const set = (next: InboxState): void => {
    state = next;
    for (const listener of listeners) listener();
  };

  /** 安排下一次读取；`soon` 时最多等忙碌间隔，用于操作之后 Host 还在收尾的情形。 */
  const schedule = (soon = false): void => {
    clearTimeout(timer);
    if (listeners.size === 0) return;
    const interval = pollInterval(state.inbox);
    timer = setTimeout(
      () => {
        if (document.visibilityState === "hidden") schedule();
        else void refresh();
      },
      soon ? Math.min(interval, BUSY_INTERVAL) : interval,
    );
  };

  const showNotice = (notice: Notice | null): void => {
    clearTimeout(noticeTimer);
    set({ ...state, notice });
    if (notice !== null)
      noticeTimer = setTimeout(() => set({ ...state, notice: null }), NOTICE_TTL);
  };

  /** 换上新的收件箱；有请求结束时发出提示。 */
  const receive = (inbox: InboxView): void => {
    const notice = finishedNotice(finishedItems(state.inbox, inbox, state.viewing));
    set({ ...state, status: "ready", inbox, error: null });
    if (notice !== null) showNotice(notice);
  };

  async function refresh(): Promise<void> {
    const current = ++generation;
    if (state.inbox === null) set({ ...state, status: "loading", error: null });
    try {
      const inbox = await transport.fetchInbox();
      if (current === generation) receive(inbox);
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
      receive(result.inbox);
      if (result.ok && notice !== undefined) showNotice(notice);
      // 暂停回溯时正在读的会话还会读完，分析会话也可能在返回后才结束：几秒后再读一次。
      schedule(true);
      return result;
    },
    clearNotice() {
      showNotice(null);
    },
    watch(id) {
      watching.set(id, (watching.get(id) ?? 0) + 1);
      set({ ...state, viewing: [...watching.keys()] });
      return () => {
        const count = (watching.get(id) ?? 1) - 1;
        if (count === 0) watching.delete(id);
        else watching.set(id, count);
        set({ ...state, viewing: [...watching.keys()] });
      };
    },
    hostNotices() {
      hosts += 1;
      set({ ...state, paged: true });
      return () => {
        hosts -= 1;
        set({ ...state, paged: hosts > 0 });
      };
    },
    dispose() {
      clearTimeout(timer);
      clearTimeout(noticeTimer);
      window.removeEventListener("focus", onFocus);
      listeners.clear();
    },
  };
}
