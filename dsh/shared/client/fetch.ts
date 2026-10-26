import * as v from "valibot";

const SessionItemsSchema = v.object({
  items: v.array(v.object({ text: v.string(), time: v.number() })),
});

const GlobalItemsSchema = v.object({
  items: v.array(
    v.object({
      text: v.string(),
      time: v.number(),
      sessionId: v.string(),
      title: v.optional(v.string()),
    }),
  ),
});

export type SessionItem = v.InferOutput<typeof SessionItemsSchema>["items"][number];
export type GlobalItem = v.InferOutput<typeof GlobalItemsSchema>["items"][number];

async function requestJson(url: string, init: RequestInit): Promise<unknown> {
  const response = await fetch(url, init);
  const body: unknown = await response.json();
  if (!response.ok) {
    const message =
      typeof body === "object" && body !== null && "message" in body
        ? String(body.message)
        : response.statusText;
    throw new Error(`${init.method ?? "GET"} ${url} answered ${response.status}: ${message}`);
  }
  return body;
}

/** `GET` 一个 JSON 路由，非 2xx 时以响应里的 `message` 报错。 */
export function getJson(url: string, signal: AbortSignal): Promise<unknown> {
  return requestJson(url, { signal, headers: { accept: "application/json" } });
}

/** 以 JSON 请求体 `POST`，非 2xx 时以响应里的 `message` 报错。 */
export function postJson(url: string, payload: unknown): Promise<unknown> {
  return requestJson(url, {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** 读取一个会话的 Prompt，时间正序。`route` 为文档相对路径，如 `dsh-recall/prompts`。 */
export async function fetchSessionPrompts(
  route: string,
  sessionId: string,
  signal: AbortSignal,
): Promise<SessionItem[]> {
  const url = `${route}?session=${encodeURIComponent(sessionId)}`;
  return v.parse(SessionItemsSchema, await getJson(url, signal)).items;
}

/** 读取全局 Prompt 历史，时间倒序、文本去重。 */
export async function fetchGlobalPrompts(
  route: string,
  signal: AbortSignal,
): Promise<GlobalItem[]> {
  return v.parse(GlobalItemsSchema, await getJson(route, signal)).items;
}
