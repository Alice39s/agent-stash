/** 浏览器端访问 Host 路由：响应按 shared.ts 的 schema 校验。 */
import * as v from "valibot";
import {
  ACTION_PATH,
  ActionResultSchema,
  DETAIL_PATH,
  DetailViewSchema,
  ErrorBodySchema,
  INBOX_PATH,
  InboxViewSchema,
  type Action,
  type ActionResult,
  type DetailView,
  type InboxView,
} from "../shared.ts";

/** 解析响应；操作失败（409/404）也带收件箱，按结果返回而不是抛出。 */
async function parse<TSchema extends v.GenericSchema>(
  response: Response,
  schema: TSchema,
  path: string,
): Promise<v.InferOutput<TSchema>> {
  const body: unknown = await response.json();
  const result = v.safeParse(schema, body);
  if (result.success) return result.output;
  const error = v.safeParse(ErrorBodySchema, body);
  throw new Error(error.success ? error.output.error : `${path} 返回了 ${String(response.status)}`);
}

/** 读取收件箱与工作状态。 */
export async function fetchInbox(signal?: AbortSignal): Promise<InboxView> {
  const response = await fetch(INBOX_PATH, {
    headers: { accept: "application/json" },
    cache: "no-store",
    ...(signal === undefined ? {} : { signal }),
  });
  return parse(response, InboxViewSchema, INBOX_PATH);
}

/** 读取一条建议的证据与草稿。 */
export async function fetchDetail(id: string, signal?: AbortSignal): Promise<DetailView> {
  const response = await fetch(`${DETAIL_PATH}?${new URLSearchParams({ id }).toString()}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    ...(signal === undefined ? {} : { signal }),
  });
  return parse(response, DetailViewSchema, DETAIL_PATH);
}

/** 提交一个操作。 */
export async function postAction(action: Action): Promise<ActionResult> {
  const response = await fetch(ACTION_PATH, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(action),
  });
  return parse(response, ActionResultSchema, ACTION_PATH);
}
