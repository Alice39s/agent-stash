import type { IncomingMessage, ServerResponse } from "node:http";
import { sessionPrompts, type PromptEvent } from "../prompts.ts";
import {
  createPromptHistory,
  type HistorySource,
  type PromptHistory,
  type SessionInfo,
} from "./history.ts";

/** 会话头里本插件读取的字段。 */
export interface DshSessionHeader {
  readonly id: string;
  readonly createdAt: number;
  readonly cwd?: string;
  readonly origin?: "subagent";
  readonly delegationDepth?: number;
}

/** 投影快照里本插件读取的两个键。 */
export interface DshProjectionSnapshot {
  readonly values: {
    readonly sessionListMetadata?: { readonly lastPromptAt: number | null };
    readonly title?: string | null;
  };
}

/** 进程内的活跃会话，只作为投影服务的句柄使用。 */
export type DshLiveSession = object;

export interface DshWebRoute {
  readonly kind: "exact";
  readonly path: string;
  readonly handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

/** DSH Host 上下文里本插件用到的服务。 */
export interface DshHostContext {
  readonly webServer: { register(route: DshWebRoute): () => void };
  readonly connection: { requestRejection(req: IncomingMessage): number | undefined };
  readonly sessionQuery: {
    listSessions(): Promise<readonly { readonly header: DshSessionHeader }[]>;
    readSession(id: string): Promise<{ readonly events: readonly PromptEvent[] }>;
  };
  readonly sessions: { get(id: string): DshLiveSession | undefined };
  readonly sessionProjections: {
    cachedSnapshot(
      session: DshLiveSession,
      keys: readonly ProjectionKey[],
    ): DshProjectionSnapshot | undefined;
    snapshot(session: DshLiveSession, keys: readonly ProjectionKey[]): DshProjectionSnapshot;
  };
  effect(execute: () => () => void, label?: string): void;
  get(name: "sessionProjectionCache"):
    | {
        cachedSnapshot(
          header: DshSessionHeader,
          keys: readonly ProjectionKey[],
        ): DshProjectionSnapshot | undefined;
      }
    | undefined;
}

type ProjectionKey = "sessionListMetadata" | "title";

/** Host 插件声明的依赖服务。 */
export const HOST_INJECT = [
  "webServer",
  "connection",
  "sessionQuery",
  "sessions",
  "sessionProjections",
];

const KEYS: readonly ProjectionKey[] = ["sessionListMetadata", "title"];

/** 全局历史最多读取的会话数。 */
const MAX_SESSIONS = 50;
/** 全局历史最多返回的条目数。 */
const MAX_ENTRIES = 500;

function liveSnapshot(ctx: DshHostContext, live: DshLiveSession): DshProjectionSnapshot {
  return (
    ctx.sessionProjections.cachedSnapshot(live, KEYS) ?? ctx.sessionProjections.snapshot(live, KEYS)
  );
}

/** 活跃会话读进程内投影，冷会话读持久化的投影缓存。 */
function snapshotOf(
  ctx: DshHostContext,
  header: DshSessionHeader,
): DshProjectionSnapshot | undefined {
  const live = ctx.sessions.get(header.id);
  if (live !== undefined) return liveSnapshot(ctx, live);
  return ctx.get("sessionProjectionCache")?.cachedSnapshot(header, KEYS);
}

/** 用会话查询服务与投影快照实现历史来源：只收录有工作目录的顶层会话。 */
export function dshHistorySource(ctx: DshHostContext): HistorySource {
  return {
    async sessions() {
      const records = await ctx.sessionQuery.listSessions();
      return records
        .map((record) => record.header)
        .filter(
          (header) =>
            header.cwd !== undefined &&
            header.origin !== "subagent" &&
            (header.delegationDepth ?? 0) === 0,
        )
        .map((header): SessionInfo => {
          const values = snapshotOf(ctx, header)?.values;
          const stamp = values?.sessionListMetadata?.lastPromptAt;
          const info: SessionInfo = { id: header.id, stamp, rank: stamp ?? header.createdAt };
          if (typeof values?.title === "string") info.title = values.title;
          return info;
        });
    },
    stamp(id) {
      const live = ctx.sessions.get(id);
      // 冷会话的日志不会变化，它重新活跃后时间戳可读，缓存随之失效。
      if (live === undefined) return undefined;
      return liveSnapshot(ctx, live).values.sessionListMetadata?.lastPromptAt;
    },
    async prompts(id) {
      return sessionPrompts((await ctx.sessionQuery.readSession(id)).events);
    },
  };
}

function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

/**
 * Prompt 历史路由：`GET ?session=<id>` 返回该会话的 Prompt（时间正序），
 * 不带参数返回全局历史（时间倒序、文本去重）。
 */
export function promptRouteHandler(
  history: PromptHistory,
  rejection: (req: IncomingMessage) => number | undefined,
): DshWebRoute["handler"] {
  return async (req, res) => {
    const rejected = rejection(req);
    if (rejected !== undefined) {
      res.statusCode = rejected;
      res.end();
      return;
    }
    if (req.method !== "GET") {
      res.setHeader("allow", "GET");
      sendJson(res, 405, { message: "only GET is allowed" });
      return;
    }
    const sessionId = new URL(req.url ?? "/", "http://localhost").searchParams.get("session");
    try {
      const items =
        sessionId === null
          ? await history.global()
          : (await history.session(sessionId)).map(({ text, time }) => ({ text, time }));
      sendJson(res, 200, { items });
    } catch (error) {
      const scope = sessionId === null ? "global history" : `session "${sessionId}"`;
      sendJson(res, 500, { message: `reading prompts of ${scope} failed: ${String(error)}` });
    }
  };
}

/** 在 `path` 上注册 Prompt 历史路由，插件卸载时一并移除。 */
export function registerPromptRoute(ctx: DshHostContext, path: string, label: string): void {
  const history = createPromptHistory(dshHistorySource(ctx), {
    maxSessions: MAX_SESSIONS,
    maxEntries: MAX_ENTRIES,
  });
  const handler = promptRouteHandler(history, (req) => ctx.connection.requestRejection(req));
  ctx.effect(() => ctx.webServer.register({ kind: "exact", path, handler }), label);
}
