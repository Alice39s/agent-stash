/**
 * fork 写出适配：按源会话格式构造子版本的 seed、meta 与 Agent 选项，以及排队的用户消息。
 *
 * - 格式 0（DSH 0.1.0-rc.3）：`meta.seedLength` 记继承前缀长度，seed 里不放 `session/end-seed`，
 *   构造器会在 seed 末尾自己补上。
 * - 格式 4（DSH 0.2.1-rc.3）：`meta.isSeeded` 加顶层 `inheritedEventCount`，继承前缀之后紧跟
 *   `session/end-seed {inherited: true}`；`assistant/message` 必须带 `stream` 数组。
 *
 * 两版都不允许手写的 `assistant/message` 带 `sourceEventSeqs`，这里一律省略。
 */
import type {
  DshAgentOptions,
  DshAssistantMessage,
  DshForkMeta,
  DshSessionEvent,
  DshUserMessage,
} from "./dsh.ts";
import type { ContentBlock, ModelRoute, SessionFormat, SessionLog } from "./model.ts";
import type { ManualTurn, OperationPlan } from "./plan.ts";

/** `agents.create` 里与 fork 相关的参数。 */
export interface ForkRequest {
  readonly seed: readonly DshSessionEvent[];
  readonly meta: DshForkMeta;
  /** 只有格式 4 需要。 */
  readonly inheritedEventCount?: number;
}

/** 一条新的用户消息，内容块原样保留。 */
export function userMessage(content: readonly ContentBlock[]): DshUserMessage {
  return { id: crypto.randomUUID(), role: "user", content, source: { kind: "user" } };
}

function assistantMessage(manual: ManualTurn): DshAssistantMessage {
  return {
    id: crypto.randomUUID(),
    role: "assistant",
    content: manual.reply.content,
    source: { kind: "model", provider: manual.reply.provider, model: manual.reply.model },
  };
}

/** 源会话从 seq 0 到 `boundary`（含）的事件；`boundary` 为 -1 时不继承。 */
function inheritedPrefix(source: SessionLog, boundary: number): readonly DshSessionEvent[] {
  if (boundary === -1) return [];
  if (source.events[boundary]?.seq !== boundary) {
    throw new Error(`会话 ${source.id} 的分支边界 ${String(boundary)} 不是连续的事件位置`);
  }
  return source.events.slice(0, boundary + 1);
}

/** 从 `firstSeq` 起连续编号的事件。 */
function sequence(
  firstSeq: number,
  time: number,
  entries: readonly Omit<DshSessionEvent, "seq" | "time">[],
): DshSessionEvent[] {
  return entries.map((entry, index) => ({ ...entry, seq: firstSeq + index, time }));
}

/** 手写回合：开回合、用户输入、一个步骤里的助手回复、关步骤、以 completed 关回合。 */
function manualTurnEvents(
  format: SessionFormat,
  firstSeq: number,
  manual: ManualTurn,
  time: number,
): DshSessionEvent[] {
  const { turn } = manual;
  const assistant = assistantMessage(manual);
  return sequence(firstSeq, time, [
    { type: "turn/start", data: { turn } },
    { type: "user/message", data: userMessage(manual.prompt), surfaceOp: "append" },
    { type: "step/start", data: { turn, step: 1 } },
    {
      type: "assistant/message",
      data:
        format === 4
          ? { turn, step: 1, message: assistant, stream: [] }
          : { turn, step: 1, message: assistant },
      surfaceOp: "append",
    },
    { type: "step/end", data: { turn, step: 1 } },
    { type: "turn/end", data: { turn, reason: { kind: "completed" } } },
  ]);
}

/**
 * 构造子版本的 seed 与 meta。
 * @param source - 源会话。
 * @param plan - 版本操作计划。
 * @param agentPreset - 子版本使用的 Agent 预设；部署不按会话组合预设时为 undefined。
 * @param time - 手写事件的时间戳。
 */
export function forkRequest(
  source: SessionLog,
  plan: OperationPlan,
  agentPreset: string | undefined,
  time: number,
): ForkRequest {
  const inherited = inheritedPrefix(source, plan.boundary);
  const lineage = {
    ...(source.cwd === undefined ? {} : { cwd: source.cwd }),
    parentSession: source.id,
    ...(agentPreset === undefined ? {} : { agentPreset }),
  };
  if (source.format === 0) {
    return {
      seed: [
        ...inherited,
        ...(plan.manualTurn === undefined
          ? []
          : manualTurnEvents(0, inherited.length, plan.manualTurn, time)),
      ],
      meta: { ...lineage, seedLength: inherited.length },
    };
  }
  const marker: DshSessionEvent = {
    type: "session/end-seed",
    seq: inherited.length,
    time,
    data: { inherited: true },
  };
  return {
    seed: [
      ...inherited,
      marker,
      ...(plan.manualTurn === undefined
        ? []
        : manualTurnEvents(4, inherited.length + 1, plan.manualTurn, time)),
    ],
    meta: { ...lineage, isSeeded: true },
    inheritedEventCount: inherited.length,
  };
}

/**
 * 子版本或恢复源会话时使用的 Agent 选项：日志里最近的请求路由优先，其次是源 Agent 当前的选项。
 * 格式 4 额外带上推理强度；0.1.0-rc.3 的 AgentOptions 没有这个字段。
 */
export function agentOptions(
  sessionId: string,
  format: SessionFormat,
  route: ModelRoute | undefined,
  current: DshAgentOptions | undefined,
): DshAgentOptions {
  const provider = route?.provider ?? current?.provider;
  const model = route?.model ?? current?.model;
  if (provider === undefined || provider === "" || model === undefined || model === "") {
    throw new Error(`无法从会话 ${sessionId} 的历史或当前 Agent 确定模型路由`);
  }
  const maxTokens = route?.maxTokens ?? current?.maxTokens;
  const reasoningEffort =
    format === 4 ? (route?.reasoningEffort ?? current?.reasoningEffort) : undefined;
  return {
    provider,
    model,
    ...(maxTokens === undefined ? {} : { maxTokens }),
    ...(reasoningEffort === undefined ? {} : { reasoningEffort }),
  };
}
