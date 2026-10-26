/** 浏览器半边测试共用的翻译函数、时间线样例与注入面替身。 */
import type {
  EditableMessageBlock,
  MessageEditEffect,
  MessageEditTimeline,
  VersionSummary,
} from "../shared.ts";
import type { MessageEditFace, MessageEditState } from "./controller.ts";
import { MESSAGE_EDIT_DICTIONARIES, type MessageEditTranslate } from "./locale.ts";
import { createSnapshotStore } from "./store.ts";

/** 与宿主 `locale.bind` 相同的 `{name}` 插值；缺参数时直接报错。 */
export function translator(locale: "en" | "zh"): MessageEditTranslate {
  const dictionary = MESSAGE_EDIT_DICTIONARIES[locale];
  return (key, params = {}) =>
    dictionary[key].replaceAll(/\{(\w+)\}/gu, (_match, name: string) => {
      const value = params[name];
      if (value === undefined) throw new Error(`missing parameter ${name} for ${key}`);
      return String(value);
    });
}

export function block(
  fields: Pick<EditableMessageBlock, "turn" | "eventSeq" | "blockIndex" | "kind" | "text"> &
    Partial<EditableMessageBlock>,
): EditableMessageBlock {
  return {
    key: `${String(fields.eventSeq)}:${String(fields.blockIndex)}`,
    time: 1_000 + fields.eventSeq,
    ...fields,
  };
}

function effect(
  fields: Partial<MessageEditEffect> & Pick<MessageEditEffect, "operation">,
): MessageEditEffect {
  return {
    id: "6f1c1b8e-2d4a-4c1e-9a4b-8d1f0c2e3a5b",
    cascade: "truncate",
    targetTurn: 1,
    targetEventSeq: 1,
    ...fields,
  };
}

function version(
  fields: Pick<VersionSummary, "sessionId" | "depth"> & Partial<VersionSummary>,
): VersionSummary {
  return { createdAt: 5_000, current: false, onCurrentEffectPath: false, ...fields };
}

/**
 * 三个回合，回合号与 DSH 一样从 1 开始：回合 1 与 2 由用户触发，回合 3 是插件注入的回合（没有用户输入）。
 * 版本树：root → current（编辑）→ 两个子版本；root 下另有一个重试分支。
 */
export const TIMELINE: MessageEditTimeline = {
  sessionId: "current-session",
  messages: [
    block({ turn: 1, eventSeq: 1, blockIndex: 0, kind: "user", text: "Hello" }),
    block({
      turn: 1,
      eventSeq: 3,
      blockIndex: 0,
      kind: "assistant.reasoning",
      text: "Thinking",
      messageId: "m0",
    }),
    block({
      turn: 1,
      eventSeq: 3,
      blockIndex: 1,
      kind: "assistant.response",
      text: "Hi there",
      messageId: "m0",
    }),
    block({ turn: 2, eventSeq: 11, blockIndex: 0, kind: "user", text: "" }),
    block({
      turn: 2,
      eventSeq: 13,
      blockIndex: 0,
      kind: "assistant.response",
      text: "Second reply",
      messageId: "m1",
    }),
    block({
      turn: 3,
      eventSeq: 21,
      blockIndex: 0,
      kind: "assistant.response",
      text: "Reminder handled",
      messageId: "m2",
    }),
  ],
  retryableTurns: [
    { turn: 1, userEventSeq: 1, preview: "Hello", time: 1_001 },
    { turn: 2, userEventSeq: 11, preview: "", time: 1_011 },
  ],
  versions: [
    version({ sessionId: "root-session", depth: 0, createdAt: 1_000, onCurrentEffectPath: true }),
    version({
      sessionId: "current-session",
      parentSessionId: "root-session",
      depth: 1,
      createdAt: 2_000,
      current: true,
      onCurrentEffectPath: true,
      effect: effect({
        operation: "edit",
        blockKind: "user",
        targetTurn: 1,
        before: "Hi",
        after: "Hello",
      }),
    }),
    version({
      sessionId: "older-child",
      parentSessionId: "current-session",
      depth: 2,
      createdAt: 3_000,
      effect: effect({ operation: "reroll", targetTurn: 2 }),
    }),
    version({
      sessionId: "newer-child",
      parentSessionId: "current-session",
      depth: 2,
      createdAt: 4_000,
      effect: effect({ operation: "retry", targetTurn: 2, cascade: "preserve" }),
    }),
    version({
      sessionId: "grandchild",
      parentSessionId: "newer-child",
      depth: 3,
      createdAt: 4_500,
      effect: effect({ operation: "edit", targetTurn: 2, before: "", after: "Filled" }),
    }),
    version({ sessionId: "fork-session", parentSessionId: "root-session", depth: 1 }),
  ],
  undoStack: ["root-session"],
  redoSessionIds: ["older-child", "newer-child"],
};

export const READY: MessageEditState = {
  status: "ready",
  error: null,
  pending: null,
  timeline: TIMELINE,
};

/** 注入面替身：读固定的快照，操作一律成功。 */
export function faceOf(state: MessageEditState): MessageEditFace {
  return {
    store: createSnapshotStore(state),
    acquire: () => () => {},
    load: () => {},
    edit: async () => true,
    retry: async () => true,
    reroll: async () => true,
    openVersion: () => {},
  };
}
