import { generateText } from "@xsai/generate-text";
import * as v from "valibot";
import type { JsonValue } from "./models.ts";

/** 一个 OpenAI 兼容的对话模型：接口地址、密钥、模型名，以及合并进请求体的附加字段。 */
export interface ChatEndpoint {
  readonly baseURL: string;
  readonly apiKey: string;
  readonly model: string;
  readonly body: Readonly<Record<string, JsonValue>>;
}

/** 一次单轮请求：系统提示与一条用户消息。`body` 只对这一次请求生效，例如要求输出 JSON。 */
export interface ChatRequest {
  readonly system: string;
  readonly user: string;
  readonly signal: AbortSignal;
  readonly body?: Readonly<Record<string, JsonValue>>;
}

/** 模型的回复正文，是否因输出上限被截断，以及这次请求的 token 用量。 */
export interface ChatReply {
  readonly text: string;
  readonly truncated: boolean;
  readonly inputTokens: number;
  readonly outputTokens: number;
}

/** 只有 `error` 没有 `choices` 的响应体。 */
const ErrorBodySchema = v.object({
  error: v.object({ message: v.string() }),
  choices: v.optional(v.undefined()),
});

/**
 * 有的网关在上游出错时仍返回 HTTP 200，把错误放在响应体的 `error` 字段里。
 * 这种响应改为抛出带上游原话的错误，不再交给 xsai 去读不存在的用量字段。
 */
const fetchRejectingErrorBody: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  if (!response.ok || !(response.headers.get("content-type") ?? "").includes("json")) {
    return response;
  }
  const body: unknown = JSON.parse(await response.clone().text());
  const parsed = v.safeParse(ErrorBodySchema, body);
  if (parsed.success) {
    throw new Error(`HTTP 200 with an error body: ${parsed.output.error.message}`);
  }
  return response;
};

/** 发出一次单轮请求。服务返回错误时原样抛出，由调用方决定是否重试。 */
export async function complete(endpoint: ChatEndpoint, request: ChatRequest): Promise<ChatReply> {
  const result = await generateText({
    fetch: fetchRejectingErrorBody,
    ...endpoint.body,
    ...request.body,
    apiKey: endpoint.apiKey,
    baseURL: endpoint.baseURL,
    model: endpoint.model,
    messages: [
      { role: "system", content: request.system },
      { role: "user", content: request.user },
    ],
    abortSignal: request.signal,
  });
  return {
    text: result.text ?? "",
    truncated: result.finishReason === "length",
    inputTokens: result.usage.inputTokens,
    outputTokens: result.usage.outputTokens,
  };
}
