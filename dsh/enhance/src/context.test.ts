import { describe, expect, test } from "vitest";
import {
  clip,
  condense,
  countTurns,
  foldCodeBlocks,
  projectTurns,
  renderTurns,
  selectTurns,
  type ContextTurn,
  type SurfaceEvent,
} from "./context.ts";

function user(text: string, kind = "user"): SurfaceEvent {
  return {
    type: "user/message",
    data: { role: "user", content: [{ type: "text", text }], source: { kind } },
  };
}

function assistant(...blocks: { type: string; text?: string }[]): SurfaceEvent {
  return { type: "assistant/message", data: { message: { role: "assistant", content: blocks } } };
}

describe("session context projection", () => {
  test("keeps user prompts and assistant text, in order", () => {
    const turns = projectTurns([
      user("plan the cache"),
      assistant({ type: "text", text: "Option A uses Redis." }),
      user("go with A"),
      assistant({ type: "text", text: "Done." }),
    ]);
    expect(turns).toEqual([
      { kind: "turn", user: "plan the cache", assistant: "Option A uses Redis." },
      { kind: "turn", user: "go with A", assistant: "Done." },
    ]);
  });

  test("leaves out tool calls, tool results, reasoning, and injected messages", () => {
    const turns = projectTurns([
      { type: "system/message", data: { content: [{ type: "text", text: "SYSTEM PROMPT" }] } },
      user("read the config"),
      assistant(
        { type: "thinking", text: "private reasoning" },
        { type: "toolCall" },
        { type: "text", text: "Reading it now." },
      ),
      { type: "tool/result", data: { content: [{ type: "text", text: "API_TOKEN=abc" }] } },
      { type: "developer/message", data: { content: [{ type: "text", text: "be brief" }] } },
      user("injected reminder", "system-reminder"),
      assistant({ type: "text", text: "The timeout is 30 s." }),
    ]);
    expect(turns).toEqual([
      {
        kind: "turn",
        user: "read the config",
        assistant: "Reading it now.\n\nThe timeout is 30 s.",
      },
    ]);
  });

  test("turns a compaction checkpoint into a summary entry", () => {
    const turns = projectTurns([
      user("We agreed on plan B.", "compact-checkpoint"),
      user("continue"),
    ]);
    expect(turns.map((turn) => turn.kind)).toEqual(["summary", "turn"]);
    expect(countTurns(turns)).toBe(1);
  });

  test("keeps only the latest turns up to the limit", () => {
    const turns: ContextTurn[] = ["one", "two", "three", "four"].map((text) => ({
      kind: "turn",
      user: text,
      assistant: "",
    }));
    expect(selectTurns(turns, 2).map((turn) => turn.user)).toEqual(["three", "four"]);
  });

  test("drops the oldest turns when the selection exceeds the character budget", () => {
    const long = "x".repeat(1100);
    const turns: ContextTurn[] = Array.from({ length: 3 }, (_, index) => ({
      kind: "turn",
      user: `${String(index)} ${long}`,
      assistant: long,
    }));
    const selected = selectTurns(turns, 3);
    expect(selected.map((turn) => turn.user.slice(0, 1))).toEqual(["2"]);
  });

  test("redacts credentials from the selected turns", () => {
    const turns: ContextTurn[] = [
      { kind: "turn", user: "use sk-abc123def456ghi789jkl012mno", assistant: "ok" },
    ];
    expect(selectTurns(turns, 1)[0]?.user).toBe("use [redacted]");
  });

  test("renders turns with numbered labels and a summary heading", () => {
    const text = renderTurns([
      { kind: "summary", user: "Earlier we chose plan B.", assistant: "" },
      { kind: "turn", user: "go", assistant: "Started." },
      { kind: "turn", user: "and tests?", assistant: "" },
    ]);
    expect(text).toBe(
      [
        "[Summary of earlier conversation]\nEarlier we chose plan B.",
        "[Turn 1]\nUser: go\nAssistant: Started.",
        "[Turn 2]\nUser: and tests?",
      ].join("\n\n"),
    );
  });
});

describe("context condensing", () => {
  test("folds long code blocks to their first lines", () => {
    const body = Array.from({ length: 20 }, (_, index) => `line ${String(index)}`).join("\n");
    const folded = foldCodeBlocks(`before\n\`\`\`ts\n${body}\n\`\`\`\nafter`);
    expect(folded).toContain("line 5\n[… 14 more lines of code …]\n```\nafter");
    expect(folded).not.toContain("line 6");
  });

  test("keeps short code blocks as they are", () => {
    const text = "```sh\npnpm test\n```";
    expect(foldCodeBlocks(text)).toBe(text);
  });

  test("clips long text to its head and tail", () => {
    const clipped = clip("a".repeat(60) + "b".repeat(40), 50);
    expect(clipped).toBe(`${"a".repeat(30)}\n[… 50 characters omitted …]\n${"b".repeat(20)}`);
  });

  test("collapses runs of blank lines", () => {
    expect(condense("a\n\n\n\nb", 100)).toBe("a\n\nb");
  });
});
