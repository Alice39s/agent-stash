import { describe, expect, test } from "vitest";
import { createPromptHistory, type HistorySource, type SessionInfo } from "./history.ts";
import type { SessionPrompt } from "../prompts.ts";

interface FakeSession extends SessionInfo {
  prompts: SessionPrompt[];
}

function fakeSource(sessions: FakeSession[]): HistorySource & { reads: string[] } {
  const reads: string[] = [];
  return {
    reads,
    sessions: () =>
      Promise.resolve(
        sessions.map(({ id, stamp, rank, title }) => ({
          id,
          stamp,
          rank,
          ...(title === undefined ? {} : { title }),
        })),
      ),
    stamp: (id) => sessions.find((session) => session.id === id)?.stamp,
    prompts: (id) => {
      reads.push(id);
      const session = sessions.find((candidate) => candidate.id === id);
      if (session === undefined) return Promise.reject(new Error(`no session ${id}`));
      return Promise.resolve([...session.prompts]);
    },
  };
}

const prompt = (text: string, time: number): SessionPrompt => ({ text, time, seq: time });

describe("createPromptHistory", () => {
  test("reads one session once and rereads it after a newer prompt", async () => {
    const session: FakeSession = { id: "s1", stamp: 10, rank: 10, prompts: [prompt("a", 10)] };
    const source = fakeSource([session]);
    const history = createPromptHistory(source, { maxSessions: 10, maxEntries: 10 });

    expect(await history.session("s1")).toEqual([prompt("a", 10)]);
    expect(await history.session("s1")).toEqual([prompt("a", 10)]);
    expect(source.reads).toEqual(["s1"]);

    session.prompts.push(prompt("b", 20));
    session.stamp = 20;
    expect((await history.session("s1")).map((entry) => entry.text)).toEqual(["a", "b"]);
    expect(source.reads).toEqual(["s1", "s1"]);
  });

  test("shares one read between concurrent requests", async () => {
    const source = fakeSource([{ id: "s1", stamp: 1, rank: 1, prompts: [prompt("a", 1)] }]);
    const history = createPromptHistory(source, { maxSessions: 10, maxEntries: 10 });
    await Promise.all([history.session("s1"), history.session("s1")]);
    expect(source.reads).toEqual(["s1"]);
  });

  test("merges the most recently prompted sessions into one global history", async () => {
    const source = fakeSource([
      { id: "old", stamp: 5, rank: 5, prompts: [prompt("old prompt", 5)] },
      { id: "new", stamp: 30, rank: 30, title: "Release", prompts: [prompt("ship it", 30)] },
      { id: "mid", stamp: 20, rank: 20, prompts: [prompt("fix it", 20)] },
    ]);
    const history = createPromptHistory(source, { maxSessions: 2, maxEntries: 10 });

    expect(await history.global()).toEqual([
      { text: "ship it", time: 30, sessionId: "new", title: "Release" },
      { text: "fix it", time: 20, sessionId: "mid" },
    ]);
    expect(source.reads.toSorted()).toEqual(["mid", "new"]);
  });

  test("propagates a failed read and retries it on the next request", async () => {
    const source = fakeSource([]);
    const history = createPromptHistory(source, { maxSessions: 10, maxEntries: 10 });
    await expect(history.session("missing")).rejects.toThrow("no session missing");
    await expect(history.session("missing")).rejects.toThrow("no session missing");
    expect(source.reads).toEqual(["missing", "missing"]);
  });
});
