import {
  mergeGlobalPrompts,
  type HistoryEntry,
  type SessionPrompt,
  type SessionPromptList,
} from "../prompts.ts";

/** 列入全局历史候选的一个会话。 */
export interface SessionInfo {
  readonly id: string;
  /** 最近一条人工 Prompt 的时间；`null` 表示没有，`undefined` 表示读不到。 */
  stamp: number | null | undefined;
  /** 排序用的活跃时间，越大越新。 */
  readonly rank: number;
  title?: string;
}

/** 历史服务依赖的会话读取能力，由 DSH 适配层提供。 */
export interface HistorySource {
  /** 可见的顶层会话。 */
  sessions(): Promise<SessionInfo[]>;
  /** 会话当前的 Prompt 时间戳，用来判断缓存是否过期。 */
  stamp(id: string): number | null | undefined;
  /** 从会话日志读取全部人工 Prompt，按日志顺序。 */
  prompts(id: string): Promise<SessionPrompt[]>;
}

export interface PromptHistoryLimits {
  /** 全局历史最多读取的会话数。 */
  readonly maxSessions: number;
  /** 全局历史最多返回的条目数。 */
  readonly maxEntries: number;
}

export interface PromptHistory {
  /** 一个会话的全部 Prompt，按时间正序。 */
  session(id: string): Promise<readonly SessionPrompt[]>;
  /** 最近活跃会话的 Prompt 合并结果，按时间倒序、文本去重。 */
  global(): Promise<HistoryEntry[]>;
}

interface CacheEntry {
  readonly stamp: number | null | undefined;
  readonly prompts: Promise<readonly SessionPrompt[]>;
}

/**
 * 以会话日志为唯一来源的 Prompt 历史。每个会话的读取结果按 Prompt 时间戳缓存：
 * 时间戳不变就复用，变化后重读；读取失败不进缓存。
 */
export function createPromptHistory(
  source: HistorySource,
  limits: PromptHistoryLimits,
): PromptHistory {
  const cache = new Map<string, CacheEntry>();

  function read(id: string, stamp: number | null | undefined): Promise<readonly SessionPrompt[]> {
    const cached = cache.get(id);
    if (cached !== undefined && (stamp === undefined || cached.stamp === stamp)) {
      return cached.prompts;
    }
    const prompts = source.prompts(id);
    const entry: CacheEntry = { stamp, prompts };
    cache.set(id, entry);
    prompts.catch(() => {
      if (cache.get(id) === entry) cache.delete(id);
    });
    return prompts;
  }

  return {
    session: (id) => read(id, source.stamp(id)),
    async global() {
      const sessions = (await source.sessions())
        .filter((session) => session.stamp !== null)
        .toSorted((left, right) => right.rank - left.rank)
        .slice(0, limits.maxSessions);
      // 逐个读取：冷会话要整份载入日志，并发读取会让内存峰值随会话数增长。
      const lists: SessionPromptList[] = [];
      for (const session of sessions) {
        lists.push({
          sessionId: session.id,
          ...(session.title === undefined ? {} : { title: session.title }),
          // oxlint-disable-next-line no-await-in-loop -- 刻意串行，理由见上。
          prompts: await read(session.id, session.stamp),
        });
      }
      return mergeGlobalPrompts(lists, limits.maxEntries);
    },
  };
}
