import { describe, expect, test } from "vitest";
import { episodesOfLog } from "./episodes.ts";
import type { Episode } from "./model.ts";
import { redact } from "./redact.ts";
import { detectCandidates, jaccard, tokens } from "./signals.ts";
import {
  failingSession,
  migrationSession,
  recoverySession,
  releaseSession,
  routineSession,
  sessionLog,
} from "./testing.ts";
import type { DshSessionLog } from "./dsh.ts";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);
const OPTIONS = { minOccurrences: 2 };

function episodes(...logs: readonly DshSessionLog[]): Episode[] {
  return logs.flatMap((log) =>
    episodesOfLog(log, { redact: (text) => redact(text), keepOutput: true }),
  );
}

/** 测试失败后只改源码就通过的一次调试。 */
function debug(id: string, start: number): DshSessionLog {
  return sessionLog({ id, cwd: "/work/widget" }, [], start)
    .human("tests are red")
    .sh("pnpm test", { exit: 1, output: "Error: ResizeObserver is not defined" })
    .edit("/work/widget/src/setup.ts")
    .sh("pnpm test")
    .end()
    .build();
}

describe("detectCandidates", () => {
  test("finds a workflow repeated in two independent sessions", () => {
    const found = detectCandidates(
      episodes(
        releaseSession("s1", T0, "Release a new patch version of widget"),
        releaseSession("s2", T0 + 3 * DAY, "发布 widget 的 patch 版本 release"),
        releaseSession("s3", T0 + 5 * DAY, "Cut a patch release for widget"),
      ),
      OPTIONS,
    );
    const repeated = found.filter((candidate) => candidate.kind === "repeated");
    expect(repeated).toHaveLength(1);
    expect(repeated[0]?.occurrences).toBeGreaterThanOrEqual(2);
    expect(repeated[0]?.features).toEqual(
      expect.arrayContaining(["npm publish", "npm version", "gh release create"]),
    );
  });

  test("does not count one session twice", () => {
    const log = sessionLog({ id: "s1", cwd: "/work/widget" })
      .human("Release a patch version")
      .sh("pnpm bundle")
      .sh("npm version patch")
      .sh("npm publish")
      .end()
      .human("Release a patch version again")
      .sh("pnpm bundle")
      .sh("npm version patch")
      .sh("npm publish")
      .end()
      .build();
    expect(detectCandidates(episodes(log), OPTIONS)).toEqual([]);
  });

  test("does not count a forked replay as an independent repetition", () => {
    const parent = sessionLog({ id: "parent", cwd: "/work/widget" })
      .human("Release a patch version")
      .sh("pnpm bundle")
      .sh("npm version patch")
      .sh("npm publish")
      .end();
    const fork = sessionLog({ id: "fork", cwd: "/work/widget" }, parent.build().events)
      .human("Release a patch version")
      .sh("pnpm bundle")
      .sh("npm version patch")
      .sh("npm publish")
      .end()
      .build();
    expect(detectCandidates(episodes(parent.build(), fork), OPTIONS)).toEqual([]);
  });

  test("finds a verified recovery that needed a dependency reinstall", () => {
    const found = detectCandidates(episodes(recoverySession("s1", T0)), OPTIONS);
    expect(found.map((candidate) => [candidate.kind, candidate.occurrences])).toEqual([
      ["recovery", 1],
    ]);
  });

  test("needs two sessions before a source-only fix becomes a debugging pattern", () => {
    expect(detectCandidates(episodes(debug("s1", T0)), OPTIONS)).toEqual([]);
    const found = detectCandidates(episodes(debug("s1", T0), debug("s2", T0 + DAY)), OPTIONS);
    expect(found.map((candidate) => [candidate.kind, candidate.occurrences])).toEqual([
      ["recovery", 2],
    ]);
  });

  test("leaves a long one-off migration for review as a complex candidate", () => {
    const found = detectCandidates(episodes(migrationSession("s1", T0)), OPTIONS);
    expect(found.map((candidate) => candidate.kind)).toEqual(["complex"]);
  });

  test("finds nothing in routine edits or failed attempts", () => {
    const found = detectCandidates(
      episodes(
        routineSession("s1", T0),
        routineSession("s2", T0 + DAY),
        failingSession("s3", T0 + 2 * DAY),
        failingSession("s4", T0 + 3 * DAY),
      ),
      OPTIONS,
    );
    expect(found).toEqual([]);
  });

  test("keeps candidate ids stable across detections", () => {
    const logs = [
      releaseSession("s1", T0, "Release a new patch version of widget"),
      releaseSession("s2", T0 + DAY, "Release a patch version of widget"),
    ];
    const first = detectCandidates(episodes(...logs), OPTIONS)[0]?.id;
    const second = detectCandidates(episodes(...logs.toReversed()), OPTIONS)[0]?.id;
    expect(first).toBeDefined();
    expect(second).toBe(first);
  });
});

describe("tokens", () => {
  test("splits Latin words and Chinese character pairs", () => {
    expect([...tokens("发布 widget 的版本 please")]).toEqual(["widget", "发布", "的版", "版本"]);
    expect(jaccard(tokens("release widget"), tokens("Release Widget"))).toBe(1);
  });
});
