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
  SEARCH_PATH,
  SearchViewSchema,
  SESSION_PATH,
  SessionViewSchema,
  STATS_PATH,
  StatsViewSchema,
  type Action,
  type ActionResult,
  type DetailView,
  type InboxView,
  type SearchView,
  type SessionView,
  type StatsView,
  type TaskView,
} from "../shared.ts";

/** 搜索的条件：查询词、只看某种结果（null 是全部）、最多返回几条。 */
export interface SearchQuery {
  readonly q: string;
  readonly outcome: TaskView["outcome"] | null;
  readonly limit: number;
}

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

/** GET 一个路由并按 schema 校验。 */
async function get<TSchema extends v.GenericSchema>(
  path: string,
  schema: TSchema,
  params: Readonly<Record<string, string>>,
  signal: AbortSignal | undefined,
): Promise<v.InferOutput<TSchema>> {
  const query = new URLSearchParams(params).toString();
  const response = await fetch(query === "" ? path : `${path}?${query}`, {
    headers: { accept: "application/json" },
    cache: "no-store",
    ...(signal === undefined ? {} : { signal }),
  });
  return parse(response, schema, path);
}

/** 读取收件箱与工作状态。 */
export function fetchInbox(signal?: AbortSignal): Promise<InboxView> {
  return get(INBOX_PATH, InboxViewSchema, {}, signal);
}

/** 读取一张卡片（线索或 idea）的证据、摘要与草稿。 */
export function fetchDetail(id: string, signal?: AbortSignal): Promise<DetailView> {
  return get(DETAIL_PATH, DetailViewSchema, { id }, signal);
}

/** 读取一个会话的分析情况与任务。 */
export function fetchSession(sessionId: string, signal?: AbortSignal): Promise<SessionView> {
  return get(SESSION_PATH, SessionViewSchema, { id: sessionId }, signal);
}

/** 在已存的任务索引里搜索。 */
export function search(query: SearchQuery, signal?: AbortSignal): Promise<SearchView> {
  return get(
    SEARCH_PATH,
    SearchViewSchema,
    {
      q: query.q,
      limit: String(query.limit),
      ...(query.outcome === null ? {} : { outcome: query.outcome }),
    },
    signal,
  );
}

/** 读取统计。 */
export function fetchStats(signal?: AbortSignal): Promise<StatsView> {
  return get(STATS_PATH, StatsViewSchema, {}, signal);
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
