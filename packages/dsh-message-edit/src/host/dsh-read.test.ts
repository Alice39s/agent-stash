import { describe, expect, test } from "vitest";
import { flattenLineage, parseLogEvents, sessionFormat, storedSessionLog } from "./dsh-read.ts";
import type { DshLineageNode, DshSessionHeader } from "./dsh.ts";
import { image, numbered, reasoning, ROUTE, text, turnsLog } from "./testing.ts";

const TURN = { turn: 0, prompt: [text("问"), image("img")], reply: [reasoning("想"), text("答")] };

describe("parseLogEvents", () => {
  test("reads the same view from format 0 and format 4 logs", () => {
    const v0 = parseLogEvents("s", turnsLog(0, [TURN]));
    const v4 = parseLogEvents("s", turnsLog(4, [TURN]));
    expect(v4).toEqual(v0);
    expect(v0).toEqual([
      { type: "turn/start", seq: 0, turn: 0 },
      {
        type: "user/message",
        seq: 1,
        time: 1_001,
        message: { id: "user-0", sourceKind: "user", content: [text("问"), image("img")] },
      },
      { type: "request/header", seq: 3, route: ROUTE },
      {
        type: "assistant/message",
        seq: 4,
        time: 1_004,
        turn: 0,
        message: { id: "assistant-0", ...ROUTE, content: [reasoning("想"), text("答")] },
      },
      { type: "turn/end", seq: 6, turn: 0 },
    ]);
  });

  test("keeps every field of text and opaque content blocks", () => {
    const blocks = [
      { type: "text", text: "注", note: "kept" },
      { type: "file", attachment: { id: "f", sizes: [1, 2] } },
    ];
    const [event] = parseLogEvents(
      "s",
      numbered([
        {
          type: "user/message",
          data: { id: "u", role: "user", content: blocks, source: { kind: "user" } },
        },
      ]),
    );
    expect(event).toMatchObject({ message: { content: blocks } });
  });

  test("skips event types the plugin does not interpret", () => {
    const view = parseLogEvents(
      "s",
      numbered([
        { type: "session/end-seed", data: { inherited: true } },
        { type: "todo/write", data: { todos: [] } },
        { type: "agent-preset/selected", data: { agentPreset: "coder" } },
      ]),
    );
    expect(view).toEqual([{ type: "agent-preset/selected", seq: 2, agentPreset: "coder" }]);
  });

  test("rejects a malformed interpreted event with its session, seq, and type", () => {
    const events = numbered([
      { type: "turn/start", data: { turn: 0 } },
      { type: "user/message", data: { id: "u", role: "user", content: [{ type: "text" }] } },
    ]);
    expect(() => parseLogEvents("session-x", events)).toThrow(
      "会话 session-x 的事件 1（user/message）结构不符",
    );
  });
});

function header(version: number): DshSessionHeader {
  return { version, id: "session-x", createdAt: 0 };
}

function node(id: string, createdAt: number, descendants: DshLineageNode[] = []): DshLineageNode {
  return { session: { header: { version: 4, id, createdAt, parentSession: "p" } }, descendants };
}

describe("sessionFormat", () => {
  test.each([0, 4] as const)("accepts format %i", (version) => {
    expect(sessionFormat(header(version))).toBe(version);
  });

  test.each([1, 3, 5])("rejects format %i", (version) => {
    expect(() => sessionFormat(header(version))).toThrow(
      `会话 session-x 的格式版本 ${String(version)} 不受支持`,
    );
  });
});

describe("storedSessionLog", () => {
  test("keeps the raw events and the header fields used by forks", () => {
    const events = turnsLog(4, [TURN]);
    const log = storedSessionLog({
      session: { version: 4, id: "s", createdAt: 0, cwd: "/w", agentPreset: "coder" },
      events,
    });
    expect(log).toMatchObject({ id: "s", format: 4, cwd: "/w", agentPreset: "coder", events });
    expect(log.view).toHaveLength(5);
  });
});

describe("flattenLineage", () => {
  test("lists the tree depth first with siblings in creation order", () => {
    const root = { header: { version: 4, id: "root", createdAt: 0 } };
    const lineage = flattenLineage(root, [
      node("late", 30),
      node("early", 10, [node("grandchild", 40)]),
      node("tie-b", 20),
      node("tie-a", 20),
    ]);
    expect(lineage.map(({ sessionId, depth }) => [sessionId, depth])).toEqual([
      ["root", 0],
      ["early", 1],
      ["grandchild", 2],
      ["tie-a", 1],
      ["tie-b", 1],
      ["late", 1],
    ]);
    expect(lineage[0]).toEqual({ sessionId: "root", createdAt: 0, depth: 0 });
    expect(lineage[1]).toEqual({
      sessionId: "early",
      parentSessionId: "p",
      createdAt: 10,
      depth: 1,
    });
  });
});
