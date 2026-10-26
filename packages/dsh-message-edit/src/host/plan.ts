/**
 * 三种版本操作的计划：编辑、重新生成、重试。
 *
 * 子版本总是从某个已结束回合的 `turn/start` 之前分支，继承此前的全部事件；被改动的回合要么
 * 手写成一个已结束回合（编辑助手消息），要么作为排队的用户输入重新生成。纯函数，只接收已结束回合。
 */
import type {
  CascadePolicy,
  EditOperation,
  MessageEditEffect,
  MessageEditOperation,
  RerollOperation,
  RetryOperation,
} from "../shared.ts";
import { conflictError } from "./errors.ts";
import type { ClosedTurn } from "./history.ts";
import {
  isTextualBlock,
  type AssistantMessageEvent,
  type ContentBlock,
  type TextualBlock,
  type UserMessageEvent,
} from "./model.ts";

/** 手写回合里的助手回复，只保留文本与思考块。 */
export interface AssistantReply {
  readonly provider: string;
  readonly model: string;
  readonly content: readonly TextualBlock[];
}

/** 子版本里直接写成的一个已结束回合：原用户输入加编辑后的助手回复，不调用模型。 */
export interface ManualTurn {
  readonly turn: number;
  readonly prompt: readonly ContentBlock[];
  readonly reply: AssistantReply;
}

export interface OperationPlan {
  /** 子版本继承的源会话事件里最后一个的 seq（含）；-1 表示不继承任何事件。 */
  readonly boundary: number;
  readonly effect: MessageEditEffect;
  readonly manualTurn?: ManualTurn;
  /** 子版本创建后依次排队的用户输入，每条成为一个新回合。 */
  readonly queuedPrompts: readonly (readonly ContentBlock[])[];
}

function newEffect(draft: Omit<MessageEditEffect, "id">): MessageEditEffect {
  return { id: crypto.randomUUID(), ...draft };
}

/** 替换一个文本或思考块的文本，块的其余字段与其他块原样保留。 */
function replaceText(
  content: readonly ContentBlock[],
  blockIndex: number,
  text: string,
): ContentBlock[] {
  return content.map((block, index) =>
    index === blockIndex && isTextualBlock(block) ? { ...block, text } : block,
  );
}

/** 从第 `start` 个回合起，各回合的用户输入；保留级联时依次重放它们。 */
function laterPrompts(turns: readonly ClosedTurn[], start: number): (readonly ContentBlock[])[] {
  return turns
    .slice(start)
    .flatMap((turn) => (turn.user === undefined ? [] : [turn.user.message.content]));
}

function cascadePrompts(
  cascade: CascadePolicy,
  turns: readonly ClosedTurn[],
  start: number,
): (readonly ContentBlock[])[] {
  return cascade === "preserve" ? laterPrompts(turns, start) : [];
}

function editUserPlan(
  operation: EditOperation,
  turns: readonly ClosedTurn[],
  turnIndex: number,
  turn: ClosedTurn,
  user: UserMessageEvent,
): OperationPlan {
  const before = user.message.content[operation.blockIndex];
  if (before === undefined || !isTextualBlock(before) || before.type !== "text") {
    throw conflictError(
      `会话 ${operation.sessionId} 的用户消息 ${String(user.seq)} 的第 ${String(operation.blockIndex)} 块不是文本`,
    );
  }
  return {
    boundary: turn.startSeq - 1,
    effect: newEffect({
      operation: "edit",
      cascade: operation.cascade,
      targetTurn: turn.turn,
      targetEventSeq: user.seq,
      targetBlockIndex: operation.blockIndex,
      blockKind: "user",
      before: before.text,
      after: operation.text,
    }),
    queuedPrompts: [
      replaceText(user.message.content, operation.blockIndex, operation.text),
      ...cascadePrompts(operation.cascade, turns, turnIndex + 1),
    ],
  };
}

function editAssistantPlan(
  operation: EditOperation,
  turns: readonly ClosedTurn[],
  turnIndex: number,
  turn: ClosedTurn,
  assistant: AssistantMessageEvent,
): OperationPlan {
  const before = assistant.message.content[operation.blockIndex];
  if (before === undefined || !isTextualBlock(before)) {
    throw conflictError(
      `会话 ${operation.sessionId} 的助手消息 ${String(assistant.seq)} 的第 ${String(operation.blockIndex)} 块不是文本或思考`,
    );
  }
  if (turn.user === undefined) {
    throw conflictError(
      `会话 ${operation.sessionId} 的回合 ${String(turn.turn)} 没有用户输入，无法重建助手消息 ${String(assistant.seq)}`,
    );
  }
  return {
    boundary: turn.startSeq - 1,
    effect: newEffect({
      operation: "edit",
      cascade: operation.cascade,
      targetTurn: turn.turn,
      targetEventSeq: assistant.seq,
      targetBlockIndex: operation.blockIndex,
      blockKind: before.type === "reasoning" ? "assistant.reasoning" : "assistant.response",
      before: before.text,
      after: operation.text,
    }),
    manualTurn: {
      turn: turn.turn,
      prompt: turn.user.message.content,
      reply: {
        provider: assistant.message.provider,
        model: assistant.message.model,
        content: replaceText(
          assistant.message.content,
          operation.blockIndex,
          operation.text,
        ).filter(isTextualBlock),
      },
    },
    queuedPrompts: cascadePrompts(operation.cascade, turns, turnIndex + 1),
  };
}

/** 编辑一个文本块：用户消息改写后重新生成，助手消息改写后直接写成已结束回合。 */
function editPlan(operation: EditOperation, turns: readonly ClosedTurn[]): OperationPlan {
  const turnIndex = turns.findIndex(
    (turn) => operation.eventSeq > turn.startSeq && operation.eventSeq < turn.endSeq,
  );
  const turn = turns[turnIndex];
  if (turn === undefined) {
    throw conflictError(
      `会话 ${operation.sessionId} 的事件 ${String(operation.eventSeq)} 不在已结束的回合里`,
    );
  }
  if (turn.user?.seq === operation.eventSeq) {
    return editUserPlan(operation, turns, turnIndex, turn, turn.user);
  }
  const assistant = turn.assistants.find((event) => event.seq === operation.eventSeq);
  if (assistant === undefined) {
    throw conflictError(
      `会话 ${operation.sessionId} 的事件 ${String(operation.eventSeq)} 不是可编辑的消息`,
    );
  }
  return editAssistantPlan(operation, turns, turnIndex, turn, assistant);
}

/** 重新生成最后一个带文本回复的已结束用户回合。 */
function rerollPlan(operation: RerollOperation, turns: readonly ClosedTurn[]): OperationPlan {
  for (const turn of turns.toReversed()) {
    if (turn.user === undefined) continue;
    const target = turn.assistants.findLast((event) => event.message.content.some(isTextualBlock));
    if (target === undefined) continue;
    return {
      boundary: turn.startSeq - 1,
      effect: newEffect({
        operation: "reroll",
        cascade: "truncate",
        targetTurn: turn.turn,
        targetEventSeq: target.seq,
      }),
      queuedPrompts: [turn.user.message.content],
    };
  }
  throw conflictError(`会话 ${operation.sessionId} 没有可以重新生成的已结束助手回复`);
}

/** 重试一个历史回合：截断时只重放它，保留时连同后续回合的用户输入一起重放。 */
function retryPlan(operation: RetryOperation, turns: readonly ClosedTurn[]): OperationPlan {
  const turnIndex = turns.findIndex((turn) => turn.turn === operation.turn);
  const turn = turns[turnIndex];
  if (turn?.user === undefined) {
    throw conflictError(
      `会话 ${operation.sessionId} 的回合 ${String(operation.turn)} 不是由用户输入触发的已结束回合`,
    );
  }
  return {
    boundary: turn.startSeq - 1,
    effect: newEffect({
      operation: "retry",
      cascade: operation.cascade,
      targetTurn: turn.turn,
      targetEventSeq: turn.user.seq,
    }),
    queuedPrompts:
      operation.cascade === "preserve"
        ? laterPrompts(turns, turnIndex)
        : [turn.user.message.content],
  };
}

export function planOperation(
  operation: MessageEditOperation,
  turns: readonly ClosedTurn[],
): OperationPlan {
  if (operation.action === "edit") return editPlan(operation, turns);
  if (operation.action === "reroll") return rerollPlan(operation, turns);
  return retryPlan(operation, turns);
}
