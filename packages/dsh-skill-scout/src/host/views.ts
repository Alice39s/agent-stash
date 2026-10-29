/**
 * 把存储里的建议转换成浏览器视图。视图只包含已脱敏的文本。
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
  SessionRef,
  StatusView,
} from "../shared.ts";
import type { Settings } from "./config.ts";
import type { Episode, Op } from "./model.ts";
import { proposalOf, type ModelRoute, type Working } from "./scout.ts";
import { fieldsOfDraft, renderImprovement } from "./skill-file.ts";
import { dayKey, type ScoutStore, type Suggestion } from "./store.ts";
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

/** 引擎的运行状态。 */
export interface Runtime {
  readonly lead: boolean;
  readonly scanning: boolean;
  /** 回合已结束、正在等静默期过去的会话数。 */
  readonly waiting: number;
  /** 写入后仍在核对 DSH 能否发现的建议。 */
  readonly checking: readonly string[];
  /** 正在进行的模型调用。 */
  readonly working: Working;
  readonly lastError: {
    readonly kind: string;
    readonly message: string;
    readonly at: number;
  } | null;
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

/** 正在进行的模型调用决定界面状态，其余与存储一致。 */
function stateOf(suggestion: Suggestion, working: Working): ItemState {
  const stage = working.get(suggestion.id);
  if (stage === "summary") return "summarizing";
  if (stage === "draft") return "drafting";
  return suggestion.state;
}

function itemOf(
  suggestion: Suggestion,
  index: ReadonlyMap<string, Episode>,
  runtime: Runtime,
): ItemView {
  const summary = suggestion.summary?.summary;
  const proposal = proposalOf(suggestion);
  const sessions: SessionRef[] = suggestion.candidate.episodeIds.flatMap((id) => {
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
    id: suggestion.id,
    kind: suggestion.candidate.kind,
    state: stateOf(suggestion, runtime.working),
    title: proposal?.title ?? null,
    goal: suggestion.candidate.goal,
    steps: suggestion.candidate.steps,
    found: proposal?.found ?? null,
    description: proposal?.description ?? null,
    trigger: proposal?.trigger ?? null,
    outline: proposal?.outline ?? [],
    risks: proposal?.risks ?? [],
    verification: proposal?.verification ?? null,
    reason: summary?.decision === "skip" ? summary.reason : null,
    occurrences: suggestion.candidate.occurrences,
    sessions,
    score: suggestion.candidate.score,
    detectedAt: suggestion.detectedAt,
    updatedAt: suggestion.updatedAt,
    decision: summary?.decision ?? null,
    skill: proposal?.skill ?? null,
    cautions: suggestion.draft?.cautions ?? [],
    failure: suggestion.failure,
    write:
      suggestion.write === null
        ? null
        : {
            at: suggestion.write.at,
            scope: suggestion.write.scope,
            skill: suggestion.write.skill,
            path: displayPath(suggestion.write.path),
            discovered: suggestion.write.discovered,
            checking: runtime.checking.includes(suggestion.id),
          },
    dismissedSimilar: suggestion.dismissed?.similar === true,
  };
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
  const items = [...store.suggestions.entries()]
    .map(([, suggestion]) => itemOf(suggestion, index, runtime))
    .toSorted((a, b) => ORDER[a.state] - ORDER[b.state] || b.updatedAt - a.updatedAt);
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
      outputTokens: usage?.outputTokens ?? 0,
    },
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

/** 摘要与草稿引用过的证据编号。 */
function citedRefs(suggestion: Suggestion): Set<string> {
  const draft = suggestion.draft?.draft;
  const steps = draft === undefined ? [] : draft.kind === "create" ? draft.steps : draft.notes;
  return new Set([
    ...(suggestion.summary?.summary.refs ?? []),
    ...steps.flatMap((step) => step.refs),
  ]);
}

/**
 * 组装一条建议的详情：证据任务、摘要与草稿。
 * @param store - 插件存储。
 * @param suggestion - 建议。
 * @param runtime - 引擎运行状态。
 */
export function detailView(
  store: ScoutStore,
  suggestion: Suggestion,
  runtime: Runtime,
): DetailView {
  const index = episodeIndex(store);
  const cited = citedRefs(suggestion);
  // 编号与证据包一致：按候选里的顺序给仍在记录里的任务编号。
  const present = suggestion.candidate.episodeIds.flatMap((id) => {
    const episode = index.get(id);
    return episode === undefined ? [] : [episode];
  });
  const episodes: EvidenceEpisode[] = present.map((episode, position) => {
    const ref = `E${String(position + 1)}`;
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
  const proposal = proposalOf(suggestion);
  const draft = suggestion.draft?.draft;
  return {
    item: itemOf(suggestion, index, runtime),
    episodes,
    summary: callView(suggestion.summary),
    draftCall: callView(suggestion.draft),
    draft:
      proposal !== null && draft?.kind === "create"
        ? fieldsOfDraft({ name: proposal.skill, title: proposal.title, draft })
        : null,
    section:
      proposal !== null && draft?.kind === "improve"
        ? renderImprovement(proposal.title, draft.notes)
        : null,
  };
}
