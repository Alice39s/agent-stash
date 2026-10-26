import { describe, expect, test } from "vitest";
import {
  daySections,
  mergeGlobalPrompts,
  promptCandidates,
  promptOf,
  sessionPrompts,
  type PromptEvent,
} from "./prompts.ts";

function userMessage(
  seq: number,
  time: number,
  blocks: readonly { type: string; text?: string }[],
  kind = "user",
): PromptEvent {
  return {
    type: "user/message",
    seq,
    time,
    data: { content: blocks, source: { kind } },
  };
}

describe("promptOf", () => {
  test("joins the text blocks of a human message", () => {
    const event = userMessage(3, 100, [
      { type: "text", text: "first line" },
      { type: "image" },
      { type: "text", text: "second line" },
    ]);
    expect(promptOf(event)).toEqual({ text: "first line\nsecond line", time: 100, seq: 3 });
  });

  test("skips messages that other producers injected", () => {
    expect(promptOf(userMessage(1, 1, [{ type: "text", text: "goal check" }], "goal"))).toBe(
      undefined,
    );
  });

  test("skips events that are not user messages and messages without visible text", () => {
    expect(promptOf({ type: "assistant/message", seq: 1, time: 1, data: {} })).toBe(undefined);
    expect(promptOf(userMessage(1, 1, [{ type: "text", text: "  \n " }]))).toBe(undefined);
    expect(promptOf(userMessage(1, 1, [{ type: "image" }]))).toBe(undefined);
  });
});

describe("sessionPrompts", () => {
  test("keeps the human prompts of one log in log order", () => {
    const events: PromptEvent[] = [
      userMessage(1, 10, [{ type: "text", text: "a" }]),
      { type: "turn/start", seq: 2, time: 11, data: {} },
      userMessage(3, 12, [{ type: "text", text: "b" }], "schedule"),
      userMessage(4, 13, [{ type: "text", text: "c" }]),
    ];
    expect(sessionPrompts(events).map((prompt) => prompt.text)).toEqual(["a", "c"]);
  });
});

describe("mergeGlobalPrompts", () => {
  test("orders prompts from every session newest first and keeps the newest copy of a repeated text", () => {
    const merged = mergeGlobalPrompts(
      [
        {
          sessionId: "s1",
          title: "Engineering",
          prompts: [
            { text: "fix the build", time: 10, seq: 1 },
            { text: "write tests", time: 30, seq: 5 },
          ],
        },
        {
          sessionId: "s2",
          prompts: [
            { text: "fix the build", time: 20, seq: 2 },
            { text: "ship it", time: 40, seq: 3 },
          ],
        },
      ],
      10,
    );
    expect(merged).toEqual([
      { text: "ship it", time: 40, sessionId: "s2" },
      { text: "write tests", time: 30, sessionId: "s1", title: "Engineering" },
      { text: "fix the build", time: 20, sessionId: "s2" },
    ]);
  });

  test("stops at the entry limit", () => {
    const prompts = [1, 2, 3].map((time) => ({ text: `p${time}`, time, seq: time }));
    expect(mergeGlobalPrompts([{ sessionId: "s", prompts }], 2).map((entry) => entry.text)).toEqual(
      ["p3", "p2"],
    );
  });
});

describe("promptCandidates", () => {
  const history = [
    { text: "帮我分析这个项目的缓存命中率，并给出优化建议。", time: 3, sessionId: "a" },
    { text: "帮我对比这三个方案的优缺点，并给出推荐。", time: 2, sessionId: "b" },
    { text: "帮我分析", time: 1, sessionId: "c" },
    { text: "Fix the build", time: 0, sessionId: "d" },
  ];

  test("returns the longer entries that start with the exact draft, newest first", () => {
    expect(promptCandidates(history, "帮我", 5).map((entry) => entry.sessionId)).toEqual([
      "a",
      "b",
      "c",
    ]);
    expect(promptCandidates(history, "帮我分析", 5).map((entry) => entry.sessionId)).toEqual(["a"]);
  });

  test("matches case-sensitively and ignores an empty draft", () => {
    expect(promptCandidates(history, "fix", 5)).toEqual([]);
    expect(promptCandidates(history, "Fix", 5).map((entry) => entry.sessionId)).toEqual(["d"]);
    expect(promptCandidates(history, "", 5)).toEqual([]);
  });

  test("stops at the candidate limit", () => {
    expect(promptCandidates(history, "帮", 2)).toHaveLength(2);
  });
});

/** 2026-10-<day> 本地时间 <hour>:00 的时间戳。 */
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 0).getTime();

describe("daySections", () => {
  test("groups chronological prompts by local calendar day", () => {
    const sections = daySections(
      [{ time: at(24, 9) }, { time: at(25, 20) }, { time: at(26, 9) }, { time: at(26, 11) }],
      at(26, 12),
    );
    expect(
      sections.map((section) => [section.day, section.items.map((item) => item.index)]),
    ).toEqual([
      [{ kind: "date", time: at(24, 9) }, [0]],
      [{ kind: "yesterday" }, [1]],
      [{ kind: "today" }, [2, 3]],
    ]);
  });
});
