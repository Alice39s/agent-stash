/**
 * 一个会话的时间线控制器：持有时间线快照，跟随会话变化刷新，并提交版本操作。
 * 同一会话的时间线视图、标题栏控件与消息动作按钮共用一个控制器。
 */
import type {
  CascadePolicy,
  EditableMessageBlock,
  MessageEditOperation,
  MessageEditTimeline,
  VersionOperation,
} from "../shared.ts";
import { fetchTimeline, postOperation } from "./api.ts";
import type { ClientContext, Observable, SessionListState, SessionSnapshot } from "./dsh.ts";
import { createSnapshotStore } from "./store.ts";

/** 一阵连续的会话变化合并成一次刷新。 */
const REFRESH_DELAY_MS = 300;

const NOOP = (): void => {};

/** 控制器快照，三个界面表面共用。 */
export interface MessageEditState {
  readonly status: "idle" | "loading" | "ready" | "error";
  readonly error: string | null;
  readonly pending: VersionOperation | null;
  readonly timeline: MessageEditTimeline | null;
}

/** 通过 Slot `inject` 交给组件的注入面；组件解构后直接调用，各成员不依赖 `this`。 */
export interface MessageEditFace {
  /** 控制器快照，组件用 `useSnapshot` 订阅。 */
  readonly store: Observable<MessageEditState>;
  /** 组件挂载时登记使用，返回的函数在卸载时注销；有使用者时才跟随会话刷新。 */
  readonly acquire: () => () => void;
  readonly load: () => void;
  readonly edit: (
    block: EditableMessageBlock,
    text: string,
    cascade: CascadePolicy,
  ) => Promise<boolean>;
  readonly retry: (turn: number, cascade: CascadePolicy) => Promise<boolean>;
  readonly reroll: () => Promise<boolean>;
  readonly openVersion: (sessionId: string) => void;
}

const INITIAL_STATE: MessageEditState = {
  status: "idle",
  error: null,
  pending: null,
  timeline: null,
};

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/**
 * 与 `sessionId` 同属一棵版本树的会话及其父子关系，序列化成一个字符串；
 * 版本树增删会话或改变父子关系时它才会变化。
 */
export function lineageRevision(list: SessionListState, sessionId: string): string {
  const rootOf = (id: string): string => {
    const seen = new Set<string>();
    let cursor = id;
    while (!seen.has(cursor)) {
      seen.add(cursor);
      const parent = list.byId[cursor]?.parentId;
      if (parent === undefined || list.byId[parent] === undefined) return cursor;
      cursor = parent;
    }
    return cursor;
  };
  const root = rootOf(sessionId);
  return list.ids
    .filter((id) => rootOf(id) === root)
    .toSorted()
    .map((id) => `${id}>${list.byId[id]?.parentId ?? ""}`)
    .join("|");
}

/** 会话快照里能反映回合开始与结束的字段。 */
export function sessionRevision(snapshot: SessionSnapshot): string {
  return [snapshot.running, snapshot.openState, snapshot.removed].join("|");
}

/** 打开一个会话：0.1.0-rc.3 用 `sessions.open`，0.2.1 用 `uiWorkspace.openSession`。 */
export function openSession(ctx: ClientContext, sessionId: string): void {
  if (ctx.sessions.open !== undefined) {
    ctx.sessions.open(sessionId);
    return;
  }
  const workspace = ctx.get("uiWorkspace");
  if (workspace === undefined) {
    throw new Error(`cannot open session ${sessionId}: neither sessions.open nor uiWorkspace`);
  }
  workspace.openSession(sessionId);
}

/** 会话出现在 Host 会话列表里之后再打开它，避免打开一个列表还不认识的会话。 */
function openWhenListed(ctx: ClientContext, sessionId: string): () => void {
  const listed = (): boolean => ctx.sessions.list.getSnapshot().ids.includes(sessionId);
  if (listed()) {
    openSession(ctx, sessionId);
    return NOOP;
  }
  const unsubscribe = ctx.sessions.list.subscribe(() => {
    if (!listed()) return;
    unsubscribe();
    openSession(ctx, sessionId);
  });
  return unsubscribe;
}

export interface MessageEditController {
  readonly face: MessageEditFace;
  /** 连接重建后，已经载入过的时间线重新拉取。 */
  refreshIfLoaded(): void;
}

export function createMessageEditController(
  ctx: ClientContext,
  sessionId: string,
): MessageEditController {
  const store = createSnapshotStore(INITIAL_STATE);
  let users = 0;
  let generation = 0;
  let inflight: AbortController | null = null;
  let rerun = false;
  let stopObserving: (() => Promise<void>) | null = null;
  const navigations = new Set<() => void>();

  const patch = (next: Partial<MessageEditState>): void => {
    store.update((state) => ({ ...state, ...next }));
  };

  const load = (): void => {
    if (inflight !== null) {
      rerun = true;
      return;
    }
    const abort = new AbortController();
    const current = ++generation;
    inflight = abort;
    patch({ status: "loading", error: null });
    fetchTimeline(sessionId, abort.signal)
      .then(
        (timeline) => {
          if (current === generation) patch({ status: "ready", error: null, timeline });
        },
        (error: unknown) => {
          if (current === generation) patch({ status: "error", error: messageOf(error) });
        },
      )
      .finally(() => {
        if (inflight === abort) inflight = null;
        if (rerun && users > 0) {
          rerun = false;
          load();
        }
      });
  };

  /** 跟随版本树与会话进展刷新；返回的函数撤销全部订阅与计时器。 */
  const observe = (): (() => void) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = (): void => {
      if (timer !== undefined || store.getSnapshot().status === "idle") return;
      timer = setTimeout(() => {
        timer = undefined;
        load();
      }, REFRESH_DELAY_MS);
    };

    let lineage = lineageRevision(ctx.sessions.list.getSnapshot(), sessionId);
    let session: Observable<SessionSnapshot> | undefined;
    let progress = "";
    let unsubscribeSession = NOOP;

    /** 会话打开、关闭或换了绑定对象时，改订新的会话快照。 */
    const bindSession = (): void => {
      const next = ctx.sessions.binding(sessionId)?.session;
      if (next === session) return;
      unsubscribeSession();
      session = next;
      if (next === undefined) {
        progress = "";
        unsubscribeSession = NOOP;
        return;
      }
      progress = sessionRevision(next.getSnapshot());
      unsubscribeSession = next.subscribe(() => {
        const revision = sessionRevision(next.getSnapshot());
        if (revision === progress) return;
        progress = revision;
        schedule();
      });
    };
    bindSession();
    const unsubscribeList = ctx.sessions.list.subscribe(() => {
      bindSession();
      const revision = lineageRevision(ctx.sessions.list.getSnapshot(), sessionId);
      if (revision === lineage) return;
      lineage = revision;
      schedule();
    });

    return () => {
      if (timer !== undefined) clearTimeout(timer);
      unsubscribeList();
      unsubscribeSession();
      for (const cancel of navigations) cancel();
      navigations.clear();
      generation += 1;
      inflight?.abort();
      inflight = null;
      rerun = false;
    };
  };

  const mutate = async (operation: MessageEditOperation): Promise<boolean> => {
    const state = store.getSnapshot();
    if (state.pending !== null || state.status !== "ready") return false;
    patch({ pending: operation.action, error: null });
    try {
      const result = await postOperation(operation);
      patch({ pending: null });
      navigations.add(openWhenListed(ctx, result.sessionId));
      return true;
    } catch (error) {
      patch({ pending: null, error: messageOf(error) });
      return false;
    }
  };

  const face: MessageEditFace = {
    store,
    acquire() {
      users += 1;
      if (users === 1) {
        stopObserving = ctx.effect(observe, `message-edit: observe ${sessionId}`);
        load();
      }
      let released = false;
      return () => {
        if (released) return;
        released = true;
        users -= 1;
        if (users > 0) return;
        const stop = stopObserving;
        stopObserving = null;
        void stop?.();
      };
    },
    load,
    edit: (block, text, cascade) =>
      mutate({
        action: "edit",
        sessionId,
        eventSeq: block.eventSeq,
        blockIndex: block.blockIndex,
        text,
        cascade,
      }),
    retry: (turn, cascade) => mutate({ action: "retry", sessionId, turn, cascade }),
    reroll: () => mutate({ action: "reroll", sessionId }),
    openVersion: (target) => {
      openSession(ctx, target);
    },
  };

  return {
    face,
    refreshIfLoaded() {
      if (users > 0 && store.getSnapshot().status !== "idle") load();
    },
  };
}
