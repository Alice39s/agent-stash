import { createServer, type Server } from "node:http";
import * as v from "valibot";
import { afterEach, describe, expect, test } from "vitest";
import {
  ACTION_PATH,
  DETAIL_PATH,
  DetailViewSchema,
  SEARCH_PATH,
  SESSION_PATH,
  STATS_PATH,
  ActionResultSchema,
  ErrorBodySchema,
  SearchViewSchema,
  SessionViewSchema,
  StatsViewSchema,
} from "../shared.ts";
import { Config, currentSettings } from "./config.ts";
import { scoutRoutes } from "./route.ts";
import { createScout } from "./scout.ts";
import { SCOUT_DOMAIN, storeOf } from "./store.ts";
import {
  answerText,
  directorySkills,
  logQuery,
  memoryDomain,
  releaseSession,
  routineSession,
  scriptedLlm,
} from "./testing.ts";
import { detailView, inboxView, searchView, sessionView, statsView } from "./views.ts";

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 1);

let server: Server | undefined;

afterEach(async () => {
  const running = server;
  server = undefined;
  if (running !== undefined) await new Promise((done) => running.close(done));
});

/** 在本机随机端口上挂好插件的全部路由，返回基地址与引擎。 */
async function serve() {
  const store = storeOf(memoryDomain(SCOUT_DOMAIN));
  const settings = currentSettings(Config({}));
  const scout = createScout({
    query: logQuery([
      releaseSession("s1", T0, "Release a patch version of widget"),
      releaseSession("s2", T0 + DAY, "Release widget again"),
      routineSession("s3", T0 + 2 * DAY),
    ]),
    llm: scriptedLlm([
      answerText(JSON.stringify({ decision: "skip", reason: "No.", refs: ["E1"] })),
      answerText(JSON.stringify({ decision: "skip", reason: "No.", refs: ["E1"] })),
    ]),
    skills: directorySkills(() => []),
    store,
    settings: () => settings,
    defaultModel: () => ({ provider: "test", model: "m" }),
    logger: { info: () => undefined, warn: () => undefined },
    now: () => T0 + 5 * DAY,
    signal: new AbortController().signal,
  });
  scout.setLead(true);
  await scout.scan();
  const routes = scoutRoutes({
    scout,
    connection: { requestRejection: () => undefined },
    logger: { info: () => undefined, warn: () => undefined },
    inbox: () => inboxView(store, settings, scout.routes(), scout.runtime(), T0 + 5 * DAY),
    detail: async (id) => {
      await scout.evidence(id);
      return detailView(store, id, scout.runtime());
    },
    session: async (id) => sessionView(id, await scout.session(id)),
    search: (query, outcome, limit) => searchView(query, scout.search(query, { outcome, limit })),
    stats: async () =>
      statsView(store, await scout.coverage(), scout.runtime().working, T0 + 5 * DAY),
  });
  const http = createServer((request, response) => {
    const path = new URL(request.url ?? "", "http://localhost").pathname;
    const route = routes.find((entry) => entry.path === path);
    if (route === undefined) {
      response.writeHead(404).end();
      return;
    }
    void route.handler(request, response);
  });
  server = http;
  await new Promise<void>((done) => http.listen(0, "127.0.0.1", done));
  const address = http.address();
  if (address === null || typeof address === "string") throw new Error("服务器没有监听 TCP 端口");
  const { port } = address;
  return { base: `http://127.0.0.1:${String(port)}`, scout, store };
}

/** 读取一个 GET 路由，用 schema 校验响应体。 */
async function get<TSchema extends v.GenericSchema>(
  url: string,
  schema: TSchema,
): Promise<v.InferOutput<TSchema>> {
  const response = await fetch(url);
  expect(response.status).toBe(200);
  return v.parse(schema, await response.json());
}

/** 操作的响应体：操作结果，或请求不合法时的错误说明。 */
const ActionReplySchema = v.union([ActionResultSchema, ErrorBodySchema]);

async function post(
  base: string,
  body: object,
): Promise<{ status: number; body: v.InferOutput<typeof ActionReplySchema> }> {
  const response = await fetch(`${base}${ACTION_PATH}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return { status: response.status, body: v.parse(ActionReplySchema, await response.json()) };
}

describe("scoutRoutes", () => {
  test("searches stored tasks with an optional outcome and a bounded limit", async () => {
    const { base } = await serve();
    const view = await get(`${base}${SEARCH_PATH}?q=release+widget&limit=1`, SearchViewSchema);
    expect(view).toMatchObject({ query: "release widget", total: 2, indexed: { sessions: 3 } });
    expect(view.hits).toHaveLength(1);
    expect(view.hits[0]).toMatchObject({ sessionId: "s2", goal: "Release widget again" });

    const failed = await get(`${base}${SEARCH_PATH}?q=release&outcome=failed`, SearchViewSchema);
    expect(failed.total).toBe(0);
    const empty = await get(`${base}${SEARCH_PATH}`, SearchViewSchema);
    expect(empty).toMatchObject({ query: "", total: 0 });
    for (const query of ["limit=0", "limit=201", "limit=x", "outcome=great"]) {
      // oxlint-disable-next-line no-await-in-loop -- 逐个检查。
      expect((await fetch(`${base}${SEARCH_PATH}?q=x&${query}`)).status).toBe(400);
    }
  });

  test("describes a session and needs its id", async () => {
    const { base } = await serve();
    const view = await get(`${base}${SESSION_PATH}?id=s1`, SessionViewSchema);
    expect(view).toMatchObject({ sessionId: "s1", state: "analyzed", error: null });
    expect(view.tasks).toHaveLength(1);
    expect((await fetch(`${base}${SESSION_PATH}`)).status).toBe(400);
  });

  test("returns statistics with the sessions DSH lists", async () => {
    const { base } = await serve();
    const stats = await get(`${base}${STATS_PATH}`, StatsViewSchema);
    expect(stats.coverage).toMatchObject({ analyzed: 3, inRange: 3, total: 3, failed: [] });
    expect(stats.usage).toHaveLength(7);
  });

  test("answers the lead id of an extraction and opens it in detail", async () => {
    const { base, scout, store } = await serve();
    const extracted = await post(base, { action: "extract-session", sessionId: "s1" });
    expect(extracted).toMatchObject({ status: 200, body: { ok: true, leadId: "session:s1" } });
    const episodeIds = ["s1", "s2"].flatMap(
      (id) => store.sessions.get(id)?.episodes.map((episode) => episode.id) ?? [],
    );
    const selected = await post(base, { action: "extract-selected", episodeIds });
    expect(selected.status).toBe(200);
    const leadId = "leadId" in selected.body ? selected.body.leadId : undefined;
    expect(leadId).toMatch(/^selected:[0-9a-f]{16}$/u);
    await scout.idle();
    const detail = await get(
      `${base}${DETAIL_PATH}?id=${encodeURIComponent(leadId ?? "")}`,
      DetailViewSchema,
    );
    expect(detail.item).toMatchObject({ id: leadId, kind: "selected", state: "skipped" });
    expect(detail.episodes).toHaveLength(2);
    // 其余操作的响应不带线索 id。
    const analyzed = await post(base, { action: "analyze-session", sessionId: "s2" });
    expect("leadId" in analyzed.body).toBe(false);
    expect((await fetch(`${base}${DETAIL_PATH}?id=nope`)).status).toBe(404);
  });

  test("runs the session, extraction, and backfill actions", async () => {
    const { base, scout } = await serve();
    expect(await post(base, { action: "analyze-session", sessionId: "s1" })).toMatchObject({
      status: 200,
      body: { ok: true },
    });
    const missing = await post(base, { action: "extract-session", sessionId: "gone" });
    expect(missing).toMatchObject({ status: 404, body: { ok: false, error: { kind: "missing" } } });
    const selected = await post(base, { action: "extract-selected", episodeIds: ["s9:1"] });
    expect(selected).toMatchObject({ status: 404, body: { error: { kind: "missing" } } });
    const tooMany = await post(base, {
      action: "extract-selected",
      episodeIds: Array.from({ length: 13 }, (_, n) => `s1:${String(n)}`),
    });
    expect(tooMany.status).toBe(400);

    expect(await post(base, { action: "backfill", range: "90d" })).toMatchObject({
      status: 200,
      body: { ok: true },
    });
    await scout.idle();
    const pause = await post(base, { action: "backfill-pause" });
    expect(pause).toMatchObject({ status: 409, body: { error: { kind: "invalid" } } });
    expect(scout.runtime().backfill).toMatchObject({ range: "90d", state: "done", total: 0 });
  });
});
