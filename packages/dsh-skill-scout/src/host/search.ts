/**
 * 已存 Episode 上的全文搜索。索引在内存里，词来自 signals.ts 的 `tokens`（拉丁字母按词、汉字按相邻两字）；
 * 搜索的文本是用户请求、每个操作的签名、命令、错误行与改动文件，以及任务进行中的插话，都已脱敏。
 * 会话记录变化时标脏，下一次查询重建索引。搜索不读原始日志。
 */
import type { Episode, Outcome } from "./model.ts";
import { clip } from "./redact.ts";
import { tokens } from "./signals.ts";

/** 一段可搜索的文本。 */
interface Field {
  readonly text: string;
  readonly words: ReadonlySet<string>;
  /** 命中时作为片段返回；用户请求本身已显示在结果里，不作为片段。 */
  readonly snippet: boolean;
}

interface Doc {
  readonly episode: Episode;
  readonly fields: readonly Field[];
}

/** 一个命中的任务。 */
export interface SearchHit {
  readonly episode: Episode;
  /** 各段文本命中的查询词数之和。 */
  readonly score: number;
  /** 命中的片段：命令、错误行、文件路径或插话。 */
  readonly matches: readonly string[];
}

export interface SearchResult {
  /** 命中总数；`hits` 只含前 `limit` 条。 */
  readonly total: number;
  readonly hits: readonly SearchHit[];
  /** 索引覆盖的会话与任务数。 */
  readonly indexed: { readonly sessions: number; readonly episodes: number };
}

export interface SearchOptions {
  /** 只要这种结果的任务。 */
  readonly outcome?: Outcome | undefined;
  readonly limit: number;
}

/** 每个结果最多返回的片段数与每段的长度。 */
const MAX_MATCHES = 3;
const SNIPPET_CHARS = 200;

const HAN = /\p{Script=Han}/u;

/**
 * 查询词与索引词是否相符：完全相同；拉丁词还可以是索引词的开头（`vite` 命中 `vite.config.ts`）。
 * 汉字词已经按两字切分，只认完全相同。
 */
function matchesWord(word: string, query: string): boolean {
  return word === query || (!HAN.test(query) && word.startsWith(query));
}

/** 一个 Episode 的可搜索文本：请求、每个操作（命令或改动的文件，加上错误行）、插话；相同的文本只取一次。 */
function fieldsOf(episode: Episode): Field[] {
  const fields: Field[] = [{ text: episode.goal, words: tokens(episode.goal), snippet: false }];
  const seen = new Set<string>();
  const add = (text: string, extra: readonly string[]): void => {
    if (text === "" || seen.has(text)) return;
    seen.add(text);
    fields.push({ text, words: tokens([text, ...extra].join(" ")), snippet: true });
  };
  for (const op of episode.ops) {
    const label = op.kind === "edit" ? (op.target ?? op.sig) : (op.command ?? op.sig);
    add(label, [op.sig, op.target ?? ""]);
    if (op.error !== null) add(op.error, []);
  }
  for (const text of episode.steering) add(text, []);
  return fields;
}

function hitOf(doc: Doc, words: readonly string[]): SearchHit {
  let score = 0;
  const matches: string[] = [];
  for (const field of doc.fields) {
    const count = words.filter((query) =>
      [...field.words].some((word) => matchesWord(word, query)),
    ).length;
    score += count;
    if (count > 0 && field.snippet && matches.length < MAX_MATCHES) {
      matches.push(clip(field.text, SNIPPET_CHARS));
    }
  }
  return { episode: doc.episode, score, matches };
}

/**
 * 创建搜索索引。
 * @param source - 读取全部会话记录；索引标脏后的下一次查询从这里重建。
 */
export function createSearchIndex(
  source: () => Iterable<{ readonly episodes: readonly Episode[] }>,
) {
  let dirty = true;
  let docs: Doc[] = [];
  let postings = new Map<string, number[]>();
  /** 排好序的全部索引词，按前缀查找拉丁词。 */
  let vocabulary: string[] = [];
  let sessions = 0;

  function rebuild(): void {
    docs = [];
    postings = new Map();
    sessions = 0;
    for (const record of source()) {
      sessions += 1;
      for (const episode of record.episodes) {
        const position = docs.length;
        const fields = fieldsOf(episode);
        docs.push({ episode, fields });
        const words = new Set<string>();
        for (const field of fields) for (const word of field.words) words.add(word);
        for (const word of words) {
          const owners = postings.get(word);
          if (owners === undefined) postings.set(word, [position]);
          else owners.push(position);
        }
      }
    }
    vocabulary = [...postings.keys()].toSorted();
    dirty = false;
  }

  /** 含某个查询词的任务：完全相同的词，拉丁词再加上以它开头的词。 */
  function docsOf(query: string): Set<number> {
    const result = new Set(postings.get(query) ?? []);
    if (HAN.test(query)) return result;
    let low = 0;
    let high = vocabulary.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if ((vocabulary[middle] ?? "") < query) low = middle + 1;
      else high = middle;
    }
    for (let index = low; index < vocabulary.length; index += 1) {
      const word = vocabulary[index];
      if (word === undefined || !word.startsWith(query)) break;
      for (const position of postings.get(word) ?? []) result.add(position);
    }
    return result;
  }

  return {
    /** 会话记录变了：下一次查询重建索引。 */
    invalidate(): void {
      dirty = true;
    },
    /**
     * 查找同时含有全部查询词的任务，按命中词数、再按时间从新到旧排列。
     * @param query - 查询文本，与索引用同一种分词；分不出词时没有结果。
     */
    search(query: string, options: SearchOptions): SearchResult {
      if (dirty) rebuild();
      const words = [...tokens(query)];
      const indexed = { sessions, episodes: docs.length };
      if (words.length === 0) return { total: 0, hits: [], indexed };
      // 从命中最少的词开始取交集。
      const [smallest, ...others] = words.map(docsOf).toSorted((a, b) => a.size - b.size);
      const hits = [...(smallest ?? [])]
        .filter((position) => others.every((owners) => owners.has(position)))
        .flatMap((position) => {
          const doc = docs[position];
          if (doc === undefined) return [];
          if (options.outcome !== undefined && doc.episode.outcome !== options.outcome) return [];
          return [hitOf(doc, words)];
        })
        .toSorted((a, b) => b.score - a.score || b.episode.endedAt - a.episode.endedAt);
      return { total: hits.length, hits: hits.slice(0, options.limit), indexed };
    },
  };
}

export type SearchIndex = ReturnType<typeof createSearchIndex>;
