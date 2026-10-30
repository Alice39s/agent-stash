/**
 * Skill Scout 的工作流程：会话空闲后提取 Episode，跨会话检测线索；线索先由发现模型写一段摘要
 * （规则线索在后台按限额自动进行，或由用户发起），摘要给出一个或几个互不重叠的 idea；用户同意某个 idea 后
 * 再由生成模型写 Skill 草稿，用户审核后写入 Skill 并核对 DSH 能发现它。用户还可以要求提炼一整段会话或搜索结果里
 * 选中的任务，以及回溯历史范围之外更早的会话。会话分析串行执行，不阻塞 Agent 主循环；只有持有工作锁的进程
 * 自动分析会话、发起后台摘要。
 */
import { createHash, randomUUID } from "node:crypto";
import { realpath } from "node:fs/promises";
import { dirname, resolve } from "pathe";
import type { ActionErrorKind, ProgressPhase, ProgressView } from "../shared.ts";
import type { Settings } from "./config.ts";
import type {
  DshLlm,
  DshLogger,
  DshModelSelection,
  DshSessionHeader,
  DshSessionLog,
  DshSessionQuery,
  DshSessionSkillCatalog,
  DshSkillSummary,
} from "./dsh.ts";
import { episodesOfLog } from "./episodes.ts";
import { isRequested, type Candidate, type Episode, type LeadKind } from "./model.ts";
import { clip, compilePatterns, containsSecret, redact } from "./redact.ts";
import {
  buildEvidence,
  checkDraft,
  checkSummary,
  complete,
  draftMessage,
  draftPrompt,
  isModelError,
  maxIdeas,
  modelError,
  summaryPrompt,
  type Completion,
  type CreatorGuide,
  type Draft,
  type EvidencePack,
  type Proposal,
  type RelatedSkill,
  type Summary,
} from "./llm.ts";
import { createSearchIndex, type SearchOptions, type SearchResult } from "./search.ts";
import { detectCandidates, jaccard, mostCommon, tokens } from "./signals.ts";
import {
  appendSection,
  fieldsOfDraft,
  renderImprovement,
  renderSkillFile,
  type SkillFields,
} from "./skill-file.ts";
import {
  dayKey,
  ideaId,
  proposalsOf,
  recentDays,
  recordKey,
  splitIdeaId,
  type CallRecord,
  type FailureRecord,
  type IdeaRecord,
  type IdeaState,
  type Lead,
  type LeadState,
  type ScoutStore,
  type SessionRecord,
  type Stage,
  type WriteRecord,
} from "./store.ts";
import {
  createSkillFile,
  errorCode,
  hashOf,
  insideRoots,
  isWriteError,
  newSkillPath,
  readOptional,
  replaceSkillFile,
  skillRoots,
  undoSkillWrite,
} from "./writer.ts";

const MINUTE = 60_000;
const DAY = 24 * 60 * MINUTE;
/** 后台摘要失败后自动重试的等待时间；用完后只能手动重试。草稿失败从不自动重试。 */
const RETRY_DELAYS = [10 * MINUTE, 60 * MINUTE, 6 * 60 * MINUTE] as const;
/**
 * 输出上限按推理模型留足余量：规则线索的摘要只有几行；整段会话与所选任务最多 5 个 idea，
 * 上限与等待时间都放宽；草稿是一个完整的 Skill。
 */
const SUMMARY_MAX_TOKENS = 4096;
const EXTRACT_MAX_TOKENS = 8192;
const EXTRACT_TIMEOUT_FACTOR = 2;
const DRAFT_MAX_TOKENS = 8192;
/** 各类回复通常的字数，界面据此估算进度。 */
const EXPECTED_CHARS = { summary: 900, extract: 2000, draft: 1600 } as const;
/** 生成草稿时一并发给模型的写作指南：证据会话能看到的这个 Skill。 */
const CREATOR_SKILL = "skill-creator";
/** 写作指南的字符上限；写 SKILL.md 的指导通常在开头，后面是试跑、评测与打包的流程。 */
const CREATOR_CHARS = 20_000;
/** 写入后等待 DSH 发现新 Skill 的轮询次数与间隔。 */
const DISCOVERY_POLLS = 12;
const DISCOVERY_INTERVAL = 250;
/** 轮询结束时 DSH 仍未列出的 Skill，在后台按这个间隔与次数继续核对。 */
const RECHECK_INTERVAL = 5_000;
const RECHECKS = 24;
/** 模型调用记录保留的条数。 */
const CALL_LIMIT = 100;
/** 用量记录保留的天数：统计看近 7 天，后台摘要的间隔还要看前一天。 */
const USAGE_DAYS = 8;
/** 「忽略类似」：标题词的 Jaccard 相似度达到这个值，或 Skill 名称相同，就算相近。 */
const SIMILAR_TITLE = 0.6;
/** 规则检测出的三种线索；后台摘要与规则检测的合并只处理它们。 */
const RULE_KINDS: ReadonlySet<LeadKind> = new Set(["repeated", "recovery", "complex"]);
/** 调用记录里线索标题的长度上限。 */
const TITLE_CHARS = 120;
/** 会话页查不到会话时，重新列出全部会话的最短间隔。 */
const RELIST_INTERVAL = 10_000;

/** 回溯的范围：最近 90 天，或全部。 */
export type BackfillRange = "90d" | "all";
const BACKFILL_DAYS: Readonly<Record<BackfillRange, number>> = {
  "90d": 90,
  all: Number.POSITIVE_INFINITY,
};

/** 引擎依赖的 DSH 服务与插件状态。 */
export interface ScoutDeps {
  readonly query: DshSessionQuery;
  readonly llm: DshLlm;
  /** 会话 Agent 看到的 Skill 目录；去重、改进与写入核对都以它为准。 */
  readonly skills: DshSessionSkillCatalog;
  readonly store: ScoutStore;
  readonly settings: () => Settings;
  readonly defaultModel: () => DshModelSelection | undefined;
  readonly logger: DshLogger;
  readonly now: () => number;
  /** 插件卸载时取消。 */
  readonly signal: AbortSignal;
}

/** 选中的模型与它的来源：设置里指定，或跟随 Agent 的默认模型。 */
export type ModelRoute = DshModelSelection & { readonly source: "config" | "default" };

/** 正在进行的模型请求：线索 id（摘要）或 idea id（草稿）到进度。 */
export type Working = ReadonlyMap<string, ProgressView>;

/** 回溯的进度。 */
export interface BackfillStatus {
  readonly range: BackfillRange;
  readonly state: "listing" | "running" | "paused" | "done";
  readonly total: number;
  readonly done: number;
  readonly failed: number;
}

/** 会话在 DSH 里的情况：存在、是子代理会话，或找不到。 */
export type Presence = "present" | "subagent" | "missing";

/** 带类别的操作失败，路由把它转换成响应。 */
export type ActionError = Error & { readonly kind: ActionErrorKind };

export function actionError(kind: ActionErrorKind, message: string): ActionError {
  return Object.assign(new Error(message), { name: "ActionError", kind });
}

export function isActionError(error: Error): error is ActionError {
  return error.name === "ActionError" && "kind" in error;
}

/** 写入或预览时的用户输入。 */
export interface WriteInput {
  readonly scope?: "project" | "user" | undefined;
  readonly fields?: SkillFields | undefined;
  readonly section?: string | undefined;
  readonly baseHash?: string | undefined;
}

export type Preview =
  | {
      readonly kind: "create";
      readonly scope: "project" | "user";
      readonly path: string;
      readonly content: string;
      readonly exists: boolean;
      readonly fields: SkillFields;
    }
  | {
      readonly kind: "improve";
      readonly skill: string;
      readonly path: string | null;
      readonly writable: boolean;
      readonly before: string;
      readonly after: string;
      readonly baseHash: string;
      readonly section: string;
    };

function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/** 两个集合的重叠系数：交集除以较小集合的大小。 */
function overlap(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  const smaller = Math.min(left.size, right.size);
  if (smaller === 0) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared += 1;
  return shared / smaller;
}

/** 线索里有已经写入 Skill 的 idea。 */
function hasWritten(lead: Lead): boolean {
  return lead.ideas.some((idea) => idea.state === "written");
}

/**
 * 新候选与已有规则线索是同一个模式：同类且特征或证据大体重合；
 * 或者已有线索来自一次长任务，而新候选的证据包含了那次任务，即同一流程后来又在别的会话里出现。
 */
function sameLead(candidate: Candidate, lead: Lead): boolean {
  if (candidate.kind !== lead.candidate.kind) {
    return (
      lead.candidate.kind === "complex" &&
      lead.candidate.episodeIds.some((id) => candidate.episodeIds.includes(id))
    );
  }
  if (jaccard(new Set(candidate.features), new Set(lead.candidate.features)) >= 0.5) {
    return true;
  }
  return overlap(new Set(candidate.episodeIds), new Set(lead.candidate.episodeIds)) >= 0.5;
}

/** 新候选与一条「忽略类似」或已写入 Skill 的规则线索相近。 */
function covered(candidate: Candidate, lead: Lead): boolean {
  const similarDismissal = lead.state === "dismissed" && lead.dismissed?.similar === true;
  if (!similarDismissal && !hasWritten(lead)) return false;
  const features = jaccard(new Set(candidate.features), new Set(lead.candidate.features));
  const goals = jaccard(tokens(candidate.goal), tokens(lead.candidate.goal));
  return similarDismissal ? features >= 0.3 || goals >= 0.5 : features >= 0.5;
}

/** 证据更新后，已有规则线索的新状态；不需要更新时返回 null。 */
function refreshed(lead: Lead, candidate: Candidate, now: number): Lead | null {
  const same =
    lead.candidate.episodeIds.length === candidate.episodeIds.length &&
    lead.candidate.episodeIds.every((id, index) => candidate.episodeIds[index] === id);
  if (same || lead.state === "dismissed" || hasWritten(lead)) return null;
  const next = { ...lead, candidate: { ...candidate, id: lead.candidate.id } };
  if (
    lead.state === "skipped" &&
    candidate.episodeIds.length >= 2 * Math.max(1, lead.summarizedSize)
  ) {
    return { ...next, state: "detected", summary: null, updatedAt: now };
  }
  return next;
}

/** 由摘要与失败记录决定的线索状态；恢复忽略的线索时使用。 */
export function settledLeadState(lead: Lead): LeadState {
  const decision = lead.summary?.summary.decision;
  if (decision === "skip") return "skipped";
  if (decision === "suggest") return "summarized";
  return lead.failure === null ? "detected" : "failed";
}

/** 由草稿与写入记录决定的 idea 状态；恢复忽略的 idea、撤销写入时使用。 */
export function settledIdeaState(idea: IdeaRecord): IdeaState {
  if (idea.write !== null) return "written";
  return idea.draft === null ? "proposed" : "ready";
}

/** 还没有任何进展的 idea：没有草稿、没有写入，也没有「忽略类似」。重新摘要可以替换它。 */
function untouched(idea: IdeaRecord): boolean {
  return idea.draft === null && idea.write === null && idea.dismissed?.similar !== true;
}

/** 线索仍待处理：还没有摘要、摘要失败，或还有等待同意、可以保存、草稿失败的 idea。 */
function pending(lead: Lead): boolean {
  if (lead.state === "detected" || lead.state === "failed") return true;
  return (
    lead.state === "summarized" &&
    lead.ideas.some(
      (idea) => idea.state === "proposed" || idea.state === "ready" || idea.state === "failed",
    )
  );
}

function failureOf(
  error: Error,
  stage: Stage,
  previous: FailureRecord | null,
  now: number,
): FailureRecord {
  const kind = isModelError(error) ? error.kind : "model";
  const attempts = previous?.stage === stage ? previous.attempts + 1 : 1;
  return { stage, kind, message: error.message, at: now, attempts };
}

/** 摘要失败的线索何时可以自动重试；次数用完时返回 null。 */
function retryAt(failure: FailureRecord): number | null {
  const delay = RETRY_DELAYS[failure.attempts - 1];
  return delay === undefined ? null : failure.at + delay;
}

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

/** 按设置里的追加规则脱敏。 */
function redactor(settings: Settings): (text: string) => string {
  const patterns = compilePatterns(settings.redactPatterns);
  return (text) => redact(text, patterns);
}

/** 写入前再查一次凭据：用户编辑过的内容同样不能带出密钥。 */
function checkText(texts: readonly string[]): void {
  if (texts.some((text) => containsSecret(text))) {
    throw actionError("unsafe", "内容里有凭据形态的文本，请删除后再写入");
  }
}

/** 已有 Skill 与候选的相关度。 */
interface RankedSkill {
  readonly skill: DshSkillSummary;
  readonly score: number;
}

/**
 * 按与候选的相关度给证据会话能看到的 Skill 排序，相关度相同时按名称。
 * @param target - 要改进的 Skill：它排在第一位。
 */
function rankSkills(
  candidate: Candidate,
  episodes: readonly Episode[],
  catalog: readonly DshSkillSummary[],
  target: string | null,
): RankedSkill[] {
  const query = tokens(
    [candidate.goal, ...episodes.map((e) => e.goal), ...candidate.steps].join(" "),
  );
  return catalog
    .map((skill) => ({
      skill,
      score:
        skill.name === target
          ? Number.POSITIVE_INFINITY
          : overlap(query, tokens(`${skill.name.replaceAll("-", " ")} ${skill.description}`)),
    }))
    .toSorted((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));
}

/**
 * 与候选相关的已有 Skill，最多 3 个；最相关的一条附带脱敏后的 SKILL.md 全文。
 * @param ranked - `rankSkills` 排好的 Skill。
 */
async function relatedSkills(
  ranked: readonly RankedSkill[],
  redactText: (text: string) => string,
): Promise<RelatedSkill[]> {
  const related = ranked.filter((entry) => entry.score >= 0.2).slice(0, 3);
  const path = related[0]?.skill.path;
  const content = path === undefined ? null : await readOptional(path);
  return related.map((entry, index) => ({
    skill: entry.skill,
    excerpt: index === 0 && content !== null ? redactText(content) : null,
  }));
}

/**
 * 证据会话能看到的 skill-creator 技能，脱敏后取开头一段作为草稿的写作指南。
 * @returns 没有这个 Skill，或它没有可读的文件时为 null，草稿只用内置的写作要求。
 */
async function creatorGuide(
  catalog: readonly DshSkillSummary[],
  redactText: (text: string) => string,
): Promise<CreatorGuide | null> {
  const path = catalog.find((skill) => skill.name === CREATOR_SKILL)?.path;
  const content = path === undefined ? null : await readOptional(path);
  if (path === undefined || content === null) return null;
  const text = redactText(content).trim();
  return {
    dir: redactText(dirname(path)),
    text: text.length <= CREATOR_CHARS ? text : `${text.slice(0, CREATOR_CHARS)}…`,
  };
}

/** Episode id `<会话 id>:<起始 seq>` 里的会话 id。 */
function sessionOfEpisode(episodeId: string): string {
  return episodeId.slice(0, episodeId.lastIndexOf(":"));
}

/**
 * 用户要求提炼的整段会话或所选任务组成的候选。
 * @param episodes - 证据任务；候选里按时间从新到旧排列。
 */
function requestedCandidate(
  kind: "session" | "selected",
  id: string,
  episodes: readonly Episode[],
): Candidate {
  const latest = episodes.toSorted((a, b) => b.endedAt - a.endedAt);
  // 整段会话以第一个请求代表会话的主题；所选任务以最新的一个为代表。
  const representative = kind === "session" ? latest.at(-1) : latest[0];
  return {
    id,
    kind,
    features: [],
    steps: [],
    episodeIds: latest.map((episode) => episode.id),
    occurrences: new Set(episodes.map((episode) => episode.sessionId)).size,
    score: 0,
    goal: clip(representative?.goal ?? "", 160),
    cwd: mostCommon(episodes.map((episode) => episode.cwd)),
  };
}

/** 一次模型请求：给线索写摘要（index 为 null），或给一个 idea 写草稿。 */
interface Job {
  /** 进度的键：摘要是线索 id，草稿是 idea id。 */
  readonly key: string;
  readonly leadId: string;
  readonly index: number | null;
  readonly stage: Stage;
  readonly route: ModelRoute;
  /** 后台自动发起的摘要，计入每日上限与间隔。 */
  readonly background: boolean;
  /** 调用记录里的标题：摘要用线索的请求，草稿用 idea 的标题。 */
  readonly title: string;
  readonly expected: number;
}

/** 一次模型请求的经过：请求发出的时间与收到的完整回复；还没发出请求时都为 null。 */
interface Attempt {
  startedAt: number | null;
  completion: Completion | null;
}

/** 回溯任务的内部状态。 */
interface BackfillJob {
  readonly range: BackfillRange;
  state: BackfillStatus["state"];
  total: number;
  done: number;
  failed: number;
  /** 还没读的会话，较新的在前。 */
  queue: string[];
  listed: boolean;
  /** 有一个循环正在处理这个任务。 */
  active: boolean;
}

/** 一次会话分析的结果。 */
type Analysis = "changed" | "unchanged" | "failed" | "subagent" | "missing";

function newLead(candidate: Candidate, now: number): Lead {
  return {
    id: candidate.id,
    candidate,
    state: "detected",
    detectedAt: now,
    updatedAt: now,
    summarizedSize: 0,
    summary: null,
    ideas: [],
    failure: null,
    dismissed: null,
  };
}

/** 一个 idea 的存储记录与摘要里的方案。 */
function ideaOf(
  lead: Lead,
  position: number,
): { readonly idea: IdeaRecord; readonly proposal: Proposal } {
  const idea = lead.ideas[position];
  const proposal = proposalsOf(lead)[position];
  if (idea === undefined || proposal === undefined) {
    throw actionError("missing", `没有这条建议：${ideaId(lead.id, position)}`);
  }
  return { idea, proposal };
}

/** 重新摘要会替换线索的全部 idea：只有 idea 都还没有进展时才可以。 */
function checkResummary(lead: Lead): void {
  if (!lead.ideas.every(untouched)) {
    throw actionError("invalid", "这条线索的 idea 已经在处理，不能重新摘要");
  }
}

function summaryJob(lead: Lead, route: ModelRoute, background: boolean): Job {
  return {
    key: lead.id,
    leadId: lead.id,
    index: null,
    stage: "summary",
    route,
    background,
    title: clip(lead.candidate.goal, TITLE_CHARS),
    expected: isRequested(lead.candidate.kind) ? EXPECTED_CHARS.extract : EXPECTED_CHARS.summary,
  };
}

/**
 * 创建引擎。
 * @param deps - DSH 服务与插件存储。
 */
export function createScout(deps: ScoutDeps) {
  const { store } = deps;
  /** 本进程持有工作锁。 */
  let worker = false;
  let scanning = 0;
  /** 正在进行或排队的模型请求；每条线索的摘要、每个 idea 的草稿同一时间最多一次。 */
  const progress = new Map<string, ProgressView>();
  const active = new Set<Promise<void>>();
  /** 扫描与回溯的循环；它们把每个会话单独排进分析队列。 */
  const loops = new Set<Promise<void>>();
  let lastError: { kind: string; message: string; at: number } | null = null;
  let chain: Promise<void> = Promise.resolve();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** 写入后仍在后台核对 DSH 能否发现的 idea。 */
  const rechecks = new Map<string, ReturnType<typeof setTimeout>>();
  /** 最近一次列出的全部会话，供统计与会话页使用，到下一次列出前有效。 */
  let listing: {
    readonly at: number;
    readonly headers: ReadonlyMap<string, DshSessionHeader>;
  } | null = null;
  let scanRun: Promise<void> | null = null;
  /** 补回证据时 DSH 里已经找不到的会话。 */
  const gone = new Set<string>();
  let backfillJob: BackfillJob | null = null;

  function sessionRecords(): SessionRecord[] {
    return [...store.sessions.entries()].map(([, record]) => record);
  }

  const index = createSearchIndex(sessionRecords);

  /** 后台任务的边界：记录失败但不让它影响 Agent。 */
  function report(label: string, error: unknown): void {
    if (deps.signal.aborted) return;
    const message = asError(error).message;
    lastError = { kind: "analysis", message, at: deps.now() };
    deps.logger.warn("skill-scout: %s failed: %s", label, message);
  }

  /** 排进分析队列，返回任务自己的结果；任务失败不影响队列里后面的任务。 */
  function enqueue<T>(task: () => Promise<T>): Promise<T> {
    const run = chain.then(task);
    chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /** 排进分析队列的后台任务；失败只记录，返回的 Promise 不会拒绝。 */
  function serial(label: string, task: () => Promise<void>): Promise<void> {
    return enqueue(task).catch((error: unknown) => report(label, error));
  }

  /** 跟踪一个扫描或回溯循环，`idle` 等它结束。 */
  function loop(run: Promise<void>): Promise<void> {
    loops.add(run);
    return run.finally(() => {
      loops.delete(run);
    });
  }

  /** 设置里指定的模型；没有指定时跟随 Agent 的默认模型。 */
  function routeOf(provider: string, model: string, effort: string): ModelRoute | undefined {
    if (provider !== "" && model !== "") {
      return {
        provider,
        model,
        ...(effort === "" ? {} : { reasoningEffort: effort }),
        source: "config",
      };
    }
    const fallback = deps.defaultModel();
    return fallback === undefined ? undefined : { ...fallback, source: "default" };
  }

  /** 两个阶段此刻使用的模型。 */
  function routes(): { readonly summary?: ModelRoute; readonly draft?: ModelRoute } {
    const s = deps.settings();
    const summary = routeOf(s.summaryProvider, s.summaryModel, s.summaryEffort);
    const draft = routeOf(s.draftProvider, s.draftModel, s.draftEffort);
    return {
      ...(summary === undefined ? {} : { summary }),
      ...(draft === undefined ? {} : { draft }),
    };
  }

  function leads(): Lead[] {
    return [...store.suggestions.entries()].map(([, lead]) => lead);
  }

  function episodeIndex(): Map<string, Episode> {
    const found = new Map<string, Episode>();
    for (const record of sessionRecords()) {
      for (const episode of record.episodes) found.set(episode.id, episode);
    }
    return found;
  }

  /** 候选里仍在分析记录里的证据任务，按候选里的顺序。 */
  function episodesOf(candidate: Candidate): Episode[] {
    const found = episodeIndex();
    return candidate.episodeIds.flatMap((id) => {
      const episode = found.get(id);
      return episode === undefined ? [] : [episode];
    });
  }

  /** 候选证据所在的会话，较新的在前。 */
  function sessionsOf(candidate: Candidate): string[] {
    const episodes = episodesOf(candidate).toSorted((a, b) => b.endedAt - a.endedAt);
    return [...new Set(episodes.map((e) => e.sessionId))];
  }

  /**
   * 证据会话的 Agent 看到的 Skill 目录：从较新的会话开始，跳过已删除的会话。
   * @returns 目录；证据会话都已删除时返回 null。
   */
  async function catalogOf(candidate: Candidate): Promise<readonly DshSkillSummary[] | null> {
    for (const sessionId of sessionsOf(candidate)) {
      try {
        // oxlint-disable-next-line no-await-in-loop -- 第一个仍存在的会话即可。
        return (await deps.skills.list({ sessionId }, deps.signal)).skills;
      } catch (error) {
        if (errorCode(error) !== "session/not-found") throw error;
      }
    }
    return null;
  }

  async function save(lead: Lead): Promise<void> {
    await store.suggestions.put(recordKey(lead.id), lead);
  }

  async function putSession(record: SessionRecord): Promise<void> {
    await store.sessions.put(recordKey(record.sessionId), record);
    index.invalidate();
  }

  function findLead(id: string): Lead {
    const lead = store.suggestions.get(recordKey(id));
    if (lead === undefined) throw actionError("missing", `没有这条线索：${id}`);
    return lead;
  }

  /** 解析线索 id 或 idea id（`<线索 id>~<下标>`）。 */
  function locate(id: string): { readonly lead: Lead; readonly index: number | null } {
    const direct = store.suggestions.get(recordKey(id));
    if (direct !== undefined) return { lead: direct, index: null };
    const parts = splitIdeaId(id);
    const owner = parts === null ? undefined : store.suggestions.get(recordKey(parts.leadId));
    if (parts === null || owner === undefined || owner.ideas[parts.index] === undefined) {
      throw actionError("missing", `没有这条建议：${id}`);
    }
    return { lead: owner, index: parts.index };
  }

  /**
   * 解析只针对单个 idea 的操作的 id。
   * @param what - 操作名，用于说明。
   */
  function locateIdea(id: string, what: string) {
    const { lead, index: position } = locate(id);
    if (position === null) {
      throw actionError(
        "invalid",
        lead.ideas.length === 0 ? "这条线索还没有可同意的摘要" : `${what}针对单个 idea`,
      );
    }
    return { lead, position, key: ideaId(lead.id, position), ...ideaOf(lead, position) };
  }

  /** 按最新的线索记录替换其中一个 idea。 */
  async function saveIdea(
    leadId: string,
    position: number,
    update: (idea: IdeaRecord) => IdeaRecord,
  ): Promise<void> {
    const current = findLead(leadId);
    const { idea } = ideaOf(current, position);
    await save({
      ...current,
      ideas: current.ideas.map((entry, at) => (at === position ? update(idea) : entry)),
    });
  }

  /** 读取会话日志：会话不存在时为 null，其他失败返回错误。 */
  async function readLog(sessionId: string): Promise<DshSessionLog | Error | null> {
    try {
      return await deps.query.readSession(sessionId);
    } catch (error) {
      return errorCode(error) === "session/not-found" ? null : asError(error);
    }
  }

  /**
   * 读取并提取一个会话；日志的事件数没有变化时跳过，分析失败的会话同样不重试。
   * 读取与解析日志是插件与外部数据的边界：失败记在会话记录上，不中断后续工作。
   * 新读入的会话最近的活动早于历史范围时按回溯记录（例如用户要求分析或提炼一个很早的会话）：
   * 修剪时保留，规则检测不用它；已有记录的回溯标记不变。
   * @param backfilled - 回溯或补回证据时读入，不论时间一律按回溯记录。
   */
  async function analyzeSession(sessionId: string, backfilled: boolean): Promise<Analysis> {
    const settings = deps.settings();
    const previous = store.sessions.get(recordKey(sessionId));
    const log = await readLog(sessionId);
    if (log === null) return "missing";
    const since = deps.now() - settings.historyDays * DAY;
    const backfilledOf = (activity: number): boolean =>
      previous?.backfilled ?? (backfilled || activity < since);
    const failed = async (
      base: Omit<SessionRecord, "episodes" | "error">,
      message: string,
    ): Promise<Analysis> => {
      await putSession({ ...base, episodes: previous?.episodes ?? [], error: message });
      deps.logger.warn("skill-scout: analyzing session %s failed: %s", sessionId, message);
      return "failed";
    };
    if (log instanceof Error) {
      const header = listing?.headers.get(sessionId);
      const createdAt = previous?.createdAt ?? header?.createdAt ?? deps.now();
      return failed(
        {
          sessionId,
          cwd: previous?.cwd ?? header?.cwd ?? null,
          createdAt,
          eventCount: null,
          scannedAt: deps.now(),
          backfilled: backfilledOf(createdAt),
        },
        `读取会话日志失败：${log.message}`,
      );
    }
    if (log.session.origin === "subagent") return "subagent";
    if (previous?.eventCount === log.events.length) return "unchanged";
    const base = {
      sessionId,
      cwd: log.session.cwd ?? null,
      createdAt: log.session.createdAt,
      eventCount: log.events.length,
      scannedAt: deps.now(),
    };
    let episodes: Episode[];
    try {
      episodes = episodesOfLog(log, {
        redact: redactor(settings),
        keepOutput: settings.readOutput,
      });
    } catch (error) {
      return failed(
        { ...base, backfilled: backfilledOf(base.createdAt) },
        `解析会话日志失败：${asError(error).message}`,
      );
    }
    const activity = Math.max(base.createdAt, ...episodes.map((episode) => episode.endedAt));
    await putSession({ ...base, backfilled: backfilledOf(activity), episodes, error: null });
    return "changed";
  }

  /**
   * 线索的证据会话已被修剪时重新读入，按回溯记录，之后不再被修剪。只读取存储里没有的会话；
   * DSH 里已经找不到的会话记在内存里，不再重复读取。
   * @returns 读不回来的证据会话与原因。
   */
  async function restoreEvidence(candidate: Candidate): Promise<string[]> {
    const sessions = [...new Set(candidate.episodeIds.map(sessionOfEpisode))].filter(
      (sessionId) => store.sessions.get(recordKey(sessionId)) === undefined,
    );
    const lost: string[] = [];
    for (const sessionId of sessions) {
      if (gone.has(sessionId)) {
        lost.push(`DSH 里找不到会话 ${sessionId}`);
        continue;
      }
      // oxlint-disable-next-line no-await-in-loop -- 逐个读取，理由同扫描。
      const analysis = await enqueue(() => analyzeSession(sessionId, true));
      if (analysis === "missing") {
        gone.add(sessionId);
        lost.push(`DSH 里找不到会话 ${sessionId}`);
      }
      const error = store.sessions.get(recordKey(sessionId))?.error;
      if (error !== null && error !== undefined) lost.push(`会话 ${sessionId} 分析失败：${error}`);
    }
    return lost;
  }

  /**
   * 删除历史范围之外的会话记录（回溯读入的除外），以及 `USAGE_DAYS` 天以前的用量记录，存储不随时间增长。
   * 仍待处理的线索引用的会话保留，证据不会丢失。
   */
  async function prune(since: number): Promise<void> {
    const cited = new Set(
      leads()
        .filter(pending)
        .flatMap((lead) => lead.candidate.episodeIds),
    );
    const stale = [...store.sessions.entries()].filter(
      ([, record]) =>
        !record.backfilled &&
        Math.max(record.createdAt, ...record.episodes.map((episode) => episode.endedAt)) < since &&
        !record.episodes.some((episode) => cited.has(episode.id)),
    );
    const kept = new Set(recentDays(deps.now(), USAGE_DAYS));
    const usage = [...store.usage.entries()].filter(([key]) => !kept.has(key));
    await Promise.all([
      ...stale.map(([key]) => store.sessions.delete(key)),
      ...usage.map(([key]) => store.usage.delete(key)),
    ]);
    if (stale.length > 0) index.invalidate();
  }

  /** 在历史范围内的全部 Episode 上运行检测，把候选合并进规则线索，再修剪过期记录。 */
  async function detect(): Promise<void> {
    const settings = deps.settings();
    const now = deps.now();
    const since = now - settings.historyDays * DAY;
    const episodes = sessionRecords()
      .flatMap((record) => record.episodes)
      .filter((episode) => episode.endedAt >= since);
    const candidates = detectCandidates(episodes, { minOccurrences: settings.minOccurrences });
    const known = leads().filter((lead) => RULE_KINDS.has(lead.candidate.kind));
    const claimed = new Set<string>();
    for (const candidate of candidates) {
      const match =
        known.find((lead) => lead.id === candidate.id) ??
        known.find((lead) => !claimed.has(lead.id) && sameLead(candidate, lead));
      if (match !== undefined) {
        claimed.add(match.id);
        const next = refreshed(match, candidate, now);
        // oxlint-disable-next-line no-await-in-loop -- 逐条写入，写入失败时停在出错的那条。
        if (next !== null) await save(next);
        continue;
      }
      if (known.some((lead) => covered(candidate, lead))) continue;
      const created = newLead(candidate, now);
      known.push(created);
      claimed.add(created.id);
      // oxlint-disable-next-line no-await-in-loop -- 同上。
      await save(created);
    }
    await prune(since);
  }

  /** 回合结束后的分析：分析一个会话并更新线索，然后看是否有到期的后台摘要。 */
  function analyze(sessionId: string): Promise<void> {
    return serial(`analyzing session ${sessionId}`, async () => {
      if (!worker || !deps.settings().discovery) return;
      scanning += 1;
      try {
        if ((await analyzeSession(sessionId, false)) === "changed") await detect();
      } finally {
        scanning -= 1;
      }
      pump();
    });
  }

  /** 列出全部会话，记下来供统计与会话页使用。 */
  async function listAll(): Promise<readonly DshSessionHeader[]> {
    const headers = (await deps.query.listSessions(deps.signal)).map(({ header }) => header);
    listing = { at: deps.now(), headers: new Map(headers.map((header) => [header.id, header])) };
    return headers;
  }

  async function scanOnce(): Promise<void> {
    const settings = deps.settings();
    if (!worker || !settings.discovery) return;
    scanning += 1;
    try {
      const since = deps.now() - settings.historyDays * DAY;
      const unread = (await listAll())
        .filter(
          (header) =>
            header.origin !== "subagent" &&
            header.createdAt >= since &&
            store.sessions.get(recordKey(header.id)) === undefined,
        )
        .slice(0, settings.maxSessions);
      // 逐个读取：每个会话的日志可能很大，串行读取把内存占用限制在一个会话。
      // 每个会话单独排队，用户要求的分析可以插在中间。
      for (const { id } of unread) {
        if (deps.signal.aborted) return;
        // oxlint-disable-next-line no-await-in-loop -- 见上。
        await serial(`reading session ${id}`, async () => {
          await analyzeSession(id, false);
        });
        // 让出事件循环，避免长时间占用 Host。
        // oxlint-disable-next-line no-await-in-loop -- 见上。
        await sleep(0);
      }
      await serial("detecting candidates", detect);
    } catch (error) {
      report("reading past sessions", error);
    } finally {
      scanning -= 1;
    }
    pump();
  }

  /**
   * 启动时读取历史范围内尚未分析过的会话，再运行检测。同一时间只有一次扫描。
   * @returns 读取完成后兑现，从不拒绝；失败记录在工作状态里。
   */
  function scan(): Promise<void> {
    scanRun ??= loop(scanOnce()).finally(() => {
      scanRun = null;
    });
    return scanRun;
  }

  /** 回溯任务仍在进行：没有被新的范围替换、没有暂停，插件也没有卸载。 */
  function backfilling(job: BackfillJob): boolean {
    return backfillJob === job && job.state === "running" && !deps.signal.aborted;
  }

  async function runBackfill(job: BackfillJob): Promise<void> {
    job.active = true;
    try {
      if (!job.listed) {
        const now = deps.now();
        const since = now - deps.settings().historyDays * DAY;
        const from = now - BACKFILL_DAYS[job.range] * DAY;
        const headers = await listAll();
        job.queue = headers
          .filter(
            (header) =>
              header.origin !== "subagent" &&
              header.createdAt < since &&
              header.createdAt >= from &&
              store.sessions.get(recordKey(header.id)) === undefined,
          )
          .toSorted((a, b) => b.createdAt - a.createdAt)
          .map((header) => header.id);
        job.total = job.queue.length;
        job.listed = true;
        if (job.state === "listing") job.state = "running";
      }
      while (backfilling(job)) {
        const id = job.queue.shift();
        if (id === undefined) {
          job.state = "done";
          break;
        }
        // oxlint-disable-next-line no-await-in-loop -- 逐个读取，理由同扫描。
        const analysis = await enqueue(() => analyzeSession(id, true));
        job.done += 1;
        if (analysis === "failed") job.failed += 1;
        // oxlint-disable-next-line no-await-in-loop -- 让出事件循环。
        await sleep(0);
      }
    } catch (error) {
      report("reading older sessions", error);
      job.state = "paused";
    } finally {
      job.active = false;
    }
  }

  /**
   * 回溯历史范围之外更早的会话，供搜索与提炼：逐个读入并标为回溯，修剪时保留，规则检测不用它们。
   * 立即返回，进度见工作状态。同一范围暂停后再次调用时继续；换一个范围时重新列出。
   */
  function backfill(range: BackfillRange): void {
    const current = backfillJob;
    if (current !== null && current.range === range && current.state !== "done") {
      if (current.state !== "paused") return;
      current.state = current.listed ? "running" : "listing";
      if (!current.active) void loop(runBackfill(current));
      return;
    }
    const job: BackfillJob = {
      range,
      state: "listing",
      total: 0,
      done: 0,
      failed: 0,
      queue: [],
      listed: false,
      active: false,
    };
    backfillJob = job;
    void loop(runBackfill(job));
  }

  /** 暂停回溯：正在读的会话读完后停下。 */
  function pauseBackfill(): void {
    const job = backfillJob;
    if (job === null || (job.state !== "running" && job.state !== "listing")) {
      throw actionError("invalid", "没有正在进行的回溯");
    }
    job.state = "paused";
  }

  function cancelTimer(sessionId: string): void {
    clearTimeout(timers.get(sessionId));
    timers.delete(sessionId);
  }

  /** 一个会话的回合结束后，等它安静一段时间再分析；期间再有回合结束就重新计时。 */
  function noteTurnEnd(sessionId: string): void {
    const settings = deps.settings();
    if (!worker || !settings.discovery || deps.signal.aborted) return;
    cancelTimer(sessionId);
    const timer = setTimeout(() => {
      timers.delete(sessionId);
      void analyze(sessionId);
    }, settings.quietPeriod * MINUTE);
    timer.unref();
    timers.set(sessionId, timer);
  }

  /** 最近一次后台摘要的时间，看今天与昨天。 */
  function lastSummaryAt(now: number): number | null {
    const times = recentDays(now, 2).flatMap((day) => {
      const usage = store.usage.get(day);
      return usage === undefined || usage.lastSummaryAt === 0 ? [] : [usage.lastSummaryAt];
    });
    return times.length === 0 ? null : Math.max(...times);
  }

  /**
   * 记下一次已经发出的模型请求：当天的用量（后台摘要另外计入每日上限与间隔），
   * 以及一条调用记录，只保留最新的 `CALL_LIMIT` 条。
   */
  async function recordCall(
    job: Job,
    attempt: Attempt,
    result: CallRecord["result"],
    detail: string | null,
  ): Promise<void> {
    const now = deps.now();
    const used = {
      inputTokens: attempt.completion?.inputTokens ?? 0,
      cacheReadTokens: attempt.completion?.cacheReadTokens ?? 0,
      cacheWriteTokens: attempt.completion?.cacheWriteTokens ?? 0,
      outputTokens: attempt.completion?.outputTokens ?? 0,
    };
    const day = dayKey(now);
    const usage = store.usage.get(day) ?? {
      summaries: 0,
      requested: 0,
      failures: 0,
      inputTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      outputTokens: 0,
      lastSummaryAt: 0,
    };
    await store.usage.put(day, {
      summaries: usage.summaries + (job.background ? 1 : 0),
      requested: usage.requested + (job.background ? 0 : 1),
      failures: usage.failures + (result === "failed" ? 1 : 0),
      inputTokens: usage.inputTokens + used.inputTokens,
      cacheReadTokens: usage.cacheReadTokens + used.cacheReadTokens,
      cacheWriteTokens: usage.cacheWriteTokens + used.cacheWriteTokens,
      outputTokens: usage.outputTokens + used.outputTokens,
      lastSummaryAt: job.background ? now : usage.lastSummaryAt,
    });
    await store.calls.put(`${now.toString(36)}-${randomUUID().slice(0, 8)}`, {
      at: now,
      stage: job.stage,
      leadId: job.leadId,
      ideaIndex: job.index,
      title: job.title,
      provider: job.route.provider,
      model: job.route.model,
      durationMs: now - (attempt.startedAt ?? now),
      ...used,
      result,
      detail,
    });
    const excess = [...store.calls.entries()]
      .toSorted(([, a], [, b]) => b.at - a.at)
      .slice(CALL_LIMIT);
    await Promise.all(excess.map(([key]) => store.calls.delete(key)));
  }

  /** 记下请求进入的阶段；收到正文时同时更新已收到的字数。 */
  function advance(key: string, phase: ProgressPhase, chars?: number): void {
    const current = progress.get(key);
    if (current === undefined) return;
    progress.set(key, {
      ...current,
      phase,
      phaseAt: current.phase === phase ? current.phaseAt : deps.now(),
      chars: chars ?? current.chars,
    });
  }

  function track(job: Job, phase: ProgressPhase): void {
    const now = deps.now();
    progress.set(job.key, {
      stage: job.stage,
      phase,
      startedAt: now,
      phaseAt: now,
      chars: 0,
      expected: job.expected,
    });
  }

  /**
   * 组装候选的证据包，并读取证据会话可用的 Skill。摘要的证据包另外列出全部已占用的 Skill 名称。
   * @param target - 要改进的 Skill，附带它的全文。
   */
  async function evidenceOf(
    candidate: Candidate,
    target: string | null,
    stage: Stage,
  ): Promise<{
    readonly pack: EvidencePack;
    readonly existing: ReadonlySet<string>;
    readonly catalog: readonly DshSkillSummary[];
  }> {
    const settings = deps.settings();
    const lost = await restoreEvidence(candidate);
    const episodes = episodesOf(candidate);
    if (episodes.length === 0) {
      throw modelError(
        "evidence",
        lost.length > 0 ? `读不到证据：${lost.join("；")}` : "证据任务已不在分析记录里",
      );
    }
    const catalog = await catalogOf(candidate);
    if (catalog === null) throw modelError("evidence", "证据会话都已删除，读不到它们可用的 Skill");
    const ranked = rankSkills(candidate, episodes, catalog, target);
    const related = await relatedSkills(ranked, redactor(settings));
    const taken = stage === "summary" ? ranked.map((entry) => entry.skill.name) : [];
    return {
      pack: buildEvidence(candidate, episodes, related, settings.evidenceBudget, taken),
      existing: new Set(catalog.map((skill) => skill.name)),
      catalog,
    };
  }

  /** 请求一次模型并记下进度；超时与插件卸载都会取消请求。 */
  async function call(
    job: Job,
    attempt: Attempt,
    system: string,
    message: string,
    maxTokens: number,
    timeout: number,
  ): Promise<Completion> {
    const signal = AbortSignal.any([deps.signal, AbortSignal.timeout(timeout * 1000)]);
    advance(job.key, "waiting");
    attempt.startedAt = deps.now();
    const completion = await complete(
      deps.llm,
      job.route,
      system,
      message,
      maxTokens,
      signal,
      (phase, chars) => advance(job.key, phase, chars),
    );
    attempt.completion = completion;
    advance(job.key, "checking");
    return completion;
  }

  /** 给一条线索写摘要：判断值不值得保存，值得时给出互不重叠的 idea。 */
  async function summarizeOnce(job: Job, attempt: Attempt): Promise<Summary> {
    const settings = deps.settings();
    const { candidate } = findLead(job.leadId);
    const requested = isRequested(candidate.kind);
    const { pack, existing } = await evidenceOf(candidate, null, "summary");
    const completion = await call(
      job,
      attempt,
      summaryPrompt(settings.prompt, candidate.kind),
      pack.text,
      requested ? EXTRACT_MAX_TOKENS : SUMMARY_MAX_TOKENS,
      settings.summaryTimeout * (requested ? EXTRACT_TIMEOUT_FACTOR : 1),
    );
    return checkSummary(completion.text, pack, existing, maxIdeas(candidate.kind));
  }

  /** 按用户同意的 idea 写草稿；证据会话有 skill-creator 时附上它作为写作指南。 */
  async function draftOnce(
    job: Job,
    position: number,
    attempt: Attempt,
  ): Promise<{ readonly draft: Draft; readonly cautions: readonly string[] }> {
    const settings = deps.settings();
    const lead = findLead(job.leadId);
    const { proposal } = ideaOf(lead, position);
    const improve = proposal.decision === "suggest_improve" ? proposal.skill : null;
    const { pack, existing, catalog } = await evidenceOf(lead.candidate, improve, "draft");
    if (improve !== null && !existing.has(improve)) {
      throw modelError("evidence", `要改进的 Skill 已不存在：${improve}`);
    }
    const creator = await creatorGuide(catalog, redactor(settings));
    const completion = await call(
      job,
      attempt,
      draftPrompt(proposal, creator),
      draftMessage(proposal, pack),
      DRAFT_MAX_TOKENS,
      settings.draftTimeout,
    );
    return checkDraft(completion.text, pack, proposal);
  }

  /** 「忽略类似」留下的屏蔽：被忽略的 idea（或被忽略的整条线索里的 idea）的 Skill 名称与标题词。 */
  function similarBlocks(
    except: string,
  ): { readonly skill: string; readonly words: ReadonlySet<string> }[] {
    return leads()
      .filter((lead) => lead.id !== except)
      .flatMap((lead) => {
        const whole = lead.state === "dismissed" && lead.dismissed?.similar === true;
        return proposalsOf(lead).flatMap((proposal, position) =>
          whole || lead.ideas[position]?.dismissed?.similar === true
            ? [{ skill: proposal.skill, words: tokens(proposal.title) }]
            : [],
        );
      });
  }

  /** 保存一份摘要：给出的 idea 与「忽略类似」相近的直接记为忽略。调用期间被忽略的线索保持忽略。 */
  async function saveSummary(job: Job, summary: Summary, attempt: Attempt): Promise<void> {
    const current = findLead(job.leadId);
    const now = deps.now();
    const blocks = summary.decision === "suggest" ? similarBlocks(current.id) : [];
    const ideas = (summary.decision === "suggest" ? summary.ideas : []).map(
      (proposal): IdeaRecord => {
        const words = tokens(proposal.title);
        const similar = blocks.some(
          (block) => block.skill === proposal.skill || jaccard(words, block.words) >= SIMILAR_TITLE,
        );
        return {
          state: similar ? "dismissed" : "proposed",
          updatedAt: now,
          draft: null,
          failure: null,
          write: null,
          dismissed: similar ? { at: now, similar: true } : null,
        };
      },
    );
    await save({
      ...current,
      summary: {
        at: now,
        provider: job.route.provider,
        model: job.route.model,
        inputTokens: attempt.completion?.inputTokens ?? 0,
        outputTokens: attempt.completion?.outputTokens ?? 0,
        summary,
      },
      ideas,
      summarizedSize: current.candidate.episodeIds.length,
      failure: null,
      updatedAt: now,
      state:
        current.state === "dismissed"
          ? "dismissed"
          : summary.decision === "skip"
            ? "skipped"
            : "summarized",
    });
  }

  /** 记下一次失败，返回失败记录。 */
  async function saveFailure(job: Job, error: Error): Promise<FailureRecord> {
    const now = deps.now();
    if (job.index === null) {
      const current = findLead(job.leadId);
      const failure = failureOf(error, "summary", current.failure, now);
      // 重新摘要失败时，旧摘要与它给出的 idea 一并作废：用户要的是一份新摘要，而它们都还没有进展。
      await save({
        ...current,
        state: current.state === "dismissed" ? "dismissed" : "failed",
        summary: null,
        ideas: [],
        updatedAt: now,
        failure,
      });
      return failure;
    }
    const { idea } = ideaOf(findLead(job.leadId), job.index);
    const failure = failureOf(error, "draft", idea.failure, now);
    await saveIdea(job.leadId, job.index, (current) => ({
      ...current,
      state: current.state === "dismissed" ? "dismissed" : "failed",
      updatedAt: now,
      failure,
    }));
    return failure;
  }

  /** 运行一次摘要或草稿并保存结果；失败记录在线索或 idea 上。从不拒绝。 */
  async function runModel(job: Job): Promise<void> {
    const attempt: Attempt = { startedAt: null, completion: null };
    try {
      advance(job.key, "preparing");
      try {
        if (job.index === null) {
          const summary = await summarizeOnce(job, attempt);
          await saveSummary(job, summary, attempt);
          await recordCall(
            job,
            attempt,
            summary.decision === "skip" ? "skipped" : "proposed",
            summary.decision === "skip" ? summary.reason : String(summary.ideas.length),
          );
        } else {
          const { draft, cautions } = await draftOnce(job, job.index, attempt);
          const now = deps.now();
          await saveIdea(job.leadId, job.index, (idea) => ({
            ...idea,
            draft: {
              at: now,
              provider: job.route.provider,
              model: job.route.model,
              inputTokens: attempt.completion?.inputTokens ?? 0,
              outputTokens: attempt.completion?.outputTokens ?? 0,
              cautions: [...cautions],
              draft,
            },
            // 调用期间被忽略的 idea 保持忽略，草稿照样记下，恢复时回到可以保存。
            state: idea.state === "dismissed" ? "dismissed" : "ready",
            updatedAt: now,
            failure: null,
          }));
          await recordCall(job, attempt, "drafted", null);
        }
        lastError = null;
      } catch (error) {
        if (deps.signal.aborted) return;
        const failure = await saveFailure(job, asError(error));
        lastError = { kind: failure.kind, message: failure.message, at: failure.at };
        deps.logger.warn("skill-scout: %s of %s failed: %s", job.stage, job.key, failure.message);
        if (attempt.startedAt !== null) await recordCall(job, attempt, "failed", failure.message);
      }
    } catch (error) {
      report(`${job.stage} of ${job.key}`, error);
    } finally {
      progress.delete(job.key);
    }
  }

  /** 在后台运行一次已经登记了进度的模型请求。 */
  function launch(job: Job): void {
    const run: Promise<void> = runModel(job).finally(() => {
      active.delete(run);
    });
    active.add(run);
  }

  function start(job: Job): void {
    track(job, "preparing");
    launch(job);
  }

  /** 到期可以自动写摘要的规则线索，按分数从高到低。只有摘要会自动重试。 */
  function due(now: number): Lead[] {
    return leads()
      .filter((lead) => {
        if (!RULE_KINDS.has(lead.candidate.kind)) return false;
        if (lead.state === "detected") return true;
        if (lead.state !== "failed" || lead.failure === null) return false;
        const at = retryAt(lead.failure);
        return at !== null && now >= at;
      })
      .toSorted((a, b) => b.candidate.score - a.candidate.score || a.detectedAt - b.detectedAt);
  }

  /** 在限额内启动下一次后台摘要；有任何模型请求在进行时不启动。后台从不生成草稿。 */
  function pump(): void {
    if (!worker || progress.size > 0 || deps.signal.aborted) return;
    const settings = deps.settings();
    // 关闭会话分析或后台摘要后，不再发出任何后台模型请求。
    if (!settings.discovery || !settings.summarize) return;
    const now = deps.now();
    if ((store.usage.get(dayKey(now))?.summaries ?? 0) >= settings.dailySummaries) return;
    const last = lastSummaryAt(now);
    if (last !== null && now - last < settings.summaryInterval * MINUTE) return;
    const next = due(now)[0];
    if (next === undefined) return;
    const target = routes().summary;
    if (target === undefined) {
      lastError = { kind: "no-model", message: "没有可用的发现模型", at: now };
      return;
    }
    start(summaryJob(next, target, true));
  }

  /** 线索有正在进行的模型请求：摘要，或它的任何一个 idea 的草稿。 */
  function busy(lead: Lead): boolean {
    return (
      progress.has(lead.id) ||
      lead.ideas.some((_, position) => progress.has(ideaId(lead.id, position)))
    );
  }

  function summaryRoute(): ModelRoute {
    const target = routes().summary;
    if (target === undefined) throw actionError("no-model", "没有可用的发现模型");
    return target;
  }

  /** 用户请求给线索写摘要：不受后台开关与限额约束。 */
  function summarizeNow(id: string): void {
    const { lead, index: position } = locate(id);
    if (position !== null) throw actionError("invalid", "摘要针对整条线索");
    if (busy(lead)) throw actionError("busy", "这条线索正在处理");
    if (lead.state === "dismissed") throw actionError("invalid", "这条线索已经处理过");
    checkResummary(lead);
    start(summaryJob(lead, summaryRoute(), false));
  }

  /** 用户同意一个 idea，请求生成草稿；已有草稿时重新生成。 */
  function draftNow(id: string): void {
    const { lead, position, key, idea, proposal } = locateIdea(id, "草稿");
    if (progress.has(key) || progress.has(lead.id)) throw actionError("busy", "这条建议正在处理");
    if (lead.state === "dismissed" || idea.state === "dismissed" || idea.state === "written") {
      throw actionError("invalid", "这条建议已经处理过");
    }
    const target = routes().draft;
    if (target === undefined) throw actionError("no-model", "没有可用的生成模型");
    start({
      key,
      leadId: lead.id,
      index: position,
      stage: "draft",
      route: target,
      background: false,
      title: proposal.title,
      expected: EXPECTED_CHARS.draft,
    });
  }

  /** 忽略一条线索或一个 idea；similar 同时屏蔽之后出现的相近线索与 idea。 */
  async function dismiss(id: string, similar: boolean): Promise<void> {
    const { lead, index: position } = locate(id);
    const now = deps.now();
    if (position === null) {
      if (hasWritten(lead)) throw actionError("invalid", "这条线索里有已写入的 Skill，需要先撤销");
      await save({ ...lead, state: "dismissed", updatedAt: now, dismissed: { at: now, similar } });
      return;
    }
    if (ideaOf(lead, position).idea.state === "written") {
      throw actionError("invalid", "已写入的建议需要先撤销");
    }
    await saveIdea(lead.id, position, (idea) => ({
      ...idea,
      state: "dismissed",
      updatedAt: now,
      dismissed: { at: now, similar },
    }));
  }

  /** 恢复忽略的线索或 idea；证据会话已被修剪时重新读入，之后的摘要与草稿照常有证据。 */
  async function restore(id: string): Promise<void> {
    const { lead, index: position } = locate(id);
    const now = deps.now();
    if (position === null) {
      if (lead.state !== "dismissed") throw actionError("invalid", "这条线索没有被忽略");
      const next = { ...lead, dismissed: null };
      await save({ ...next, state: settledLeadState(next), updatedAt: now });
    } else {
      if (ideaOf(lead, position).idea.state !== "dismissed") {
        throw actionError("invalid", "这条建议没有被忽略");
      }
      await saveIdea(lead.id, position, (idea) => {
        const next = { ...idea, dismissed: null };
        return { ...next, state: settledIdeaState(next), updatedAt: now };
      });
    }
    await restoreEvidence(lead.candidate);
  }

  /**
   * 用户要求提炼时的线索：没有就新建；已有时换上新的证据，被忽略的随之恢复。
   * idea 已有进展的线索不能替换，避免丢掉用户已经同意或保存的 idea。
   */
  async function requestedLead(candidate: Candidate): Promise<Lead> {
    const now = deps.now();
    const existing = store.suggestions.get(recordKey(candidate.id));
    if (existing !== undefined) checkResummary(existing);
    const lead =
      existing === undefined
        ? newLead(candidate, now)
        : {
            ...existing,
            candidate,
            dismissed: null,
            updatedAt: now,
            state: existing.state === "dismissed" ? settledLeadState(existing) : existing.state,
          };
    await save(lead);
    return lead;
  }

  /** 用户要求提炼前的检查：有发现模型，这条线索没有在处理。 */
  function checkRequest(id: string): ModelRoute {
    const target = summaryRoute();
    const existing = store.suggestions.get(recordKey(id));
    if (progress.has(id) || (existing !== undefined && busy(existing))) {
      throw actionError("busy", "这条线索正在处理");
    }
    return target;
  }

  /** 排队分析一个会话；会话不存在或是子代理会话时以操作失败拒绝。 */
  function analyzeQueued(sessionId: string): Promise<Analysis> {
    return enqueue(async () => {
      cancelTimer(sessionId);
      scanning += 1;
      try {
        const analysis = await analyzeSession(sessionId, false);
        if (analysis === "missing") throw actionError("missing", `没有这个会话：${sessionId}`);
        if (analysis === "subagent") throw actionError("invalid", "子代理会话不单独分析");
        if (analysis === "changed") await detect();
        return analysis;
      } finally {
        scanning -= 1;
      }
    });
  }

  /** 不等静默期，立即分析一个会话；用户发起，不受发现开关约束。 */
  async function analyzeNow(sessionId: string): Promise<void> {
    await analyzeQueued(sessionId);
    pump();
  }

  /**
   * 提炼一整段会话：需要时先分析它，再把它的全部任务交给发现模型，最多给出 5 个 idea。
   * 分析与线索创建完成后返回，摘要在后台进行。
   * @returns 建立或沿用的线索 id。
   */
  async function extractSession(sessionId: string): Promise<string> {
    const id = `session:${sessionId}`;
    const route = checkRequest(id);
    const job: Job = {
      key: id,
      leadId: id,
      index: null,
      stage: "summary",
      route,
      background: false,
      title: "",
      expected: EXPECTED_CHARS.extract,
    };
    track(job, "queued");
    let lead: Lead;
    try {
      await analyzeQueued(sessionId);
      const record = store.sessions.get(recordKey(sessionId));
      const episodes = record?.episodes ?? [];
      if (episodes.length === 0) {
        throw record?.error === null || record?.error === undefined
          ? actionError("empty", "这个会话里还没有可提炼的任务")
          : actionError("invalid", `会话分析失败：${record.error}`);
      }
      lead = await requestedLead(requestedCandidate("session", id, episodes));
    } catch (error) {
      progress.delete(id);
      throw error;
    }
    launch({ ...job, title: clip(lead.candidate.goal, TITLE_CHARS) });
    return id;
  }

  /**
   * 提炼搜索结果里勾选的任务：组成一条线索交给发现模型，最多给出 5 个 idea。
   * @returns 建立或沿用的线索 id。
   */
  async function extractSelected(episodeIds: readonly string[]): Promise<string> {
    const ids = [...new Set(episodeIds)].toSorted();
    const id = `selected:${createHash("sha256").update(ids.join("\n")).digest("hex").slice(0, 16)}`;
    const route = checkRequest(id);
    const found = episodeIndex();
    const missing = ids.filter((episodeId) => !found.has(episodeId));
    if (missing.length > 0) throw actionError("missing", `没有这些任务：${missing.join(", ")}`);
    const episodes = ids.flatMap((episodeId) => {
      const episode = found.get(episodeId);
      return episode === undefined ? [] : [episode];
    });
    const candidate = requestedCandidate("selected", id, episodes);
    const job: Job = {
      key: id,
      leadId: id,
      index: null,
      stage: "summary",
      route,
      background: false,
      title: clip(candidate.goal, TITLE_CHARS),
      expected: EXPECTED_CHARS.extract,
    };
    track(job, "preparing");
    try {
      await requestedLead(candidate);
    } catch (error) {
      progress.delete(id);
      throw error;
    }
    launch(job);
    return id;
  }

  /** 生成写入预览；不触碰文件系统以外的状态。 */
  async function preview(id: string, input: WriteInput): Promise<Preview> {
    const { lead, key, idea, proposal } = locateIdea(id, "预览");
    const draft = idea.draft?.draft;
    const cwd = lead.candidate.cwd;
    if (draft === undefined) throw actionError("invalid", "这条建议还没有可写入的草稿");
    if (draft.kind === "create") {
      const fields =
        input.fields ?? fieldsOfDraft({ name: proposal.skill, title: proposal.title, draft });
      const scope = input.scope ?? deps.settings().scope;
      const path = await newSkillPath(scope, fields.name, cwd).catch((error: Error) => {
        throw isWriteError(error) ? actionError("invalid", error.message) : error;
      });
      const content = renderSkillFile(fields, key, dayKey(deps.now()));
      return {
        kind: "create",
        scope,
        path,
        content,
        exists: (await readOptional(path)) !== null,
        fields,
      };
    }
    const name = proposal.skill;
    const skill = (await catalogOf(lead.candidate))?.find((entry) => entry.name === name);
    const section = input.section ?? renderImprovement(proposal.title, draft.notes);
    const path = skill?.path ?? null;
    const before = path === null ? "" : ((await readOptional(path)) ?? "");
    const writable = path !== null && insideRoots(path, await skillRoots(cwd));
    return {
      kind: "improve",
      skill: name,
      path,
      writable,
      before,
      after: appendSection(before, section),
      baseHash: hashOf(before),
      section,
    };
  }

  /** 证据会话的 Skill 目录此刻是否列出了这个文件。 */
  async function listed(candidate: Candidate, name: string, path: string): Promise<boolean> {
    const expected = resolve(await realpath(path));
    const skill = (await catalogOf(candidate))?.find((entry) => entry.name === name);
    return skill?.path !== undefined && resolve(await realpath(skill.path)) === expected;
  }

  /**
   * DSH 的文件监视在写入后稍晚才让目录缓存失效，这里按固定间隔轮询一小段时间。
   * 文件已经写好，核对失败只记日志并按未列出处理，写入记录照常保存，撤销仍然可用。
   */
  async function discovered(candidate: Candidate, name: string, path: string): Promise<boolean> {
    try {
      for (let poll = 0; poll < DISCOVERY_POLLS && !deps.signal.aborted; poll += 1) {
        // oxlint-disable-next-line no-await-in-loop -- 轮询。
        if (await listed(candidate, name, path)) return true;
        // oxlint-disable-next-line no-await-in-loop -- 轮询。
        await sleep(DISCOVERY_INTERVAL);
      }
    } catch (error) {
      report(`checking that DSH lists ${name}`, error);
    }
    return false;
  }

  /**
   * 轮询结束时 DSH 还没列出新写入的 Skill：在后台继续核对，列出后更新写入记录。
   * idea 被撤销或改写到别处时停止。
   */
  function recheck(leadId: string, position: number, attempt = 1): void {
    if (deps.signal.aborted) return;
    const key = ideaId(leadId, position);
    const timer = setTimeout(() => {
      rechecks.delete(key);
      const lead = store.suggestions.get(recordKey(leadId));
      const record = lead?.ideas[position]?.write;
      if (lead === undefined || record === null || record === undefined) return;
      if (lead.ideas[position]?.state !== "written") return;
      listed(lead.candidate, record.skill, record.path)
        .then(async (found) => {
          if (deps.signal.aborted) return;
          if (!found) {
            if (attempt < RECHECKS) recheck(leadId, position, attempt + 1);
            return;
          }
          const latest = store.suggestions.get(recordKey(leadId))?.ideas[position];
          if (latest?.state !== "written" || latest.write?.path !== record.path) return;
          await saveIdea(leadId, position, (idea) => ({
            ...idea,
            write: idea.write === null ? null : { ...idea.write, discovered: true },
          }));
        })
        .catch((error: unknown) => report(`checking that DSH lists ${record.skill}`, error));
    }, RECHECK_INTERVAL);
    timer.unref();
    rechecks.set(key, timer);
  }

  /** 写入一个 idea 的 Skill 文件，并核对 DSH 能发现它。 */
  async function write(id: string, input: WriteInput): Promise<void> {
    const { lead, position, idea } = locateIdea(id, "写入");
    if (idea.state !== "ready" || lead.state === "dismissed") {
      throw actionError("invalid", "只有待处理的建议可以写入");
    }
    const plan = await preview(id, input);
    const cwd = lead.candidate.cwd;
    const roots = await skillRoots(cwd);
    let record: WriteRecord;
    try {
      if (plan.kind === "create") {
        checkText([plan.content]);
        const file = await createSkillFile(plan.path, plan.content, roots);
        record = {
          ...file,
          at: deps.now(),
          scope: plan.scope,
          skill: plan.fields.name,
          discovered: false,
        };
      } else {
        if (!plan.writable || plan.path === null) {
          throw actionError("outside", "这个 Skill 不在可写的项目或用户 Skill 目录里");
        }
        if (input.baseHash !== undefined && input.baseHash !== plan.baseHash) {
          throw actionError("changed", "预览之后 Skill 文件被改过，请重新预览");
        }
        checkText([plan.section]);
        const file = await replaceSkillFile(plan.path, plan.before, plan.after, roots);
        record = {
          ...file,
          at: deps.now(),
          scope: "existing",
          skill: plan.skill,
          discovered: false,
        };
      }
    } catch (error) {
      if (error instanceof Error && isWriteError(error))
        throw actionError(error.kind, error.message);
      throw error;
    }
    const written: WriteRecord = {
      ...record,
      discovered: await discovered(lead.candidate, record.skill, record.path),
    };
    try {
      await saveIdea(lead.id, position, (current) => ({
        ...current,
        state: "written",
        updatedAt: deps.now(),
        write: written,
      }));
    } catch (error) {
      // 记录没存下来就无法撤销：把文件恢复到写入之前，再报告保存失败。
      await undoSkillWrite(written);
      throw error;
    }
    if (!written.discovered) recheck(lead.id, position);
  }

  /** 撤销写入，idea 回到可以保存。 */
  async function undo(id: string): Promise<void> {
    const { lead, position, key, idea } = locateIdea(id, "撤销");
    if (idea.state !== "written" || idea.write === null) {
      throw actionError("invalid", "这条建议没有写入记录");
    }
    try {
      await undoSkillWrite(idea.write);
    } catch (error) {
      if (error instanceof Error && isWriteError(error))
        throw actionError(error.kind, error.message);
      throw error;
    }
    clearTimeout(rechecks.get(key));
    rechecks.delete(key);
    await saveIdea(lead.id, position, (current) => {
      const next = { ...current, write: null };
      return { ...next, state: settledIdeaState(next), updatedAt: deps.now() };
    });
  }

  /**
   * 会话在 DSH 里的情况。先查最近一次列出的会话；查不到且列出已经过了一段时间时重新列出一次。
   */
  async function presence(sessionId: string): Promise<Presence> {
    let header = listing?.headers.get(sessionId);
    if (header === undefined && (listing === null || deps.now() - listing.at >= RELIST_INTERVAL)) {
      header = (await listAll()).find((entry) => entry.id === sessionId);
    }
    if (header === undefined) return "missing";
    return header.origin === "subagent" ? "subagent" : "present";
  }

  return {
    /** 设置本进程是否持有工作锁。 */
    setLead(value: boolean): void {
      worker = value;
    },
    noteTurnEnd,
    analyze,
    scan,
    detect: () => serial("detecting candidates", detect),
    pump,
    summarizeNow,
    draftNow,
    dismiss,
    restore,
    preview,
    write,
    undo,
    analyzeNow,
    extractSession,
    extractSelected,
    backfill,
    pauseBackfill,
    routes,
    /**
     * 打开一张卡片的详情之前补回它的证据：证据会话已被修剪时重新读入。
     * 卡片不存在时什么都不做，由详情视图报告找不到。
     */
    async evidence(id: string): Promise<void> {
      const direct = store.suggestions.get(recordKey(id));
      const parts = direct === undefined ? splitIdeaId(id) : null;
      const lead =
        direct ?? (parts === null ? undefined : store.suggestions.get(recordKey(parts.leadId)));
      if (lead !== undefined) await restoreEvidence(lead.candidate);
    },
    /** 搜索已存的任务。 */
    search(query: string, options: SearchOptions): SearchResult {
      return index.search(query, options);
    },
    /** 会话页需要的会话状态：分析记录、是否在等静默期、在 DSH 里的情况。 */
    async session(sessionId: string): Promise<{
      readonly record: SessionRecord | undefined;
      readonly waiting: boolean;
      readonly presence: Presence;
    }> {
      const record = store.sessions.get(recordKey(sessionId));
      const waiting = timers.has(sessionId);
      return {
        record,
        waiting,
        presence: record !== undefined || waiting ? "present" : await presence(sessionId),
      };
    },
    /**
     * 历史范围内与全部不是子代理的会话数。用最近一次列出的会话，到下一次扫描前有效；
     * 本进程还没列出过时（例如没有工作锁）先列出一次。
     */
    async coverage(): Promise<{ readonly inRange: number; readonly total: number }> {
      const known = listing?.headers.values() ?? (await listAll());
      const headers = [...known].filter((header) => header.origin !== "subagent");
      const since = deps.now() - deps.settings().historyDays * DAY;
      return {
        inRange: headers.filter((header) => header.createdAt >= since).length,
        total: headers.length,
      };
    },
    /** 等待扫描、回溯、已排队的分析与正在进行的模型请求结束；测试与卸载时使用。 */
    async idle(): Promise<void> {
      await Promise.all(loops);
      await chain;
      await Promise.all(active);
    },
    runtime() {
      const job = backfillJob;
      return {
        lead: worker,
        scanning: scanning > 0,
        waiting: timers.size,
        checking: [...rechecks.keys()],
        working: new Map(progress) as Working,
        lastError,
        backfill:
          job === null
            ? null
            : {
                range: job.range,
                state: job.state,
                total: job.total,
                done: job.done,
                failed: job.failed,
              },
      };
    },
    dispose(): void {
      for (const timer of [...timers.values(), ...rechecks.values()]) clearTimeout(timer);
      timers.clear();
      rechecks.clear();
    },
  };
}

export type Scout = ReturnType<typeof createScout>;
