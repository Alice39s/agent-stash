import * as v from "valibot";
import { redactSecrets } from "./secrets.ts";

/**
 * 会话上下文的投影：只取用户亲手发送的消息、上下文压缩留下的摘要和助手回复的正文，
 * 工具调用与结果、推理过程、注入的系统与开发者消息一律不进入改写请求。
 */

/** 会话当前模型视图里的一条事件，只读取类型与数据。 */
export interface SurfaceEvent {
  readonly type: string;
  readonly data: unknown;
}

/** 一轮对话：用户消息与紧随其后的助手回复；`summary` 是上下文压缩留下的早前摘要。 */
export interface ContextTurn {
  readonly kind: "turn" | "summary";
  readonly user: string;
  readonly assistant: string;
}

const TextBlocksSchema = v.array(v.looseObject({ type: v.string(), text: v.optional(v.string()) }));
const UserDataSchema = v.looseObject({
  content: TextBlocksSchema,
  source: v.looseObject({ kind: v.string() }),
});
const AssistantDataSchema = v.looseObject({
  message: v.looseObject({ content: TextBlocksSchema }),
});

/** 单条用户消息保留的字符数。 */
const USER_CHARS = 1200;
/** 一轮里助手回复保留的字符数。 */
const ASSISTANT_CHARS = 1200;
/** 早前摘要保留的字符数。 */
const SUMMARY_CHARS = 1500;
/** 全部上下文的字符预算：超出时从最早的一轮开始丢弃，最近一轮总会保留。 */
const CONTEXT_CHARS = 4000;
/** 超过这么多行的代码块只保留开头几行。 */
const CODE_LINES = 12;
/** 折叠的代码块保留的开头行数。 */
const CODE_HEAD_LINES = 6;

function textOf(blocks: v.InferOutput<typeof TextBlocksSchema>): string {
  return blocks
    .flatMap((block) => (block.type === "text" && block.text !== undefined ? [block.text] : []))
    .join("\n")
    .trim();
}

/** 把会话当前模型视图折成按顺序排列的对话轮次。 */
export function projectTurns(events: readonly SurfaceEvent[]): ContextTurn[] {
  const turns: { kind: ContextTurn["kind"]; user: string; assistant: string[] }[] = [];
  for (const event of events) {
    if (event.type === "user/message") {
      const data = v.parse(UserDataSchema, event.data);
      const kind =
        data.source.kind === "user"
          ? "turn"
          : data.source.kind === "compact-checkpoint"
            ? "summary"
            : undefined;
      if (kind === undefined) continue;
      turns.push({ kind, user: textOf(data.content), assistant: [] });
    } else if (event.type === "assistant/message") {
      const text = textOf(v.parse(AssistantDataSchema, event.data).message.content);
      if (text !== "") turns.at(-1)?.assistant.push(text);
    }
  }
  return turns
    .map((turn) => ({ kind: turn.kind, user: turn.user, assistant: turn.assistant.join("\n\n") }))
    .filter((turn) => turn.user !== "" || turn.assistant !== "");
}

/** 折叠过长的代码块：保留语言标记与开头几行，注明省略的行数。 */
export function foldCodeBlocks(text: string): string {
  return text.replace(
    /^(`{3,}|~{3,})([^\n]*)\n([\s\S]*?)\n\1[ \t]*$/gmu,
    (block, fence: string, info: string, body: string) => {
      const lines = body.split("\n");
      if (lines.length <= CODE_LINES) return block;
      const kept = lines.slice(0, CODE_HEAD_LINES).join("\n");
      const omitted = String(lines.length - CODE_HEAD_LINES);
      return `${fence}${info}\n${kept}\n[… ${omitted} more lines of code …]\n${fence}`;
    },
  );
}

/** 超过 `max` 个字符时保留开头与结尾，中间注明省略了多少字符。 */
export function clip(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = Math.ceil(max * 0.6);
  const tail = Math.floor(max * 0.4);
  const omitted = String(text.length - head - tail);
  return `${text.slice(0, head)}\n[… ${omitted} characters omitted …]\n${text.slice(text.length - tail)}`;
}

/** 发给模型之前的统一清理：抹去凭据、折叠代码块、合并连续空行，再按字数截断。 */
export function condense(text: string, max: number): string {
  const cleaned = foldCodeBlocks(redactSecrets(text)).replace(/\n{3,}/gu, "\n\n");
  return clip(cleaned, max);
}

function condenseTurn(turn: ContextTurn): ContextTurn {
  if (turn.kind === "summary") return { ...turn, user: condense(turn.user, SUMMARY_CHARS) };
  return {
    kind: turn.kind,
    user: condense(turn.user, USER_CHARS),
    assistant: condense(turn.assistant, ASSISTANT_CHARS),
  };
}

function size(turn: ContextTurn): number {
  return turn.user.length + turn.assistant.length;
}

/**
 * 取最近 `limit` 轮并压缩到预算之内。预算不够时先丢最早的轮次；
 * 只剩最近一轮仍然超出时，把它截到预算以内。
 */
export function selectTurns(turns: readonly ContextTurn[], limit: number): ContextTurn[] {
  const selected = turns.slice(-limit).map(condenseTurn);
  while (
    selected.length > 1 &&
    selected.reduce((sum, turn) => sum + size(turn), 0) > CONTEXT_CHARS
  ) {
    selected.shift();
  }
  const last = selected[0];
  if (selected.length === 1 && last !== undefined && size(last) > CONTEXT_CHARS) {
    const share = Math.floor(CONTEXT_CHARS / 2);
    selected[0] = { ...last, user: clip(last.user, share), assistant: clip(last.assistant, share) };
  }
  return selected;
}

/** 选中的内容里真正的对话轮数，不算早前摘要。 */
export function countTurns(turns: readonly ContextTurn[]): number {
  return turns.filter((turn) => turn.kind === "turn").length;
}

/** 把选中的轮次排成改写请求里的上下文段落，最早的在前。 */
export function renderTurns(turns: readonly ContextTurn[]): string {
  let index = 0;
  return turns
    .map((turn) => {
      if (turn.kind === "summary") return `[Summary of earlier conversation]\n${turn.user}`;
      index += 1;
      const lines = [`[Turn ${String(index)}]`, `User: ${turn.user}`];
      if (turn.assistant !== "") lines.push(`Assistant: ${turn.assistant}`);
      return lines.join("\n");
    })
    .join("\n\n");
}
