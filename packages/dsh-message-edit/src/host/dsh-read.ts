/**
 * DSH 读取适配：把 live 会话、持久化会话与版本树追踪结果转换成插件的值。
 *
 * 两版读取完整事件日志的方式不同（0.1.0-rc.3 是 `session.events`，0.2.1-rc.3 是
 * `session.snapshotEvents()`），会话格式版本也不同，都在这里分流。插件解读的事件数据先用
 * valibot 校验，再进入 `LogEvent` 视图。
 */
import * as v from "valibot";
import type {
  DshLineageNode,
  DshSession,
  DshSessionEvent,
  DshSessionHeader,
  DshSessionLogSnapshot,
  DshSessionQuery,
  DshSessionRecord,
  DshSessionStore,
  JsonValue,
} from "./dsh.ts";
import type { LineageNode, LogEvent, SessionFormat, SessionLog } from "./model.ts";

const JsonValueSchema: v.GenericSchema<JsonValue> = v.lazy(() =>
  v.union([
    v.string(),
    v.number(),
    v.boolean(),
    v.null(),
    v.array(JsonValueSchema),
    v.record(v.string(), JsonValueSchema),
  ]),
);

const TEXTUAL_BLOCK_TYPES = ["text", "reasoning"] as const;

/** 文本与思考块保留全部字段，替换文本时其余字段原样带上。 */
const TextualBlockSchema = v.objectWithRest(
  { type: v.picklist(TEXTUAL_BLOCK_TYPES), text: v.string() },
  JsonValueSchema,
);

/** 其他内容块原样保留；排除文本与思考类型，`isTextualBlock` 只需看 `type`。 */
const OpaqueBlockSchema = v.objectWithRest(
  { type: v.pipe(v.string(), v.notValues(TEXTUAL_BLOCK_TYPES)) },
  JsonValueSchema,
);

const ContentBlockSchema = v.union([TextualBlockSchema, OpaqueBlockSchema]);

const IntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(0));

const TurnDataSchema = v.object({ turn: IntegerSchema });

const UserMessageDataSchema = v.object({
  id: v.pipe(v.string(), v.nonEmpty()),
  content: v.array(ContentBlockSchema),
  source: v.object({ kind: v.string() }),
});

const AssistantMessageDataSchema = v.object({
  turn: IntegerSchema,
  message: v.object({
    id: v.pipe(v.string(), v.nonEmpty()),
    content: v.array(ContentBlockSchema),
    source: v.object({ provider: v.string(), model: v.string() }),
  }),
});

const RequestHeaderDataSchema = v.object({
  header: v.object({
    config: v.object({
      provider: v.string(),
      model: v.string(),
      maxTokens: v.optional(IntegerSchema),
      reasoningEffort: v.optional(v.string()),
    }),
  }),
});

const PresetSelectedDataSchema = v.object({ agentPreset: v.string() });

/** 按 schema 解读一个事件的数据；结构不符时带上会话、seq 与事件类型抛出。 */
function eventData<TInput, TOutput>(
  schema: v.GenericSchema<TInput, TOutput>,
  sessionId: string,
  event: DshSessionEvent,
): TOutput {
  const result = v.safeParse(schema, event.data);
  if (!result.success) {
    throw new Error(
      `会话 ${sessionId} 的事件 ${String(event.seq)}（${event.type}）结构不符：${v.summarize(result.issues)}`,
    );
  }
  return result.output;
}

/** 解读一个事件；插件不关心的事件类型返回 undefined。 */
function logEvent(sessionId: string, event: DshSessionEvent): LogEvent | undefined {
  switch (event.type) {
    case "turn/start":
      return {
        type: "turn/start",
        seq: event.seq,
        turn: eventData(TurnDataSchema, sessionId, event).turn,
      };
    case "turn/end":
      return {
        type: "turn/end",
        seq: event.seq,
        turn: eventData(TurnDataSchema, sessionId, event).turn,
      };
    case "user/message": {
      const data = eventData(UserMessageDataSchema, sessionId, event);
      return {
        type: "user/message",
        seq: event.seq,
        time: event.time,
        message: { id: data.id, sourceKind: data.source.kind, content: data.content },
      };
    }
    case "assistant/message": {
      const { turn, message } = eventData(AssistantMessageDataSchema, sessionId, event);
      return {
        type: "assistant/message",
        seq: event.seq,
        time: event.time,
        turn,
        message: {
          id: message.id,
          provider: message.source.provider,
          model: message.source.model,
          content: message.content,
        },
      };
    }
    case "request/header": {
      const { config } = eventData(RequestHeaderDataSchema, sessionId, event).header;
      return {
        type: "request/header",
        seq: event.seq,
        route: {
          provider: config.provider,
          model: config.model,
          ...(config.maxTokens === undefined ? {} : { maxTokens: config.maxTokens }),
          ...(config.reasoningEffort === undefined
            ? {}
            : { reasoningEffort: config.reasoningEffort }),
        },
      };
    }
    case "agent-preset/selected":
      return {
        type: "agent-preset/selected",
        seq: event.seq,
        agentPreset: eventData(PresetSelectedDataSchema, sessionId, event).agentPreset,
      };
    default:
      return undefined;
  }
}

/** 把原始事件日志转换成插件视图，保持 seq 顺序。 */
export function parseLogEvents(sessionId: string, events: readonly DshSessionEvent[]): LogEvent[] {
  return events.flatMap((event) => {
    const parsed = logEvent(sessionId, event);
    return parsed === undefined ? [] : [parsed];
  });
}

/** 从 header 判定会话格式；两版的 header 校验分别只接受 0 与 4。 */
export function sessionFormat(header: DshSessionHeader): SessionFormat {
  switch (header.version) {
    case 0:
      return 0;
    case 4:
      return 4;
    default:
      throw new Error(
        `会话 ${header.id} 的格式版本 ${String(header.version)} 不受支持，只支持 0（DSH 0.1.0-rc.3）与 4（DSH 0.2.1-rc.3）`,
      );
  }
}

/** live 会话的完整事件日志：0.2.1-rc.3 用 `snapshotEvents()`，0.1.0-rc.3 用 `events`。 */
function liveEvents(session: DshSession): readonly DshSessionEvent[] {
  if (typeof session.snapshotEvents === "function") return session.snapshotEvents();
  if (session.events !== undefined) return session.events;
  throw new Error(`会话 ${session.id} 既没有 snapshotEvents() 也没有 events，无法读取事件日志`);
}

function sessionLog(header: DshSessionHeader, events: readonly DshSessionEvent[]): SessionLog {
  return {
    id: header.id,
    format: sessionFormat(header),
    ...(header.cwd === undefined ? {} : { cwd: header.cwd }),
    ...(header.agentPreset === undefined ? {} : { agentPreset: header.agentPreset }),
    events,
    view: parseLogEvents(header.id, events),
  };
}

/** 读取 live 会话。 */
export function liveSessionLog(session: DshSession): SessionLog {
  return sessionLog(session.header, liveEvents(session));
}

/** 读取 `sessionQuery.readSession` 的结果。 */
export function storedSessionLog(snapshot: DshSessionLogSnapshot): SessionLog {
  return sessionLog(snapshot.session, snapshot.events);
}

/** 读取一个会话：live 会话直接读内存，否则经 `sessionQuery` 读持久化日志。 */
export async function readSessionLog(
  sources: { readonly sessions: DshSessionStore; readonly sessionQuery: DshSessionQuery },
  sessionId: string,
): Promise<SessionLog> {
  const live = sources.sessions.get(sessionId);
  if (live !== undefined) return liveSessionLog(live);
  return storedSessionLog(await sources.sessionQuery.readSession(sessionId));
}

function lineageNode(header: DshSessionHeader, depth: number): LineageNode {
  return {
    sessionId: header.id,
    ...(header.parentSession === undefined ? {} : { parentSessionId: header.parentSession }),
    createdAt: header.createdAt,
    depth,
  };
}

function byCreation(left: DshLineageNode, right: DshLineageNode): number {
  const a = left.session.header;
  const b = right.session.header;
  return a.createdAt - b.createdAt || a.id.localeCompare(b.id);
}

/** 深度优先展开版本树；同一父版本的子版本按创建时间、再按 id 排序。 */
export function flattenLineage(
  root: DshSessionRecord,
  descendants: readonly DshLineageNode[],
): LineageNode[] {
  const nodes: LineageNode[] = [lineageNode(root.header, 0)];
  const visit = (children: readonly DshLineageNode[], depth: number): void => {
    for (const child of children.toSorted(byCreation)) {
      nodes.push(lineageNode(child.session.header, depth));
      visit(child.descendants, depth + 1);
    }
  };
  visit(descendants, 1);
  return nodes;
}

/** 读取一个会话所在的整棵可见版本树：先找到最上层的可见祖先，再从它展开。 */
export async function readLineage(
  query: DshSessionQuery,
  sessionId: string,
): Promise<LineageNode[]> {
  const trace = await query.traceSession(sessionId);
  const top = trace.complete ? trace.root : (trace.ancestors.at(-1) ?? trace.target);
  const rootTrace = top.header.id === sessionId ? trace : await query.traceSession(top.header.id);
  return flattenLineage(rootTrace.target, rootTrace.descendants);
}
