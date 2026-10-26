import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import type { IncomingMessage } from "node:http";
import { homedir } from "node:os";
import { join } from "pathe";
import { parseInitArgs, renderInitPrompt } from "../../src/init/prompt.ts";
import { CONFIG_PATH, loadInitRegistry, type InitRegistry } from "../../src/init/registry.ts";
import { readJsonBody, sendJson, type DshWebRoute } from "../shared/host/http.ts";
import { PRESETS_PATH, RUN_PATH, RunRequestSchema, type PresetList } from "./wire.ts";

/** DSH 会话里本插件用到的部分。 */
export interface DshSession {
  readonly header: { readonly cwd?: string };
}

export interface DshUserMessage {
  readonly id: string;
  readonly role: "user";
  readonly content: readonly { readonly type: "text"; readonly text: string }[];
  readonly source: { readonly kind: "user" };
}

export interface DshAgent {
  readonly session: DshSession;
  followup(message: DshUserMessage): void;
}

/** `sessionController.resolveAgent` 的结果：活跃或恢复后的 Agent，或会话域的错误。 */
export type DshAgentLookup =
  | { readonly agent: DshAgent }
  | { readonly error: { readonly code?: string; readonly message: string } };

/** DSH Host 上下文里本插件用到的服务。 */
export interface DshContext {
  readonly webServer: { register(route: DshWebRoute): () => void };
  readonly connection: { requestRejection(req: IncomingMessage): number | undefined };
  readonly sessionController: { resolveAgent(sessionId: string): Promise<DshAgentLookup> };
  effect(execute: () => () => void, label?: string): void;
  get(name: "workingDirectory"): { get(session: DshSession): string } | undefined;
}

export const name = "agent-stash-init";
export const inject = ["webServer", "connection", "sessionController"];

/** `$DSH_HOME`（默认 `~/.dsh`）下的 `agent-stash/init.json`。 */
export function dshConfigFile(env: NodeJS.ProcessEnv = process.env): string {
  return join(env["DSH_HOME"] ?? join(homedir(), ".dsh"), CONFIG_PATH);
}

/** 列给浏览器的预设：内置预设在前，自定义预设在后，各自保持注册顺序。 */
export function presetList(registry: InitRegistry): PresetList {
  const presets = [...registry.presets.values()];
  return {
    defaultPreset: registry.defaultPreset,
    presets: [
      ...presets.filter((preset) => !preset.custom),
      ...presets.filter((preset) => preset.custom),
    ].map((preset) => ({ name: preset.name, title: preset.title, custom: preset.custom })),
  };
}

/** 会话当前目录：优先 working-directory 服务，旧版 DSH 退回会话创建时的 cwd。 */
function sessionDirectory(ctx: DshContext, session: DshSession): string {
  const directory = ctx.get("workingDirectory")?.get(session) ?? session.header.cwd;
  if (!directory) {
    throw new Error("/init needs a session working directory");
  }
  return directory;
}

function userMessage(text: string): DshUserMessage {
  return Object.freeze({
    id: randomUUID(),
    role: "user",
    content: Object.freeze([Object.freeze({ type: "text", text })]),
    source: Object.freeze({ kind: "user" }),
  });
}

/**
 * 解析 `[预设] [额外指令]`，把渲染好的 `/init` prompt 作为后续用户消息排进会话，返回选中的预设名。
 * 每次都重新读取配置，改了 `init.json` 不必重启。
 */
export async function runInit(ctx: DshContext, agent: DshAgent, input: string): Promise<string> {
  const registry = await loadInitRegistry([dshConfigFile()]);
  const { preset, extra } = parseInitArgs(input, registry);
  const template = await readFile(preset.file, "utf8");
  const prompt = renderInitPrompt(template, extra, sessionDirectory(ctx, agent.session));
  agent.followup(userMessage(prompt));
  return preset.name;
}

type Handler = DshWebRoute["handler"];

function reason(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/** 先过 DSH 的连接鉴权（Host/Origin 检查与浏览器认证），再限定请求方法。 */
function guarded(ctx: DshContext, method: "GET" | "POST", handle: Handler): Handler {
  return async (req, res) => {
    const rejected = ctx.connection.requestRejection(req);
    if (rejected !== undefined) {
      res.statusCode = rejected;
      res.end();
      return;
    }
    if (req.method !== method) {
      res.setHeader("allow", method);
      sendJson(res, 405, { message: `only ${method} is allowed` });
      return;
    }
    await handle(req, res);
  };
}

/** `GET /agent-stash-init/presets`：预设列表与默认预设。 */
export function presetsRoute(ctx: DshContext): DshWebRoute {
  return {
    kind: "exact",
    path: `/${PRESETS_PATH}`,
    handler: guarded(ctx, "GET", async (_req, res) => {
      try {
        sendJson(res, 200, presetList(await loadInitRegistry([dshConfigFile()])));
      } catch (error) {
        sendJson(res, 500, { message: `reading the /init presets failed: ${reason(error)}` });
      }
    }),
  };
}

/**
 * `POST /agent-stash-init/run`，请求体 `{ session, input }`：恢复会话的 Agent 后执行 `/init`。
 * 会话不存在返回 404，会话归属其他 Agent 等会话域错误返回 409。
 */
export function runRoute(ctx: DshContext): DshWebRoute {
  return {
    kind: "exact",
    path: `/${RUN_PATH}`,
    handler: guarded(ctx, "POST", async (req, res) => {
      const body = await readJsonBody(req, RunRequestSchema);
      if (!body.ok) {
        sendJson(res, body.status, { message: body.message });
        return;
      }
      try {
        const found = await ctx.sessionController.resolveAgent(body.value.session);
        if ("error" in found) {
          const status = found.error.code === "session/not-found" ? 404 : 409;
          sendJson(res, status, { message: found.error.message });
          return;
        }
        sendJson(res, 200, { preset: await runInit(ctx, found.agent, body.value.input) });
      } catch (error) {
        sendJson(res, 500, { message: `/init failed: ${reason(error)}` });
      }
    }),
  };
}

/** 注册预设列表与执行两条路由；输入框里的 `/init` 指令由浏览器半部提供。 */
export function apply(ctx: DshContext): void {
  for (const route of [presetsRoute(ctx), runRoute(ctx)]) {
    ctx.effect(() => ctx.webServer.register(route), `${name}: ${route.path}`);
  }
}
