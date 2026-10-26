/** 从会话事件里取出的一条人工输入 Prompt。 */
export interface SessionPrompt {
  readonly text: string;
  readonly time: number;
  readonly seq: number;
}

/** 跨会话历史里的一条 Prompt，附带来源会话。 */
export interface HistoryEntry {
  readonly text: string;
  readonly time: number;
  readonly sessionId: string;
  readonly title?: string;
}

/** 本模块读取的会话事件字段；其余字段原样忽略。 */
export interface PromptEvent {
  readonly type: string;
  readonly seq: number;
  readonly time: number;
  readonly data: unknown;
}

interface UserMessageData {
  readonly content: readonly { readonly type: string; readonly text?: string }[];
  readonly source: { readonly kind: string };
}

/** 一个会话已经读出的 Prompt 列表，用于合并全局历史。 */
export interface SessionPromptList {
  readonly sessionId: string;
  readonly title?: string;
  readonly prompts: readonly SessionPrompt[];
}

/** 日期分组的标签：今天、昨天，或具体日期。 */
export type PromptDay =
  | { readonly kind: "today" }
  | { readonly kind: "yesterday" }
  | { readonly kind: "date"; readonly time: number };

/** 按日期分组后的一段历史，`index` 指向原数组下标。 */
export interface PromptSection {
  readonly day: PromptDay;
  readonly items: readonly { readonly index: number }[];
}

function isUserMessageData(data: unknown): data is UserMessageData {
  if (typeof data !== "object" || data === null) return false;
  const { content, source } = data as Partial<UserMessageData>;
  return Array.isArray(content) && typeof source === "object" && source !== null;
}

/**
 * 取出用户亲手发送的 Prompt：只认 `user/message` 且来源为 `user`，
 * 文本块按换行拼接，只含空白的消息不算 Prompt。
 */
export function promptOf(event: PromptEvent): SessionPrompt | undefined {
  if (event.type !== "user/message" || !isUserMessageData(event.data)) return undefined;
  if (event.data.source.kind !== "user") return undefined;
  const text = event.data.content
    .flatMap((block) => (block.type === "text" && block.text !== undefined ? [block.text] : []))
    .join("\n");
  if (text.trim() === "") return undefined;
  return { text, time: event.time, seq: event.seq };
}

/** 一个会话日志里全部人工 Prompt，保持日志顺序。 */
export function sessionPrompts(events: readonly PromptEvent[]): SessionPrompt[] {
  return events.flatMap((event) => {
    const prompt = promptOf(event);
    return prompt === undefined ? [] : [prompt];
  });
}

/** 合并多个会话的 Prompt：按时间倒序，重复文本只保留最新一条，最多 `limit` 条。 */
export function mergeGlobalPrompts(
  lists: readonly SessionPromptList[],
  limit: number,
): HistoryEntry[] {
  const all = lists.flatMap((list) =>
    list.prompts.map((prompt): HistoryEntry => ({
      text: prompt.text,
      time: prompt.time,
      sessionId: list.sessionId,
      ...(list.title === undefined ? {} : { title: list.title }),
    })),
  );
  all.sort((left, right) => right.time - left.time);
  const seen = new Set<string>();
  const merged: HistoryEntry[] = [];
  for (const entry of all) {
    if (merged.length >= limit) break;
    if (seen.has(entry.text)) continue;
    seen.add(entry.text);
    merged.push(entry);
  }
  return merged;
}

/** 以草稿为完整前缀（区分大小写）且比草稿更长的历史条目，保持原顺序，最多 `limit` 条。 */
export function promptCandidates<T extends { readonly text: string }>(
  history: readonly T[],
  draft: string,
  limit: number,
): T[] {
  if (draft === "") return [];
  const candidates: T[] = [];
  for (const entry of history) {
    if (candidates.length >= limit) break;
    if (entry.text.length > draft.length && entry.text.startsWith(draft)) candidates.push(entry);
  }
  return candidates;
}

function startOfDay(time: number): number {
  const date = new Date(time);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

/** 相对 `now` 的本地日历日标签。 */
export function promptDay(time: number, now: number): PromptDay {
  const day = startOfDay(time);
  const today = startOfDay(now);
  if (day === today) return { kind: "today" };
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day === yesterday.getTime()) return { kind: "yesterday" };
  return { kind: "date", time };
}

/** 把按时间排列的 Prompt 按本地日历日切段，段内保持原顺序。 */
export function daySections(
  prompts: readonly { readonly time: number }[],
  now: number,
): PromptSection[] {
  const sections: { day: PromptDay; key: number; items: { index: number }[] }[] = [];
  prompts.forEach((prompt, index) => {
    const key = startOfDay(prompt.time);
    const last = sections.at(-1);
    if (last?.key === key) {
      last.items.push({ index });
      return;
    }
    sections.push({ day: promptDay(prompt.time, now), key, items: [{ index }] });
  });
  return sections.map(({ day, items }) => ({ day, items }));
}
