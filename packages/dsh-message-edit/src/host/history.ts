/**
 * 会话历史的折叠：已结束回合、可编辑块、可重试回合，以及最近一次的模型路由与 Agent 预设。
 * 只接收 `LogEvent` 视图，不接触 DSH 对象。
 */
import type { EditableMessageBlock, RetryableTurn } from "../shared.ts";
import {
  isTextualBlock,
  type AssistantMessageEvent,
  type LogEvent,
  type ModelRoute,
  type UserMessageEvent,
} from "./model.ts";

/** 一个由 `turn/start` 与同号 `turn/end` 包住的回合。 */
export interface ClosedTurn {
  readonly turn: number;
  readonly startSeq: number;
  readonly endSeq: number;
  /** 回合里第一条来自用户的消息；只有插件注入的回合没有它。 */
  readonly user?: UserMessageEvent;
  readonly assistants: readonly AssistantMessageEvent[];
}

interface OpenTurn {
  readonly turn: number;
  readonly startSeq: number;
  user?: UserMessageEvent;
  readonly assistants: AssistantMessageEvent[];
}

/** 折叠出已经结束的回合；仍在进行的尾部回合不在结果里。 */
export function closedTurns(view: readonly LogEvent[]): ClosedTurn[] {
  const turns: ClosedTurn[] = [];
  let open: OpenTurn | undefined;
  for (const event of view) {
    switch (event.type) {
      case "turn/start":
        open = { turn: event.turn, startSeq: event.seq, assistants: [] };
        break;
      case "user/message":
        if (open !== undefined && open.user === undefined && event.message.sourceKind === "user") {
          open.user = event;
        }
        break;
      case "assistant/message":
        if (open?.turn === event.turn) open.assistants.push(event);
        break;
      case "turn/end":
        if (open?.turn === event.turn) {
          turns.push({ ...open, endSeq: event.seq });
          open = undefined;
        }
        break;
      case "request/header":
      case "agent-preset/selected":
        break;
    }
  }
  return turns;
}

/** 用户消息里的文本块；思考块只出现在助手消息里。 */
function userBlocks(turn: number, user: UserMessageEvent): EditableMessageBlock[] {
  return user.message.content.flatMap((block, blockIndex): EditableMessageBlock[] =>
    isTextualBlock(block) && block.type === "text"
      ? [
          {
            key: `${String(user.seq)}:${String(blockIndex)}`,
            turn,
            eventSeq: user.seq,
            blockIndex,
            kind: "user",
            text: block.text,
            time: user.time,
          },
        ]
      : [],
  );
}

/** 助手消息里的文本与思考块，带上消息 id 供聊天区的消息动作行对应。 */
function assistantBlocks(turn: number, event: AssistantMessageEvent): EditableMessageBlock[] {
  return event.message.content.flatMap((block, blockIndex): EditableMessageBlock[] =>
    isTextualBlock(block)
      ? [
          {
            key: `${String(event.seq)}:${String(blockIndex)}`,
            turn,
            eventSeq: event.seq,
            blockIndex,
            kind: block.type === "reasoning" ? "assistant.reasoning" : "assistant.response",
            text: block.text,
            time: event.time,
            messageId: event.message.id,
          },
        ]
      : [],
  );
}

/** 已结束回合里可以编辑的文本块，按回合内的事件顺序排列。 */
export function editableMessages(turns: readonly ClosedTurn[]): EditableMessageBlock[] {
  return turns.flatMap((turn) => [
    ...(turn.user === undefined ? [] : userBlocks(turn.turn, turn.user)),
    ...turn.assistants.flatMap((event) => assistantBlocks(turn.turn, event)),
  ]);
}

/** 用户消息的纯文本，各文本块以换行连接。 */
export function userText(event: UserMessageEvent): string {
  return event.message.content
    .flatMap((block) => (isTextualBlock(block) && block.type === "text" ? [block.text] : []))
    .join("\n");
}

/** 由用户消息触发、可以重试的已结束回合。 */
export function retryableTurns(turns: readonly ClosedTurn[]): RetryableTurn[] {
  return turns.flatMap((turn): RetryableTurn[] =>
    turn.user === undefined
      ? []
      : [
          {
            turn: turn.turn,
            userEventSeq: turn.user.seq,
            preview: userText(turn.user),
            time: turn.user.time,
          },
        ],
  );
}

/** 最近一次请求使用的模型路由；还没有发出过请求时返回 undefined。 */
export function latestRoute(view: readonly LogEvent[]): ModelRoute | undefined {
  return view.findLast((event) => event.type === "request/header")?.route;
}

/** 会话实际使用的 Agent 预设：最近一次切换优先，否则是 header 记录的创建时预设。 */
export function sessionPreset(
  view: readonly LogEvent[],
  headerPreset: string | undefined,
): string | undefined {
  const selected = view.findLast((event) => event.type === "agent-preset/selected");
  return selected === undefined ? headerPreset : selected.agentPreset;
}
