/**
 * 测试用的会话日志构造：事件按顺序连续编号，结构与两版 DSH 写入的事件一致。
 * 只被 `*.test.ts` 引用，不进入 Host bundle。
 */
import { storedSessionLog } from "./dsh-read.ts";
import type { DshSessionEvent, DshSessionHeader, JsonObject } from "./dsh.ts";
import type { ContentBlock, SessionFormat, SessionLog } from "./model.ts";

export const ROUTE = { provider: "deepseek", model: "deepseek-chat" } as const;

export type EventDraft = Omit<DshSessionEvent, "seq" | "time">;

export function text(value: string): ContentBlock {
  return { type: "text", text: value };
}

export function reasoning(value: string): ContentBlock {
  return { type: "reasoning", text: value };
}

export function image(id: string): ContentBlock {
  return { type: "image", attachment: { id, mimeType: "image/png" } };
}

/** 给事件草稿编上从 0 起的连续 seq，时间戳是 `1000 + seq`。 */
export function numbered(drafts: readonly EventDraft[]): DshSessionEvent[] {
  return drafts.map((draft, seq) => ({ ...draft, seq, time: 1_000 + seq }));
}

export interface TurnSpec {
  readonly turn: number;
  /** 用户输入；省略时这个回合只有插件注入的消息。 */
  readonly prompt?: readonly ContentBlock[];
  readonly reply: readonly ContentBlock[];
}

/** 一个完整回合的 7 个事件。 */
export function turnDrafts(format: SessionFormat, spec: TurnSpec): EventDraft[] {
  const { turn, prompt, reply } = spec;
  const user =
    prompt === undefined
      ? { content: [text("定时提醒")], source: { kind: "plugin", plugin: "schedule" } }
      : { content: prompt, source: { kind: "user" } };
  return [
    { type: "turn/start", data: { turn } },
    {
      type: "user/message",
      data: { id: `user-${String(turn)}`, role: "user", ...user },
      surfaceOp: "append",
    },
    { type: "step/start", data: { turn, step: 1 } },
    { type: "request/header", data: { header: { config: ROUTE }, reason: "initial" } },
    {
      type: "assistant/message",
      data: {
        turn,
        step: 1,
        message: {
          id: `assistant-${String(turn)}`,
          role: "assistant",
          content: reply,
          source: { kind: "model", ...ROUTE },
        },
        ...(format === 4 ? { stream: [] } : {}),
      },
      surfaceOp: "append",
    },
    { type: "step/end", data: { turn, step: 1 } },
    { type: "turn/end", data: { turn, reason: { kind: "completed" } } },
  ];
}

/** 没有助手回复就结束的回合（报错或被停止）的 5 个事件：开回合、用户输入、空步骤、按 `reason` 关回合。 */
export function unansweredTurnDrafts(
  turn: number,
  prompt: readonly ContentBlock[],
  reason: JsonObject,
): EventDraft[] {
  return [
    { type: "turn/start", data: { turn } },
    {
      type: "user/message",
      data: { id: `user-${String(turn)}`, role: "user", content: prompt, source: { kind: "user" } },
      surfaceOp: "append",
    },
    { type: "step/start", data: { turn, step: 1 } },
    { type: "step/end", data: { turn, step: 1 } },
    { type: "turn/end", data: { turn, reason } },
  ];
}

/** 由若干完整回合组成的事件日志。 */
export function turnsLog(format: SessionFormat, specs: readonly TurnSpec[]): DshSessionEvent[] {
  return numbered(specs.flatMap((spec) => turnDrafts(format, spec)));
}

/** 经读取适配得到的会话日志。 */
export function sessionLog(
  format: SessionFormat,
  events: readonly DshSessionEvent[],
  header: Partial<Pick<DshSessionHeader, "agentPreset" | "parentSession">> = {},
): SessionLog {
  return storedSessionLog({
    session: { version: format, id: "session-source", createdAt: 0, cwd: "/work", ...header },
    events,
  });
}
