/**
 * DSH Host 运行时的结构类型。
 *
 * 插件不 import `@deepseek-ai/*` 的运行时值：这里只描述本插件用到的成员，
 * 以 DSH 0.2.1-rc.3 与 0.2.2-alpha.2 都提供的接口为准。
 */
import type { IncomingMessage, ServerResponse } from "node:http";

/** 可无损序列化为 JSON 的值。 */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject;
export type JsonObject = { readonly [key: string]: JsonValue };

/** 会话事件信封。 */
export interface DshSessionEvent {
  readonly type: string;
  readonly seq: number;
  readonly time: number;
  readonly data: JsonValue;
}

/** 会话创建时的元数据。 */
export interface DshSessionHeader {
  readonly id: string;
  readonly createdAt: number;
  readonly cwd?: string;
  readonly isSeeded?: boolean;
  /** 只有 subagent 子会话带 `'subagent'`。 */
  readonly origin?: string;
  readonly delegationDepth?: number;
}

/** 一个 live 会话；`session/event` 监听器收到它。 */
export interface DshSession {
  readonly id: string;
  readonly header: DshSessionHeader;
}

/** `sessionQuery.readSession` 的结果：同一次观察里的 header、继承前缀长度与完整原始日志。 */
export interface DshSessionLog {
  readonly session: DshSessionHeader;
  readonly inheritedEventCount: number;
  readonly events: readonly DshSessionEvent[];
}

/** `ctx.sessionQuery`。 */
export interface DshSessionQuery {
  listSessions(
    signal?: AbortSignal,
  ): Promise<readonly { readonly header: DshSessionHeader; readonly live: boolean }[]>;
  readSession(id: string): Promise<DshSessionLog>;
}

/** 模型流的分块里本插件读取的部分。 */
export type DshStreamChunk =
  | { readonly type: "text-delta"; readonly index: number; readonly text: string }
  | {
      readonly type: "usage";
      readonly usage: {
        /** 未命中缓存的输入。 */
        readonly inputTokens: number;
        readonly outputTokens: number;
        readonly cacheReadTokens?: number;
        readonly cacheWriteTokens?: number;
      };
    }
  | {
      readonly type: "finish";
      readonly reason: {
        readonly kind: string;
        readonly failure?: { readonly code: string; readonly message: string };
      };
    }
  | { readonly type: "reasoning-delta" }
  | { readonly type: "block-start" | "block-end" | "tool-call-delta" };

/** 一次独立的模型请求。 */
export interface DshGenerateOptions {
  readonly provider: string;
  readonly model: string;
  readonly reasoningEffort?: string;
  readonly system: string;
  readonly messages: readonly {
    readonly role: "user";
    readonly content: readonly { readonly type: "text"; readonly text: string }[];
  }[];
  readonly maxTokens: number;
  readonly temperature?: number;
  readonly signal: AbortSignal;
}

/** `ctx.llm`。 */
export interface DshLlm {
  stream(options: DshGenerateOptions): AsyncIterable<DshStreamChunk>;
}

/** 默认模型选择。 */
export interface DshModelSelection {
  readonly provider: string;
  readonly model: string;
  readonly reasoningEffort?: string;
}

/** `ctx.get('agentDefaultModel')`。 */
export interface DshAgentDefaultModel {
  currentSelection(): DshModelSelection;
}

/** 会话 Skill 目录里的一条 Skill。 */
export interface DshSkillSummary {
  readonly name: string;
  readonly description: string;
  readonly whenToUse?: string;
  /** 指令文件的绝对路径；虚拟 Skill 没有。 */
  readonly path?: string;
}

/**
 * `ctx.sessionSkillCatalog`：一个会话的 Agent 看到的 Skill 目录。DSH 按会话记录的工作目录与 Agent 预设
 * 解析，冷会话不会被激活；只列出用户可调用的 Skill。会话不存在时以 `code: "session/not-found"` 拒绝。
 */
export interface DshSessionSkillCatalog {
  list(
    request: { readonly sessionId: string },
    signal: AbortSignal,
  ): Promise<{ readonly skills: readonly DshSkillSummary[] }>;
}

/** storageDomain 的表声明；`valueSchema.parse` 在读取与写入时校验每条记录。 */
export interface DshTableSpec<V> {
  readonly valueSchema: { readonly parse: (raw: JsonValue) => V };
}

/** storageDomain 的 domain 声明；`T` 是表名到记录类型的映射。 */
export interface DshDomainSpec<T> {
  readonly name: string;
  readonly version: number;
  readonly layout: "per-record";
  readonly invalidRecords: "backup-and-skip";
  readonly tables: { readonly [K in keyof T]: DshTableSpec<T[K]> };
}

/** domain 里的一张 KV 表：读取走内存，写入等落盘后才返回。 */
export interface DshTable<V> {
  get(key: string): V | undefined;
  entries(): IterableIterator<[string, V]>;
  put(key: string, value: V): Promise<void>;
  delete(key: string): Promise<boolean>;
}

/** 一个打开的 domain；表的值类型由打开时声明的 `valueSchema` 保证。 */
export interface DshDomain<T> {
  table<K extends keyof T & string>(name: K): DshTable<T[K]>;
  close(): Promise<void>;
}

/** `ctx.storageDomain`。 */
export interface DshDomainFacility {
  open<T>(spec: DshDomainSpec<T>): Promise<DshDomain<T>>;
}

/** 一条精确路径的 Web 路由。 */
export interface DshWebRoute {
  readonly kind: "exact";
  readonly path: string;
  readonly handler: (request: IncomingMessage, response: ServerResponse) => Promise<void>;
}

/** `ctx.webServer`。 */
export interface DshWebServer {
  register(route: DshWebRoute): () => void;
}

/** `ctx.connection`（Host 侧）。 */
export interface DshHostConnection {
  /** 对自定义 Web 路由执行 Host/Origin 检查与浏览器 Cookie 认证；放行时返回 undefined。 */
  requestRejection(request: IncomingMessage): number | undefined;
}

/** `ctx.logger`。 */
export interface DshLogger {
  info(format: string, ...params: readonly string[]): void;
  warn(format: string, ...params: readonly string[]): void;
}

/** effect 产出的清理函数。 */
export type DshDisposer = () => void | Promise<void>;

/** 插件的 Cordis Context：`inject` 列出的服务，以及可选的默认模型。 */
export interface ScoutContext {
  readonly sessionQuery: DshSessionQuery;
  readonly llm: DshLlm;
  readonly sessionSkillCatalog: DshSessionSkillCatalog;
  readonly storageDomain: DshDomainFacility;
  readonly webServer: DshWebServer;
  readonly connection: DshHostConnection;
  readonly logger: DshLogger;
  get(name: "agentDefaultModel"): DshAgentDefaultModel | undefined;
  /** 注册即 effect，插件卸载时自动解除。 */
  on(
    name: "session/event",
    listener: (session: DshSession, event: DshSessionEvent) => void,
  ): () => void;
  /** 异步生成器每产出一个清理函数就登记一个；插件卸载或 effect 失败时逆序执行。 */
  effect(execute: () => AsyncIterable<DshDisposer>, label: string): PromiseLike<DshDisposer>;
}
