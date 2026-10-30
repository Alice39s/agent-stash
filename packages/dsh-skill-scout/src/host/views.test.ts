import { describe, expect, test } from "vitest";
import { Config, currentSettings } from "./config.ts";
import type { DshSessionLog } from "./dsh.ts";
import { episodesOfLog } from "./episodes.ts";
import type { Proposal } from "./llm.ts";
import { redact } from "./redact.ts";
import type { Episode } from "./model.ts";
import type { Working } from "./scout.ts";
import {
  dayKey,
  ideaId,
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
import { inboxView, statsView, type Runtime } from "./views.ts";

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

/** 没有进行中的模型请求。 */
const IDLE: Working = new Map();

/** 一个进行中的模型请求。 */
function inFlight(stage: "summary" | "draft") {
  return { stage, phase: "waiting" as const, startedAt: T0, phaseAt: T0, chars: 0, expected: 900 };
}

/** 本地时间 2026-10-30 15:00，统计的「现在」。 */
const NOW = new Date(2026, 9, 30, 15, 0).getTime();

/** 本地日期 2026-10-<day> 的某个时刻；day 小于 1 时落到 9 月。 */
function local(day: number, hours: number, minutes = 0, seconds = 0): number {
  return new Date(2026, 9, day, hours, minutes, seconds).getTime();
}

/** 一个会话的任务，结束时间改成给定的时刻。 */
function endingAt(log: DshSessionLog, endedAt: number, replay = false): Episode[] {
  return episodesOfLog(log, { redact: (text) => redact(text), keepOutput: true }).map((episode) =>
    Object.assign(episode, { endedAt, replay }),
  );
}

/** 直接写入一条会话记录。 */
async function putRecord(
  store: ScoutStore,
  sessionId: string,
  episodes: readonly Episode[],
  backfilled: boolean,
): Promise<void> {
  await store.sessions.put(recordKey(sessionId), {
    sessionId,
    cwd: null,
    createdAt: episodes[0]?.startedAt ?? T0,
    eventCount: 10,
    scannedAt: NOW,
    episodes: [...episodes],
    error: null,
    backfilled,
  });
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
    const { actions } = statsView(store, { inRange: 7, total: 7 }, IDLE, T0 + 3 * DAY);
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
    const { actions } = statsView(await storeWith(logs), { inRange: 3, total: 3 }, IDLE, T0);
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
    const { errors } = statsView(store, { inRange: 3, total: 3 }, IDLE, T0 + 2 * DAY);
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
    const stats = statsView(store, { inRange: 5, total: 9 }, IDLE, T0 + DAY);
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
      leads: { detected: 1, summarized: 1, skipped: 1, failed: 0, dismissed: 1 },
      ideas: { proposed: 2, ready: 1, failed: 0, written: 1, dismissed: 1 },
    });
  });

  test("counts leads and ideas by stored state, each merged idea on its own", async () => {
    const store = storeOf(memoryDomain(SCOUT_DOMAIN));
    const leads = [
      lead("new", "detected", []),
      lead("many", "summarized", [
        ideaRecord("proposed", false),
        ideaRecord("ready", true),
        ideaRecord("failed", false),
        ideaRecord("written", true),
        ideaRecord("dismissed", false),
      ]),
      // 与 many 的 proposed 同名，收件箱只显示一张。
      lead("twin", "summarized", [ideaRecord("proposed", false)]),
      lead("drafting", "summarized", [ideaRecord("proposed", false)]),
      lead("skipped", "skipped", [], true),
      lead("again", "skipped", [], true),
      lead("broken", "failed", []),
      lead("gone", "dismissed", [ideaRecord("ready", true)]),
    ];
    await Promise.all(leads.map((entry) => store.suggestions.put(recordKey(entry.id), entry)));
    const working: Working = new Map([
      // 正在重新摘要的线索计入 detected；被忽略的线索仍计入 dismissed。
      ["again", inFlight("summary")],
      ["gone", inFlight("summary")],
      // 正在生成草稿的 idea 计入请求前的状态。
      [ideaId("drafting", 0), inFlight("draft")],
    ]);
    const runtime: Runtime = {
      lead: true,
      scanning: false,
      waiting: 0,
      checking: [],
      working,
      lastError: null,
      backfill: null,
    };
    const inbox = inboxView(store, currentSettings(Config({})), {}, runtime, T0);
    expect(inbox.items.some((item) => item.merged > 0)).toBe(true);

    expect(statsView(store, { inRange: 0, total: 0 }, working, T0).funnel).toEqual({
      leads: { detected: 2, summarized: 3, skipped: 1, failed: 1, dismissed: 1 },
      ideas: { proposed: 3, ready: 2, failed: 1, written: 1, dismissed: 1 },
    });
    expect(statsView(store, { inRange: 0, total: 0 }, IDLE, T0).funnel.leads).toEqual({
      detected: 1,
      summarized: 3,
      skipped: 2,
      failed: 1,
      dismissed: 1,
    });
  });

  test("lists the last 30 local days with task outcomes and new leads, empty days included", async () => {
    const store = storeOf(memoryDomain(SCOUT_DOMAIN));
    await putRecord(
      store,
      "today",
      endingAt(releaseSession("today", NOW, "Release widget"), local(30, 0)),
      false,
    );
    await putRecord(
      store,
      "broken",
      endingAt(failingSession("broken", NOW), local(30, 14, 59)),
      false,
    );
    // 跨午夜：前一天的最后一秒算前一天。
    await putRecord(
      store,
      "late",
      endingAt(releaseSession("late", NOW, "Release widget"), local(29, 23, 59, 59)),
      false,
    );
    // 第 30 天的零点算进第一天，再早一秒不算。
    await putRecord(
      store,
      "first",
      endingAt(releaseSession("first", NOW, "Release widget"), local(1, 0)),
      true,
    );
    await putRecord(
      store,
      "older",
      endingAt(releaseSession("older", NOW, "Release widget"), local(0, 23, 59, 59)),
      true,
    );
    // 重放的任务不算。
    await putRecord(
      store,
      "replayed",
      endingAt(releaseSession("replayed", NOW, "Release widget"), local(30, 10), true),
      false,
    );
    await Promise.all(
      [
        { ...lead("new", "detected", []), detectedAt: local(30, 9) },
        { ...lead("edge", "detected", []), detectedAt: local(1, 0) },
        { ...lead("old", "detected", []), detectedAt: local(0, 12) },
      ].map((entry) => store.suggestions.put(recordKey(entry.id), entry)),
    );
    const { daily } = statsView(store, { inRange: 6, total: 6 }, IDLE, NOW);
    expect(daily).toHaveLength(30);
    expect(daily[0]?.day).toBe("2026-10-01");
    expect(daily.at(-1)?.day).toBe(dayKey(NOW));
    const zero = {
      verified: 0,
      succeeded: 0,
      unverified: 0,
      disputed: 0,
      failed: 0,
      aborted: 0,
      leads: 0,
    };
    expect(daily[0]).toEqual({ ...zero, day: "2026-10-01", verified: 1, leads: 1 });
    expect(daily[28]).toEqual({ ...zero, day: "2026-10-29", verified: 1 });
    expect(daily[29]).toEqual({ ...zero, day: "2026-10-30", verified: 1, failed: 1, leads: 1 });
    expect(daily.slice(1, 28)).toEqual(
      Array.from({ length: 27 }, (_, n) => ({
        ...zero,
        day: `2026-10-${String(n + 2).padStart(2, "0")}`,
      })),
    );
  });

  test("counts the sessions that used each action in each of the last 8 weeks", async () => {
    const store = storeOf(memoryDomain(SCOUT_DOMAIN));
    const WEEK = 7 * DAY;
    const ends: readonly [string, number][] = [
      ["w7a", NOW - DAY],
      ["w7b", NOW - WEEK + 1],
      // 正好 7 天前是前一周的开始。
      ["w6", NOW - WEEK],
      ["w0", NOW - 8 * WEEK + 1],
      // 8 周以前的会话只算进总数。
      ["out", NOW - 8 * WEEK],
    ];
    for (const [id, end] of ends) {
      // oxlint-disable-next-line no-await-in-loop -- 逐条写入。
      await putRecord(store, id, endingAt(releaseSession(id, end, "Release widget"), end), false);
    }
    await putRecord(
      store,
      "ancient-2",
      endingAt(
        sessionLog({ id: "ancient-2", cwd: "/work/x" }, [], NOW - 30 * WEEK)
          .human("Deploy")
          .sh("wrangler deploy")
          .end()
          .build(),
        NOW - 30 * WEEK,
      ),
      false,
    );
    const { actions } = statsView(store, { inRange: 6, total: 6 }, IDLE, NOW);
    expect(actions.length).toBeGreaterThan(1);
    for (const action of actions) expect(action.weeks).toHaveLength(8);
    const publish = actions.find((action) => action.label === "npm publish");
    expect(publish).toMatchObject({ sessions: 5, weeks: [1, 0, 0, 0, 0, 0, 1, 2] });
    expect(actions.find((action) => action.label === "wrangler deploy")).toMatchObject({
      sessions: 1,
      weeks: [0, 0, 0, 0, 0, 0, 0, 0],
    });
  });
});
