/**
 * `MESSAGE_EDIT_PATH` 路由：GET 返回时间线，POST 执行版本操作。
 *
 * 0.2.1-rc.3 的 `ctx.connection.requestRejection` 对自定义路由执行 Host/Origin 检查与浏览器
 * 认证，存在时先过它。请求不合法返回 400，会话状态不允许操作返回 409，其余失败返回 500 并记日志；
 * 出错时响应体都是 `{error}`。
 */
import * as v from "valibot";
import {
  MESSAGE_EDIT_PATH,
  MessageEditOperationSchema,
  type MessageEditOperationResult,
  type MessageEditTimeline,
} from "../shared.ts";
import type {
  DshHttpRequest,
  DshHttpResponse,
  DshLogger,
  DshWebRoute,
  MessageEditContext,
} from "./dsh.ts";
import { isConflictError } from "./errors.ts";
import { runOperation } from "./operation.ts";
import { loadTimeline } from "./timeline.ts";
import type { VersionTable } from "./version-store.ts";

const SessionIdParamSchema = v.pipe(v.string("缺少 sessionId 查询参数"), v.nonEmpty());

const OperationBodySchema = v.pipe(v.string(), v.parseJson(), MessageEditOperationSchema);

interface Reply {
  readonly status: number;
  readonly body: MessageEditTimeline | MessageEditOperationResult | { readonly error: string };
  readonly headers?: Readonly<Record<string, string>>;
}

function invalidRequest(summary: string): Reply {
  return { status: 400, body: { error: `请求不合法：${summary}` } };
}

async function readBody(request: DshHttpRequest): Promise<string> {
  const decoder = new TextDecoder();
  let text = "";
  for await (const chunk of request) {
    text += typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });
  }
  return text + decoder.decode();
}

/** 执行一个已经通过校验的请求，把失败按类别映射成状态码。 */
async function settle(
  logger: DshLogger,
  action: string,
  task: () => Promise<MessageEditTimeline | MessageEditOperationResult>,
): Promise<Reply> {
  try {
    return { status: 200, body: await task() };
  } catch (error) {
    if (error instanceof Error && isConflictError(error)) {
      return { status: 409, body: { error: error.message } };
    }
    const message = `${action}失败：${error instanceof Error ? error.message : String(error)}`;
    const detail = error instanceof Error ? (error.stack ?? error.message) : String(error);
    logger.error("%s\n%s", message, detail);
    return { status: 500, body: { error: message } };
  }
}

async function reply(
  ctx: MessageEditContext,
  versions: VersionTable,
  request: DshHttpRequest,
): Promise<Reply> {
  switch (request.method) {
    case "GET": {
      const query = new URL(request.url, "http://message-edit.local").searchParams;
      const sessionId = v.safeParse(SessionIdParamSchema, query.get("sessionId"));
      if (!sessionId.success) return invalidRequest(v.summarize(sessionId.issues));
      return settle(ctx.logger, `读取会话 ${sessionId.output} 的时间线`, () =>
        loadTimeline(ctx, versions, sessionId.output),
      );
    }
    case "POST": {
      const operation = v.safeParse(OperationBodySchema, await readBody(request));
      if (!operation.success) return invalidRequest(v.summarize(operation.issues));
      return settle(
        ctx.logger,
        `在会话 ${operation.output.sessionId} 上执行 ${operation.output.action}`,
        () => runOperation(ctx, versions, operation.output),
      );
    }
    default:
      return {
        status: 405,
        body: { error: `${MESSAGE_EDIT_PATH} 不支持 ${request.method} 请求` },
        headers: { allow: "GET, POST" },
      };
  }
}

function respond(response: DshHttpResponse, { status, body, headers }: Reply): void {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

export function messageEditRoute(ctx: MessageEditContext, versions: VersionTable): DshWebRoute {
  return {
    kind: "exact",
    path: MESSAGE_EDIT_PATH,
    handler: async (request, response) => {
      const rejection = ctx.connection.requestRejection?.(request);
      if (rejection !== undefined) {
        respond(response, {
          status: rejection,
          body: { error: `DSH 连接鉴权拒绝了这个请求（HTTP ${String(rejection)}）` },
        });
        return;
      }
      respond(response, await reply(ctx, versions, request));
    },
  };
}
