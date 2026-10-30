import { describe, expect, test } from "vitest";
import type { DshSessionLog } from "./dsh.ts";
import { episodesOfLog } from "./episodes.ts";
import type { Episode } from "./model.ts";
import { redact } from "./redact.ts";
import { createSearchIndex } from "./search.ts";
import {
  failingSession,
  recoverySession,
  releaseSession,
  routineSession,
  sessionLog,
} from "./testing.ts";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);

function episodesOf(log: DshSessionLog): Episode[] {
  return episodesOfLog(log, { redact: (text) => redact(text), keepOutput: true });
}

/** 一个可以替换会话记录的索引。 */
function indexOf(logs: readonly DshSessionLog[]) {
  const records = logs.map((log) => ({ episodes: episodesOf(log) }));
  const index = createSearchIndex(() => records);
  return { index, records };
}

const SESSIONS = [
  releaseSession("s1", T0, "Release a patch version of widget"),
  releaseSession("s2", T0 + DAY, "Release widget again"),
  recoverySession("s3", T0 + 2 * DAY),
  routineSession("s4", T0 + 3 * DAY),
  sessionLog({ id: "s5", cwd: "/work/widget" }, [], T0 + 4 * DAY)
    .human("Make the build faster")
    .edit("/work/widget/vite.config.ts")
    .sh("pnpm build")
    .human("顺便把缓存也关掉")
    .sh("pnpm build --force")
    .end()
    .build(),
  failingSession("s6", T0 + 5 * DAY),
];

const sessionsOf = (hits: readonly { readonly episode: Episode }[]): string[] =>
  hits.map((hit) => hit.episode.sessionId);

describe("createSearchIndex", () => {
  test("returns tasks that contain every query word, newest first when they match equally", () => {
    const { index } = indexOf(SESSIONS);
    const result = index.search("release widget", { limit: 10 });
    expect(sessionsOf(result.hits)).toEqual(["s2", "s1"]);
    expect(result.total).toBe(2);
    expect(index.search("release rollup", { limit: 10 }).total).toBe(0);
  });

  test("matches the start of a word in commands, file paths, and error lines", () => {
    const { index } = indexOf(SESSIONS);
    const vite = index.search("vite", { limit: 10 });
    expect(sessionsOf(vite.hits)).toEqual(["s5"]);
    expect(vite.hits[0]?.matches).toContain("vite.config.ts");
    const rollup = index.search("rollup", { limit: 10 });
    expect(sessionsOf(rollup.hits)).toEqual(["s3"]);
    expect(rollup.hits[0]?.matches.some((text) => text.includes("Cannot find module"))).toBe(true);
  });

  test("searches Chinese text by pairs of characters, including what the user said mid-task", () => {
    const { index } = indexOf(SESSIONS);
    expect(sessionsOf(index.search("修好", { limit: 10 }).hits)).toEqual(["s3"]);
    const steering = index.search("缓存", { limit: 10 });
    expect(sessionsOf(steering.hits)).toEqual(["s5"]);
    expect(steering.hits[0]?.matches).toEqual(["顺便把缓存也关掉"]);
  });

  test("ranks tasks that match more often first and keeps at most three snippets", () => {
    const { index } = indexOf(SESSIONS);
    const result = index.search("pnpm", { limit: 10 });
    // s3 里 pnpm 出现在更多的命令里，命中数最多。
    expect(result.hits[0]?.episode.sessionId).toBe("s3");
    for (const hit of result.hits) expect(hit.matches.length).toBeLessThanOrEqual(3);
    // 用户请求不作为片段：只命中请求的任务没有片段。
    const goal = index.search("faster", { limit: 10 });
    expect(goal.hits).toMatchObject([{ episode: { sessionId: "s5" }, matches: [] }]);
  });

  test("filters by outcome and limits the hits without changing the total", () => {
    const { index } = indexOf(SESSIONS);
    const all = index.search("pnpm", { limit: 10 });
    const limited = index.search("pnpm", { limit: 1 });
    expect(limited.total).toBe(all.total);
    expect(limited.hits).toHaveLength(1);
    const failed = index.search("pnpm", { outcome: "failed", limit: 10 });
    expect(sessionsOf(failed.hits)).toEqual(["s6"]);
    expect(all.total).toBe(6);
  });

  test("returns nothing for a query without words and reports what is indexed", () => {
    const { index } = indexOf(SESSIONS);
    const result = index.search("  a the  ", { limit: 10 });
    expect(result).toEqual({
      total: 0,
      hits: [],
      indexed: { sessions: 6, episodes: 6 },
    });
  });

  test("rebuilds the index on the next query after it is marked stale", () => {
    const { index, records } = indexOf(SESSIONS.slice(0, 1));
    expect(index.search("rollup", { limit: 10 }).total).toBe(0);
    records.push({ episodes: episodesOf(recoverySession("s3", T0)) });
    expect(index.search("rollup", { limit: 10 }).total).toBe(0);
    index.invalidate();
    expect(sessionsOf(index.search("rollup", { limit: 10 }).hits)).toEqual(["s3"]);
  });
});
