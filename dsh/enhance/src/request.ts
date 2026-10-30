import * as v from "valibot";
import {
  ContextResultSchema,
  CONTEXT_PATH,
  FailureSchema,
  RewriteResultSchema,
  REWRITE_PATH,
  type ContextResult,
  type Failure,
  type RewriteRequest,
  type RewriteResult,
} from "./wire.ts";

/** 浏览器请求改写的结果；`network` 表示请求没有到达 Host 或回应无法识别。 */
export type RewriteResponse =
  | { readonly ok: true; readonly value: RewriteResult }
  | {
      readonly ok: false;
      readonly reason: Failure["reason"] | "network";
      readonly message: string;
    };

/** 文档相对路径：DSH 可能挂在子路径下。 */
function relative(path: string): string {
  return path.slice(1);
}

/** 请求 Host 改写草稿；`signal` 中止时抛出 AbortError，由调用方忽略。 */
export async function requestRewrite(
  payload: RewriteRequest,
  signal: AbortSignal,
): Promise<RewriteResponse> {
  let response: Response;
  try {
    response = await fetch(relative(REWRITE_PATH), {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    if (signal.aborted) throw error;
    return { ok: false, reason: "network", message: `POST ${REWRITE_PATH}: ${String(error)}` };
  }
  const body: unknown = await response.json().catch(() => undefined);
  if (response.ok) {
    const parsed = v.safeParse(RewriteResultSchema, body);
    if (parsed.success) return { ok: true, value: parsed.output };
    return { ok: false, reason: "network", message: `POST ${REWRITE_PATH}: unexpected response` };
  }
  const failure = v.safeParse(FailureSchema, body);
  if (failure.success) return { ok: false, ...failure.output };
  const message =
    typeof body === "object" && body !== null && "message" in body
      ? String(body.message)
      : response.statusText;
  return {
    ok: false,
    reason: "network",
    message: `POST ${REWRITE_PATH} ${String(response.status)}: ${message}`,
  };
}

/** 读取下一次改写会关联几轮对话，以及各预设的预计用量。 */
export async function requestContext(
  sessionId: string,
  signal: AbortSignal,
): Promise<ContextResult> {
  const url = `${relative(CONTEXT_PATH)}?session=${encodeURIComponent(sessionId)}`;
  const response = await fetch(url, { headers: { accept: "application/json" }, signal });
  if (!response.ok) throw new Error(`GET ${CONTEXT_PATH} answered ${String(response.status)}`);
  return v.parse(ContextResultSchema, await response.json());
}
