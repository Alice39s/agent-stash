import type { IncomingMessage, ServerResponse } from "node:http";
import { text } from "node:stream/consumers";
import * as v from "valibot";

/** `webServer.register` 接受的精确路径路由。 */
export interface DshWebRoute {
  readonly kind: "exact";
  readonly path: string;
  readonly handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
}

/** 以 JSON 回应，不允许缓存。 */
export function sendJson(res: ServerResponse, status: number, payload: unknown): void {
  res.statusCode = status;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.setHeader("cache-control", "no-store");
  res.end(JSON.stringify(payload));
}

/**
 * `ctx.connection` 里路由鉴权用到的部分。
 *
 * DSH 0.2.3-alpha.1 之前，WebServer 不检查自定义路由，由插件调用 `requestRejection` 做 Host/Origin
 * 检查与浏览器认证；从 0.2.3-alpha.1 起，WebServer 在调用 handler 之前完成准入（注册时不写 `auth`
 * 即要求认证），Connection 也不再提供 `requestRejection`。
 */
export interface DshConnection {
  requestRejection?(req: IncomingMessage): number | undefined;
}

type Handler = DshWebRoute["handler"];

/**
 * 先过 DSH 的连接鉴权，再限定请求方法。两者不通过时都以 `{ message }` 回应，浏览器半部能读出原因。
 * Connection 没有 `requestRejection` 时，请求在到达 handler 之前已经通过了 WebServer 的准入。
 */
export function guardRoute(
  connection: DshConnection,
  method: "GET" | "POST",
  handle: Handler,
): Handler {
  return async (req, res) => {
    const rejected = connection.requestRejection?.(req);
    if (rejected !== undefined) {
      sendJson(res, rejected, { message: "the DSH connection check rejected this request" });
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

/** 请求体的解析结果：失败时带上应回的状态码与原因。 */
export type JsonBody<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly status: 400 | 415; readonly message: string };

/**
 * 读取并校验 JSON 请求体。只接受 `application/json`：跨站页面不经预检发不出这种请求。
 */
export async function readJsonBody<TSchema extends v.GenericSchema>(
  req: IncomingMessage,
  schema: TSchema,
): Promise<JsonBody<v.InferOutput<TSchema>>> {
  const type = req.headers["content-type"] ?? "";
  if (!/^application\/json\s*(?:;|$)/iu.test(type)) {
    return { ok: false, status: 415, message: "the request body must be application/json" };
  }
  const result = v.safeParse(v.pipe(v.string(), v.parseJson(), schema), await text(req));
  if (!result.success) {
    return { ok: false, status: 400, message: v.summarize(result.issues) };
  }
  return { ok: true, value: result.output };
}
