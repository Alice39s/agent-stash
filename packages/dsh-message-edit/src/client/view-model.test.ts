import { describe, expect, test } from "vitest";
import type { MessageEditTimeline } from "../shared.ts";
import { block, READY, TIMELINE, translator, UNANSWERED_TIMELINE } from "./testing.ts";
import {
  canReroll,
  dialogHintKey,
  lastTurn,
  messageTarget,
  nextRadioIndex,
  operationsBlocked,
  stepper,
  turnGroups,
  turnTarget,
  unansweredTurn,
  versionRows,
  versionTitle,
} from "./view-model.ts";

const EMPTY: MessageEditTimeline = {
  ...TIMELINE,
  messages: [],
  retryableTurns: [],
};

describe("turnGroups", () => {
  test("groups blocks by turn in ascending order and keeps read-only turns", () => {
    const groups = turnGroups(TIMELINE);
    expect(groups.map((group) => group.turn)).toEqual([1, 2, 3]);
    expect(groups[0]?.blocks.map((item) => item.key)).toEqual(["1:0", "3:0", "3:1"]);
    expect(groups[0]?.retry?.preview).toBe("Hello");
    expect(groups[2]?.retry).toBeUndefined();
  });

  test("returns no groups for a session without finished turns", () => {
    expect(turnGroups(EMPTY)).toEqual([]);
  });
});

test("lastTurn is the highest finished turn", () => {
  expect(lastTurn(TIMELINE)).toBe(3);
  expect(lastTurn(EMPTY)).toBeUndefined();
});

describe("messageTarget", () => {
  test("offers the turn's user message before the assistant message blocks", () => {
    const target = messageTarget(TIMELINE, "m0");
    expect(target?.retry.turn).toBe(1);
    expect(target?.choices.map((item) => item.kind)).toEqual([
      "user",
      "assistant.reasoning",
      "assistant.response",
    ]);
    expect(target?.hasLaterTurns).toBe(true);
  });

  test("orders the assistant blocks by block index", () => {
    const reversed: MessageEditTimeline = {
      ...TIMELINE,
      messages: TIMELINE.messages.toReversed(),
    };
    expect(messageTarget(reversed, "m0")?.choices.map((item) => item.key)).toEqual([
      "1:0",
      "3:0",
      "3:1",
    ]);
  });

  test("reports no later turns for the last turn", () => {
    const lastIsRetryable: MessageEditTimeline = {
      ...TIMELINE,
      messages: TIMELINE.messages.filter((item) => item.turn < 3),
    };
    expect(messageTarget(lastIsRetryable, "m1")?.hasLaterTurns).toBe(false);
  });

  test("finds nothing for unknown messages and for turns without user input", () => {
    expect(messageTarget(TIMELINE, "missing")).toBeUndefined();
    expect(messageTarget(TIMELINE, "m2")).toBeUndefined();
  });
});

describe("turnTarget", () => {
  test("offers only the user message of a turn without a reply", () => {
    const target = turnTarget(UNANSWERED_TIMELINE, 4);
    expect(target?.retry.turn).toBe(4);
    expect(target?.choices.map((item) => item.key)).toEqual(["31:0"]);
    expect(target?.hasLaterTurns).toBe(false);
  });

  test("reports later turns for an earlier turn", () => {
    expect(turnTarget(UNANSWERED_TIMELINE, 2)?.hasLaterTurns).toBe(true);
  });

  test("finds nothing for turns without user input or outside the timeline", () => {
    expect(turnTarget(TIMELINE, 3)).toBeUndefined();
    expect(turnTarget(TIMELINE, 4)).toBeUndefined();
  });
});

describe("unansweredTurn", () => {
  const turn = { turn: 4, end: { seq: 40 } };

  test("claims a turn whose tail anchors at its turn/end", () => {
    expect(unansweredTurn({ turn, seq: 40 })).toBe(4);
  });

  test("claims a turn that closes with an unsaved partial reply", () => {
    expect(unansweredTurn({ turn, seq: 38.1 })).toBe(4);
  });

  test("leaves a turn with a saved closing reply to the message actions", () => {
    expect(unansweredTurn({ turn, seq: 37 })).toBeNull();
  });

  test("ignores a turn without turn/end", () => {
    expect(unansweredTurn({ turn: { turn: 4, end: undefined }, seq: 40 })).toBeNull();
  });
});

describe("canReroll", () => {
  test("needs a user-triggered turn, with or without a reply", () => {
    expect(canReroll(TIMELINE)).toBe(true);
    const userOnly: MessageEditTimeline = {
      ...TIMELINE,
      messages: [block({ turn: 1, eventSeq: 1, blockIndex: 0, kind: "user", text: "Hi" })],
    };
    expect(canReroll(userOnly)).toBe(true);
    expect(canReroll(EMPTY)).toBe(false);
  });
});

describe("stepper", () => {
  test("counts the undo stack and follows the newest child chain forward", () => {
    expect(stepper(TIMELINE)).toEqual({
      previous: "root-session",
      next: "newer-child",
      branches: 2,
      position: 2,
      total: 4,
    });
  });

  test("is a single position without undo or redo targets", () => {
    const alone: MessageEditTimeline = { ...TIMELINE, undoStack: [], redoSessionIds: [] };
    expect(stepper(alone)).toMatchObject({ previous: undefined, next: undefined, total: 1 });
  });
});

describe("version rows", () => {
  test("mark the current version, its upstream versions, and the rest", () => {
    expect(
      versionRows(TIMELINE).map((row) => [row.version.sessionId, row.tone, row.indent]),
    ).toEqual([
      ["root-session", "ancestor", 0],
      ["current-session", "current", 1],
      ["older-child", "other", 2],
      ["newer-child", "other", 2],
      ["grandchild", "other", 3],
      ["fork-session", "other", 1],
    ]);
  });

  test("stop indenting after six levels", () => {
    const deep: MessageEditTimeline = {
      ...TIMELINE,
      versions: [
        { sessionId: "deep", depth: 9, createdAt: 1, current: false, onCurrentEffectPath: false },
      ],
    };
    expect(versionRows(deep)[0]?.indent).toBe(6);
  });

  test("titles name the operation and the turn", () => {
    const en = translator("en");
    expect(TIMELINE.versions.map((version) => versionTitle(version, en))).toEqual([
      "Original",
      "Edited message in turn 1",
      "Regenerated turn 2",
      "Retried turn 2",
      "Edited turn 2",
      "Branch",
    ]);
    const zh = translator("zh");
    expect(TIMELINE.versions.map((version) => versionTitle(version, zh))[1]).toBe(
      "编辑了回合 1 的消息",
    );
  });
});

test("dialog hint follows later turns and the cascade policy", () => {
  expect(dialogHintKey(false, "preserve")).toBe("dialog.hint.last");
  expect(dialogHintKey(true, "truncate")).toBe("dialog.hint.truncate");
  expect(dialogHintKey(true, "preserve")).toBe("dialog.hint.preserve");
});

test("radio navigation wraps with arrows and jumps with Home and End", () => {
  expect(nextRadioIndex(1, "ArrowRight", 2)).toBe(0);
  expect(nextRadioIndex(0, "ArrowLeft", 2)).toBe(1);
  expect(nextRadioIndex(0, "ArrowDown", 2)).toBe(1);
  expect(nextRadioIndex(1, "Home", 2)).toBe(0);
  expect(nextRadioIndex(0, "End", 2)).toBe(1);
  expect(nextRadioIndex(0, "Enter", 2)).toBeUndefined();
});

test("operations are blocked while one runs or the timeline is not ready", () => {
  expect(operationsBlocked(READY)).toBe(false);
  expect(operationsBlocked({ ...READY, pending: "edit" })).toBe(true);
  expect(operationsBlocked({ ...READY, status: "loading" })).toBe(true);
});
