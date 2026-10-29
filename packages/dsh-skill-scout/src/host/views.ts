/**
 * 把存储里的建议转换成浏览器视图。视图只包含已脱敏的文本。
 */
import type {
  DetailView,
  EvidenceEpisode,
  EvidenceOp,
  InboxView,
  ItemState,
  ItemView,
  SessionRef,
  StatusView,
} from "../shared.ts";
import type { Settings } from "./config.ts";
import type { Episode, Op } from "./model.ts";
import type { ReviewRoute } from "./scout.ts";
import { fieldsOfDraft, renderImprovement } from "./skill-file.ts";
import { dayKey, type ScoutStore, type Suggestion } from "./store.ts";
import { displayPath } from "./writer.ts";

/** 收件箱里各状态的排列顺序。 */
const ORDER: Readonly<Record<ItemState, number>> = {
  reviewing: 0,
  ready: 1,
  failed: 2,
  detected: 3,
  written: 4,
  skipped: 5,
  dismissed: 6,
};

/** 引擎的运行状态。 */
export interface Runtime {
  readonly lead: boolean;
  readonly scanning: boolean;
  /** 回合已结束、正在等静默期过去的会话数。 */
  readonly waiting: number;
  /** 写入后仍在核对 DSH 能否发现的建议。 */
  readonly checking: readonly string[];
  readonly reviewing: string | null;
  readonly lastError: {
    readonly kind: string;
    readonly message: string;
    readonly at: number;
  } | null;
}

function episodeIndex(store: ScoutStore): Map<string, Episode> {
  const index = new Map<string, Episode>();
  for (const [, record] of store.sessions.entries()) {
    for (const episode of record.episodes) index.set(episode.id, episode);
  }
  return index;
}

function itemOf(
  suggestion: Suggestion,
  index: ReadonlyMap<string, Episode>,
  runtime: Runtime,
): ItemView {
  const verdict = suggestion.review?.verdict;
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
  const skill =
    verdict?.decision === "suggest_create"
      ? verdict.skill.name
      : verdict?.decision === "suggest_improve"
        ? verdict.improve.skill
        : null;
  return {
    id: suggestion.id,
    kind: suggestion.candidate.kind,
    state: runtime.reviewing === suggestion.id ? "reviewing" : suggestion.state,
    title: verdict === undefined || verdict.decision === "skip" ? null : verdict.title,
    goal: suggestion.candidate.goal,
    reason: verdict?.reason ?? null,
    occurrences: suggestion.candidate.occurrences,
    sessions,
    score: suggestion.candidate.score,
    detectedAt: suggestion.detectedAt,
    updatedAt: suggestion.updatedAt,
    decision: verdict?.decision ?? null,
    skill,
    cautions: suggestion.review?.cautions ?? [],
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

/**
 * 组装收件箱视图。
 * @param store - 插件存储。
 * @param settings - 当前设置。
 * @param route - 当前选中的复核模型。
 * @param runtime - 引擎运行状态。
 * @param now - 当前时间。
 */
export function inboxView(
  store: ScoutStore,
  settings: Settings,
  route: ReviewRoute | undefined,
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
    review: settings.review,
    notify: settings.notify,
    scope: settings.scope,
    model:
      route === undefined
        ? null
        : {
            provider: route.provider,
            model: route.model,
            effort: route.reasoningEffort ?? null,
            source: route.source,
          },
    lead: runtime.lead,
    scanning: runtime.scanning,
    waiting: runtime.waiting,
    reviewing: runtime.reviewing,
    usage: {
      reviews: usage?.reviews ?? 0,
      limit: settings.dailyReviews,
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

/**
 * 组装一条建议的详情：证据任务、模型结论与草稿。
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
  const verdict = suggestion.review?.verdict;
  const cited = new Set(
    verdict === undefined
      ? []
      : [
          ...verdict.refs,
          ...(verdict.decision === "suggest_create"
            ? verdict.skill.steps.flatMap((step) => step.refs)
            : verdict.decision === "suggest_improve"
              ? verdict.improve.notes.flatMap((note) => note.refs)
              : []),
        ],
  );
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
      followup: episode.followup,
    };
  });
  const review = suggestion.review;
  return {
    item: itemOf(suggestion, index, runtime),
    episodes,
    review:
      review === null
        ? null
        : {
            provider: review.provider,
            model: review.model,
            at: review.at,
            inputTokens: review.inputTokens,
            outputTokens: review.outputTokens,
          },
    draft:
      verdict?.decision === "suggest_create" ? fieldsOfDraft(verdict.skill, verdict.title) : null,
    section:
      verdict?.decision === "suggest_improve"
        ? renderImprovement(verdict.title, verdict.improve.notes)
        : null,
  };
}
