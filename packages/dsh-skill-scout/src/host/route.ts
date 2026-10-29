/**
 * 浏览器使用的三个路由：
 * - GET `INBOX_PATH`：收件箱与工作状态；
 * - GET `DETAIL_PATH?id=`：一条建议的证据与草稿；
 * - POST `ACTION_PATH`：复核、忽略、恢复、预览、写入、撤销与重新扫描。
 * 每个请求先经过 `ctx.connection.requestRejection` 的 Host/Origin 检查与浏览器认证。
 * 请求不合法返回 400，建议不存在返回 404，其余已知的操作失败返回 409 并附带新的收件箱。
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import * as v from "valibot";
import {
  ACTION_PATH,
  ActionSchema,
  DETAIL_PATH,
  INBOX_PATH,
  type Action,
  type ActionResult,
  type DetailView,
  type InboxView,
  type PreviewView,
} from "../shared.ts";
import type { DshHostConnection, DshLogger, DshWebRoute } from "./dsh.ts";
import { isActionError, type Preview, type Scout } from "./scout.ts";
import { displayPath } from "./writer.ts";

/** 路由需要的插件状态。 */
export interface RouteDeps {
  readonly scout: Scout;
  readonly connection: DshHostConnection;
  readonly logger: DshLogger;
  readonly inbox: () => InboxView;
  readonly detail: (id: string) => DetailView | undefined;
}

const MAX_BODY = 256 * 1024;

const ActionBodySchema = v.pipe(v.string(), v.parseJson(), ActionSchema);

interface Reply {
  readonly status: number;
  readonly body: InboxView | DetailView | ActionResult | { readonly error: string };
}

async function readBody(request: IncomingMessage): Promise<string> {
  request.setEncoding("utf8");
  let text = "";
  for await (const chunk of request) {
    text += String(chunk);
    if (text.length > MAX_BODY) throw new Error("请求体过大");
  }
  return text;
}

function respond(response: ServerResponse, { status, body }: Reply, allow?: string): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...(allow === undefined ? {} : { allow }),
  });
  response.end(JSON.stringify(body));
}

/** 预览的界面形式：去掉内部字段，路径里的家目录换成 `~`。 */
function previewView(preview: Preview): PreviewView {
  if (preview.kind === "create") {
    const { fields: _fields, ...view } = preview;
    return { ...view, path: displayPath(view.path) };
  }
  const { section: _section, ...view } = preview;
  return { ...view, path: view.path === null ? null : displayPath(view.path) };
}

/** 执行一个操作；只有 preview 返回内容。 */
async function perform(scout: Scout, action: Action): Promise<PreviewView | undefined> {
  if (action.action === "preview") return previewView(await scout.preview(action.id, action));
  if (action.action === "analyze") scout.analyzeNow(action.id);
  else if (action.action === "dismiss") await scout.dismiss(action.id, action.similar);
  else if (action.action === "restore") await scout.restore(action.id);
  else if (action.action === "write") await scout.write(action.id, action);
  else if (action.action === "undo") await scout.undo(action.id);
  // 扫描在后台排队，失败记在工作状态里；收件箱的 scanning 字段反映进度。
  else void scout.backfill();
  return undefined;
}

async function act(deps: RouteDeps, request: IncomingMessage): Promise<Reply> {
  const parsed = v.safeParse(ActionBodySchema, await readBody(request));
  if (!parsed.success)
    return { status: 400, body: { error: `请求不合法：${v.summarize(parsed.issues)}` } };
  try {
    const preview = await perform(deps.scout, parsed.output);
    const result: ActionResult = {
      ok: true,
      inbox: deps.inbox(),
      ...(preview === undefined ? {} : { preview }),
    };
    return { status: 200, body: result };
  } catch (error) {
    if (error instanceof Error && isActionError(error)) {
      return {
        status: error.kind === "missing" ? 404 : 409,
        body: {
          ok: false,
          error: { kind: error.kind, message: error.message },
          inbox: deps.inbox(),
        },
      };
    }
    const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
    deps.logger.warn("skill-scout: %s failed: %s", parsed.output.action, message);
    return { status: 500, body: { error: error instanceof Error ? error.message : String(error) } };
  }
}

function guarded(
  deps: RouteDeps,
  path: string,
  method: "GET" | "POST",
  handle: (request: IncomingMessage) => Promise<Reply>,
): DshWebRoute {
  return {
    kind: "exact",
    path,
    handler: async (request, response) => {
      const rejection = deps.connection.requestRejection(request);
      if (rejection !== undefined) {
        respond(response, { status: rejection, body: { error: "DSH 连接鉴权拒绝了这个请求" } });
        return;
      }
      if (request.method !== method) {
        respond(response, { status: 405, body: { error: `${path} 只接受 ${method}` } }, method);
        return;
      }
      respond(response, await handle(request));
    },
  };
}

/** 插件注册的全部路由。 */
export function scoutRoutes(deps: RouteDeps): DshWebRoute[] {
  return [
    guarded(deps, INBOX_PATH, "GET", async () => ({ status: 200, body: deps.inbox() })),
    guarded(deps, DETAIL_PATH, "GET", async (request) => {
      const id = new URL(request.url ?? "", "http://skill-scout.local").searchParams.get("id");
      if (id === null || id === "") return { status: 400, body: { error: "缺少 id 查询参数" } };
      const detail = deps.detail(id);
      return detail === undefined
        ? { status: 404, body: { error: `没有这条建议：${id}` } }
        : { status: 200, body: detail };
    }),
    guarded(deps, ACTION_PATH, "POST", (request) => act(deps, request)),
  ];
}
