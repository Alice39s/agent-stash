import { describe, expect, test } from "vitest";
import type { MessageEditOperation } from "../shared.ts";
import { agentOptions, forkRequest, userMessage } from "./fork.ts";
import { closedTurns } from "./history.ts";
import type { SessionFormat } from "./model.ts";
import { planOperation, type OperationPlan } from "./plan.ts";
import { image, ROUTE, sessionLog, text, turnsLog } from "./testing.ts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TIME = 5_000;
const MANUAL_TYPES = [
  "turn/start",
  "user/message",
  "step/start",
  "assistant/message",
  "step/end",
  "turn/end",
];

/** 两个完整回合（seq 0–13）；编辑回合 1 的助手回复，继承前缀是 seq 0–6。 */
function source(format: SessionFormat) {
  return sessionLog(
    format,
    turnsLog(format, [
      { turn: 0, prompt: [text("问一")], reply: [text("答一")] },
      { turn: 1, prompt: [text("问二"), image("img")], reply: [text("答二")] },
    ]),
  );
}

function plan(format: SessionFormat, operation: MessageEditOperation) {
  return planOperation(operation, closedTurns(source(format).view));
}

const EDIT_REPLY: MessageEditOperation = {
  action: "edit",
  sessionId: "session-source",
  eventSeq: 11,
  blockIndex: 0,
  text: "改二",
  cascade: "truncate",
};

describe("forkRequest for format 0", () => {
  test("inherits the prefix and records it as meta.seedLength without an end-seed marker", () => {
    const log = source(0);
    const fork = forkRequest(log, plan(0, EDIT_REPLY), "coder", TIME);
    expect(fork.seed.slice(0, 7)).toEqual(log.events.slice(0, 7));
    expect(fork.seed.slice(7).map((event) => event.type)).toEqual(MANUAL_TYPES);
    expect(fork.seed.map((event) => event.seq)).toEqual([...Array(13).keys()]);
    expect(fork.seed.some((event) => event.type === "session/end-seed")).toBe(false);
    expect(fork.meta).toEqual({
      cwd: "/work",
      parentSession: "session-source",
      agentPreset: "coder",
      seedLength: 7,
    });
    expect(fork).not.toHaveProperty("inheritedEventCount");
  });

  test("writes the manual turn without stream or sourceEventSeqs", () => {
    const fork = forkRequest(source(0), plan(0, EDIT_REPLY), undefined, TIME);
    const [turnStart, user, , assistant, , turnEnd] = fork.seed.slice(7);
    expect(turnStart).toEqual({ type: "turn/start", seq: 7, time: TIME, data: { turn: 1 } });
    expect(user).toEqual({
      type: "user/message",
      seq: 8,
      time: TIME,
      data: {
        id: expect.stringMatching(UUID),
        role: "user",
        content: [text("问二"), image("img")],
        source: { kind: "user" },
      },
      surfaceOp: "append",
    });
    expect(assistant).toEqual({
      type: "assistant/message",
      seq: 10,
      time: TIME,
      data: {
        turn: 1,
        step: 1,
        message: {
          id: expect.stringMatching(UUID),
          role: "assistant",
          content: [text("改二")],
          source: { kind: "model", ...ROUTE },
        },
      },
      surfaceOp: "append",
    });
    expect(turnEnd?.data).toEqual({ turn: 1, reason: { kind: "completed" } });
  });

  test("seeds exactly the inherited prefix when the plan has no manual turn", () => {
    const log = source(0);
    const fork = forkRequest(log, plan(0, { action: "reroll", sessionId: log.id }), "coder", TIME);
    expect(fork.seed).toEqual(log.events.slice(0, 7));
    expect(fork.meta).toMatchObject({ seedLength: 7 });
  });
});

describe("forkRequest for format 4", () => {
  test("marks the inherited cut and passes inheritedEventCount with meta.isSeeded", () => {
    const log = source(4);
    const fork = forkRequest(log, plan(4, EDIT_REPLY), "coder", TIME);
    expect(fork.seed.slice(0, 7)).toEqual(log.events.slice(0, 7));
    expect(fork.seed[7]).toEqual({
      type: "session/end-seed",
      seq: 7,
      time: TIME,
      data: { inherited: true },
    });
    expect(fork.seed.slice(8).map((event) => event.type)).toEqual(MANUAL_TYPES);
    expect(fork.seed.map((event) => event.seq)).toEqual([...Array(14).keys()]);
    expect(fork.meta).toEqual({
      cwd: "/work",
      parentSession: "session-source",
      agentPreset: "coder",
      isSeeded: true,
    });
    expect(fork.inheritedEventCount).toBe(7);
  });

  test("gives the manual assistant message an empty stream and no sourceEventSeqs", () => {
    const fork = forkRequest(source(4), plan(4, EDIT_REPLY), undefined, TIME);
    const assistant = fork.seed.find(
      (event) => event.type === "assistant/message" && event.seq > 7,
    );
    expect(assistant).not.toHaveProperty("sourceEventSeqs");
    expect(assistant?.data).toMatchObject({ turn: 1, step: 1, stream: [] });
  });

  test("places the marker at seq 0 when nothing is inherited", () => {
    const log = source(4);
    const fork = forkRequest(
      log,
      plan(4, { action: "retry", sessionId: log.id, turn: 0, cascade: "preserve" }),
      undefined,
      TIME,
    );
    expect(fork.seed).toEqual([
      { type: "session/end-seed", seq: 0, time: TIME, data: { inherited: true } },
    ]);
    expect(fork.inheritedEventCount).toBe(0);
    expect(fork.meta).toEqual({ cwd: "/work", parentSession: "session-source", isSeeded: true });
  });
});

describe("forkRequest boundaries", () => {
  test("rejects a boundary outside the source log", () => {
    const log = source(0);
    const broken: OperationPlan = {
      ...plan(0, { action: "reroll", sessionId: log.id }),
      boundary: 99,
    };
    expect(() => forkRequest(log, broken, undefined, TIME)).toThrow(
      "会话 session-source 的分支边界 99",
    );
  });
});

describe("userMessage", () => {
  test("wraps the prompt blocks in a fresh user-sourced message", () => {
    expect(userMessage([text("hi"), image("a")])).toEqual({
      id: expect.stringMatching(UUID),
      role: "user",
      content: [text("hi"), image("a")],
      source: { kind: "user" },
    });
  });
});

describe("agentOptions", () => {
  const route = { provider: "p", model: "m", maxTokens: 64, reasoningEffort: "high" };

  test("carries reasoning effort for format 4", () => {
    expect(agentOptions("s", 4, route, undefined)).toEqual(route);
  });

  test("drops reasoning effort for format 0", () => {
    expect(agentOptions("s", 0, route, undefined)).toEqual({
      provider: "p",
      model: "m",
      maxTokens: 64,
    });
  });

  test("uses the current agent options when the log has no request yet", () => {
    expect(agentOptions("s", 4, undefined, { provider: "a", model: "b" })).toEqual({
      provider: "a",
      model: "b",
    });
  });

  test("rejects a session without any model route", () => {
    expect(() => agentOptions("session-x", 0, undefined, {})).toThrow("会话 session-x");
  });
});
