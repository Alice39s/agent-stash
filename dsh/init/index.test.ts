import { readFile } from "node:fs/promises";
import { createServer, type Server } from "node:http";
import { fileURLToPath } from "node:url";
import { join } from "pathe";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { DshWebRoute } from "../shared/host/http.ts";
import {
  apply,
  dshConfigFile,
  type DshAgent,
  type DshAgentLookup,
  type DshContext,
  type DshSession,
  type DshUserMessage,
} from "./index.ts";

/** `DSH_HOME`，其中的 `agent-stash/init.json` 把默认预设设为 kimi-code，并加上 team 预设。 */
const DSH_HOME = fileURLToPath(new URL("../../src/init/fixtures/agent", import.meta.url));
const SESSION_DIR = "/work/original";
const CURRENT_DIR = "/work/current";
const SESSION = "session-1";

interface Harness {
  routes: Map<string, DshWebRoute>;
  sent: DshUserMessage[];
  disposed: () => number;
}

function mount(options: {
  workingDirectory?: string;
  session?: DshSession;
  lookup?: (id: string) => DshAgentLookup;
}): Harness {
  const routes = new Map<string, DshWebRoute>();
  const disposers: (() => void)[] = [];
  let disposed = 0;
  const sent: DshUserMessage[] = [];
  const agent: DshAgent = {
    session: options.session ?? { header: { cwd: SESSION_DIR } },
    followup: (message) => sent.push(message),
  };
  const ctx: DshContext = {
    webServer: {
      register(route) {
        routes.set(route.path, route);
        return () => {
          disposed += 1;
          routes.delete(route.path);
        };
      },
    },
    connection: {
      requestRejection: (req) => (req.headers["x-test-trust"] === "no" ? 403 : undefined),
    },
    sessionController: {
      resolveAgent: (id) =>
        Promise.resolve(
          options.lookup?.(id) ??
            (id === SESSION
              ? { agent }
              : { error: { code: "session/not-found", message: `session "${id}" not found` } }),
        ),
    },
    effect(execute) {
      disposers.push(execute());
    },
    get: () =>
      options.workingDirectory === undefined
        ? undefined
        : { get: () => options.workingDirectory ?? "" },
  };
  apply(ctx);
  return {
    routes,
    sent,
    disposed: () => {
      for (const dispose of disposers) dispose();
      return disposed;
    },
  };
}

let server: Server | undefined;

afterEach(async () => {
  await new Promise<void>((resolve) => {
    if (server === undefined) resolve();
    else server.close(() => resolve());
  });
  server = undefined;
  vi.unstubAllEnvs();
});

beforeEach(() => {
  vi.stubEnv("DSH_HOME", DSH_HOME);
});

/** 在本机端口上挂起 Harness 的全部路由，返回地址。 */
async function serve(harness: Harness): Promise<string> {
  server = createServer((req, res) => {
    const route = harness.routes.get(new URL(req.url ?? "/", "http://localhost").pathname);
    if (route === undefined) {
      res.statusCode = 404;
      res.end();
      return;
    }
    void route.handler(req, res);
  });
  await new Promise<void>((resolve) => server?.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (address === null || typeof address === "string") throw new Error("server is not on TCP");
  return `http://127.0.0.1:${address.port}`;
}

function run(base: string, body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  return fetch(`${base}/agent-stash-init/run`, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

async function template(preset: string): Promise<string> {
  return readFile(
    fileURLToPath(new URL(`../../vendor/init-prompts/${preset}/prompt.md`, import.meta.url)),
    "utf8",
  );
}

test("reads the config from $DSH_HOME and falls back to ~/.dsh", () => {
  expect(dshConfigFile()).toBe(join(DSH_HOME, "agent-stash/init.json"));
  expect(dshConfigFile({})).toMatch(/\/\.dsh\/agent-stash\/init\.json$/);
});

describe("GET /agent-stash-init/presets", () => {
  test("lists the built-in presets before the custom ones with the configured default", async () => {
    const base = await serve(mount({}));
    const response = await fetch(`${base}/agent-stash-init/presets`);
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body: unknown = await response.json();
    expect(body).toEqual({
      defaultPreset: "kimi-code",
      presets: [
        { name: "codex", title: "Codex CLI", custom: false },
        { name: "kimi-code", title: "Kimi Code CLI", custom: false },
        { name: "opencode", title: "OpenCode", custom: false },
        { name: "crush", title: "Crush", custom: false },
        { name: "copilot", title: "GitHub Copilot in VS Code", custom: false },
        { name: "qwen-code", title: "Qwen Code", custom: false },
        { name: "kilo-code", title: "Kilo Code", custom: false },
        { name: "claude-code", title: "Claude Code (classic)", custom: false },
        { name: "claude-code-init-new", title: "Claude Code (multi-phase)", custom: false },
        { name: "team", title: "team", custom: true, description: "Team AGENTS.md preset" },
      ],
    });
  });

  test("answers the rejection status of an untrusted request and only allows GET", async () => {
    const base = await serve(mount({}));
    const rejected = await fetch(`${base}/agent-stash-init/presets`, {
      headers: { "x-test-trust": "no" },
    });
    expect(rejected.status).toBe(403);
    expect(await rejected.json()).toEqual({
      message: "the DSH connection check rejected this request",
    });
    const posted = await fetch(`${base}/agent-stash-init/presets`, { method: "POST" });
    expect(posted.status).toBe(405);
    expect(posted.headers.get("allow")).toBe("GET");
  });
});

describe("POST /agent-stash-init/run", () => {
  test("queues the selected preset with the extra prompt as a follow-up user message", async () => {
    const harness = mount({});
    const response = await run(await serve(harness), {
      session: SESSION,
      input: " codex Mention pnpm.",
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ preset: "codex" });
    expect(harness.sent).toEqual([
      {
        id: expect.stringMatching(/^[0-9a-f-]{36}$/),
        role: "user",
        content: [
          {
            type: "text",
            text: `${(await template("codex")).trimEnd()}\n\n## Additional instructions from the user\n\nMention pnpm.\n`,
          },
        ],
        source: { kind: "user" },
      },
    ]);
    expect(Object.isFrozen(harness.sent[0]?.content[0])).toBe(true);
  });

  test("runs the $DSH_HOME default preset without arguments", async () => {
    const harness = mount({});
    const response = await run(await serve(harness), { session: SESSION, input: "" });
    expect(await response.json()).toEqual({ preset: "kimi-code" });
    expect(harness.sent[0]?.content[0]?.text).toBe(await template("kimi-code"));
  });

  test("fills ${path} with the current working directory, else the session directory", async () => {
    const current = mount({ workingDirectory: CURRENT_DIR });
    await run(await serve(current), { session: SESSION, input: "team release flow" });
    expect(current.sent[0]?.content[0]?.text).toBe(
      `Write the team AGENTS.md for ${CURRENT_DIR}.\n\nFocus: release flow\n`,
    );
    server?.close();

    const original = mount({});
    await run(await serve(original), { session: SESSION, input: "team" });
    expect(original.sent[0]?.content[0]?.text).toBe(
      `Write the team AGENTS.md for ${SESSION_DIR}.\n\nFocus: \n`,
    );
  });

  test("maps session lookup errors to 404 and 409", async () => {
    const base = await serve(
      mount({
        lookup: (id) =>
          id === "child"
            ? { error: { code: "session/subagent-owned", message: "owned by its parent" } }
            : { error: { code: "session/not-found", message: `session "${id}" not found` } },
      }),
    );
    const missing = await run(base, { session: "missing", input: "" });
    expect(missing.status).toBe(404);
    expect(await missing.json()).toEqual({ message: 'session "missing" not found' });
    const child = await run(base, { session: "child", input: "" });
    expect(child.status).toBe(409);
  });

  test("reports a session without a working directory as a failed run", async () => {
    const harness = mount({ session: { header: {} } });
    const response = await run(await serve(harness), { session: SESSION, input: "" });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ message: "/init needs a session working directory" });
    expect(harness.sent).toEqual([]);
  });

  test("names the preset whose template file cannot be read", async () => {
    vi.stubEnv(
      "DSH_HOME",
      fileURLToPath(new URL("../../src/init/fixtures/missing-template", import.meta.url)),
    );
    const harness = mount({});
    const response = await run(await serve(harness), { session: SESSION, input: "broken" });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      message: expect.stringMatching(
        /^reading the template of preset "broken" failed: ENOENT: .*\/missing-template\/agent-stash\/missing\.md'$/u,
      ),
    });
    expect(harness.sent).toEqual([]);
  });

  test("rejects bodies that are not JSON run requests", async () => {
    const base = await serve(mount({}));
    const plain = await fetch(`${base}/agent-stash-init/run`, {
      method: "POST",
      headers: { "content-type": "text/plain" },
      body: JSON.stringify({ session: SESSION, input: "" }),
    });
    expect(plain.status).toBe(415);
    const invalid = await run(base, { session: "", input: 1 });
    expect(invalid.status).toBe(400);
    const untrusted = await run(base, { session: SESSION, input: "" }, { "x-test-trust": "no" });
    expect(untrusted.status).toBe(403);
    const read = await fetch(`${base}/agent-stash-init/run`);
    expect(read.status).toBe(405);
  });
});

test("unloading the plugin removes both routes", () => {
  const harness = mount({});
  expect([...harness.routes.keys()]).toEqual([
    "/agent-stash-init/presets",
    "/agent-stash-init/run",
  ]);
  expect(harness.disposed()).toBe(2);
  expect(harness.routes.size).toBe(0);
});
