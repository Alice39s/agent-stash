import type { IncomingMessage, ServerResponse } from "node:http";
import type { DshKitHost } from "../../shared/host/kit.ts";
import { guardRoute, readJsonBody, sendJson, type DshWebRoute } from "../../shared/host/http.ts";
import { currentSettings, type ConfigValue } from "./config.ts";
import {
  countTurns,
  projectTurns,
  selectTurns,
  type ContextTurn,
  type SurfaceEvent,
} from "./context.ts";
import { presetInstructions } from "./presets.ts";
import { expandIncludes, loadReferences, type References } from "./references.ts";
import { buildPrompt, runRewrite, type LlmView, type ModelRoute } from "./rewrite.ts";
import type { EnhanceSettings } from "./settings-value.ts";
import { estimateTokens } from "./tokens.ts";
import {
  CONTEXT_PATH,
  type ContextResult,
  RewriteRequestSchema,
  REWRITE_PATH,
  type Failure,
  type RewriteResult,
  type SessionModel,
} from "./wire.ts";

/** DSH Host 上下文里本插件用到的服务。 */
export interface EnhanceHostContext extends DshKitHost {
  readonly webServer: { register(route: DshWebRoute): () => void };
  readonly connection: { requestRejection(req: IncomingMessage): number | undefined };
  readonly sessionQuery: {
    readSurface(id: string): Promise<{ readonly events: readonly SurfaceEvent[] }>;
  };
  readonly llm: LlmView;
  effect(execute: () => () => void, label?: string): void;
  get(name: "agentDefaultModel"): { currentSelection(): ModelRoute } | undefined;
}

/** Host 半部声明的依赖服务；`agentDefaultModel` 可选，经 `ctx.get` 读取。 */
export const HOST_INJECT = ["webServer", "connection", "sessionQuery", "llm"];

/**
 * 改写用的模型：配置里选了模型就用它和配置的推理强度；否则跟随会话当前选中的模型，
 * 会话还没选过模型时用 DSH 的默认模型。
 */
export function resolveRoute(
  settings: EnhanceSettings,
  session: SessionModel | undefined,
  fallback: () => ModelRoute | undefined,
): ModelRoute | undefined {
  if (settings.provider !== "" && settings.model !== "") {
    return {
      provider: settings.provider,
      model: settings.model,
      ...(settings.effort === "" ? {} : { reasoningEffort: settings.effort }),
    };
  }
  if (session === undefined) return fallback();
  const { provider, model, reasoningEffort } = session;
  return reasoningEffort === undefined ? { provider, model } : { provider, model, reasoningEffort };
}

/** 按设置读取会话最近几轮对话；关闭上下文时为空。 */
async function contextTurns(
  ctx: EnhanceHostContext,
  settings: EnhanceSettings,
  sessionId: string,
): Promise<ContextTurn[]> {
  if (!settings.context) return [];
  const surface = await ctx.sessionQuery.readSurface(sessionId);
  return selectTurns(projectTurns(surface.events), settings.contextTurns);
}

/** 读取随包分发的写作参考；第一次调用时读取，之后复用同一份结果。 */
export type ReferenceSource = () => Promise<References>;

/** 预设实际发给模型的模式说明：自定义或内置指令，`<include>` 换成写作参考的全文。 */
export function resolveInstructions(
  settings: EnhanceSettings,
  presetId: string,
  references: References,
):
  | { readonly ok: true; readonly text: string }
  | { readonly ok: false; readonly failure: Failure } {
  const preset = settings.presets.find((candidate) => candidate.id === presetId);
  const instructions = preset === undefined ? undefined : presetInstructions(preset);
  if (instructions === undefined) {
    return {
      ok: false,
      failure: {
        reason: "preset",
        message: `preset "${presetId}" does not exist or has no instructions`,
      },
    };
  }
  const expanded = expandIncludes(instructions, references);
  if (expanded.ok) return expanded;
  const known = [...references.keys()].join(", ");
  return {
    ok: false,
    failure: {
      reason: "preset",
      message: `preset "${presetId}" includes ${expanded.missing.map((name) => `"${name}"`).join(", ")}, which is not a bundled reference (bundled: ${known})`,
    },
  };
}

const STATUS: Readonly<Record<Failure["reason"], number>> = {
  timeout: 504,
  model: 502,
  truncated: 502,
  empty: 502,
  invalid: 502,
  "no-model": 409,
  preset: 404,
  context: 500,
};

function sendFailure(res: ServerResponse, failure: Failure): void {
  sendJson(res, STATUS[failure.reason], failure);
}

function contextFailure(sessionId: string, error: unknown): Failure {
  const detail = error instanceof Error ? error.message : String(error);
  return { reason: "context", message: `reading session "${sessionId}" failed: ${detail}` };
}

/** 每个预设在草稿为空时的预计输入 token 数；指令无法展开的预设不计。 */
export function estimatePresets(
  settings: EnhanceSettings,
  turns: readonly ContextTurn[],
  references: References,
): Record<string, number> {
  const tokens: Record<string, number> = {};
  for (const preset of settings.presets) {
    const instructions = resolveInstructions(settings, preset.id, references);
    if (!instructions.ok) continue;
    const prompt = buildPrompt("", instructions.text, turns);
    tokens[preset.id] = estimateTokens(prompt.system) + estimateTokens(prompt.input);
  }
  return tokens;
}

/** `GET ?session=<id>`：下一次改写会关联几轮对话，以及各预设的预计用量。 */
export function contextHandler(
  ctx: EnhanceHostContext,
  config: ConfigValue,
  references: ReferenceSource,
): DshWebRoute["handler"] {
  return guardRoute(
    (req) => ctx.connection.requestRejection(req),
    "GET",
    async (req, res) => {
      const sessionId = new URL(req.url ?? "/", "http://localhost").searchParams.get("session");
      if (sessionId === null || sessionId === "") {
        sendJson(res, 400, { message: "the session query parameter is required" });
        return;
      }
      const settings = currentSettings(config);
      let turns: ContextTurn[];
      try {
        turns = await contextTurns(ctx, settings, sessionId);
      } catch (error) {
        sendFailure(res, contextFailure(sessionId, error));
        return;
      }
      const result: ContextResult = {
        turns: countTurns(turns),
        tokens: estimatePresets(settings, turns, await references()),
      };
      sendJson(res, 200, result);
    },
  );
}

/** `POST`：用选中的预设改写草稿；浏览器断开时中止模型请求。 */
export function rewriteHandler(
  ctx: EnhanceHostContext,
  config: ConfigValue,
  references: ReferenceSource,
): DshWebRoute["handler"] {
  return guardRoute(
    (req) => ctx.connection.requestRejection(req),
    "POST",
    async (req, res) => {
      const body = await readJsonBody(req, RewriteRequestSchema);
      if (!body.ok) {
        sendJson(res, body.status, { message: body.message });
        return;
      }
      const { session, preset: presetId, draft, model } = body.value;
      const settings = currentSettings(config);
      const instructions = resolveInstructions(settings, presetId, await references());
      if (!instructions.ok) {
        sendFailure(res, instructions.failure);
        return;
      }
      const route = resolveRoute(settings, model, () =>
        ctx.get("agentDefaultModel")?.currentSelection(),
      );
      if (route === undefined) {
        sendFailure(res, {
          reason: "no-model",
          message: "no rewriting model is configured and neither the session nor DSH selects one",
        });
        return;
      }
      let turns: ContextTurn[];
      try {
        turns = await contextTurns(ctx, settings, session);
      } catch (error) {
        sendFailure(res, contextFailure(session, error));
        return;
      }
      const closed = new AbortController();
      res.on("close", () => {
        if (!res.writableFinished) closed.abort();
      });
      const prompt = buildPrompt(draft, instructions.text, turns);
      const outcome = await runRewrite(ctx.llm, route, prompt, draft, {
        signal: closed.signal,
        timeoutMs: settings.timeout * 1000,
      });
      // 浏览器已经断开，没有人接收回应。
      if (outcome === undefined) return;
      if (!outcome.ok) {
        sendFailure(res, { reason: outcome.reason, message: outcome.message });
        return;
      }
      const result: RewriteResult = {
        text: outcome.text,
        unchanged: outcome.unchanged,
        turns: countTurns(turns),
      };
      sendJson(res, 200, result);
    },
  );
}

/** 注册改写与上下文两条路由，插件卸载时一并移除。 */
export function registerRoutes(ctx: EnhanceHostContext, config: ConfigValue): void {
  let loading: Promise<References> | undefined;
  const references: ReferenceSource = () => (loading ??= loadReferences());
  const routes: DshWebRoute[] = [
    { kind: "exact", path: REWRITE_PATH, handler: rewriteHandler(ctx, config, references) },
    { kind: "exact", path: CONTEXT_PATH, handler: contextHandler(ctx, config, references) },
  ];
  for (const route of routes) {
    ctx.effect(() => ctx.webServer.register(route), `dsh-enhance: ${route.path}`);
  }
}
