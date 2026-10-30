import { describe, expect, test } from "vitest";
import type { DshSessionLog } from "./dsh.ts";
import { episodesOfLog } from "./episodes.ts";
import type { Proposal } from "./llm.ts";
import { redact } from "./redact.ts";
import {
  recordKey,
  SCOUT_DOMAIN,
  storeOf,
  type IdeaRecord,
  type Lead,
  type ScoutStore,
} from "./store.ts";
import {
  failingSession,
  memoryDomain,
  recoverySession,
  releaseSession,
  sessionLog,
} from "./testing.ts";
import { statsView } from "./views.ts";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);

async function storeWith(logs: readonly DshSessionLog[]): Promise<ScoutStore> {
  const store = storeOf(memoryDomain(SCOUT_DOMAIN));
  for (const log of logs) {
    // oxlint-disable-next-line no-await-in-loop -- 逐条写入。
    await store.sessions.put(recordKey(log.session.id), {
      sessionId: log.session.id,
      cwd: log.session.cwd ?? null,
      createdAt: log.session.createdAt,
      eventCount: log.events.length,
      scannedAt: T0,
      episodes: episodesOfLog(log, { redact: (text) => redact(text), keepOutput: true }),
      error: null,
      backfilled: false,
    });
  }
  return store;
}

/** 只用内联代码与 HTTP 请求的会话：动作说明不了做了什么。 */
function probeSession(id: string, start: number): DshSessionLog {
  return sessionLog({ id, cwd: "/work/api" }, [], start)
    .human("Check the API")
    .sh("curl -s https://api.example.com/health")
    .sh("python3 -c 'print(1)'")
    .end()
    .build();
}

const PROPOSAL: Proposal = {
  decision: "suggest_create",
  title: "Release",
  found: "Found.",
  description: "Release.",
  trigger: "When releasing.",
  risks: [],
  verification: "Published.",
  skill: "release",
  outline: ["Publish"],
  refs: ["E1"],
};

function ideaRecord(state: IdeaRecord["state"], drafted: boolean): IdeaRecord {
  return {
    state,
    updatedAt: T0,
    draft: drafted
      ? {
          at: T0,
          provider: "test",
          model: "m",
          inputTokens: 1,
          outputTokens: 1,
          cautions: [],
          draft: { kind: "improve", notes: [{ text: "Note.", refs: [] }] },
        }
      : null,
    failure: null,
    write: null,
    dismissed: state === "dismissed" ? { at: T0, similar: false } : null,
  };
}

function lead(id: string, state: Lead["state"], ideas: readonly IdeaRecord[], skip = false): Lead {
  const summary =
    ideas.length > 0
      ? { decision: "suggest" as const, ideas: ideas.map(() => PROPOSAL) }
      : { decision: "skip" as const, reason: "No.", refs: [] };
  return {
    id,
    candidate: {
      id,
      kind: "repeated",
      features: [],
      steps: [],
      episodeIds: [],
      occurrences: 2,
      score: 1,
      goal: "Release",
      cwd: null,
    },
    state,
    detectedAt: T0,
    updatedAt: T0,
    summarizedSize: 2,
    summary:
      ideas.length > 0 || skip
        ? { at: T0, provider: "test", model: "m", inputTokens: 1, outputTokens: 1, summary }
        : null,
    ideas: [...ideas],
    failure: null,
    dismissed: state === "dismissed" ? { at: T0, similar: false } : null,
  };
}

describe("statsView", () => {
  test("lists actions seen across sessions, leaving out routine, read-only, and opaque ones", async () => {
    const store = await storeWith([
      releaseSession("s1", T0, "Release widget"),
      releaseSession("s2", T0 + DAY, "Release widget"),
      releaseSession("s3", T0 + 2 * DAY, "Release widget"),
      probeSession("p1", T0),
      probeSession("p2", T0 + DAY),
      probeSession("p3", T0 + 2 * DAY),
      probeSession("p4", T0 + 3 * DAY),
    ]);
    const { actions } = statsView(store, { inRange: 7, total: 7 }, T0 + 3 * DAY);
    expect(actions.every((action) => action.sessions === 3)).toBe(true);
    expect(actions.map((action) => action.label).toSorted()).toEqual([
      "gh release create",
      "npm publish",
      "npm version",
      "pnpm bundle",
      "pnpm check",
    ]);
  });

  test("keeps the twelve actions seen in the most sessions", async () => {
    const scripts = Array.from({ length: 14 }, (_, n) => `step${String(n).padStart(2, "0")}`);
    const logs = Array.from({ length: 3 }, (_, session) => {
      let log = sessionLog(
        { id: `m${String(session)}`, cwd: "/work/mono" },
        [],
        T0 + session * DAY,
      ).human("Run the pipeline");
      // 第 n 个脚本只在前 n % 3 + 1 个会话里出现：出现次数各不相同。
      for (const [n, script] of scripts.entries()) {
        if (session <= n % 3) log = log.sh(`pnpm run ${script}`);
      }
      return log.end().build();
    });
    const { actions } = statsView(await storeWith(logs), { inRange: 3, total: 3 }, T0);
    expect(actions).toHaveLength(12);
    // 4 个动作出现在 3 个会话里，5 个在 2 个会话里，剩下的名额给只出现一次的。
    expect(actions.map((action) => action.sessions)).toEqual([3, 3, 3, 3, 2, 2, 2, 2, 2, 1, 1, 1]);
  });

  test("lists errors that recur in at least two sessions", async () => {
    const store = await storeWith([
      recoverySession("r1", T0),
      recoverySession(
        "r2",
        T0 + DAY,
        "/work/other",
        "Error: Cannot find module @rollup/rollup-linux-x64-gnu. npm has a bug related to optional dependencies.",
      ),
      failingSession("f1", T0 + 2 * DAY),
    ]);
    const { errors } = statsView(store, { inRange: 3, total: 3 }, T0 + 2 * DAY);
    expect(errors).toHaveLength(1);
    expect(errors[0]?.sessions).toBe(2);
    expect(errors[0]?.signature).toContain("<platform>");
    expect(errors[0]?.example).toContain("Cannot find module");
  });

  test("counts outcomes, coverage, and the funnel from leads to written ideas", async () => {
    const store = await storeWith([
      releaseSession("s1", T0, "Release widget"),
      failingSession("f1", T0 + DAY),
    ]);
    await store.sessions.put(recordKey("bad"), {
      sessionId: "bad",
      cwd: null,
      createdAt: T0,
      eventCount: 3,
      scannedAt: T0 + DAY,
      episodes: [],
      error: "解析会话日志失败：结构不符",
      backfilled: true,
    });
    const written = { ...ideaRecord("written", true), write: null };
    await Promise.all(
      [
        lead("detected", "detected", []),
        lead("skipped", "skipped", [], true),
        lead("summarized", "summarized", [
          written,
          ideaRecord("dismissed", false),
          ideaRecord("proposed", false),
        ]),
        lead("dismissed", "dismissed", [ideaRecord("proposed", false), ideaRecord("ready", true)]),
      ].map((entry) => store.suggestions.put(recordKey(entry.id), entry)),
    );
    const stats = statsView(store, { inRange: 5, total: 9 }, T0 + DAY);
    expect(stats.outcomes).toEqual({
      verified: 1,
      succeeded: 0,
      unverified: 0,
      disputed: 0,
      failed: 1,
      aborted: 0,
    });
    expect(stats.coverage).toEqual({
      analyzed: 2,
      inRange: 5,
      total: 9,
      backfilled: 1,
      failed: [{ sessionId: "bad", message: "解析会话日志失败：结构不符", at: T0 + DAY }],
    });
    expect(stats.funnel).toEqual({
      leads: 4,
      summarized: 3,
      skipped: 1,
      ideas: 5,
      drafted: 2,
      written: 1,
      dismissed: 3,
    });
  });
});
