/**
 * Skill Scout 的工作流程：会话空闲后提取 Episode，跨会话检测候选，按限额交给模型复核，
 * 用户确认后写入 Skill 并核对 DSH 能发现它。所有后台工作串行执行，不阻塞 Agent 主循环；
 * 只有持有工作锁的进程做分析与复核。
 */
import { realpath } from "node:fs/promises";
import { resolve } from "pathe";
import type { ActionErrorKind } from "../shared.ts";
import type { Settings } from "./config.ts";
import type {
  DshLlm,
  DshLogger,
  DshModelSelection,
  DshSessionQuery,
  DshSessionSkillCatalog,
  DshSkillSummary,
} from "./dsh.ts";
import { episodesOfLog } from "./episodes.ts";
import type { Candidate, Episode } from "./model.ts";
import { compilePatterns, containsSecret, redact } from "./redact.ts";
import {
  buildEvidence,
  checkReview,
  complete,
  isReviewError,
  reviewError,
  systemPrompt,
  type RelatedSkill,
} from "./review.ts";
import { detectCandidates, jaccard, tokens } from "./signals.ts";
import {
  appendSection,
  fieldsOfDraft,
  renderImprovement,
  renderSkillFile,
  type SkillFields,
} from "./skill-file.ts";
import {
  dayKey,
  recordKey,
  type FailureRecord,
  type ReviewRecord,
  type ScoutStore,
  type Suggestion,
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
/** 复核失败后自动重试的等待时间；用完后只能手动重试。 */
const RETRY_DELAYS = [10 * MINUTE, 60 * MINUTE, 6 * 60 * MINUTE] as const;
const REVIEW_MAX_TOKENS = 8192;
/** 写入后等待 DSH 发现新 Skill 的轮询次数与间隔。 */
const DISCOVERY_POLLS = 12;
const DISCOVERY_INTERVAL = 250;
/** 轮询结束时 DSH 仍未列出的 Skill，在后台按这个间隔与次数继续核对。 */
const RECHECK_INTERVAL = 5_000;
const RECHECKS = 24;

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

/** 选中的复核模型与它的来源。 */
export type ReviewRoute = DshModelSelection & { readonly source: "config" | "default" };

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

/** 两个集合的重叠系数：交集除以较小集合的大小。 */
function overlap(left: ReadonlySet<string>, right: ReadonlySet<string>): number {
  const smaller = Math.min(left.size, right.size);
  if (smaller === 0) return 0;
  let shared = 0;
  for (const item of left) if (right.has(item)) shared += 1;
  return shared / smaller;
}

/**
 * 新候选与已有建议是同一个模式：同类且特征或证据大体重合；
 * 或者已有建议来自一次长任务，而新候选的证据包含了那次任务，即同一流程后来又在别的会话里出现。
 */
function sameSuggestion(candidate: Candidate, suggestion: Suggestion): boolean {
  if (candidate.kind !== suggestion.candidate.kind) {
    return (
      suggestion.candidate.kind === "complex" &&
      suggestion.candidate.episodeIds.some((id) => candidate.episodeIds.includes(id))
    );
  }
  if (jaccard(new Set(candidate.features), new Set(suggestion.candidate.features)) >= 0.5) {
    return true;
  }
  return overlap(new Set(candidate.episodeIds), new Set(suggestion.candidate.episodeIds)) >= 0.5;
}

/** 新候选与一条「忽略类似」或已写入的建议相近。 */
function covered(candidate: Candidate, suggestion: Suggestion): boolean {
  const similarDismissal =
    suggestion.state === "dismissed" && suggestion.dismissed?.similar === true;
  if (!similarDismissal && suggestion.state !== "written") return false;
  const features = jaccard(new Set(candidate.features), new Set(suggestion.candidate.features));
  const goals = jaccard(tokens(candidate.goal), tokens(suggestion.candidate.goal));
  return similarDismissal ? features >= 0.3 || goals >= 0.5 : features >= 0.5;
}

/** 证据更新后，已有建议的新状态；不需要更新时返回 null。 */
function refreshed(suggestion: Suggestion, candidate: Candidate, now: number): Suggestion | null {
  const same =
    suggestion.candidate.episodeIds.length === candidate.episodeIds.length &&
    suggestion.candidate.episodeIds.every((id, index) => candidate.episodeIds[index] === id);
  if (same || suggestion.state === "dismissed" || suggestion.state === "written") return null;
  const next = { ...suggestion, candidate: { ...candidate, id: suggestion.candidate.id } };
  if (
    suggestion.state === "skipped" &&
    candidate.episodeIds.length >= 2 * Math.max(1, suggestion.reviewedSize)
  ) {
    return { ...next, state: "detected", updatedAt: now };
  }
  return next;
}

function failureOf(error: Error, previous: FailureRecord | null, now: number): FailureRecord {
  const kind = isReviewError(error) ? error.kind : "model";
  return { kind, message: error.message, at: now, attempts: (previous?.attempts ?? 0) + 1 };
}

/** 失败的建议何时可以自动重试；次数用完时返回 null。 */
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

/** 与候选相关的已有 Skill；最相关的一条附带脱敏后的 SKILL.md 全文。 */
async function relatedSkills(
  candidate: Candidate,
  episodes: readonly Episode[],
  catalog: readonly DshSkillSummary[],
  redactText: (text: string) => string,
): Promise<RelatedSkill[]> {
  const query = tokens(
    [candidate.goal, ...episodes.map((e) => e.goal), ...candidate.features].join(" "),
  );
  const ranked = catalog
    .map((skill) => ({
      skill,
      score: overlap(query, tokens(`${skill.name.replaceAll("-", " ")} ${skill.description}`)),
    }))
    .filter((entry) => entry.score >= 0.2)
    .toSorted((a, b) => b.score - a.score)
    .slice(0, 3);
  const path = ranked[0]?.skill.path;
  const content = path === undefined ? null : await readOptional(path);
  return ranked.map((entry, index) => ({
    skill: entry.skill,
    excerpt: index === 0 && content !== null ? redactText(content) : null,
  }));
}

/**
 * 创建引擎。
 * @param deps - DSH 服务与插件存储。
 */
export function createScout(deps: ScoutDeps) {
  const { store } = deps;
  let lead = false;
  let scanning = 0;
  let reviewing: string | null = null;
  let active: Promise<void> | null = null;
  let lastError: { kind: string; message: string; at: number } | null = null;
  let chain: Promise<void> = Promise.resolve();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  /** 写入后仍在后台核对 DSH 能否发现的建议。 */
  const rechecks = new Map<string, ReturnType<typeof setTimeout>>();

  /** 后台任务的边界：记录失败但不让它影响 Agent。 */
  function report(label: string, error: unknown): void {
    if (deps.signal.aborted) return;
    const message = error instanceof Error ? error.message : String(error);
    lastError = { kind: "analysis", message, at: deps.now() };
    deps.logger.warn("skill-scout: %s failed: %s", label, message);
  }

  /** 串行执行分析任务；失败只记录，不影响后续任务，返回的 Promise 不会拒绝。 */
  function serial(label: string, task: () => Promise<void>): Promise<void> {
    const run = chain.then(task).catch((error: unknown) => report(label, error));
    chain = run;
    return run;
  }

  function route(): ReviewRoute | undefined {
    const settings = deps.settings();
    if (settings.provider !== "" && settings.model !== "") {
      return {
        provider: settings.provider,
        model: settings.model,
        ...(settings.effort === "" ? {} : { reasoningEffort: settings.effort }),
        source: "config",
      };
    }
    const fallback = deps.defaultModel();
    return fallback === undefined ? undefined : { ...fallback, source: "default" };
  }

  function suggestions(): Suggestion[] {
    return [...store.suggestions.entries()].map(([, suggestion]) => suggestion);
  }

  function episodeIndex(): Map<string, Episode> {
    const index = new Map<string, Episode>();
    for (const [, record] of store.sessions.entries()) {
      for (const episode of record.episodes) index.set(episode.id, episode);
    }
    return index;
  }

  /** 候选证据所在的会话，较新的在前。 */
  function sessionsOf(candidate: Candidate): string[] {
    const index = episodeIndex();
    const episodes = candidate.episodeIds.flatMap((id) => {
      const episode = index.get(id);
      return episode === undefined ? [] : [episode];
    });
    return [...new Set(episodes.toSorted((a, b) => b.endedAt - a.endedAt).map((e) => e.sessionId))];
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

  async function save(suggestion: Suggestion): Promise<void> {
    await store.suggestions.put(recordKey(suggestion.id), suggestion);
  }

  function find(id: string): Suggestion {
    const suggestion = store.suggestions.get(recordKey(id));
    if (suggestion === undefined) throw actionError("missing", `没有这条建议：${id}`);
    return suggestion;
  }

  /** 读取并提取一个会话；日志没有变化时跳过。 */
  async function analyzeSession(sessionId: string): Promise<boolean> {
    const settings = deps.settings();
    const log = await deps.query.readSession(sessionId);
    if (log.session.origin === "subagent") return false;
    const key = recordKey(sessionId);
    if (store.sessions.get(key)?.eventCount === log.events.length) return false;
    const episodes = episodesOfLog(log, {
      redact: redactor(settings),
      keepOutput: settings.readOutput,
    });
    await store.sessions.put(key, {
      sessionId,
      cwd: log.session.cwd ?? null,
      createdAt: log.session.createdAt,
      eventCount: log.events.length,
      scannedAt: deps.now(),
      episodes,
    });
    return true;
  }

  /**
   * 删除历史范围之外的会话记录，以及昨天以前的用量记录（复核间隔要看昨天的最后一次），存储不随时间增长。
   * 仍待处理（未复核、复核中、可以保存、复核失败）的建议引用的会话保留，证据不会丢失。
   */
  async function prune(since: number): Promise<void> {
    const cited = new Set(
      suggestions()
        .filter(
          (suggestion) =>
            suggestion.state !== "written" &&
            suggestion.state !== "dismissed" &&
            suggestion.state !== "skipped",
        )
        .flatMap((suggestion) => suggestion.candidate.episodeIds),
    );
    const stale = [...store.sessions.entries()].filter(
      ([, record]) =>
        Math.max(record.createdAt, ...record.episodes.map((episode) => episode.endedAt)) < since &&
        !record.episodes.some((episode) => cited.has(episode.id)),
    );
    const kept = new Set([dayKey(deps.now()), dayKey(deps.now() - DAY)]);
    const usage = [...store.usage.entries()].filter(([key]) => !kept.has(key));
    await Promise.all([
      ...stale.map(([key]) => store.sessions.delete(key)),
      ...usage.map(([key]) => store.usage.delete(key)),
    ]);
  }

  /** 在历史范围内的全部 Episode 上运行检测，把候选合并进建议，再修剪过期记录。 */
  async function detect(): Promise<void> {
    const settings = deps.settings();
    const now = deps.now();
    const since = now - settings.historyDays * DAY;
    const episodes = [...store.sessions.entries()]
      .flatMap(([, record]) => record.episodes)
      .filter((episode) => episode.endedAt >= since);
    const candidates = detectCandidates(episodes, { minOccurrences: settings.minOccurrences });
    const known = suggestions();
    const claimed = new Set<string>();
    for (const candidate of candidates) {
      const match =
        known.find((suggestion) => suggestion.id === candidate.id) ??
        known.find(
          (suggestion) => !claimed.has(suggestion.id) && sameSuggestion(candidate, suggestion),
        );
      if (match !== undefined) {
        claimed.add(match.id);
        const next = refreshed(match, candidate, now);
        // oxlint-disable-next-line no-await-in-loop -- 逐条写入，写入失败时停在出错的那条。
        if (next !== null) await save(next);
        continue;
      }
      if (known.some((suggestion) => covered(candidate, suggestion))) continue;
      const created: Suggestion = {
        id: candidate.id,
        candidate,
        state: "detected",
        detectedAt: now,
        updatedAt: now,
        reviewedSize: 0,
        review: null,
        failure: null,
        write: null,
        dismissed: null,
      };
      known.push(created);
      claimed.add(created.id);
      // oxlint-disable-next-line no-await-in-loop -- 同上。
      await save(created);
    }
    await prune(since);
  }

  /** 分析一个会话并更新建议，然后看是否有到期的复核。 */
  function analyze(sessionId: string): Promise<void> {
    return serial(`analyzing session ${sessionId}`, async () => {
      if (!lead || !deps.settings().discovery) return;
      scanning += 1;
      try {
        if (await analyzeSession(sessionId)) await detect();
      } finally {
        scanning -= 1;
      }
      pump();
    });
  }

  /**
   * 启动时读取历史范围内尚未分析过的会话。
   * @returns 读取完成后兑现；单个会话读取失败只记录日志。
   */
  function backfill(): Promise<void> {
    return serial("reading past sessions", async () => {
      const settings = deps.settings();
      if (!lead || !settings.discovery) return;
      scanning += 1;
      try {
        const since = deps.now() - settings.historyDays * DAY;
        const records = await deps.query.listSessions(deps.signal);
        const pending = records
          .filter(
            ({ header }) =>
              header.origin !== "subagent" &&
              header.createdAt >= since &&
              store.sessions.get(recordKey(header.id)) === undefined,
          )
          .slice(0, settings.maxSessions);
        // 逐个读取：每个会话的日志可能很大，串行读取把内存占用限制在一个会话。
        for (const { header } of pending) {
          if (deps.signal.aborted) return;
          try {
            // oxlint-disable-next-line no-await-in-loop -- 见上。
            await analyzeSession(header.id);
          } catch (error) {
            report(`reading session ${header.id}`, error);
          }
          // 让出事件循环，避免长时间占用 Host。
          // oxlint-disable-next-line no-await-in-loop -- 见上。
          await sleep(0);
        }
        await detect();
      } finally {
        scanning -= 1;
      }
      pump();
    });
  }

  /** 一个会话的回合结束后，等它安静一段时间再分析；期间再有回合结束就重新计时。 */
  function noteTurnEnd(sessionId: string): void {
    const settings = deps.settings();
    if (!lead || !settings.discovery || deps.signal.aborted) return;
    const existing = timers.get(sessionId);
    if (existing !== undefined) clearTimeout(existing);
    const timer = setTimeout(() => {
      timers.delete(sessionId);
      void analyze(sessionId);
    }, settings.quietPeriod * MINUTE);
    timer.unref();
    timers.set(sessionId, timer);
  }

  function lastReviewAt(now: number): number | null {
    const times = [dayKey(now), dayKey(now - DAY)].flatMap((day) => {
      const usage = store.usage.get(day);
      return usage === undefined ? [] : [usage.lastAt];
    });
    return times.length === 0 ? null : Math.max(...times);
  }

  async function recordUsage(
    inputTokens: number,
    outputTokens: number,
    failed: boolean,
  ): Promise<void> {
    const now = deps.now();
    const day = dayKey(now);
    const usage = store.usage.get(day) ?? {
      reviews: 0,
      failures: 0,
      inputTokens: 0,
      outputTokens: 0,
      lastAt: 0,
    };
    await store.usage.put(day, {
      reviews: usage.reviews + 1,
      failures: usage.failures + (failed ? 1 : 0),
      inputTokens: usage.inputTokens + inputTokens,
      outputTokens: usage.outputTokens + outputTokens,
      lastAt: now,
    });
  }

  /** 复核一条建议：组装证据、请求模型、校验结论。 */
  async function review(
    suggestion: Suggestion,
    target: ReviewRoute,
    onCalled: () => void,
  ): Promise<{ readonly record: ReviewRecord }> {
    const settings = deps.settings();
    const index = episodeIndex();
    const episodes = suggestion.candidate.episodeIds.flatMap((id) => {
      const episode = index.get(id);
      return episode === undefined ? [] : [episode];
    });
    if (episodes.length === 0) throw reviewError("evidence", "证据任务已不在分析记录里");
    const catalog = await catalogOf(suggestion.candidate);
    if (catalog === null) throw reviewError("evidence", "证据会话都已删除，读不到它们可用的 Skill");
    const related = await relatedSkills(
      suggestion.candidate,
      episodes,
      catalog,
      redactor(settings),
    );
    const pack = buildEvidence(suggestion.candidate, episodes, related, settings.evidenceBudget);
    const signal = AbortSignal.any([deps.signal, AbortSignal.timeout(settings.timeout * 1000)]);
    onCalled();
    const completion = await complete(
      deps.llm,
      target,
      systemPrompt(settings.prompt),
      pack.text,
      REVIEW_MAX_TOKENS,
      signal,
    );
    const checked = checkReview(completion.text, pack, new Set(catalog.map((skill) => skill.name)));
    return {
      record: {
        at: deps.now(),
        provider: target.provider,
        model: target.model,
        inputTokens: completion.inputTokens,
        outputTokens: completion.outputTokens,
        cautions: [...checked.cautions],
        verdict: checked.review,
      },
    };
  }

  /** 运行一次复核并保存结果；失败记录在建议上。从不拒绝。 */
  async function runReview(id: string, target: ReviewRoute): Promise<void> {
    let called = false;
    let tokensUsed = { input: 0, output: 0 };
    try {
      const suggestion = find(id);
      try {
        const { record } = await review(suggestion, target, () => {
          called = true;
        });
        tokensUsed = { input: record.inputTokens, output: record.outputTokens };
        const current = find(id);
        // 复核期间被忽略的建议保持忽略；结论照样记下，恢复时据此回到对应状态。
        const reviewed = record.verdict.decision === "skip" ? "skipped" : "ready";
        await save({
          ...current,
          state: current.state === "dismissed" ? "dismissed" : reviewed,
          updatedAt: deps.now(),
          reviewedSize: current.candidate.episodeIds.length,
          review: record,
          failure: null,
        });
        lastError = null;
        if (called) await recordUsage(tokensUsed.input, tokensUsed.output, false);
      } catch (error) {
        if (deps.signal.aborted) return;
        const failure = failureOf(
          error instanceof Error ? error : new Error(String(error)),
          suggestion.failure,
          deps.now(),
        );
        const current = find(id);
        await save({
          ...current,
          state: current.state === "dismissed" ? "dismissed" : "failed",
          updatedAt: deps.now(),
          failure,
        });
        lastError = { kind: failure.kind, message: failure.message, at: failure.at };
        deps.logger.warn("skill-scout: review of %s failed: %s", id, failure.message);
        if (called) await recordUsage(0, 0, true);
      }
    } catch (error) {
      report(`review of ${id}`, error);
    } finally {
      reviewing = null;
    }
  }

  /** 在后台开始一次复核；同一时间只有一次。 */
  function startReview(id: string, target: ReviewRoute): void {
    reviewing = id;
    active = runReview(id, target).finally(() => {
      active = null;
    });
  }

  /** 到期可以自动复核的建议，按分数从高到低。 */
  function due(now: number): Suggestion[] {
    return suggestions()
      .filter((suggestion) => {
        if (suggestion.state === "detected") return true;
        if (suggestion.state !== "failed" || suggestion.failure === null) return false;
        const at = retryAt(suggestion.failure);
        return at !== null && now >= at;
      })
      .toSorted((a, b) => b.candidate.score - a.candidate.score || a.detectedAt - b.detectedAt);
  }

  /** 在限额内启动下一次后台复核。 */
  function pump(): void {
    if (!lead || reviewing !== null || deps.signal.aborted) return;
    const settings = deps.settings();
    // 关闭会话分析或后台复核后，不再发出任何后台模型请求。
    if (!settings.discovery || !settings.review) return;
    const now = deps.now();
    if ((store.usage.get(dayKey(now))?.reviews ?? 0) >= settings.dailyReviews) return;
    const last = lastReviewAt(now);
    if (last !== null && now - last < settings.reviewInterval * MINUTE) return;
    const next = due(now)[0];
    if (next === undefined) return;
    const target = route();
    if (target === undefined) {
      lastError = { kind: "no-model", message: "没有可用的复核模型", at: now };
      return;
    }
    startReview(next.id, target);
  }

  /** 用户手动请求复核：不受后台开关与限额约束，但同一时间只复核一条。 */
  function analyzeNow(id: string): void {
    const suggestion = find(id);
    if (reviewing !== null) throw actionError("busy", "正在复核另一条建议");
    if (suggestion.state === "written" || suggestion.state === "dismissed") {
      throw actionError("invalid", "这条建议已经处理过");
    }
    const target = route();
    if (target === undefined) throw actionError("no-model", "没有可用的复核模型");
    startReview(id, target);
  }

  async function dismiss(id: string, similar: boolean): Promise<void> {
    const suggestion = find(id);
    if (suggestion.state === "written") throw actionError("invalid", "已写入的建议需要先撤销");
    const now = deps.now();
    await save({
      ...suggestion,
      state: "dismissed",
      updatedAt: now,
      dismissed: { at: now, similar },
    });
  }

  async function restore(id: string): Promise<void> {
    const suggestion = find(id);
    if (suggestion.state !== "dismissed") throw actionError("invalid", "这条建议没有被忽略");
    const verdict = suggestion.review?.verdict.decision;
    const state = verdict === undefined ? "detected" : verdict === "skip" ? "skipped" : "ready";
    await save({ ...suggestion, state, updatedAt: deps.now(), dismissed: null });
  }

  /** 生成写入预览；不触碰文件系统以外的状态。 */
  async function preview(id: string, input: WriteInput): Promise<Preview> {
    const suggestion = find(id);
    const verdict = suggestion.review?.verdict;
    const cwd = suggestion.candidate.cwd;
    if (verdict?.decision === "suggest_create") {
      const fields = input.fields ?? fieldsOfDraft(verdict.skill, verdict.title);
      const scope = input.scope ?? deps.settings().scope;
      const path = await newSkillPath(scope, fields.name, cwd).catch((error: Error) => {
        throw isWriteError(error) ? actionError("invalid", error.message) : error;
      });
      const content = renderSkillFile(fields, suggestion.id, dayKey(deps.now()));
      return {
        kind: "create",
        scope,
        path,
        content,
        exists: (await readOptional(path)) !== null,
        fields,
      };
    }
    if (verdict?.decision === "suggest_improve") {
      const name = verdict.improve.skill;
      const skill = (await catalogOf(suggestion.candidate))?.find((entry) => entry.name === name);
      const section = input.section ?? renderImprovement(verdict.title, verdict.improve.notes);
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
    throw actionError("invalid", "这条建议还没有可写入的草稿");
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
   * 建议被撤销或改写到别处时停止。
   */
  function recheck(id: string, attempt = 1): void {
    if (deps.signal.aborted) return;
    const timer = setTimeout(() => {
      rechecks.delete(id);
      const suggestion = store.suggestions.get(recordKey(id));
      const record = suggestion?.write;
      if (suggestion?.state !== "written" || record === null || record === undefined) return;
      listed(suggestion.candidate, record.skill, record.path)
        .then(async (found) => {
          if (deps.signal.aborted) return;
          if (!found) {
            if (attempt < RECHECKS) recheck(id, attempt + 1);
            return;
          }
          const latest = store.suggestions.get(recordKey(id));
          if (latest?.state !== "written" || latest.write?.path !== record.path) return;
          await save({ ...latest, write: { ...latest.write, discovered: true } });
        })
        .catch((error: unknown) => report(`checking that DSH lists ${record.skill}`, error));
    }, RECHECK_INTERVAL);
    timer.unref();
    rechecks.set(id, timer);
  }

  /** 写入 Skill 文件，并核对 DSH 能发现它。 */
  async function write(id: string, input: WriteInput): Promise<void> {
    const suggestion = find(id);
    if (suggestion.state !== "ready") throw actionError("invalid", "只有待处理的建议可以写入");
    const plan = await preview(id, input);
    const cwd = suggestion.candidate.cwd;
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
    record = {
      ...record,
      discovered: await discovered(suggestion.candidate, record.skill, record.path),
    };
    try {
      await save({ ...find(id), state: "written", updatedAt: deps.now(), write: record });
    } catch (error) {
      // 记录没存下来就无法撤销：把文件恢复到写入之前，再报告保存失败。
      await undoSkillWrite(record);
      throw error;
    }
    if (!record.discovered) recheck(id);
  }

  /** 撤销写入，建议回到待处理。 */
  async function undo(id: string): Promise<void> {
    const suggestion = find(id);
    if (suggestion.state !== "written" || suggestion.write === null) {
      throw actionError("invalid", "这条建议没有写入记录");
    }
    try {
      await undoSkillWrite(suggestion.write);
    } catch (error) {
      if (error instanceof Error && isWriteError(error))
        throw actionError(error.kind, error.message);
      throw error;
    }
    clearTimeout(rechecks.get(id));
    rechecks.delete(id);
    await save({ ...find(id), state: "ready", updatedAt: deps.now(), write: null });
  }

  return {
    /** 设置本进程是否持有工作锁。 */
    setLead(value: boolean): void {
      lead = value;
    },
    noteTurnEnd,
    analyze,
    backfill,
    detect: () => serial("detecting candidates", detect),
    pump,
    analyzeNow,
    dismiss,
    restore,
    preview,
    write,
    undo,
    route,
    /** 等待已排队的分析与正在进行的复核结束；测试与卸载时使用。 */
    async idle(): Promise<void> {
      await chain;
      await active;
    },
    runtime() {
      return {
        lead,
        scanning: scanning > 0,
        waiting: timers.size,
        checking: [...rechecks.keys()],
        reviewing,
        lastError,
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
