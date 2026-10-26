import { createServer, type IncomingMessage, type Server } from "node:http";
import { afterEach, describe, expect, test } from "vitest";
import type { PromptEvent } from "../prompts.ts";
import type { DshWebRoute } from "./http.ts";
import {
  dshHistorySource,
  promptRouteHandler,
  registerPromptRoute,
  type DshHostContext,
  type DshProjectionSnapshot,
  type DshSessionHeader,
} from "./plugin.ts";

function message(seq: number, text: string, kind = "user"): PromptEvent {
  return {
    type: "user/message",
    seq,
    time: seq * 10,
    data: { content: [{ type: "text", text }], source: { kind } },
  };
}

interface FakeSession {
  header: DshSessionHeader;
  events: PromptEvent[];
  live?: object;
  snapshot?: DshProjectionSnapshot;
}

function fakeContext(sessions: FakeSession[]): DshHostContext & { routes: DshWebRoute[] } {
  const routes: DshWebRoute[] = [];
  const byLive = (live: object) => sessions.find((session) => session.live === live);
  return {
    routes,
    webServer: {
      register(route) {
        routes.push(route);
        return () => routes.splice(routes.indexOf(route), 1);
      },
    },
    connection: {
      requestRejection: (req: IncomingMessage) =>
        req.headers["x-test-trust"] === "no" ? 403 : undefined,
    },
    sessionQuery: {
      listSessions: () => Promise.resolve(sessions.map(({ header }) => ({ header }))),
      readSession(id) {
        const session = sessions.find((candidate) => candidate.header.id === id);
        if (session === undefined) return Promise.reject(new Error(`unknown session ${id}`));
        return Promise.resolve({ events: session.events });
      },
    },
    sessions: { get: (id) => sessions.find((session) => session.header.id === id)?.live },
    sessionProjections: {
      cachedSnapshot: (live) => byLive(live)?.snapshot,
      snapshot: (live) => byLive(live)?.snapshot ?? { values: {} },
    },
    effect(execute) {
      execute();
    },
    get: () => ({
      cachedSnapshot: (header) =>
        sessions.find((session) => session.header.id === header.id && session.live === undefined)
          ?.snapshot,
    }),
  };
}

const header = (id: string, extra: Partial<DshSessionHeader> = {}): DshSessionHeader => ({
  id,
  createdAt: 1,
  cwd: "/work",
  ...extra,
});

const metadata = (lastPromptAt: number | null, title?: string): DshProjectionSnapshot => ({
  values: { sessionListMetadata: { lastPromptAt }, ...(title === undefined ? {} : { title }) },
});

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (server === undefined) resolve();
    else server.close(() => resolve());
  });
  server = undefined;
});

async function serve(handler: DshWebRoute["handler"]): Promise<string> {
  server = createServer((req, res) => {
    void handler(req, res);
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("server is not on TCP");
  return `http://127.0.0.1:${address.port}`;
}

describe("dshHistorySource", () => {
  test("lists visible top-level sessions with their prompt time and title", async () => {
    const source = dshHistorySource(
      fakeContext([
        { header: header("live"), events: [], live: {}, snapshot: metadata(50, "Live title") },
        { header: header("cold"), events: [], snapshot: metadata(null) },
        { header: header("uncached", { createdAt: 7 }), events: [] },
        { header: header("child", { origin: "subagent" }), events: [] },
        { header: header("nested", { delegationDepth: 1 }), events: [] },
        { header: { id: "headless", createdAt: 1 }, events: [] },
      ]),
    );
    expect(await source.sessions()).toEqual([
      { id: "live", stamp: 50, rank: 50, title: "Live title" },
      { id: "cold", stamp: null, rank: 1 },
      { id: "uncached", stamp: undefined, rank: 7 },
    ]);
  });

  test("reads the stamp of live sessions only and extracts human prompts from the log", async () => {
    const source = dshHistorySource(
      fakeContext([
        {
          header: header("live"),
          events: [message(1, "hello"), message(2, "injected", "goal")],
          live: {},
          snapshot: metadata(10),
        },
        { header: header("cold"), events: [], snapshot: metadata(20) },
      ]),
    );
    expect(source.stamp("live")).toBe(10);
    expect(source.stamp("cold")).toBe(undefined);
    expect(await source.prompts("live")).toEqual([{ text: "hello", time: 10, seq: 1 }]);
  });
});

const routeSessions = (): FakeSession[] => [
  {
    header: header("a"),
    events: [message(1, "first"), message(3, "third")],
    snapshot: metadata(30, "Alpha"),
  },
  { header: header("b"), events: [message(2, "second")], snapshot: metadata(20) },
];

describe("prompt route", () => {
  test("serves one session in chronological order and the global history newest first", async () => {
    const ctx = fakeContext(routeSessions());
    registerPromptRoute(ctx, "/dsh-test/prompts", "test route");
    expect(ctx.routes.map((route) => [route.kind, route.path])).toEqual([
      ["exact", "/dsh-test/prompts"],
    ]);
    const base = await serve(ctx.routes[0]!.handler);

    const one = await fetch(`${base}/dsh-test/prompts?session=a`);
    expect(one.status).toBe(200);
    expect(one.headers.get("cache-control")).toBe("no-store");
    expect(await one.json()).toEqual({
      items: [
        { text: "first", time: 10 },
        { text: "third", time: 30 },
      ],
    });

    const all = await fetch(`${base}/dsh-test/prompts`);
    expect(await all.json()).toEqual({
      items: [
        { text: "third", time: 30, sessionId: "a", title: "Alpha" },
        { text: "second", time: 20, sessionId: "b" },
        { text: "first", time: 10, sessionId: "a", title: "Alpha" },
      ],
    });
  });

  test("rejects untrusted requests and other methods with a JSON reason", async () => {
    const ctx = fakeContext(routeSessions());
    registerPromptRoute(ctx, "/dsh-test/prompts", "test route");
    const base = await serve(ctx.routes[0]!.handler);
    const rejected = await fetch(base, { headers: { "x-test-trust": "no" } });
    expect(rejected.status).toBe(403);
    expect(await rejected.json()).toEqual({
      message: "the DSH connection check rejected this request",
    });
    const post = await fetch(base, { method: "POST" });
    expect(post.status).toBe(405);
    expect(post.headers.get("allow")).toBe("GET");
  });

  test("reports the session whose log could not be read", async () => {
    const handler = promptRouteHandler(
      {
        session: () => Promise.reject(new Error("log is damaged")),
        global: () => Promise.resolve([]),
      },
      () => undefined,
    );
    const base = await serve(handler);
    const response = await fetch(`${base}/?session=broken`);
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      message: 'reading prompts of session "broken" failed: Error: log is damaged',
    });
  });
});
