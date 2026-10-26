/**
 * DSH Host 运行时的结构类型。
 *
 * 插件不 import 任何 `@deepseek-ai/*` 包：DSH 0.1.0-rc.3 与 Desktop 0.2.1-rc.3 的类型互不兼容，
 * 这里只描述本插件实际用到的成员。某一版独有的成员标为可选，使用处做特性检测。
 * DSH 对象在 `dsh-read.ts` 里读取并转换成插件自己的值，纯函数不接触这些类型。
 */

/** 可无损序列化为 JSON 的值；DSH 会话事件的数据都满足它。 */
export type JsonValue = string | number | boolean | null | readonly JsonValue[] | JsonObject;
export type JsonObject = { readonly [key: string]: JsonValue };

/** 会话事件信封。插件只解读少数几种事件的 `data`，其余事件原样透传进 fork seed。 */
export interface DshSessionEvent {
  readonly type: string;
  readonly seq: number;
  readonly time: number;
  readonly data: JsonObject;
  /** 消息类事件进入模型可见历史的方式；插件写入的事件一律是 `'append'`。 */
  readonly surfaceOp?: JsonValue;
}

/** 会话创建时的元数据。 */
export interface DshSessionHeader {
  /** 会话格式版本：0.1.0-rc.3 为 0，0.2.1-rc.3 为 4。 */
  readonly version: number;
  readonly id: string;
  readonly createdAt: number;
  readonly cwd?: string;
  readonly parentSession?: string;
  readonly agentPreset?: string;
}

/** 一个 live 会话。两版读取完整事件日志的方式不同。 */
export interface DshSession {
  readonly id: string;
  readonly header: DshSessionHeader;
  /** 0.1.0-rc.3：完整事件日志的不可变快照。 */
  readonly events?: readonly DshSessionEvent[];
  /** 0.2.1-rc.3：不带参数时返回完整事件日志的不可变快照。 */
  snapshotEvents?(): readonly DshSessionEvent[];
}

/** `ctx.sessions`。 */
export interface DshSessionStore {
  get(id: string): DshSession | undefined;
  /** 等待所有持久化监听器把会话写入存储。 */
  flush(session: DshSession): Promise<boolean>;
}

/** 写给 DSH 的用户消息；`content` 是原样保留的内容块。 */
export type DshUserMessage = {
  readonly id: string;
  readonly role: "user";
  readonly content: readonly JsonObject[];
  readonly source: { readonly kind: "user" };
};

/** 写进手写回合的助手消息。 */
export type DshAssistantMessage = {
  readonly id: string;
  readonly role: "assistant";
  readonly content: readonly JsonObject[];
  readonly source: { readonly kind: "model"; readonly provider: string; readonly model: string };
};

/** Agent 的模型路由。 */
export interface DshAgentOptions {
  readonly provider?: string;
  readonly model?: string;
  readonly maxTokens?: number;
  /** 只有 0.2.1-rc.3 的 AgentOptions 有这个字段。 */
  readonly reasoningEffort?: string;
}

/** Agent 的待处理输入；两版的 `clear()` 都把取消写进会话日志，列表为空时不写。 */
export interface DshInbox {
  clear(): void;
}

/** 一个 live Agent。 */
export interface DshAgent {
  readonly session: DshSession;
  readonly options: DshAgentOptions;
  readonly inbox: DshInbox;
  /** 在空闲阶段运行一个非回合任务；Agent 正在运行回合或另一个维护任务时同步抛出。 */
  runMaintenance<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T>;
  /** 把一条用户输入排进下一个回合并唤醒 Agent。 */
  followup(message: DshUserMessage): void;
}

/** `agents.create` / `agents.resume` 返回的所有权句柄。 */
export interface DshAgentHandle {
  readonly agent: DshAgent;
  dispose(): Promise<void>;
}

/** Agent setup 收到的未发布作用域；插件只把它原样交给 `agentPresets.mount`。 */
export type DshAgentScope = object;

/** fork 子会话的元数据。0.1.0-rc.3 用 `seedLength`，0.2.1-rc.3 用 `isSeeded`。 */
export type DshForkMeta = {
  readonly cwd?: string;
  readonly parentSession: string;
  readonly agentPreset?: string;
} & ({ readonly seedLength: number } | { readonly isSeeded: true });

export interface DshCreateAgentOptions {
  readonly sessionId: string;
  readonly seed: readonly DshSessionEvent[];
  readonly meta: DshForkMeta;
  /** 0.2.1-rc.3：继承前缀的长度，`meta.isSeeded` 为真时必填。 */
  readonly inheritedEventCount?: number;
  readonly agentOptions: DshAgentOptions;
  readonly setup?: (agentScope: DshAgentScope) => Promise<void>;
}

/** `ctx.agents`。 */
export interface DshAgentRegistry {
  get(id: string): DshAgent | undefined;
  create(options: DshCreateAgentOptions): Promise<DshAgentHandle>;
  resume(options: {
    readonly resumeSessionId: string;
    readonly agentOptions: DshAgentOptions;
  }): Promise<DshAgentHandle>;
}

/** `ctx.get('agentPresets')`；0.1.0-rc.3 由 dsh-agent-presets 提供，0.2.1-rc.3 由 dsh-agent-preset-registry 提供。 */
export interface DshAgentPresets {
  resolve(id: string): Promise<{ readonly id: string }>;
  mount(agentScope: DshAgentScope, id: string): Promise<{ readonly id: string }>;
}

/** 会话语料里的一条会话记录。 */
export interface DshSessionRecord {
  readonly header: DshSessionHeader;
}

/** 版本树里的一个后代节点。 */
export interface DshLineageNode {
  readonly session: DshSessionRecord;
  readonly descendants: readonly DshLineageNode[];
}

/** `sessionQuery.traceSession` 的结果：已知祖先与后代。 */
export type DshLineageTrace = {
  readonly target: DshSessionRecord;
  /** 从直接父会话往外排列。 */
  readonly ancestors: readonly DshSessionRecord[];
  readonly descendants: readonly DshLineageNode[];
} & (
  | { readonly complete: true; readonly root: DshSessionRecord }
  | { readonly complete: false; readonly unresolvedParentId: string }
);

/** `sessionQuery.readSession` 的结果：同一次观察里的 header 与完整事件日志。 */
export interface DshSessionLogSnapshot {
  readonly session: DshSessionHeader;
  readonly events: readonly DshSessionEvent[];
}

/** `ctx.sessionQuery`。 */
export interface DshSessionQuery {
  readSession(id: string): Promise<DshSessionLogSnapshot>;
  traceSession(id: string): Promise<DshLineageTrace>;
}

/** 一个工作区。 */
export interface DshWorkspace {
  readonly sessionIds: readonly string[];
  attachSession(id: string): Promise<void>;
  detachSession(id: string): Promise<void>;
}

/** `ctx.workspaceRegistry`。 */
export interface DshWorkspaceRegistry {
  list(): readonly DshWorkspace[];
}

/** node:http 的请求；异步迭代得到请求体分块。 */
export interface DshHttpRequest extends AsyncIterable<Uint8Array | string> {
  readonly method: string;
  readonly url: string;
  readonly headers: Readonly<Record<string, string | readonly string[] | undefined>>;
}

/** node:http 的响应。 */
export interface DshHttpResponse {
  writeHead(status: number, headers: Readonly<Record<string, string>>): void;
  end(body: string): void;
}

/** 一条精确路径的 Web 路由。 */
export interface DshWebRoute {
  readonly kind: "exact";
  readonly path: string;
  readonly handler: (request: DshHttpRequest, response: DshHttpResponse) => Promise<void>;
}

/** `ctx.webServer`。 */
export interface DshWebServer {
  register(route: DshWebRoute): () => void;
}

/** `ctx.connection`（Host 侧）。 */
export interface DshHostConnection {
  /** 0.2.1-rc.3：对自定义 Web 路由执行 Host/Origin 检查与浏览器 Cookie 认证；放行时返回 undefined。 */
  requestRejection?(request: DshHttpRequest): 401 | 403 | undefined;
}

/** storageDomain 的表声明；`valueSchema.parse` 在打开 domain 时校验每条存储记录。 */
export interface DshDomainTableSpec<V> {
  readonly valueSchema: { readonly parse: (raw: JsonValue) => V };
}

/** storageDomain 的 domain 声明。两版都接受只含 `name`、`version`、`tables` 的声明。 */
export interface DshDomainSpec<V> {
  readonly name: string;
  readonly version: number;
  readonly tables: Readonly<Record<string, DshDomainTableSpec<V>>>;
}

/** domain 里的一张 KV 表；读取走内存，写入等落盘后才返回。 */
export interface DshKvTable<V> {
  get(key: string): V | undefined;
  put(key: string, value: V): Promise<void>;
  delete(key: string): Promise<boolean>;
}

/** 一个打开的 domain。 */
export interface DshDomain<V> {
  table(name: string): DshKvTable<V>;
  close(): Promise<void>;
}

/** `ctx.storageDomain`。 */
export interface DshDomainFacility {
  open<V>(spec: DshDomainSpec<V>): Promise<DshDomain<V>>;
}

/** `ctx.logger`；`format` 支持 `%s` 占位符。 */
export interface DshLogger {
  error(format: string, ...params: readonly string[]): void;
}

/** effect 产出的清理函数。 */
export type DshDisposer = () => void | Promise<void>;

/** 插件的 Cordis Context：`inject` 列出的 Service，外加可选的 `agentPresets`。 */
export interface MessageEditContext {
  readonly sessions: DshSessionStore;
  readonly agents: DshAgentRegistry;
  readonly sessionQuery: DshSessionQuery;
  readonly workspaceRegistry: DshWorkspaceRegistry;
  readonly webServer: DshWebServer;
  readonly storageDomain: DshDomainFacility;
  readonly connection: DshHostConnection;
  readonly logger: DshLogger;
  get(name: "agentPresets"): DshAgentPresets | undefined;
  /** 异步生成器每产出一个清理函数就登记一个；插件卸载或 effect 失败时逆序执行。 */
  effect(execute: () => AsyncIterable<DshDisposer>, label: string): PromiseLike<DshDisposer>;
}
