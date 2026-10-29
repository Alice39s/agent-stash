import { describe, expect, test } from "vitest";
import type { MessageEditOperation } from "../shared.ts";
import { parseLogEvents } from "./dsh-read.ts";
import { isConflictError } from "./errors.ts";
import { closedTurns, type ClosedTurn } from "./history.ts";
import { planOperation } from "./plan.ts";
import {
  image,
  numbered,
  reasoning,
  ROUTE,
  text,
  turnDrafts,
  turnsLog,
  unansweredTurnDrafts,
} from "./testing.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const SESSION = "session-source";

/**
 * 回合 0（seq 0–6）：用户 seq 1，助手 seq 4。
 * 回合 1（seq 7–13）：只有插件注入的消息，助手 seq 11。
 * 回合 2（seq 14–20）：用户 seq 15，助手 seq 18。
 */
const TURNS = closedTurns(
  parseLogEvents(
    SESSION,
    turnsLog(0, [
      { turn: 0, prompt: [text("问一"), image("img")], reply: [reasoning("想一"), text("答一")] },
      { turn: 1, reply: [text("提醒")] },
      { turn: 2, prompt: [text("问三")], reply: [text("答三")] },
    ]),
  ),
);

/** 回合 0（seq 0–6）正常结束；回合 1（seq 7–11）报错，只留下用户消息 seq 8。 */
const FAILED_TURNS = closedTurns(
  parseLogEvents(
    SESSION,
    numbered([
      ...turnDrafts(4, { turn: 0, prompt: [text("问一")], reply: [text("答一")] }),
      ...unansweredTurnDrafts(1, [text("问二"), image("img")], {
        kind: "error",
        error: { message: "400", code: "INVALID_REQUEST" },
      }),
    ]),
  ),
);

function plan(operation: MessageEditOperation) {
  return planOperation(operation, TURNS);
}

function conflictOf(operation: MessageEditOperation, turns: readonly ClosedTurn[] = TURNS): Error {
  try {
    planOperation(operation, turns);
  } catch (error) {
    if (error instanceof Error) return error;
  }
  throw new Error("expected planOperation to throw");
}

describe("edit plans", () => {
  test("branch before the turn and replay an edited user prompt", () => {
    const result = plan({
      action: "edit",
      sessionId: SESSION,
      eventSeq: 1,
      blockIndex: 0,
      text: "改一",
      cascade: "truncate",
    });
    expect(result).toEqual({
      boundary: -1,
      effect: {
        id: expect.stringMatching(UUID),
        operation: "edit",
        cascade: "truncate",
        targetTurn: 0,
        targetEventSeq: 1,
        targetBlockIndex: 0,
        blockKind: "user",
        before: "问一",
        after: "改一",
      },
      queuedPrompts: [[text("改一"), image("img")]],
    });
  });

  test("replay later user prompts when the cascade preserves them", () => {
    const result = plan({
      action: "edit",
      sessionId: SESSION,
      eventSeq: 1,
      blockIndex: 0,
      text: "改一",
      cascade: "preserve",
    });
    expect(result.queuedPrompts).toEqual([[text("改一"), image("img")], [text("问三")]]);
  });

  test("write an edited assistant reply as a closed manual turn", () => {
    const result = plan({
      action: "edit",
      sessionId: SESSION,
      eventSeq: 4,
      blockIndex: 1,
      text: "改答",
      cascade: "truncate",
    });
    expect(result).toMatchObject({
      boundary: -1,
      effect: {
        targetEventSeq: 4,
        targetBlockIndex: 1,
        blockKind: "assistant.response",
        before: "答一",
        after: "改答",
      },
      manualTurn: {
        turn: 0,
        prompt: [text("问一"), image("img")],
        reply: { ...ROUTE, content: [reasoning("想一"), text("改答")] },
      },
      queuedPrompts: [],
    });
  });

  test("classify an edited reasoning block and keep later prompts on preserve", () => {
    const result = plan({
      action: "edit",
      sessionId: SESSION,
      eventSeq: 4,
      blockIndex: 0,
      text: "改想",
      cascade: "preserve",
    });
    expect(result.effect.blockKind).toBe("assistant.reasoning");
    expect(result.manualTurn?.reply.content).toEqual([reasoning("改想"), text("答一")]);
    expect(result.queuedPrompts).toEqual([[text("问三")]]);
  });

  test("replay the edited prompt of a turn that ended without a reply", () => {
    const result = planOperation(
      {
        action: "edit",
        sessionId: SESSION,
        eventSeq: 8,
        blockIndex: 0,
        text: "改二",
        cascade: "truncate",
      },
      FAILED_TURNS,
    );
    expect(result).toMatchObject({
      boundary: 6,
      effect: {
        targetTurn: 1,
        targetEventSeq: 8,
        blockKind: "user",
        before: "问二",
        after: "改二",
      },
      queuedPrompts: [[text("改二"), image("img")]],
    });
    expect(result.manualTurn).toBeUndefined();
  });

  test("branch right after the previous turn for later turns", () => {
    const result = plan({
      action: "edit",
      sessionId: SESSION,
      eventSeq: 15,
      blockIndex: 0,
      text: "改三",
      cascade: "truncate",
    });
    expect(result.boundary).toBe(13);
  });

  test.each([
    [7, 0, "不在已结束的回合里"],
    [9, 0, "不是可编辑的消息"],
    [1, 1, "不是文本"],
    [11, 0, "没有用户输入"],
  ])("reject event %i block %i as a conflict", (eventSeq, blockIndex, message) => {
    const error = conflictOf({
      action: "edit",
      sessionId: SESSION,
      eventSeq,
      blockIndex,
      text: "x",
      cascade: "truncate",
    });
    expect(isConflictError(error)).toBe(true);
    expect(error.message).toContain(SESSION);
    expect(error.message).toContain(message);
  });
});

describe("reroll plans", () => {
  test("regenerate the last user turn that has a text reply", () => {
    expect(plan({ action: "reroll", sessionId: SESSION })).toEqual({
      boundary: 13,
      effect: {
        id: expect.stringMatching(UUID),
        operation: "reroll",
        cascade: "truncate",
        targetTurn: 2,
        targetEventSeq: 18,
      },
      queuedPrompts: [[text("问三")]],
    });
  });

  test("regenerate a trailing turn whose reply has no text and target its prompt", () => {
    const turns = closedTurns(
      parseLogEvents(
        SESSION,
        turnsLog(4, [
          { turn: 0, prompt: [text("问")], reply: [text("答")] },
          { turn: 1, prompt: [text("跑工具")], reply: [{ type: "tool-call", id: "c", name: "x" }] },
        ]),
      ),
    );
    expect(planOperation({ action: "reroll", sessionId: SESSION }, turns)).toMatchObject({
      boundary: 6,
      effect: { targetTurn: 1, targetEventSeq: 8 },
      queuedPrompts: [[text("跑工具")]],
    });
  });

  test("regenerate a trailing turn that failed before replying", () => {
    expect(planOperation({ action: "reroll", sessionId: SESSION }, FAILED_TURNS)).toMatchObject({
      boundary: 6,
      effect: { operation: "reroll", targetTurn: 1, targetEventSeq: 8 },
      queuedPrompts: [[text("问二"), image("img")]],
    });
  });

  test("reject a session without a closed user turn", () => {
    const injectedOnly = closedTurns(
      parseLogEvents(SESSION, turnsLog(4, [{ turn: 0, reply: [text("提醒")] }])),
    );
    for (const turns of [[], injectedOnly]) {
      const error = conflictOf({ action: "reroll", sessionId: SESSION }, turns);
      expect(isConflictError(error)).toBe(true);
      expect(error.message).toContain("无法重新生成");
    }
  });
});

describe("retry plans", () => {
  test("replay only the retried prompt on truncate", () => {
    expect(plan({ action: "retry", sessionId: SESSION, turn: 0, cascade: "truncate" })).toEqual({
      boundary: -1,
      effect: {
        id: expect.stringMatching(UUID),
        operation: "retry",
        cascade: "truncate",
        targetTurn: 0,
        targetEventSeq: 1,
      },
      queuedPrompts: [[text("问一"), image("img")]],
    });
  });

  test("replay the retried prompt and every later user prompt on preserve", () => {
    const result = plan({ action: "retry", sessionId: SESSION, turn: 0, cascade: "preserve" });
    expect(result.queuedPrompts).toEqual([[text("问一"), image("img")], [text("问三")]]);
  });

  test("replay the prompt of a turn that ended without a reply", () => {
    const result = planOperation(
      { action: "retry", sessionId: SESSION, turn: 1, cascade: "truncate" },
      FAILED_TURNS,
    );
    expect(result).toMatchObject({
      boundary: 6,
      effect: { targetTurn: 1, targetEventSeq: 8 },
      queuedPrompts: [[text("问二"), image("img")]],
    });
  });

  test.each([1, 9])("reject turn %i that has no user input", (turn) => {
    const error = conflictOf({ action: "retry", sessionId: SESSION, turn, cascade: "truncate" });
    expect(isConflictError(error)).toBe(true);
    expect(error.message).toContain(`回合 ${String(turn)}`);
  });
});
