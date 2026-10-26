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

type Handler = DshWebRoute["handler"];

/**
 * 先过 DSH 的连接鉴权（`connection.requestRejection`：Host/Origin 检查与浏览器认证），再限定请求方法。
 * 两者不通过时都以 `{ message }` 回应，浏览器半部能读出原因。
 */
export function guardRoute(
  rejection: (req: IncomingMessage) => number | undefined,
  method: "GET" | "POST",
  handle: Handler,
): Handler {
  return async (req, res) => {
    const rejected = rejection(req);
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
