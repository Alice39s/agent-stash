/**
 * 规则层的经验信号检测：只用 Episode 里的结构化证据，不调用模型。
 * - repeated：不同会话里目标相近、操作流程相近且都成功的任务；
 * - recovery：失败经修复后成功的因果链，修复含安装、配置或命令改写，或同一类错误在多个会话里出现；
 * - complex：一次跨多个命令族、经过验证的较长流程，只作为候选。
 *
 * 流程按命令动作比较（`commands.ts` 的 key），等价写法算同一步。相似度刻意放宽一点，但有边界：
 * - 只有同一动作、同一 package.json 脚本词干（`build` 与 `build:web`）、同一类验证（测试、检查、构建）
 *   之间算部分相同，其它不同的动作一律算不同；
 * - 提交、推送、装依赖这类几乎每个任务都有的日常动作，以及内联代码、HTTP 请求这类说明不了做了什么的动作
 *   权重低，跑测试、检查、构建权重居中，两个任务至少要共有一个有区分度的动作才可能算重复；
 * - 共有的步骤在两个任务里的先后顺序要大体一致；
 * - 目标描述不相近时（例如用不同语言描述），只有共有两个以上有区分度的动作、流程高度相同才算重复。
 */
import { createHash } from "node:crypto";
import { isOpaque, scriptStem } from "./commands.ts";
import type { Candidate, CommandFamily, Episode, Recovery, SignalKind } from "./model.ts";
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

/** 流程里的一步：一个命令动作，或一次对有固定角色文件的改动。 */
export interface Action {
  readonly key: string;
  /** 原来的写法，用于展示。 */
  readonly sig: string;
  /** 改动没有命令族。 */
  readonly family: CommandFamily | null;
}

/** 几乎每个编码任务都有的日常动作与通用文件操作：单独出现不说明两个任务的流程相同。 */
const ROUTINE = new Set([
  "edit",
  "rm",
  "mv",
  "cp",
  "mkdir",
  "touch",
  "chmod",
  "ln",
  "sed",
  "tee",
  "kill",
  "pkill",
  "git add",
  "git commit",
  "git push",
  "git pull",
  "git fetch",
  "git stash",
  "git restore",
  "git switch",
  "git switch -c",
  "git merge",
  "git rebase",
  "pm",
  "pm install",
  "pm add",
]);

/** 几乎每个任务都有的日常动作。 */
export function isRoutine(key: string): boolean {
  return ROUTINE.has(key);
}

const ROUTINE_WEIGHT = 0.35;
const COMMON_WEIGHT = 0.6;
/** 部分相同的两步至少要有这个相似度，才算共有这一步。 */
const SHARED = 0.7;

/**
 * 一步在相似度里的权重：日常动作与说明不了做了什么的动作（内联代码、HTTP 请求）最低，
 * 验证与改动居中，其余为 1。
 */
export function weightOf(action: Action): number {
  if (ROUTINE.has(action.key) || isOpaque(action.key)) return ROUTINE_WEIGHT;
  if (action.family === null || action.family === "test" || action.family === "check") {
    return COMMON_WEIGHT;
  }
  return action.family === "build" ? COMMON_WEIGHT : 1;
}

/** 有区分度的一步：权重为 1 的动作。 */
function distinctive(action: Action): boolean {
  return weightOf(action) === 1;
}

const VERIFY_FAMILIES = new Set<CommandFamily>(["test", "check", "build"]);

/**
 * 两步的相似度：同一动作为 1；同一脚本词干为 0.7；同一类验证为 0.5；其余为 0。
 * 同一类验证只算一半：`pnpm test` 与 `pytest` 都在跑测试，但不能说明两个流程相同。
 */
export function relation(a: Action, b: Action): number {
  if (a.key === b.key) return 1;
  const stem = scriptStem(a.key);
  if (stem !== null && stem === scriptStem(b.key)) return SHARED;
  if (a.family !== null && a.family === b.family && VERIFY_FAMILIES.has(a.family)) return 0.5;
  return 0;
}

/**
 * Episode 的流程：成功执行过的非查看类命令动作，以及成功改动过的有固定角色的文件，
 * 按第一次出现的顺序，每个动作一次。
 */
export function procedureOf(episode: Episode): Action[] {
  const seen = new Map<string, Action>();
  for (const op of episode.ops) {
    if (!op.ok) continue;
    if (op.kind === "exec" && op.family !== "inspect") {
      for (const part of op.parts) {
        if (!seen.has(part.key)) seen.set(part.key, { ...part });
      }
    } else if (op.kind === "edit" && op.key !== "edit" && !seen.has(op.key)) {
      seen.set(op.key, { key: op.key, sig: op.key, family: null });
    }
  }
  return [...seen.values()];
}

function best(action: Action, others: readonly Action[]): number {
  let result = 0;
  for (const other of others) result = Math.max(result, relation(action, other));
  return result;
}

/**
 * 两个流程的加权软重合度（0 到 1）：每一步按权重计，在另一边找最相近的一步。
 * 两边完全相同为 1，没有相近的步骤为 0。
 */
export function similarity(left: readonly Action[], right: readonly Action[]): number {
  let total = 0;
  let matched = 0;
  for (const [from, to] of [
    [left, right],
    [right, left],
  ] as const) {
    for (const action of from) {
      const weight = weightOf(action);
      total += weight;
      matched += weight * best(action, to);
    }
  }
  return total === 0 ? 0 : matched / total;
}

/** 两个流程共有的、有区分度的步骤数。 */
function sharedDistinctive(left: readonly Action[], right: readonly Action[]): number {
  return left.filter((action) => distinctive(action) && best(action, right) >= SHARED).length;
}

/**
 * 共有步骤的先后顺序一致的比例：共有的步骤两两比较，在两边先后相同的占多少。
 * 共有步骤少于 3 个时顺序说明不了什么，返回 1。
 */
export function orderAgreement(left: readonly Action[], right: readonly Action[]): number {
  const positions = left.flatMap((action, index) => {
    const other = right.findIndex((candidate) => relation(action, candidate) >= SHARED);
    return other === -1 ? [] : [[index, other] as const];
  });
  if (positions.length < 3) return 1;
  let pairs = 0;
  let agreed = 0;
  for (let i = 0; i < positions.length; i += 1) {
    for (let j = i + 1; j < positions.length; j += 1) {
      const a = positions[i];
      const b = positions[j];
      if (a === undefined || b === undefined) continue;
      pairs += 1;
      if (Math.sign(b[0] - a[0]) === Math.sign(b[1] - a[1])) agreed += 1;
    }
  }
  return agreed / pairs;
}

function fingerprint(kind: SignalKind, features: readonly string[]): string {
  const digest = createHash("sha256").update(features.join("\n")).digest("hex").slice(0, 16);
  return `${kind}:${digest}`;
}

/** 出现最多的值；全是 null 时为 null。 */
export function mostCommon(values: readonly (string | null)[]): string | null {
  const counts = new Map<string, number>();
  for (const value of values) if (value !== null) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? null;
}

const MAX_STEPS = 10;

function candidateOf(
  kind: SignalKind,
  features: readonly string[],
  steps: readonly string[],
  episodes: readonly Episode[],
  score: number,
): Candidate {
  const sorted = [...new Set(features)].toSorted();
  const latest = episodes.toSorted((a, b) => b.endedAt - a.endedAt);
  return {
    id: fingerprint(kind, sorted),
    kind,
    features: sorted,
    steps: steps.slice(0, MAX_STEPS),
    episodeIds: latest.map((episode) => episode.id),
    occurrences: new Set(episodes.map((episode) => episode.sessionId)).size,
    score: Math.round(score * 100) / 100,
    goal: clip(latest[0]?.goal ?? "", 160),
    cwd: mostCommon(episodes.map((episode) => episode.cwd)),
  };
}

/** 并查集：按给定的相似对把条目合成簇。 */
function clusters<T>(items: readonly T[], pairs: Iterable<readonly [number, number]>): T[][] {
  const parent = items.map((_, index) => index);
  const find = (index: number): number => {
    let root = index;
    while (parent[root] !== root) root = parent[root] ?? root;
    return root;
  };
  for (const [i, j] of pairs) parent[find(j)] = find(i);
  const groups = new Map<number, T[]>();
  items.forEach((item, index) => {
    const root = find(index);
    groups.set(root, [...(groups.get(root) ?? []), item]);
  });
  return [...groups.values()];
}

/** 两两比较全部条目，返回相似的下标对。 */
function allPairs<T>(items: readonly T[], linked: (a: T, b: T) => boolean): [number, number][] {
  const pairs: [number, number][] = [];
  for (let i = 0; i < items.length; i += 1) {
    for (let j = i + 1; j < items.length; j += 1) {
      const a = items[i];
      const b = items[j];
      if (a !== undefined && b !== undefined && linked(a, b)) pairs.push([i, j]);
    }
  }
  return pairs;
}

interface Profile {
  readonly episode: Episode;
  readonly goal: ReadonlySet<string>;
  readonly procedure: readonly Action[];
}

/** 能让两步「共有」的索引词：动作本身，以及脚本的词干。 */
function linkTokens(action: Action): string[] {
  const stem = scriptStem(action.key);
  return stem === null ? [action.key] : [action.key, `stem:${stem}`];
}

/**
 * 目标与流程都相近，且来自不同会话：
 * - 至少共有一个有区分度的步骤，流程软重合度不低于 0.4，目标相近，二者加权不低于 0.4；
 * - 或者共有两个以上有区分度的步骤、流程软重合度不低于 0.6，此时不看目标描述；
 * 两种情况下共有步骤的顺序都要大体一致。
 */
export function similarWork(a: Profile, b: Profile): boolean {
  if (a.episode.sessionId === b.episode.sessionId) return false;
  const shared = sharedDistinctive(a.procedure, b.procedure);
  if (shared === 0) return false;
  const procedure = similarity(a.procedure, b.procedure);
  if (orderAgreement(a.procedure, b.procedure) < 0.6) return false;
  if (shared >= 2 && procedure >= 0.6) return true;
  const goal = jaccard(a.goal, b.goal);
  return goal >= 0.25 && procedure >= 0.4 && goal * 0.6 + procedure * 0.4 >= 0.4;
}

/**
 * 只比较至少共有一个有区分度的步骤的两个任务：用倒排索引找出候选对，再逐对判断。
 * 不共有任何有区分度步骤的两个任务不可能算重复，不必比较。
 */
function similarPairs(profiles: readonly Profile[]): [number, number][] {
  const index = new Map<string, number[]>();
  profiles.forEach((profile, position) => {
    const keys = new Set(profile.procedure.filter(distinctive).flatMap(linkTokens));
    for (const key of keys) index.set(key, [...(index.get(key) ?? []), position]);
  });
  const checked = new Set<string>();
  const pairs: [number, number][] = [];
  for (const owners of index.values()) {
    for (let i = 0; i < owners.length; i += 1) {
      for (let j = i + 1; j < owners.length; j += 1) {
        const a = owners[i];
        const b = owners[j];
        if (a === undefined || b === undefined) continue;
        const id = `${String(a)}:${String(b)}`;
        if (checked.has(id)) continue;
        checked.add(id);
        const left = profiles[a];
        const right = profiles[b];
        if (left !== undefined && right !== undefined && similarWork(left, right)) {
          pairs.push([a, b]);
        }
      }
    }
  }
  return pairs;
}

/**
 * 这组任务共有的步骤：在至少两个会话里出现（同一动作或同一脚本词干）的动作，
 * 按共有步骤最多的那个任务里的顺序排列。
 */
function sharedProcedure(group: readonly Profile[]): Action[] {
  const owners = (action: Action): number =>
    new Set(
      group
        .filter((profile) => best(action, profile.procedure) >= SHARED)
        .map((profile) => profile.episode.sessionId),
    ).size;
  const ranked = group
    .map((profile) => ({
      profile,
      core: profile.procedure.filter((action) => owners(action) >= 2),
    }))
    .toSorted(
      (a, b) =>
        b.core.length - a.core.length || b.profile.episode.endedAt - a.profile.episode.endedAt,
    );
  return ranked[0]?.core ?? [];
}

function repeated(profiles: readonly Profile[], options: SignalOptions): Candidate[] {
  const procedural = profiles.filter((profile) => profile.procedure.length >= 2);
  return clusters(procedural, similarPairs(procedural)).flatMap((group) => {
    const sessions = new Set(group.map((profile) => profile.episode.sessionId));
    if (sessions.size < Math.max(2, options.minOccurrences)) return [];
    const core = sharedProcedure(group);
    if (core.length < 2 || !core.some(distinctive)) return [];
    const weight = core.reduce((sum, action) => sum + weightOf(action), 0);
    const score = Math.min(1, 0.4 + 0.15 * sessions.size + 0.05 * weight);
    return [
      candidateOf(
        "repeated",
        core.map((action) => action.key),
        core.map((action) => action.sig),
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

/** 错误签名里命令动作之后的错误文本；只有退出码时为 null。 */
function errorText(recovery: Recovery): string | null {
  const prefix = `${recovery.key}: `;
  return recovery.errorSig.startsWith(prefix) ? recovery.errorSig.slice(prefix.length) : null;
}

/** 两个错误文本的词重合度；词太少的错误不比较。 */
function sameErrorText(a: string | null, b: string | null, threshold: number): boolean {
  if (a === null || b === null) return false;
  const left = tokens(a);
  const right = tokens(b);
  return left.size >= 4 && right.size >= 4 && jaccard(left, right) >= threshold;
}

/**
 * 两次恢复是同一类问题：同一动作上的同一类错误；或者错误文本几乎相同（同一个缺失模块、同一个配置错误），
 * 只是出现在同一类命令的不同写法上（`pnpm build` 与 `vite build`）。
 */
function sameProblem(a: RecoveryHit, b: RecoveryHit): boolean {
  if (a.recovery.key === b.recovery.key) {
    return (
      a.recovery.errorSig === b.recovery.errorSig ||
      sameErrorText(errorText(a.recovery), errorText(b.recovery), 0.7)
    );
  }
  const families = (hit: RecoveryHit): Set<CommandFamily> =>
    new Set(
      hit.episode.ops.flatMap((op) =>
        op.seq === hit.recovery.okSeq && op.family !== null ? [op.family] : [],
      ),
    );
  const left = families(a);
  const sameFamily = [...families(b)].some((family) => left.has(family));
  return sameFamily && sameErrorText(errorText(a.recovery), errorText(b.recovery), 0.85);
}

/** 恢复链的步骤：失败的命令、修复动作、恢复后通过的命令；命令链按段展开。 */
function recoverySteps(hit: RecoveryHit): string[] {
  const bySeq = new Map(hit.episode.ops.map((op) => [op.seq, op]));
  const label = (seq: number): string[] => {
    const op = bySeq.get(seq);
    if (op === undefined) return [];
    return op.parts.length > 1 ? op.parts.map((part) => part.sig) : [op.sig];
  };
  return [
    ...label(hit.recovery.failSeq),
    ...hit.recovery.fixSeqs.flatMap(label),
    ...label(hit.recovery.okSeq),
  ];
}

function recoveries(successes: readonly Episode[], options: SignalOptions): Candidate[] {
  const hits: RecoveryHit[] = successes.flatMap((episode) =>
    episode.recoveries.map((recovery) => ({ episode, recovery })),
  );
  return clusters(hits, allPairs(hits, sameProblem)).flatMap((group) => {
    const sessions = new Set(group.map((hit) => hit.episode.sessionId));
    const procedural = group.some((hit) => hit.recovery.procedural);
    if (!procedural && sessions.size < Math.max(2, options.minOccurrences)) return [];
    const first = group.find((hit) => hit.recovery.procedural) ?? group[0];
    if (first === undefined) return [];
    const kinds = new Set(group.flatMap((hit) => hit.recovery.fixKinds));
    const score = Math.min(
      1,
      0.45 + 0.15 * (sessions.size - 1) + (kinds.has("install") || kinds.has("config") ? 0.15 : 0),
    );
    const episodes = [...new Map(group.map((hit) => [hit.episode.id, hit.episode])).values()];
    return [
      candidateOf(
        "recovery",
        [first.recovery.key, first.recovery.errorSig],
        recoverySteps(first),
        episodes,
        score,
      ),
    ];
  });
}

/** 长任务至少要有这么多不同的非日常命令，分属这么多个命令族。 */
const COMPLEX_MIN_COMMANDS = 5;
const COMPLEX_MIN_FAMILIES = 3;

function complex(successes: readonly Episode[], covered: ReadonlySet<string>): Candidate[] {
  return successes.flatMap((episode) => {
    if (covered.has(episode.id) || episode.outcome !== "verified") return [];
    const procedure = procedureOf(episode).filter(
      (action) => action.family !== null && !ROUTINE.has(action.key) && !isOpaque(action.key),
    );
    const families = new Set(procedure.map((action) => action.family));
    if (procedure.length < COMPLEX_MIN_COMMANDS || families.size < COMPLEX_MIN_FAMILIES) return [];
    const score = Math.min(0.8, 0.3 + procedure.length / 30);
    return [
      candidateOf(
        "complex",
        procedure.map((action) => action.key),
        procedure.map((action) => action.sig),
        [episode],
        score,
      ),
    ];
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
  const fixes = recoveries(successes, options);
  // 证据全部来自同一个恢复候选的重复流程，就是那次恢复本身，只保留更具体的恢复候选。
  const repeats = repeated(profiles, options).filter(
    (candidate) =>
      !fixes.some((fix) => candidate.episodeIds.every((id) => fix.episodeIds.includes(id))),
  );
  const found = [...repeats, ...fixes];
  const covered = new Set(found.flatMap((candidate) => candidate.episodeIds));
  return [...found, ...complex(successes, covered)].toSorted((a, b) => b.score - a.score);
}
