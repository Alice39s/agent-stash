/** 浏览器端访问 Host 路由：请求与响应都按 shared.ts 的 schema 校验。 */
import * as v from "valibot";
import {
  MESSAGE_EDIT_PATH,
  MessageEditErrorSchema,
  MessageEditOperationResultSchema,
  MessageEditTimelineSchema,
  type MessageEditOperation,
  type MessageEditOperationResult,
  type MessageEditTimeline,
} from "../shared.ts";

async function parseResponse<T>(
  response: Response,
  schema: v.GenericSchema<unknown, T>,
): Promise<T> {
  const body: unknown = await response.json();
  if (!response.ok) {
    const error = v.safeParse(MessageEditErrorSchema, body);
    throw new Error(
      error.success ? error.output.error : `${MESSAGE_EDIT_PATH} responded ${response.status}`,
    );
  }
  return v.parse(schema, body);
}

/** 读取一个会话的时间线投影。 */
export async function fetchTimeline(
  sessionId: string,
  signal: AbortSignal,
): Promise<MessageEditTimeline> {
  const query = new URLSearchParams({ sessionId });
  const response = await fetch(`${MESSAGE_EDIT_PATH}?${query}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    signal,
  });
  return parseResponse(response, MessageEditTimelineSchema);
}

/** 提交一次编辑、重新生成或重试，返回新版本会话。 */
export async function postOperation(
  operation: MessageEditOperation,
): Promise<MessageEditOperationResult> {
  const response = await fetch(MESSAGE_EDIT_PATH, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(operation),
  });
  return parseResponse(response, MessageEditOperationResultSchema);
}
