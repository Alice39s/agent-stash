import { describe, expect, test } from "vitest";
import type { MessageEditEffect, VersionRecord } from "../shared.ts";
import { parseLogEvents } from "./dsh-read.ts";
import { closedTurns, editableMessages, retryableTurns } from "./history.ts";
import type { LineageNode } from "./model.ts";
import { text, turnsLog } from "./testing.ts";
import { projectTimeline, type TimelineInput } from "./timeline.ts";

function effect(operation: MessageEditEffect["operation"]): MessageEditEffect {
  return {
    id: crypto.randomUUID(),
    operation,
    cascade: "truncate",
    targetTurn: 0,
    targetEventSeq: 1,
  };
}

/**
 * root ─┬─ a（编辑，记录时间 300）── c（重试，记录时间 400）
 *       ├─ sub（子代理会话，没有记录）
 *       └─ b（重新生成，记录时间 200）
 */
const LINEAGE: readonly LineageNode[] = [
  { sessionId: "root", createdAt: 100, depth: 0 },
  { sessionId: "a", parentSessionId: "root", createdAt: 110, depth: 1 },
  { sessionId: "c", parentSessionId: "a", createdAt: 120, depth: 2 },
  { sessionId: "sub", parentSessionId: "root", createdAt: 130, depth: 1 },
  { sessionId: "b", parentSessionId: "root", createdAt: 140, depth: 1 },
];

const RECORDS = new Map<string, VersionRecord>([
  ["a", { parentSessionId: "root", createdAt: 300, effect: effect("edit") }],
  ["c", { parentSessionId: "a", createdAt: 400, effect: effect("retry") }],
  ["b", { parentSessionId: "root", createdAt: 200, effect: effect("reroll") }],
]);

function timeline(sessionId: string, overrides: Partial<TimelineInput> = {}) {
  return projectTimeline({
    sessionId,
    lineage: LINEAGE,
    records: RECORDS,
    turns: [],
    ...overrides,
  });
}

describe("projectTimeline undo stack", () => {
  test("walks recorded versions back to their sources", () => {
    expect(timeline("c").undoStack).toEqual(["a", "root"]);
    expect(timeline("a").undoStack).toEqual(["root"]);
  });

  test("is empty for a version without a record", () => {
    expect(timeline("root").undoStack).toEqual([]);
    expect(timeline("sub").undoStack).toEqual([]);
  });

  test("rejects a source outside the visible version tree", () => {
    const partial = LINEAGE.filter((node) => node.sessionId !== "root");
    const records = new Map([...RECORDS].filter(([id]) => id !== "b"));
    expect(() => timeline("a", { lineage: partial, records })).toThrow(
      "会话 a 的撤销目标 root 不在可见版本树里",
    );
  });
});

describe("projectTimeline redo targets", () => {
  test("lists recorded direct children in creation order", () => {
    expect(timeline("root").redoSessionIds).toEqual(["b", "a"]);
    expect(timeline("a").redoSessionIds).toEqual(["c"]);
    expect(timeline("c").redoSessionIds).toEqual([]);
  });
});

describe("projectTimeline versions", () => {
  test("marks the current version and its ancestor path and attaches recorded effects", () => {
    const versions = timeline("c").versions;
    expect(versions.map((version) => version.sessionId)).toEqual(["root", "a", "c", "sub", "b"]);
    expect(
      versions.filter((version) => version.current).map((version) => version.sessionId),
    ).toEqual(["c"]);
    expect(
      versions.filter((version) => version.onCurrentEffectPath).map((version) => version.sessionId),
    ).toEqual(["root", "a", "c"]);
    expect(versions.find((version) => version.sessionId === "a")).toEqual({
      sessionId: "a",
      parentSessionId: "root",
      createdAt: 300,
      depth: 1,
      current: false,
      onCurrentEffectPath: true,
      effect: RECORDS.get("a")?.effect,
    });
    expect(versions.find((version) => version.sessionId === "sub")).toEqual({
      sessionId: "sub",
      parentSessionId: "root",
      createdAt: 130,
      depth: 1,
      current: false,
      onCurrentEffectPath: false,
    });
  });

  test("rejects a record whose source differs from the session parent", () => {
    const records = new Map(RECORDS).set("c", {
      parentSessionId: "root",
      createdAt: 400,
      effect: effect("retry"),
    });
    expect(() => timeline("c", { records })).toThrow(
      "版本 c 的记录来源 root 与会话的父会话 a 不一致",
    );
  });

  test("rejects two versions that record the same effect", () => {
    const shared = RECORDS.get("a");
    if (shared === undefined) throw new Error("fixture lacks version a");
    const records = new Map(RECORDS).set("b", { ...shared, createdAt: 200 });
    expect(() => timeline("root", { records })).toThrow(
      `版本 a 与 b 记录了同一个效果 ${shared.effect.id}`,
    );
  });

  test("rejects a current session missing from its tree", () => {
    expect(() => timeline("elsewhere")).toThrow("会话 elsewhere 不在它自己的版本树里");
  });
});

describe("projectTimeline messages", () => {
  test("projects editable blocks and retryable turns of the current version", () => {
    const turns = closedTurns(
      parseLogEvents("c", turnsLog(0, [{ turn: 0, prompt: [text("问")], reply: [text("答")] }])),
    );
    const result = timeline("c", { turns });
    expect(result.sessionId).toBe("c");
    expect(result.messages).toEqual(editableMessages(turns));
    expect(result.retryableTurns).toEqual(retryableTurns(turns));
    expect(result.messages).toHaveLength(2);
  });
});
