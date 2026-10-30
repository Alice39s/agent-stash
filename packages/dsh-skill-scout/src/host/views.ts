/**
 * 把存储里的线索、idea、会话、用量与调用记录转换成浏览器视图。视图只包含已脱敏的文本。
 */
import type {
  CallView,
  DetailView,
  EvidenceEpisode,
  EvidenceOp,
  InboxView,
  ItemState,
  ItemView,
  ModelView,
  SearchView,
  SessionRef,
  SessionView,
  StatsView,
  StatusView,
  TaskView,
} from "../shared.ts";
import { isOpaque } from "./commands.ts";
import type { Settings } from "./config.ts";
import { errorSignature } from "./episodes.ts";
import type { Episode, Op } from "./model.ts";
import type { BackfillStatus, ModelRoute, Presence, Working } from "./scout.ts";
import type { SearchResult } from "./search.ts";
import { isRoutine, procedureOf } from "./signals.ts";
import { fieldsOfDraft, renderImprovement } from "./skill-file.ts";
import {
  dayKey,
  ideaId,
  proposalsOf,
  recentDays,
  recordKey,
  splitIdeaId,
  type IdeaRecord,
  type Lead,
  type ScoutStore,
  type SessionRecord,
} from "./store.ts";
import { displayPath } from "./writer.ts";

/** 收件箱里各状态的排列顺序。 */
const ORDER: Readonly<Record<ItemState, number>> = {
  drafting: 0,
  ready: 1,
  proposed: 2,
  summarizing: 3,
  failed: 4,
  detected: 5,
  written: 6,
  skipped: 7,
  dismissed: 8,
};

/** 任务概要里列出的步骤数。 */
const TASK_STEPS = 6;
/** 统计里列出的高频动作数与反复出现的错误数；错误至少要在这么多个会话里出现。 */
const TOP_ACTIONS = 12;
const TOP_ERRORS = 8;
const ERROR_SESSIONS = 2;
/** 统计里的用量天数。 */
const USAGE_DAYS = 7;
/** 统计里按天分的任务与线索的天数。 */
const DAILY_DAYS = 30;
/** 统计里高频动作按周分的周数；一周是从 now 往回的 7 天。 */
const ACTION_WEEKS = 8;
const WEEK = 7 * 24 * 60 * 60 * 1000;

/** 引擎的运行状态。 */
export interface Runtime {
  readonly lead: boolean;
  readonly scanning: boolean;
  /** 回合已结束、正在等静默期过去的会话数。 */
  readonly waiting: number;
  /** 写入后仍在核对 DSH 能否发现的 idea。 */
  readonly checking: readonly string[];
  /** 正在进行的模型请求。 */
  readonly working: Working;
  readonly lastError: {
    readonly kind: string;
    readonly message: string;
    readonly at: number;
  } | null;
  readonly backfill: BackfillStatus | null;
}

/** 两个阶段此刻使用的模型。 */
export interface Routes {
  readonly summary?: ModelRoute | undefined;
  readonly draft?: ModelRoute | undefined;
}

function episodeIndex(store: ScoutStore): Map<string, Episode> {
  const index = new Map<string, Episode>();
  for (const [, record] of store.sessions.entries()) {
    for (const episode of record.episodes) index.set(episode.id, episode);
  }
  return index;
}

function leadsOf(store: ScoutStore): Lead[] {
  return [...store.suggestions.entries()].map(([, lead]) => lead);
}

/** 线索卡片的状态：正在摘要时为 summarizing，其余与存储一致。 */
function leadState(lead: Lead, working: Working): ItemState {
  if (working.get(lead.id)?.stage === "summary") return "summarizing";
  return lead.state === "summarized" ? "proposed" : lead.state;
}

/** idea 卡片的状态：整条线索被忽略时为 dismissed，正在写草稿时为 drafting，其余与存储一致。 */
function ideaState(lead: Lead, position: number, idea: IdeaRecord, working: Working): ItemState {
  if (lead.state === "dismissed") return "dismissed";
  if (working.get(ideaId(lead.id, position))?.stage === "draft") return "drafting";
  return idea.state;
}

/** 线索只出一张卡片：还没有 idea、整条线索被忽略，或正在重新摘要。 */
function collapsed(lead: Lead, working: Working): boolean {
  return (
    lead.ideas.length === 0 ||
    lead.state === "dismissed" ||
    working.get(lead.id)?.stage === "summary"
  );
}

/** 线索卡片与 idea 卡片共有的字段：线索的来源与证据。 */
function leadFields(lead: Lead, index: ReadonlyMap<string, Episode>) {
  const sessions: SessionRef[] = lead.candidate.episodeIds.flatMap((id) => {
    const episode = index.get(id);
    return episode === undefined
      ? []
      : [
          {
            sessionId: episode.sessionId,
            episodeId: episode.id,
            at: episode.endedAt,
            goal: episode.goal,
            outcome: episode.outcome,
          },
        ];
  });
  return {
    leadId: lead.id,
    ideaCount: lead.ideas.length,
    merged: 0,
    kind: lead.candidate.kind,
    goal: lead.candidate.goal,
    steps: lead.candidate.steps,
    occurrences: lead.candidate.occurrences,
    sessions,
    score: lead.candidate.score,
    detectedAt: lead.detectedAt,
  };
}

/** 代表整条线索的卡片。 */
function leadItem(lead: Lead, index: ReadonlyMap<string, Episode>, runtime: Runtime): ItemView {
  const summary = lead.summary?.summary;
  return {
    ...leadFields(lead, index),
    id: lead.id,
    ideaIndex: null,
    state: leadState(lead, runtime.working),
    title: null,
    found: null,
    description: null,
    trigger: null,
    outline: [],
    risks: [],
    verification: null,
    reason: summary?.decision === "skip" ? summary.reason : null,
    updatedAt: lead.updatedAt,
    decision: summary?.decision === "skip" ? "skip" : null,
    skill: null,
    cautions: [],
    failure: lead.failure,
    write: null,
    dismissedSimilar: lead.dismissed?.similar === true,
    progress: runtime.working.get(lead.id) ?? null,
  };
}

/** 一个 idea 的卡片。 */
function ideaItem(
  lead: Lead,
  position: number,
  index: ReadonlyMap<string, Episode>,
  runtime: Runtime,
): ItemView {
  const idea = lead.ideas[position];
  const proposal = proposalsOf(lead)[position];
  if (idea === undefined || proposal === undefined) {
    throw new Error(`线索 ${lead.id} 没有第 ${String(position)} 个 idea`);
  }
  const id = ideaId(lead.id, position);
  return {
    ...leadFields(lead, index),
    id,
    ideaIndex: position,
    state: ideaState(lead, position, idea, runtime.working),
    title: proposal.title,
    found: proposal.found,
    description: proposal.description,
    trigger: proposal.trigger,
    outline: proposal.outline,
    risks: proposal.risks,
    verification: proposal.verification,
    reason: null,
    updatedAt: idea.updatedAt,
    decision: proposal.decision,
    skill: proposal.skill,
    cautions: idea.draft?.cautions ?? [],
    failure: idea.failure,
    write:
      idea.write === null
        ? null
        : {
            at: idea.write.at,
            scope: idea.write.scope,
            skill: idea.write.skill,
            path: displayPath(idea.write.path),
            discovered: idea.write.discovered,
            checking: runtime.checking.includes(id),
          },
    dismissedSimilar:
      idea.dismissed?.similar === true ||
      (lead.state === "dismissed" && lead.dismissed?.similar === true),
    progress: runtime.working.get(id) ?? null,
  };
}

/** 一张卡片与去重需要的信息。 */
interface Card {
  readonly view: ItemView;
  /** 未结束的 idea 的 Skill 名称；线索卡片与已结束的 idea 为 null，不参与去重。 */
  readonly skill: string | null;
  /** 卡片出现的时间：idea 是摘要的时间，线索是检测到的时间。 */
  readonly since: number;
}

function cardsOf(lead: Lead, index: ReadonlyMap<string, Episode>, runtime: Runtime): Card[] {
  if (collapsed(lead, runtime.working)) {
    return [{ view: leadItem(lead, index, runtime), skill: null, since: lead.detectedAt }];
  }
  const since = lead.summary?.at ?? lead.detectedAt;
  return lead.ideas.map((_, position) => {
    const view = ideaItem(lead, position, index, runtime);
    const open = view.state !== "dismissed" && view.state !== "written";
    return { view, skill: open ? view.skill : null, since };
  });
}

/** 不同线索里同名、未结束的 idea 只保留最早出现的一张，其余计入它的 merged。 */
function merge(cards: readonly Card[]): ItemView[] {
  const views: ItemView[] = [];
  const first = new Map<string, number>();
  const ordered = cards.toSorted(
    (a, b) =>
      a.since - b.since ||
      a.view.detectedAt - b.view.detectedAt ||
      (a.view.id < b.view.id ? -1 : 1),
  );
  for (const card of ordered) {
    const at = card.skill === null ? undefined : first.get(card.skill);
    const kept = at === undefined ? undefined : views[at];
    if (at !== undefined && kept !== undefined) {
      views[at] = { ...kept, merged: kept.merged + 1 };
      continue;
    }
    if (card.skill !== null) first.set(card.skill, views.length);
    views.push(card.view);
  }
  return views;
}

function modelView(route: ModelRoute | undefined): ModelView {
  return route === undefined
    ? null
    : {
        provider: route.provider,
        model: route.model,
        effort: route.reasoningEffort ?? null,
        source: route.source,
      };
}

/**
 * 组装收件箱视图。
 * @param store - 插件存储。
 * @param settings - 当前设置。
 * @param routes - 两个阶段此刻使用的模型。
 * @param runtime - 引擎运行状态。
 * @param now - 当前时间。
 */
export function inboxView(
  store: ScoutStore,
  settings: Settings,
  routes: Routes,
  runtime: Runtime,
  now: number,
): InboxView {
  const index = episodeIndex(store);
  const items = merge(leadsOf(store).flatMap((lead) => cardsOf(lead, index, runtime))).toSorted(
    (a, b) => ORDER[a.state] - ORDER[b.state] || b.updatedAt - a.updatedAt,
  );
  const usage = store.usage.get(dayKey(now));
  let sessions = 0;
  for (const _ of store.sessions.entries()) sessions += 1;
  const status: StatusView = {
    discovery: settings.discovery,
    summarize: settings.summarize,
    notify: settings.notify,
    scope: settings.scope,
    models: { summary: modelView(routes.summary), draft: modelView(routes.draft) },
    lead: runtime.lead,
    scanning: runtime.scanning,
    waiting: runtime.waiting,
    working: runtime.working.size,
    usage: {
      summaries: usage?.summaries ?? 0,
      limit: settings.dailySummaries,
      requested: usage?.requested ?? 0,
      inputTokens: usage?.inputTokens ?? 0,
      cacheReadTokens: usage?.cacheReadTokens ?? 0,
      cacheWriteTokens: usage?.cacheWriteTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
    },
    backfill: runtime.backfill,
    lastError: runtime.lastError,
    analyzed: { sessions, episodes: index.size },
  };
  return { status, items };
}

function roleOf(op: Op, episode: Episode): EvidenceOp["role"] {
  for (const recovery of episode.recoveries) {
    if (recovery.failSeq === op.seq) return "failure";
    if (recovery.okSeq === op.seq) return "recovered";
    if (recovery.fixSeqs.includes(op.seq)) return "fix";
  }
  return episode.evidence.includes(op.seq) ? "verify" : null;
}

function labelOf(op: Op): string {
  if (op.kind === "edit") return op.target ?? op.sig;
  return op.command ?? op.sig;
}

function callView(
  call: {
    readonly provider: string;
    readonly model: string;
    readonly at: number;
    readonly inputTokens: number;
    readonly outputTokens: number;
  } | null,
): CallView {
  return call === null
    ? null
    : {
        provider: call.provider,
        model: call.model,
        at: call.at,
        inputTokens: call.inputTokens,
        outputTokens: call.outputTokens,
      };
}

/** 卡片引用过的证据编号：idea 是它的方案与草稿，线索是摘要里的全部引用。 */
function citedRefs(lead: Lead, position: number | null): Set<string> {
  const summary = lead.summary?.summary;
  if (position === null) {
    if (summary === undefined) return new Set();
    return new Set(
      summary.decision === "skip" ? summary.refs : summary.ideas.flatMap((idea) => idea.refs),
    );
  }
  const draft = lead.ideas[position]?.draft?.draft;
  const steps = draft === undefined ? [] : draft.kind === "create" ? draft.steps : draft.notes;
  return new Set([
    ...(proposalsOf(lead)[position]?.refs ?? []),
    ...steps.flatMap((step) => step.refs),
  ]);
}

/**
 * 找到一张卡片：idea id 是那个 idea；线索 id 在线索已有可显示的 idea 时是第一个 idea，否则是线索本身。
 */
function locateItem(
  store: ScoutStore,
  id: string,
  working: Working,
): { readonly lead: Lead; readonly position: number | null } | undefined {
  const direct = store.suggestions.get(recordKey(id));
  if (direct !== undefined) {
    return { lead: direct, position: collapsed(direct, working) ? null : 0 };
  }
  const parts = splitIdeaId(id);
  const owner = parts === null ? undefined : store.suggestions.get(recordKey(parts.leadId));
  if (parts === null || owner?.ideas[parts.index] === undefined) return undefined;
  return { lead: owner, position: parts.index };
}

/**
 * 组装一张卡片的详情：证据任务、摘要与草稿，以及同一线索的全部 idea。
 * @param store - 插件存储。
 * @param id - 线索 id 或 idea id。
 * @param runtime - 引擎运行状态。
 * @returns 找不到时为 undefined。
 */
export function detailView(
  store: ScoutStore,
  id: string,
  runtime: Runtime,
): DetailView | undefined {
  const located = locateItem(store, id, runtime.working);
  if (located === undefined) return undefined;
  const { lead, position } = located;
  const index = episodeIndex(store);
  const cited = citedRefs(lead, position);
  // 编号与证据包一致：按候选里的顺序给仍在记录里的任务编号。
  const present = lead.candidate.episodeIds.flatMap((episodeId) => {
    const episode = index.get(episodeId);
    return episode === undefined ? [] : [episode];
  });
  const episodes: EvidenceEpisode[] = present.map((episode, at) => {
    const ref = `E${String(at + 1)}`;
    return {
      ref,
      episodeId: episode.id,
      sessionId: episode.sessionId,
      at: episode.endedAt,
      cwd: episode.cwd === null ? null : displayPath(episode.cwd),
      goal: episode.goal,
      outcome: episode.outcome,
      reads: episode.counts.read,
      ops: episode.ops.map((op) => {
        const opRef = `${ref}.${String(op.seq)}`;
        return {
          ref: opRef,
          kind: op.kind,
          label: labelOf(op),
          ok: op.ok,
          exit: op.exit,
          error: op.error,
          role: roleOf(op, episode),
          cited: cited.has(opRef),
        };
      }),
      reply: episode.reply,
      steering: episode.steering,
      followup: episode.followup,
    };
  });
  const proposals = proposalsOf(lead);
  const proposal = position === null ? undefined : proposals[position];
  const idea = position === null ? undefined : lead.ideas[position];
  const draft = idea?.draft?.draft;
  return {
    item:
      position === null ? leadItem(lead, index, runtime) : ideaItem(lead, position, index, runtime),
    siblings:
      position === null
        ? []
        : lead.ideas.flatMap((entry, at) => {
            const sibling = proposals[at];
            return sibling === undefined
              ? []
              : [
                  {
                    id: ideaId(lead.id, at),
                    title: sibling.title,
                    state: ideaState(lead, at, entry, runtime.working),
                  },
                ];
          }),
    episodes,
    summary: callView(lead.summary),
    draftCall: callView(idea?.draft ?? null),
    draft:
      proposal !== undefined && draft?.kind === "create"
        ? fieldsOfDraft({ name: proposal.skill, title: proposal.title, draft })
        : null,
    section:
      proposal !== undefined && draft?.kind === "improve"
        ? renderImprovement(proposal.title, draft.notes)
        : null,
  };
}

/** 任务的前几步：非查看类命令的签名与改动的文件，按出现顺序去重。 */
function taskSteps(episode: Episode): string[] {
  const steps = new Set<string>();
  for (const op of episode.ops) {
    if (op.kind === "exec" && op.family !== "inspect") {
      for (const part of op.parts) steps.add(part.sig);
    } else if (op.kind === "edit") {
      steps.add(op.target ?? op.sig);
    }
  }
  return [...steps].slice(0, TASK_STEPS);
}

/**
 * 一个任务的概要。
 * @param matches - 搜索命中的片段；不是搜索结果时为空。
 */
export function taskView(episode: Episode, matches: readonly string[]): TaskView {
  return {
    episodeId: episode.id,
    sessionId: episode.sessionId,
    at: episode.endedAt,
    cwd: episode.cwd === null ? null : displayPath(episode.cwd),
    goal: episode.goal,
    outcome: episode.outcome,
    commands: episode.counts.exec,
    edits: episode.counts.edit,
    recoveries: episode.recoveries.length,
    steps: taskSteps(episode),
    matches: [...matches],
  };
}

/**
 * 一个会话的分析情况与任务列表，任务按会话里的顺序。
 * @param state - 分析记录、是否在等静默期，以及会话在 DSH 里的情况。
 */
export function sessionView(
  sessionId: string,
  state: {
    readonly record: SessionRecord | undefined;
    readonly waiting: boolean;
    readonly presence: Presence;
  },
): SessionView {
  const { record } = state;
  const status: SessionView["state"] =
    record !== undefined
      ? record.error === null
        ? "analyzed"
        : "failed"
      : state.waiting
        ? "waiting"
        : state.presence === "present"
          ? "pending"
          : state.presence;
  return {
    sessionId,
    state: status,
    scannedAt: record?.scannedAt ?? null,
    error: record?.error ?? null,
    tasks: (record?.episodes ?? [])
      .toSorted((a, b) => a.startSeq - b.startSeq)
      .map((episode) => taskView(episode, [])),
  };
}

/** 搜索结果视图。 */
export function searchView(query: string, result: SearchResult): SearchView {
  return {
    query,
    total: result.total,
    hits: result.hits.map((hit) => taskView(hit.episode, hit.matches)),
    indexed: result.indexed,
  };
}

/**
 * 线索与 idea 各自按存储里的状态计数。整条线索被忽略时，它的 idea 一律计入 dismissed；
 * 其余 idea 按自身状态计数。正在摘要的线索计入 detected；正在生成草稿的 idea 在存储里还是
 * 请求前的状态，照常计数。被合并显示的 idea 各算一条。
 */
function funnelOf(leads: readonly Lead[], working: Working): StatsView["funnel"] {
  const funnel: StatsView["funnel"] = {
    leads: { detected: 0, summarized: 0, skipped: 0, failed: 0, dismissed: 0 },
    ideas: { proposed: 0, ready: 0, failed: 0, written: 0, dismissed: 0 },
  };
  for (const lead of leads) {
    const summarizing = lead.state !== "dismissed" && working.get(lead.id)?.stage === "summary";
    funnel.leads[summarizing ? "detected" : lead.state] += 1;
    for (const idea of lead.ideas) {
      funnel.ideas[lead.state === "dismissed" ? "dismissed" : idea.state] += 1;
    }
  }
  return funnel;
}

/**
 * 一个时间落在近几周的哪一周：从 now 往回每 7 天一段，最早的一段下标为 0；更早的为 null。
 * 晚于 now 的时间算在最近一周。
 */
function weekOf(time: number, now: number): number | null {
  const ago = Math.max(0, Math.floor((now - time) / WEEK));
  return ago < ACTION_WEEKS ? ACTION_WEEKS - 1 - ago : null;
}

/**
 * 跨会话出现最多的动作：日常动作、查看类与说明不了做了什么的动作除外。
 * 每个动作另外按任务结束的时间列出近 8 周每周用到它的会话数。
 */
function frequentActions(episodes: readonly Episode[], now: number): StatsView["actions"] {
  const found = new Map<
    string,
    { sigs: Map<string, number>; sessions: Set<string>; weeks: Set<string>[] }
  >();
  for (const episode of episodes) {
    const week = weekOf(episode.endedAt, now);
    for (const action of procedureOf(episode)) {
      if (isRoutine(action.key) || isOpaque(action.key)) continue;
      const entry = found.get(action.key) ?? {
        sigs: new Map(),
        sessions: new Set(),
        weeks: Array.from({ length: ACTION_WEEKS }, () => new Set<string>()),
      };
      entry.sigs.set(action.sig, (entry.sigs.get(action.sig) ?? 0) + 1);
      entry.sessions.add(episode.sessionId);
      if (week !== null) entry.weeks[week]?.add(episode.sessionId);
      found.set(action.key, entry);
    }
  }
  return [...found.entries()]
    .map(([key, entry]) => ({
      key,
      label: [...entry.sigs.entries()].toSorted((a, b) => b[1] - a[1])[0]?.[0] ?? key,
      sessions: entry.sessions.size,
      weeks: entry.weeks.map((sessions) => sessions.size),
    }))
    .toSorted((a, b) => b.sessions - a.sessions || (a.key < b.key ? -1 : 1))
    .slice(0, TOP_ACTIONS);
}

/** 在多个会话里出现的同一类命令错误。 */
function repeatedErrors(episodes: readonly Episode[]): StatsView["errors"] {
  const found = new Map<string, { example: string; sessions: Set<string> }>();
  for (const episode of episodes) {
    for (const op of episode.ops) {
      if (op.kind !== "exec" || op.ok || op.error === null) continue;
      const signature = errorSignature(op);
      const entry = found.get(signature) ?? { example: op.error, sessions: new Set() };
      entry.sessions.add(episode.sessionId);
      found.set(signature, entry);
    }
  }
  return [...found.entries()]
    .map(([signature, entry]) => ({
      signature,
      example: entry.example,
      sessions: entry.sessions.size,
    }))
    .filter((entry) => entry.sessions >= ERROR_SESSIONS)
    .toSorted((a, b) => b.sessions - a.sessions || (a.signature < b.signature ? -1 : 1))
    .slice(0, TOP_ERRORS);
}

/**
 * 近 30 天每天结束的任务数（按结果分）与新出现的线索数，按本地日期，最早的在前；没有记录的日子各项为 0。
 * @param episodes - 已存的任务，不含重放。
 */
function dailyCounts(
  episodes: readonly Episode[],
  leads: readonly Lead[],
  now: number,
): StatsView["daily"] {
  const days = new Map(
    recentDays(now, DAILY_DAYS).map((day) => [
      day,
      {
        day,
        verified: 0,
        succeeded: 0,
        unverified: 0,
        disputed: 0,
        failed: 0,
        aborted: 0,
        leads: 0,
      },
    ]),
  );
  for (const episode of episodes) {
    const entry = days.get(dayKey(episode.endedAt));
    if (entry !== undefined) entry[episode.outcome] += 1;
  }
  for (const lead of leads) {
    const entry = days.get(dayKey(lead.detectedAt));
    if (entry !== undefined) entry.leads += 1;
  }
  return [...days.values()];
}

/**
 * 组装统计视图。
 * @param store - 插件存储。
 * @param coverage - 历史范围内与全部的会话数。
 * @param working - 正在进行的模型请求。
 * @param now - 当前时间。
 */
export function statsView(
  store: ScoutStore,
  coverage: { readonly inRange: number; readonly total: number },
  working: Working,
  now: number,
): StatsView {
  const records = [...store.sessions.entries()].map(([, record]) => record);
  const episodes = records.flatMap((record) => record.episodes).filter((e) => !e.replay);
  const leads = leadsOf(store);
  return {
    coverage: {
      analyzed: records.filter((record) => record.error === null).length,
      inRange: coverage.inRange,
      total: coverage.total,
      backfilled: records.filter((record) => record.backfilled).length,
      failed: records
        .flatMap((record) =>
          record.error === null
            ? []
            : [{ sessionId: record.sessionId, message: record.error, at: record.scannedAt }],
        )
        .toSorted((a, b) => b.at - a.at),
    },
    funnel: funnelOf(leads, working),
    actions: frequentActions(episodes, now),
    errors: repeatedErrors(episodes),
    daily: dailyCounts(episodes, leads, now),
    usage: recentDays(now, USAGE_DAYS).map((day) => {
      const usage = store.usage.get(day);
      return {
        day,
        summaries: usage?.summaries ?? 0,
        requested: usage?.requested ?? 0,
        failures: usage?.failures ?? 0,
        inputTokens: usage?.inputTokens ?? 0,
        cacheReadTokens: usage?.cacheReadTokens ?? 0,
        cacheWriteTokens: usage?.cacheWriteTokens ?? 0,
        outputTokens: usage?.outputTokens ?? 0,
      };
    }),
    calls: [...store.calls.entries()]
      .map(([, call]) => call)
      .toSorted((a, b) => b.at - a.at)
      .map((call) => ({
        at: call.at,
        stage: call.stage,
        itemId: call.ideaIndex === null ? call.leadId : ideaId(call.leadId, call.ideaIndex),
        title: call.title,
        provider: call.provider,
        model: call.model,
        durationMs: call.durationMs,
        inputTokens: call.inputTokens,
        cacheReadTokens: call.cacheReadTokens,
        cacheWriteTokens: call.cacheWriteTokens,
        outputTokens: call.outputTokens,
        result: call.result,
        detail: call.detail,
      })),
  };
}
