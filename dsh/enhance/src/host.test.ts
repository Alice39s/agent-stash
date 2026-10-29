import { createServer, type Server } from "node:http";
import { afterEach, describe, expect, test } from "vitest";
import type { DshWebRoute } from "../../shared/host/http.ts";
import { Config } from "./config.ts";
import type { SurfaceEvent } from "./context.ts";
import {
  contextHandler,
  registerRoutes,
  resolveRoute,
  rewriteHandler,
  type EnhanceHostContext,
} from "./host.ts";
import type { LlmView, ModelRoute, StreamChunkView } from "./rewrite.ts";
import { DEFAULT_SETTINGS } from "./settings-value.ts";
import { CONTEXT_PATH, REWRITE_PATH } from "./wire.ts";

const EVENTS: SurfaceEvent[] = [
  {
    type: "user/message",
    data: { content: [{ type: "text", text: "plan the cache" }], source: { kind: "user" } },
  },
  {
    type: "assistant/message",
    data: { message: { content: [{ type: "text", text: "Option A uses Redis." }] } },
  },
  { type: "tool/result", data: { content: [{ type: "text", text: "SECRET TOOL OUTPUT" }] } },
];

interface Harness {
  readonly ctx: EnhanceHostContext;
  readonly calls: { route: ModelRoute; system: string; input: string }[];
}

function harness(options: {
  readonly reply?: string;
  readonly chunks?: readonly StreamChunkView[];
  readonly defaultModel?: ModelRoute;
  readonly events?: readonly SurfaceEvent[] | Error;
}): Harness {
  const calls: Harness["calls"] = [];
  const llm: LlmView = {
    prepareCall: async (config) => ({
      config,
      async *stream(request) {
        const input = request.messages[0]?.content[0]?.text ?? "";
        calls.push({ route: config, system: request.system, input });
        yield* (
          options.chunks ?? [
            {
              type: "text-delta",
              text: options.reply ?? "<rewritten_prompt>Done.</rewritten_prompt>",
            },
            { type: "finish", reason: { kind: "stop" } },
          ]
        );
      },
    }),
  };
  const ctx: EnhanceHostContext = {
    webServer: { register: () => () => {} },
    connection: { requestRejection: (req) => (req.headers["x-reject"] === "1" ? 403 : undefined) },
    sessionQuery: {
      readSurface: async () => {
        if (options.events instanceof Error) throw options.events;
        return { events: options.events ?? EVENTS };
      },
    },
    llm,
    effect: (execute) => {
      execute();
    },
    get: () => {
      const selection = options.defaultModel;
      return selection === undefined ? undefined : { currentSelection: () => selection };
    },
    inject: () => undefined,
  };
  return { ctx, calls };
}

const servers: Server[] = [];
afterEach(() => {
  for (const server of servers.splice(0)) server.close();
});

async function serve(handler: DshWebRoute["handler"]): Promise<string> {
  const server = createServer((req, res) => void handler(req, res));
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string")
    throw new Error("the test server has no port");
  return `http://127.0.0.1:${String(address.port)}`;
}

async function rewrite(
  h: Harness,
  body: unknown,
  config: Record<string, unknown> = {},
): Promise<{ status: number; body: unknown }> {
  const base = await serve(rewriteHandler(h.ctx, Config(config)));
  const response = await fetch(`${base}${REWRITE_PATH}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: response.status, body: await response.json() };
}

const SESSION_MODEL = { provider: "session", model: "pro", reasoningEffort: "high" };

describe("rewrite route", () => {
  test("rewrites with the session model and the recent turns", async () => {
    const h = harness({});
    const result = await rewrite(h, {
      session: "s1",
      preset: "concise",
      draft: "do it",
      model: SESSION_MODEL,
    });
    expect(result).toEqual({ status: 200, body: { text: "Done.", unchanged: false, turns: 1 } });
    expect(h.calls[0]?.route).toEqual(SESSION_MODEL);
    expect(h.calls[0]?.input).toContain("User: plan the cache\nAssistant: Option A uses Redis.");
    expect(h.calls[0]?.input).not.toContain("SECRET TOOL OUTPUT");
  });

  test("uses the configured model and effort over the session model", async () => {
    const h = harness({});
    await rewrite(
      h,
      { session: "s1", preset: "polish", draft: "do it", model: SESSION_MODEL },
      { provider: "deepseek", model: "flash", effort: "off" },
    );
    expect(h.calls[0]?.route).toEqual({
      provider: "deepseek",
      model: "flash",
      reasoningEffort: "off",
    });
  });

  test("falls back to the DSH default model when the session has none", async () => {
    const h = harness({ defaultModel: { provider: "default", model: "m" } });
    await rewrite(h, { session: "s1", preset: "polish", draft: "do it" });
    expect(h.calls[0]?.route).toEqual({ provider: "default", model: "m" });
  });

  test("answers 409 when no model can be found", async () => {
    const result = await rewrite(harness({}), { session: "s1", preset: "polish", draft: "do it" });
    expect(result.status).toBe(409);
    expect(result.body).toMatchObject({ reason: "no-model" });
  });

  test("sends no conversation when session context is off", async () => {
    const h = harness({});
    const result = await rewrite(
      h,
      { session: "s1", preset: "concise", draft: "do it", model: SESSION_MODEL },
      { context: false },
    );
    expect(result.body).toMatchObject({ turns: 0 });
    expect(h.calls[0]?.input).toBe("<draft_prompt>\ndo it\n</draft_prompt>");
  });

  test("uses the instructions of a custom preset", async () => {
    const h = harness({});
    const presets = [
      { id: "custom-1", title: "Translate", description: "", prompt: "Translate to English." },
    ];
    await rewrite(
      h,
      { session: "s1", preset: "custom-1", draft: "do it", model: SESSION_MODEL },
      { presets },
    );
    expect(h.calls[0]?.system.endsWith("\n\nTranslate to English.")).toBe(true);
  });

  test("answers 404 for an unknown preset", async () => {
    const result = await rewrite(harness({}), {
      session: "s1",
      preset: "nope",
      draft: "x",
      model: SESSION_MODEL,
    });
    expect(result).toMatchObject({ status: 404, body: { reason: "preset" } });
  });

  test("reports an unreadable session", async () => {
    const h = harness({ events: new Error("session/not-found") });
    const result = await rewrite(h, {
      session: "gone",
      preset: "polish",
      draft: "x",
      model: SESSION_MODEL,
    });
    expect(result).toEqual({
      status: 500,
      body: { reason: "context", message: 'reading session "gone" failed: session/not-found' },
    });
  });

  test("reports a draft the model left unchanged", async () => {
    const h = harness({ reply: "UNCHANGED" });
    const result = await rewrite(h, {
      session: "s1",
      preset: "concise",
      draft: "Run the tests.",
      model: SESSION_MODEL,
    });
    expect(result.body).toEqual({ text: "Run the tests.", unchanged: true, turns: 1 });
  });

  test("reports a model failure with its reason", async () => {
    const h = harness({
      chunks: [{ type: "finish", reason: { kind: "error", failure: { message: "quota" } } }],
    });
    const result = await rewrite(h, {
      session: "s1",
      preset: "polish",
      draft: "x",
      model: SESSION_MODEL,
    });
    expect(result).toEqual({
      status: 502,
      body: { reason: "model", message: "session/pro: quota" },
    });
  });

  test("rejects an invalid body", async () => {
    const result = await rewrite(harness({}), { session: "s1", preset: "polish", draft: "" });
    expect(result.status).toBe(400);
  });
});

describe("context route", () => {
  test("counts the turns the next rewrite would send", async () => {
    const base = await serve(contextHandler(harness({}).ctx, Config({})));
    const response = await fetch(`${base}${CONTEXT_PATH}?session=s1`);
    expect(await response.json()).toEqual({ turns: 1 });
  });

  test("counts nothing when session context is off", async () => {
    const base = await serve(contextHandler(harness({}).ctx, Config({ context: false })));
    const response = await fetch(`${base}${CONTEXT_PATH}?session=s1`);
    expect(await response.json()).toEqual({ turns: 0 });
  });

  test("requires the session parameter and the DSH connection check", async () => {
    const base = await serve(contextHandler(harness({}).ctx, Config({})));
    expect((await fetch(`${base}${CONTEXT_PATH}`)).status).toBe(400);
    const rejected = await fetch(`${base}${CONTEXT_PATH}?session=s1`, {
      headers: { "x-reject": "1" },
    });
    expect(rejected.status).toBe(403);
  });
});

describe("route registration", () => {
  test("registers both routes as effects", () => {
    const paths: string[] = [];
    const { ctx } = harness({});
    registerRoutes(
      {
        ...ctx,
        webServer: {
          register: (route) => {
            paths.push(route.path);
            return () => {};
          },
        },
      },
      Config({}),
    );
    expect(paths).toEqual([REWRITE_PATH, CONTEXT_PATH]);
  });
});

describe("model resolution", () => {
  test("needs both provider and model to override the session", () => {
    const settings = { ...DEFAULT_SETTINGS, provider: "deepseek" };
    expect(resolveRoute(settings, SESSION_MODEL, () => undefined)).toEqual(SESSION_MODEL);
  });
});
