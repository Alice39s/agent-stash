/**
 * Host 与浏览器两半共用的路由路径、视图 schema 与请求 schema。
 * 视图里的文本都已在 Host 侧脱敏、裁剪；浏览器收到响应后按同一份 schema 校验。
 */
import * as v from "valibot";

export const ROUTE_BASE = "/agent-stash-skill-scout";
export const INBOX_PATH = `${ROUTE_BASE}/inbox`;
export const DETAIL_PATH = `${ROUTE_BASE}/detail`;
export const ACTION_PATH = `${ROUTE_BASE}/action`;
export const SESSION_PATH = `${ROUTE_BASE}/session`;
export const SEARCH_PATH = `${ROUTE_BASE}/search`;
export const STATS_PATH = `${ROUTE_BASE}/stats`;

/** 会话 Tab 与「历史回溯提炼」页在 DSH 槽位里的 id。 */
export const VIEW_ID = "skill-scout";

/** 插件页里本插件配置页的键：`<包名>#<条目 id>`。 */
export const PACKAGE_NAME = "@agent-stash/dsh-skill-scout";
export const ROW_ID = "agent-stash-skill-scout";

const Nullable = <T extends v.GenericSchema>(schema: T) => v.nullable(schema);

/** 线索的来源：三种规则信号，加上用户发起的「提炼本会话」与「提炼所选」。 */
export const SignalKindViewSchema = v.picklist([
  "repeated",
  "recovery",
  "complex",
  "session",
  "selected",
]);

/**
 * 一张卡片在界面上的状态。还没有可同意的 idea 时，卡片代表整条线索：detected、summarizing、skipped、
 * failed（摘要失败）、dismissed；摘要给出 idea 后，每个 idea 一张卡片：proposed、drafting、ready、
 * failed（草稿失败）、dismissed、written。summarizing 与 drafting 只存在于 Host 内存。
 */
export const ItemStateSchema = v.picklist([
  "detected",
  "summarizing",
  "proposed",
  "skipped",
  "drafting",
  "ready",
  "failed",
  "dismissed",
  "written",
]);
export type ItemState = v.InferOutput<typeof ItemStateSchema>;

/** 模型调用的两个阶段：摘要与草稿。 */
export const StageViewSchema = v.picklist(["summary", "draft"]);
export type StageView = v.InferOutput<typeof StageViewSchema>;

export const DecisionSchema = v.picklist(["skip", "suggest_create", "suggest_improve"]);
export type Decision = v.InferOutput<typeof DecisionSchema>;

export const FailureKindViewSchema = v.picklist([
  "timeout",
  "model",
  "format",
  "evidence",
  "unsafe",
]);
export type FailureKind = v.InferOutput<typeof FailureKindViewSchema>;

/**
 * 一次模型请求走到哪一步：
 * - queued：等前一个请求结束；
 * - preparing：整理证据包、读取已有 Skill 与 skill-creator；
 * - waiting：请求已发出，还没收到任何分块；
 * - thinking：收到推理内容；
 * - writing：收到正文，`chars` 是已收到的字数；
 * - checking：回复已收齐，正在按 schema 与证据核对。
 */
export const ProgressPhaseSchema = v.picklist([
  "queued",
  "preparing",
  "waiting",
  "thinking",
  "writing",
  "checking",
]);
export type ProgressPhase = v.InferOutput<typeof ProgressPhaseSchema>;

export const ProgressViewSchema = v.object({
  stage: v.picklist(["summary", "draft"]),
  phase: ProgressPhaseSchema,
  /** 请求开始的时间。 */
  startedAt: v.number(),
  /** 进入当前阶段的时间。 */
  phaseAt: v.number(),
  /** 已收到的正文字数。 */
  chars: v.number(),
  /** 这类回复通常的字数，界面据此估算进度；不是上限。 */
  expected: v.number(),
});
export type ProgressView = v.InferOutput<typeof ProgressViewSchema>;

/** 证据来自的一次任务。 */
export const SessionRefSchema = v.object({
  sessionId: v.string(),
  episodeId: v.string(),
  at: v.number(),
  goal: v.string(),
  outcome: v.string(),
});
export type SessionRef = v.InferOutput<typeof SessionRefSchema>;

/** 收件箱里的一张卡片：一个 idea，或者还没有 idea 的一条线索。 */
export const ItemViewSchema = v.object({
  /** idea 是 `<线索 id>~<下标>`，线索就是线索 id。 */
  id: v.string(),
  leadId: v.string(),
  /** idea 在摘要里的下标；卡片代表整条线索时为 null。 */
  ideaIndex: Nullable(v.number()),
  /** 这条线索的摘要给出的 idea 数。 */
  ideaCount: v.number(),
  /** 其他线索里同名、未结束的 idea 折叠进这张卡片的数量。 */
  merged: v.number(),
  kind: SignalKindViewSchema,
  state: ItemStateSchema,
  /** 摘要给出的标题；还没有摘要时为 null，界面用 goal 代替。 */
  title: Nullable(v.string()),
  goal: v.string(),
  /** 规则在这组任务里找到的共有步骤，原来的写法。 */
  steps: v.array(v.string()),
  /** 摘要：在会话里发现了什么。 */
  found: Nullable(v.string()),
  /** 摘要：Skill 做什么；改进时是追加的内容补上了什么。 */
  description: Nullable(v.string()),
  /** 摘要：什么时候用。 */
  trigger: Nullable(v.string()),
  /** 摘要：打算写进 Skill 的步骤或追加的内容。 */
  outline: v.array(v.string()),
  /** 摘要：照着做的风险。 */
  risks: v.array(v.string()),
  /** 摘要：怎么确认照着做成功了。 */
  verification: Nullable(v.string()),
  /** 摘要判为跳过的理由。 */
  reason: Nullable(v.string()),
  occurrences: v.number(),
  sessions: v.array(SessionRefSchema),
  score: v.number(),
  detectedAt: v.number(),
  updatedAt: v.number(),
  decision: Nullable(DecisionSchema),
  /** 新建的 Skill 名称或要改进的 Skill。 */
  skill: Nullable(v.string()),
  cautions: v.array(v.string()),
  failure: Nullable(
    v.object({
      stage: StageViewSchema,
      kind: FailureKindViewSchema,
      message: v.string(),
      at: v.number(),
      attempts: v.number(),
    }),
  ),
  write: Nullable(
    v.object({
      at: v.number(),
      scope: v.picklist(["project", "user", "existing"]),
      skill: v.string(),
      path: v.string(),
      discovered: v.boolean(),
      /** DSH 还没列出，后台仍在核对。 */
      checking: v.boolean(),
    }),
  ),
  dismissedSimilar: v.boolean(),
  /** 正在进行的模型请求；没有时为 null。 */
  progress: Nullable(ProgressViewSchema),
});
export type ItemView = v.InferOutput<typeof ItemViewSchema>;

/** 一个阶段此刻使用的模型；没有可用模型时为 null。 */
const ModelViewSchema = Nullable(
  v.object({
    provider: v.string(),
    model: v.string(),
    effort: Nullable(v.string()),
    source: v.picklist(["config", "default"]),
  }),
);
export type ModelView = v.InferOutput<typeof ModelViewSchema>;

/** 插件此刻的工作状态。 */
export const StatusViewSchema = v.object({
  discovery: v.boolean(),
  /** 后台自动写摘要。 */
  summarize: v.boolean(),
  notify: v.picklist(["badge", "quiet"]),
  scope: v.picklist(["project", "user"]),
  models: v.object({ summary: ModelViewSchema, draft: ModelViewSchema }),
  /** 本进程持有工作锁，负责分析与后台摘要。 */
  lead: v.boolean(),
  scanning: v.boolean(),
  /** 回合已结束、等静默期过去后再分析的会话数。 */
  waiting: v.number(),
  /** 正在进行的摘要与草稿请求数。 */
  working: v.number(),
  usage: v.object({
    /** 今天的后台摘要次数与上限。 */
    summaries: v.number(),
    limit: v.number(),
    /** 今天用户发起的摘要与草稿次数。 */
    requested: v.number(),
    /** 未命中缓存的输入。 */
    inputTokens: v.number(),
    cacheReadTokens: v.number(),
    cacheWriteTokens: v.number(),
    outputTokens: v.number(),
  }),
  /** 回溯更早的会话；没有在回溯时为 null。 */
  backfill: Nullable(
    v.object({
      range: v.picklist(["90d", "all"]),
      state: v.picklist(["listing", "running", "paused", "done"]),
      total: v.number(),
      done: v.number(),
      failed: v.number(),
    }),
  ),
  lastError: Nullable(v.object({ kind: v.string(), message: v.string(), at: v.number() })),
  analyzed: v.object({ sessions: v.number(), episodes: v.number() }),
});
export type StatusView = v.InferOutput<typeof StatusViewSchema>;

export const InboxViewSchema = v.object({
  status: StatusViewSchema,
  items: v.array(ItemViewSchema),
});
export type InboxView = v.InferOutput<typeof InboxViewSchema>;

/** 证据里的一次操作。 */
export const EvidenceOpSchema = v.object({
  /** 证据编号，与模型引用一致，例如 `E1.42`。 */
  ref: v.string(),
  kind: v.picklist(["read", "edit", "exec", "delegate"]),
  label: v.string(),
  ok: v.boolean(),
  exit: Nullable(v.number()),
  error: Nullable(v.string()),
  /** 在结果判定或恢复链里的角色。 */
  role: Nullable(v.picklist(["verify", "failure", "fix", "recovered"])),
  /** 摘要或草稿引用了它。 */
  cited: v.boolean(),
});
export type EvidenceOp = v.InferOutput<typeof EvidenceOpSchema>;

export const EvidenceEpisodeSchema = v.object({
  ref: v.string(),
  episodeId: v.string(),
  sessionId: v.string(),
  at: v.number(),
  cwd: Nullable(v.string()),
  goal: v.string(),
  outcome: v.string(),
  reads: v.number(),
  ops: v.array(EvidenceOpSchema),
  reply: Nullable(v.string()),
  steering: v.array(v.string()),
  followup: Nullable(v.string()),
});
export type EvidenceEpisode = v.InferOutput<typeof EvidenceEpisodeSchema>;

/** 可编辑的 Skill 字段。 */
export const SkillFieldsSchema = v.object({
  name: v.pipe(v.string(), v.trim(), v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u), v.maxLength(64)),
  description: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(500)),
  whenToUse: v.pipe(v.string(), v.trim(), v.maxLength(500)),
  body: v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(20000)),
});
export type SkillFields = v.InferOutput<typeof SkillFieldsSchema>;

/** 一次模型调用的来源与用量。 */
const CallViewSchema = Nullable(
  v.object({
    provider: v.string(),
    model: v.string(),
    at: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
  }),
);
export type CallView = v.InferOutput<typeof CallViewSchema>;

/** 一条建议的完整信息：证据、摘要与草稿。 */
export const DetailViewSchema = v.object({
  item: ItemViewSchema,
  /** 同一线索的全部 idea（含这一个），按摘要里的顺序。 */
  siblings: v.array(v.object({ id: v.string(), title: v.string(), state: ItemStateSchema })),
  episodes: v.array(EvidenceEpisodeSchema),
  summary: CallViewSchema,
  draftCall: CallViewSchema,
  /** suggest_create 的草稿字段。 */
  draft: Nullable(SkillFieldsSchema),
  /** suggest_improve 的追加内容。 */
  section: Nullable(v.string()),
});
export type DetailView = v.InferOutput<typeof DetailViewSchema>;

/** 写入前的预览。 */
export const PreviewViewSchema = v.variant("kind", [
  v.object({
    kind: v.literal("create"),
    scope: v.picklist(["project", "user"]),
    path: v.string(),
    content: v.string(),
    exists: v.boolean(),
  }),
  v.object({
    kind: v.literal("improve"),
    skill: v.string(),
    path: Nullable(v.string()),
    /** 目标在 DSH 扫描的项目或用户 Skill 目录里，可以写入。 */
    writable: v.boolean(),
    before: v.string(),
    after: v.string(),
    baseHash: v.string(),
  }),
]);
export type PreviewView = v.InferOutput<typeof PreviewViewSchema>;

/** 一个任务（Episode）的概要，用于会话 Tab 与搜索结果。 */
export const TaskViewSchema = v.object({
  episodeId: v.string(),
  sessionId: v.string(),
  at: v.number(),
  cwd: Nullable(v.string()),
  goal: v.string(),
  outcome: v.picklist(["verified", "succeeded", "unverified", "disputed", "failed", "aborted"]),
  commands: v.number(),
  edits: v.number(),
  recoveries: v.number(),
  /** 前几步的命令签名或改动文件。 */
  steps: v.array(v.string()),
  /** 搜索命中的片段（命令、错误行、文件路径或插话）；不是搜索结果时为空。 */
  matches: v.array(v.string()),
});
export type TaskView = v.InferOutput<typeof TaskViewSchema>;

/** 一个会话在插件里的分析情况。 */
export const SessionViewSchema = v.object({
  sessionId: v.string(),
  /**
   * - analyzed：已分析，日志之后没有变化或正在等静默期；
   * - waiting：回合已结束，等静默期过去；
   * - pending：还没分析（超出历史范围、分析关闭，或启动时还没读到）；
   * - failed：分析出错，`error` 是原因；
   * - subagent：子代理会话，不单独分析；
   * - missing：DSH 里找不到这个会话。
   */
  state: v.picklist(["analyzed", "waiting", "pending", "failed", "subagent", "missing"]),
  scannedAt: Nullable(v.number()),
  error: Nullable(v.string()),
  tasks: v.array(TaskViewSchema),
});
export type SessionView = v.InferOutput<typeof SessionViewSchema>;

export const SearchViewSchema = v.object({
  query: v.string(),
  /** 命中总数；`hits` 只含前 `limit` 条，按命中词数与时间排序。 */
  total: v.number(),
  hits: v.array(TaskViewSchema),
  /** 索引覆盖的范围。 */
  indexed: v.object({ sessions: v.number(), episodes: v.number() }),
});
export type SearchView = v.InferOutput<typeof SearchViewSchema>;

/** 一次模型调用的记录。 */
export const CallLogViewSchema = v.object({
  at: v.number(),
  stage: StageViewSchema,
  /** 线索或 idea 的 id，用来跳到那张卡片。 */
  itemId: v.string(),
  title: v.string(),
  provider: v.string(),
  model: v.string(),
  durationMs: v.number(),
  inputTokens: v.number(),
  cacheReadTokens: v.number(),
  cacheWriteTokens: v.number(),
  outputTokens: v.number(),
  result: v.picklist(["proposed", "skipped", "drafted", "failed"]),
  /** 不值得保存的理由、idea 数或失败原因。 */
  detail: Nullable(v.string()),
});
export type CallLogView = v.InferOutput<typeof CallLogViewSchema>;

const Count = v.number();

export const StatsViewSchema = v.object({
  coverage: v.object({
    analyzed: Count,
    /** 历史范围内、不是子代理的会话数；还没列出会话时为 null。 */
    inRange: Nullable(Count),
    /** DSH 里全部不是子代理的会话数。 */
    total: Nullable(Count),
    backfilled: Count,
    failed: v.array(v.object({ sessionId: v.string(), message: v.string(), at: v.number() })),
  }),
  /**
   * 线索与 idea 各自按存储里的状态计数，两者单位不同，分开统计。整条线索被忽略时它的 idea 计入
   * dismissed；正在摘要的线索计入 detected，正在生成草稿的 idea 计入它请求前的状态。
   */
  funnel: v.object({
    leads: v.object({
      detected: Count,
      summarized: Count,
      skipped: Count,
      failed: Count,
      dismissed: Count,
    }),
    ideas: v.object({
      proposed: Count,
      ready: Count,
      failed: Count,
      written: Count,
      dismissed: Count,
    }),
  }),
  /** 跨会话出现最多的动作（日常动作与查看类命令除外）。 */
  actions: v.array(
    v.object({
      key: v.string(),
      label: v.string(),
      sessions: Count,
      /** 近 8 周每周用到这个动作的会话数，最早的在前。 */
      weeks: v.array(Count),
    }),
  ),
  /** 在多个会话里出现的同一类错误。 */
  errors: v.array(v.object({ signature: v.string(), example: v.string(), sessions: Count })),
  /**
   * 近 30 天每天结束的任务数（按结果分）与新出现的线索数，最早的在前；没有记录的日子也列出，各项为 0。
   * 只统计已分析的会话（含回溯读入的）。
   */
  daily: v.array(
    v.object({
      day: v.string(),
      verified: Count,
      succeeded: Count,
      unverified: Count,
      disputed: Count,
      failed: Count,
      aborted: Count,
      leads: Count,
    }),
  ),
  /** 近 7 天每天的模型用量，最早的在前。 */
  usage: v.array(
    v.object({
      day: v.string(),
      summaries: Count,
      requested: Count,
      failures: Count,
      inputTokens: Count,
      cacheReadTokens: Count,
      cacheWriteTokens: Count,
      outputTokens: Count,
    }),
  ),
  /** 最近的模型调用，最新的在前。 */
  calls: v.array(CallLogViewSchema),
});
export type StatsView = v.InferOutput<typeof StatsViewSchema>;

const Id = v.pipe(v.string(), v.minLength(1), v.maxLength(200));
const Scope = v.optional(v.picklist(["project", "user"]));
const Section = v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(8000)));

export const ActionSchema = v.variant("action", [
  v.object({ action: v.literal("summarize"), id: Id }),
  v.object({ action: v.literal("draft"), id: Id }),
  v.object({ action: v.literal("dismiss"), id: Id, similar: v.boolean() }),
  v.object({ action: v.literal("restore"), id: Id }),
  v.object({
    action: v.literal("preview"),
    id: Id,
    scope: Scope,
    fields: v.optional(SkillFieldsSchema),
    section: Section,
  }),
  v.object({
    action: v.literal("write"),
    id: Id,
    scope: Scope,
    fields: v.optional(SkillFieldsSchema),
    section: Section,
    baseHash: v.optional(v.string()),
  }),
  v.object({ action: v.literal("undo"), id: Id }),
  v.object({ action: v.literal("scan") }),
  /** 不等静默期，立即分析一个会话。 */
  v.object({ action: v.literal("analyze-session"), sessionId: Id }),
  /** 把整段会话交给发现模型，最多给出 5 个 idea。 */
  v.object({ action: v.literal("extract-session"), sessionId: Id }),
  /** 把搜索结果里勾选的任务交给发现模型。 */
  v.object({
    action: v.literal("extract-selected"),
    episodeIds: v.pipe(v.array(Id), v.minLength(1), v.maxLength(12)),
  }),
  /** 读入历史范围之外更早的会话，供搜索与提炼。 */
  v.object({ action: v.literal("backfill"), range: v.picklist(["90d", "all"]) }),
  v.object({ action: v.literal("backfill-pause") }),
]);
export type Action = v.InferInput<typeof ActionSchema>;

/** 操作失败的类别。 */
export const ActionErrorKindSchema = v.picklist([
  "invalid",
  "missing",
  "busy",
  "no-model",
  "exists",
  "changed",
  "outside",
  "unsafe",
  "empty",
]);
export type ActionErrorKind = v.InferOutput<typeof ActionErrorKindSchema>;

export const ActionResultSchema = v.variant("ok", [
  v.object({
    ok: v.literal(true),
    inbox: InboxViewSchema,
    preview: v.optional(PreviewViewSchema),
    /** extract-session 与 extract-selected 建立或沿用的线索 id。 */
    leadId: v.optional(v.string()),
  }),
  v.object({
    ok: v.literal(false),
    error: v.object({ kind: ActionErrorKindSchema, message: v.string() }),
    inbox: InboxViewSchema,
  }),
]);
export type ActionResult = v.InferOutput<typeof ActionResultSchema>;

/** 非 2xx 且不是操作失败的响应体。 */
export const ErrorBodySchema = v.object({ error: v.string() });
