/**
 * 规则层的经验信号检测：只用 Episode 里的结构化证据，不调用模型。
 * - repeated：不同会话里目标相近、操作流程相近且都成功的任务；
 * - recovery：失败经修复后成功的因果链，修复含安装、配置或命令改写，或同一错误在多个会话里出现；
 * - complex：一次跨多个命令族、经过验证的较长流程，只作为复核候选。
 */
import { createHash } from "node:crypto";
import type { Candidate, Episode, Recovery, SignalKind } from "./model.ts";
import { clip } from "./redact.ts";

/** 检测阈值；来自插件设置。 */
export interface SignalOptions {
  /** repeated 与非操作类 recovery 需要的最少独立会话数。 */
  readonly minOccurrences: number;
}

/** 规则层认为可信的结果：有工具证据的成功。 */
export function isSuccess(episode: Episode): boolean {
  return episode.outcome === "verified" || episode.outcome === "succeeded";
}

const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "be",
  "can",
  "do",
  "for",
  "from",
  "i",
  "in",
  "is",
  "it",
  "me",
  "my",
  "of",
  "on",
  "or",
  "please",
  "that",
  "the",
  "this",
  "to",
  "we",
  "with",
  "you",
  "一下",
  "一个",
  "帮我",
  "我们",
  "这个",
  "那个",
  "请你",
  "可以",
  "需要",
  "然后",
]);

/**
 * 把一段文本切成用于相似度比较的词：拉丁字母按词，汉字按相邻两字。
 * @param text - 用户请求或签名。
 * @returns 去重后的词集合。
 */
export function tokens(text: string): Set<string> {
  const result = new Set<string>();
  const lower = text.toLowerCase();
  for (const word of lower.match(/[a-z0-9][a-z0-9_.+-]*/gu) ?? []) {
    if (word.length > 1 && !STOPWORDS.has(word)) result.add(word);
  }
  for (const run of lower.match(/[\p{Script=Han}]+/gu) ?? []) {
    const chars = Array.from(run);
    if (chars.length === 1) result.add(run);
    for (let index = 0; index + 1 < chars.length; index += 1) {
      const pair = `${chars[index] ?? ""}${chars[index + 1] ?? ""}`;
      if (!STOPWORDS.has(pair)) result.add(pair);
    }
  }
  return result;
}

/** Jaccard 相似度；两个空集合为 0。 */
export function jaccard(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  if (left.size === 0 && right.size === 0) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared += 1;
  return shared / (left.size + right.size - shared);
}

/** Episode 里非查看类命令的签名集合。 */
export function procedureOf(episode: Episode): Set<string> {
  return new Set(
    episode.ops.flatMap((op) => (op.kind === "exec" && op.family !== "inspect" ? op.parts : [])),
  );
}

function fingerprint(kind: SignalKind, features: readonly string[]): string {
  const digest = createHash("sha256").update(features.join("\n")).digest("hex").slice(0, 16);
  return `${kind}:${digest}`;
}

function mostCommon(values: readonly (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

function candidateOf(
  kind: SignalKind,
  features: readonly string[],
  episodes: readonly Episode[],
  score: number,
): Candidate {
  const sorted = [...features].toSorted();
  const latest = episodes.toSorted((a, b) => b.endedAt - a.endedAt);
  return {
    id: fingerprint(kind, sorted),
    kind,
    features: sorted,
    episodeIds: latest.map((episode) => episode.id),
    occurrences: new Set(episodes.map((episode) => episode.sessionId)).size,
    score: Math.round(score * 100) / 100,
    goal: clip(latest[0]?.goal ?? "", 160),
    cwd: mostCommon(episodes.map((episode) => episode.cwd)),
  };
}

/** 并查集，用来把两两相似的 Episode 合成簇。 */
function clusters<T>(items: readonly T[], linked: (a: T, b: T) => boolean): T[][] {
  const parent = items.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root] ?? root;
    return root;
  };
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      if (a !== undefined && b !== undefined && linked(a, b)) parent[find(j)] = find(i);
    }
  }
  const groups = new Map<number, T[]>();
  items.forEach((item, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  });
  return [...groups.values()];
}

interface Profile {
  readonly episode: Episode;
  readonly goal: ReadonlySet<string>;
  readonly procedure: ReadonlySet<string>;
}

/** 目标与流程都相近，且来自不同会话。 */
function similarWork(a: Profile, b: Profile): boolean {
  if (a.episode.sessionId === b.episode.sessionId) return false;
  const goal = jaccard(a.goal, b.goal);
  const procedure = jaccard(a.procedure, b.procedure);
  return goal >= 0.25 && procedure >= 0.3 && goal * 0.6 + procedure * 0.4 >= 0.4;
}

/** 在至少两个会话里都出现的命令签名，就是这组任务共有的流程。 */
function sharedProcedure(group: readonly Profile[]): string[] {
  const sessions = new Map<string, Set<string>>();
  for (const profile of group) {
    for (const sig of profile.procedure) {
      const owners = sessions.get(sig) ?? new Set<string>();
      owners.add(profile.episode.sessionId);
      sessions.set(sig, owners);
    }
  }
  return [...sessions.entries()].filter(([, owners]) => owners.size >= 2).map(([sig]) => sig);
}

function repeated(profiles: readonly Profile[], options: SignalOptions): Candidate[] {
  const procedural = profiles.filter((profile) => profile.procedure.size >= 2);
  return clusters(procedural, similarWork).flatMap((group) => {
    const sessions = new Set(group.map((profile) => profile.episode.sessionId));
    if (sessions.size < Math.max(2, options.minOccurrences)) return [];
    const core = sharedProcedure(group);
    if (core.length < 2) return [];
    const score = Math.min(1, 0.4 + 0.15 * sessions.size + 0.05 * core.length);
    return [
      candidateOf(
        "repeated",
        core,
        group.map((profile) => profile.episode),
        score,
      ),
    ];
  });
}

interface RecoveryHit {
  readonly episode: Episode;
  readonly recovery: Recovery;
}

function recoveries(successes: readonly Episode[], options: SignalOptions): Candidate[] {
  const hits: RecoveryHit[] = successes.flatMap((episode) =>
    episode.recoveries.map((recovery) => ({ episode, recovery })),
  );
  const sameError = (a: RecoveryHit, b: RecoveryHit): boolean =>
    a.recovery.sig === b.recovery.sig &&
    (a.recovery.errorSig === b.recovery.errorSig ||
      jaccard(tokens(a.recovery.errorSig), tokens(b.recovery.errorSig)) >= 0.7);
  return clusters(hits, sameError).flatMap((group) => {
    const sessions = new Set(group.map((hit) => hit.episode.sessionId));
    const procedural = group.some((hit) => hit.recovery.procedural);
    if (!procedural && sessions.size < Math.max(2, options.minOccurrences)) return [];
    const first = group[0];
    if (first === undefined) return [];
    const kinds = new Set(group.flatMap((hit) => hit.recovery.fixKinds));
    const score = Math.min(
      1,
      0.45 + 0.15 * (sessions.size - 1) + (kinds.has("install") || kinds.has("config") ? 0.15 : 0),
    );
    const episodes = [...new Map(group.map((hit) => [hit.episode.id, hit.episode])).values()];
    return [
      candidateOf("recovery", [first.recovery.sig, first.recovery.errorSig], episodes, score),
    ];
  });
}

const COMPLEX_MIN_COMMANDS = 6;
const COMPLEX_MIN_FAMILIES = 3;

function complex(successes: readonly Episode[], covered: ReadonlySet<string>): Candidate[] {
  return successes.flatMap((episode) => {
    if (covered.has(episode.id) || episode.outcome !== "verified") return [];
    const procedure = procedureOf(episode);
    const families = new Set(
      episode.ops.flatMap((op) =>
        op.kind === "exec" && op.family !== "inspect" ? [op.family] : [],
      ),
    );
    if (procedure.size < COMPLEX_MIN_COMMANDS || families.size < COMPLEX_MIN_FAMILIES) return [];
    const score = Math.min(0.8, 0.3 + procedure.size / 30);
    return [candidateOf("complex", [...procedure], [episode], score)];
  });
}

/**
 * 在已存储的 Episode 上运行全部信号检测。
 * @param episodes - 已脱敏的 Episode，跨会话。
 * @param options - 检测阈值。
 * @returns 候选，按分数从高到低。
 */
export function detectCandidates(
  episodes: readonly Episode[],
  options: SignalOptions,
): Candidate[] {
  const successes = episodes.filter((episode) => isSuccess(episode) && !episode.replay);
  const profiles: Profile[] = successes.map((episode) => ({
    episode,
    goal: tokens(episode.goal),
    procedure: procedureOf(episode),
  }));
  const found = [...repeated(profiles, options), ...recoveries(successes, options)];
  const covered = new Set(found.flatMap((candidate) => candidate.episodeIds));
  return [...found, ...complex(successes, covered)].toSorted((a, b) => b.score - a.score);
}
