import { describe, expect, test } from "vitest";
import { parseLogEvents } from "./dsh-read.ts";
import type { DshSessionEvent } from "./dsh.ts";
import {
  closedTurns,
  editableMessages,
  latestRoute,
  retryableTurns,
  sessionPreset,
} from "./history.ts";
import { image, numbered, reasoning, ROUTE, text, turnDrafts, turnsLog } from "./testing.ts";

function view(events: readonly DshSessionEvent[]) {
  return parseLogEvents("session-test", events);
}

describe("closedTurns", () => {
  test("folds turn brackets and leaves the open tail out", () => {
    const events = numbered([
      ...turnDrafts(0, { turn: 0, prompt: [text("你好")], reply: [text("在")] }),
      { type: "turn/start", data: { turn: 1 } },
      {
        type: "user/message",
        data: { id: "user-1", role: "user", content: [text("继续")], source: { kind: "user" } },
        surfaceOp: "append",
      },
    ]);
    const turns = closedTurns(view(events));
    expect(turns).toHaveLength(1);
    expect(turns[0]).toMatchObject({ turn: 0, startSeq: 0, endSeq: 6, user: { seq: 1 } });
    expect(turns[0]?.assistants.map((event) => event.seq)).toEqual([4]);
  });

  test("takes the first user-sourced message and skips injected context", () => {
    const events = numbered([
      { type: "turn/start", data: { turn: 0 } },
      {
        type: "user/message",
        data: {
          id: "notice",
          role: "user",
          content: [text("文件已变更")],
          source: { kind: "plugin", plugin: "fs" },
        },
        surfaceOp: "append",
      },
      {
        type: "user/message",
        data: { id: "prompt", role: "user", content: [text("修一下")], source: { kind: "user" } },
        surfaceOp: "append",
      },
      { type: "turn/end", data: { turn: 0, reason: { kind: "completed" } } },
    ]);
    expect(closedTurns(view(events))[0]?.user?.message.id).toBe("prompt");
  });

  test("keeps turns without user input so the timeline stays aligned", () => {
    const events = turnsLog(4, [{ turn: 0, reply: [text("提醒已处理")] }]);
    const [turn] = closedTurns(view(events));
    expect(turn?.user).toBeUndefined();
    expect(turn?.assistants).toHaveLength(1);
  });
});

describe("editableMessages", () => {
  test("lists user text blocks and assistant text and reasoning blocks with message ids", () => {
    const events = turnsLog(0, [
      {
        turn: 0,
        prompt: [text("看图"), image("a1")],
        reply: [reasoning("先想想"), text("这是猫"), { type: "tool-call", id: "c", name: "x" }],
      },
    ]);
    expect(editableMessages(closedTurns(view(events)))).toEqual([
      {
        key: "1:0",
        turn: 0,
        eventSeq: 1,
        blockIndex: 0,
        kind: "user",
        text: "看图",
        time: 1_001,
      },
      {
        key: "4:0",
        turn: 0,
        eventSeq: 4,
        blockIndex: 0,
        kind: "assistant.reasoning",
        text: "先想想",
        time: 1_004,
        messageId: "assistant-0",
      },
      {
        key: "4:1",
        turn: 0,
        eventSeq: 4,
        blockIndex: 1,
        kind: "assistant.response",
        text: "这是猫",
        time: 1_004,
        messageId: "assistant-0",
      },
    ]);
  });
});

describe("retryableTurns", () => {
  test("lists only turns triggered by user input and previews their text", () => {
    const events = turnsLog(4, [
      { turn: 0, prompt: [text("第一行"), image("a"), text("第二行")], reply: [text("好")] },
      { turn: 1, reply: [text("提醒")] },
    ]);
    expect(retryableTurns(closedTurns(view(events)))).toEqual([
      { turn: 0, userEventSeq: 1, preview: "第一行\n第二行", time: 1_001 },
    ]);
  });
});

describe("latestRoute", () => {
  test("returns the route of the last request header", () => {
    const events = numbered([
      { type: "request/header", data: { header: { config: ROUTE }, reason: "initial" } },
      {
        type: "request/header",
        data: {
          header: { config: { provider: "p", model: "m", maxTokens: 8, reasoningEffort: "high" } },
          reason: "change",
        },
      },
    ]);
    expect(latestRoute(view(events))).toEqual({
      provider: "p",
      model: "m",
      maxTokens: 8,
      reasoningEffort: "high",
    });
  });

  test("returns undefined before any request", () => {
    expect(latestRoute([])).toBeUndefined();
  });
});

describe("sessionPreset", () => {
  test("prefers the latest logged selection over the header preset", () => {
    const events = numbered([
      { type: "agent-preset/selected", data: { agentPreset: "coder" } },
      { type: "agent-preset/selected", data: { agentPreset: "writer" } },
    ]);
    expect(sessionPreset(view(events), "default")).toBe("writer");
  });

  test("uses the header preset when no selection is logged", () => {
    expect(sessionPreset([], "default")).toBe("default");
  });
});
