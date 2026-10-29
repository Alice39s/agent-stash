/**
 * 把 DSH 会话的原始事件日志转换成插件需要的步骤序列：人类消息、工具调用（含 run_code 子调用）、
 * Agent 回复与回合结束。插件解读的事件数据先用 valibot 校验，结构不符时带上会话、seq 与类型抛出。
 */
import * as v from "valibot";
import type { DshSessionEvent, JsonObject, JsonValue } from "./dsh.ts";

/** 时间线上的一步。 */
export type Step =
  | { readonly kind: "human"; readonly seq: number; readonly time: number; readonly text: string }
  | {
      readonly kind: "tool";
      readonly seq: number;
      readonly time: number;
      readonly tool: string;
      readonly args: JsonObject;
      readonly ok: boolean;
      readonly output: string;
      readonly errorCode: string | null;
    }
  | { readonly kind: "reply"; readonly seq: number; readonly time: number; readonly text: string }
  | {
      readonly kind: "turn-end";
      readonly seq: number;
      readonly time: number;
      readonly reason: string;
    };

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

const JsonObjectSchema = v.record(v.string(), JsonValueSchema);

const BlockSchema = v.looseObject({ type: v.string(), text: v.optional(v.string()) });

const UserMessageSchema = v.looseObject({
  content: v.array(BlockSchema),
  source: v.looseObject({ kind: v.string() }),
});

const AssistantMessageSchema = v.looseObject({
  message: v.looseObject({ content: v.array(BlockSchema) }),
});

const ToolCallSchema = v.looseObject({
  callId: v.string(),
  name: v.string(),
  arguments: v.string(),
});

const ErrorSchema = v.optional(v.looseObject({ code: v.string() }));

const ToolResultSchema = v.looseObject({
  message: v.looseObject({
    toolCallId: v.string(),
    content: v.array(BlockSchema),
    isError: v.optional(v.boolean()),
  }),
  error: ErrorSchema,
});

const PtcDispatchSchema = v.looseObject({
  name: v.string(),
  arguments: JsonObjectSchema,
  isError: v.boolean(),
  content: v.array(BlockSchema),
  error: ErrorSchema,
});

const TurnEndSchema = v.looseObject({ reason: v.looseObject({ kind: v.string() }) });

/** run_code 本身不记入步骤：它的子调用由 `tool/ptc-dispatch` 逐条记录。 */
const PROGRAM_TOOL = "run_code";

function dataOf<TInput, TOutput>(
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

function textOf(
  blocks: readonly { readonly type: string; readonly text?: string | undefined }[],
): string {
  return blocks
    .filter((block) => block.type === "text" && block.text !== undefined)
    .map((block) => block.text ?? "")
    .join("\n");
}

const ArgumentsSchema = v.pipe(v.string(), v.parseJson(), JsonObjectSchema);

/**
 * 解析模型给出的工具参数。DSH 记录的是模型输出的原始 JSON 文本；它不是 JSON 对象时，
 * 这次调用本身已经失败，步骤只保留工具名与结果。
 */
function parseArguments(raw: string): JsonObject {
  const result = v.safeParse(ArgumentsSchema, raw);
  return result.success ? result.output : {};
}

/**
 * 把一个会话自有部分（继承前缀之后）的事件转换成步骤。
 * @param sessionId - 会话 id，用于错误信息。
 * @param events - 原始事件，按 seq 递增。
 * @param fromSeq - 第一个自有事件的 seq（即继承前缀长度）。
 * @returns 按 seq 排列的步骤。
 */
export function stepsOf(
  sessionId: string,
  events: readonly DshSessionEvent[],
  fromSeq: number,
): Step[] {
  const steps: Step[] = [];
  const calls = new Map<string, { readonly name: string; readonly args: string }>();
  for (const event of events) {
    if (event.seq < fromSeq) continue;
    switch (event.type) {
      case "user/message": {
        const data = dataOf(UserMessageSchema, sessionId, event);
        const text = textOf(data.content);
        if (data.source.kind === "user" && text.trim() !== "") {
          steps.push({ kind: "human", seq: event.seq, time: event.time, text });
        }
        break;
      }
      case "assistant/message": {
        const text = textOf(dataOf(AssistantMessageSchema, sessionId, event).message.content);
        if (text.trim() !== "")
          steps.push({ kind: "reply", seq: event.seq, time: event.time, text });
        break;
      }
      case "tool/call": {
        const data = dataOf(ToolCallSchema, sessionId, event);
        calls.set(data.callId, { name: data.name, args: data.arguments });
        break;
      }
      case "tool/result": {
        const data = dataOf(ToolResultSchema, sessionId, event);
        const call = calls.get(data.message.toolCallId);
        calls.delete(data.message.toolCallId);
        if (call === undefined || call.name === PROGRAM_TOOL) break;
        steps.push({
          kind: "tool",
          seq: event.seq,
          time: event.time,
          tool: call.name,
          args: parseArguments(call.args),
          ok: data.message.isError !== true,
          output: textOf(data.message.content),
          errorCode: data.error?.code ?? null,
        });
        break;
      }
      case "tool/ptc-dispatch": {
        const data = dataOf(PtcDispatchSchema, sessionId, event);
        steps.push({
          kind: "tool",
          seq: event.seq,
          time: event.time,
          tool: data.name,
          args: data.arguments,
          ok: !data.isError,
          output: textOf(data.content),
          errorCode: data.error?.code ?? null,
        });
        break;
      }
      case "turn/end": {
        const reason = dataOf(TurnEndSchema, sessionId, event).reason.kind;
        steps.push({ kind: "turn-end", seq: event.seq, time: event.time, reason });
        break;
      }
      default:
        // 其余事件（含插件自定义事件）不影响 Episode 的提取。
        break;
    }
  }
  return steps;
}
