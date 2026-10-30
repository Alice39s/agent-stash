/**
 * 看过的待决定卡片；存在 localStorage 里，跨窗口共享。
 * localStorage 是页面共享的外部存储：内容损坏时当作没有记录，写不进去（无痕模式、配额已满）时只记在内存里，
 * 两种情况都只影响角标计数。
 */
import * as v from "valibot";

export interface SeenStore {
  has(id: string): boolean;
  add(ids: readonly string[]): void;
}

const SEEN_KEY = "agent-stash-skill-scout:seen";
const SEEN_LIMIT = 200;

const SeenSchema = v.pipe(v.string(), v.parseJson(), v.array(v.string()));

/** 以 localStorage 保存看过的卡片 id，只保留最近的一部分。 */
export function createSeenStore(storage: Pick<Storage, "getItem" | "setItem">): SeenStore {
  let memory: readonly string[] = [];
  const read = (): readonly string[] => {
    const raw = storage.getItem(SEEN_KEY);
    if (raw === null) return memory;
    const parsed = v.safeParse(SeenSchema, raw);
    return parsed.success ? [...new Set([...parsed.output, ...memory])] : memory;
  };
  return {
    has: (id) => read().includes(id),
    add(ids) {
      memory = [...new Set([...read(), ...ids])].slice(-SEEN_LIMIT);
      try {
        storage.setItem(SEEN_KEY, JSON.stringify(memory));
      } catch (error) {
        if (!(error instanceof DOMException)) throw error;
      }
    },
  };
}
