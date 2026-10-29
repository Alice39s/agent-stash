/**
 * Host 与浏览器两半共用的路由路径、视图 schema 与请求 schema。
 * 视图里的文本都已在 Host 侧脱敏、裁剪；浏览器收到响应后按同一份 schema 校验。
 */
import * as v from "valibot";

export const ROUTE_BASE = "/agent-stash-skill-scout";
export const INBOX_PATH = `${ROUTE_BASE}/inbox`;
export const DETAIL_PATH = `${ROUTE_BASE}/detail`;
export const ACTION_PATH = `${ROUTE_BASE}/action`;

/** 插件页里本插件配置页的键：`<包名>#<条目 id>`。 */
export const PACKAGE_NAME = "@agent-stash/dsh-skill-scout";
export const ROW_ID = "agent-stash-skill-scout";

const Nullable = <T extends v.GenericSchema>(schema: T) => v.nullable(schema);

export const SignalKindViewSchema = v.picklist(["repeated", "recovery", "complex"]);

/** 建议在界面上的状态；reviewing 只存在于 Host 内存，表示模型正在复核它。 */
export const ItemStateSchema = v.picklist([
  "detected",
  "reviewing",
  "ready",
  "skipped",
  "failed",
  "dismissed",
  "written",
]);
export type ItemState = v.InferOutput<typeof ItemStateSchema>;

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

/** 证据来自的一次任务。 */
export const SessionRefSchema = v.object({
  sessionId: v.string(),
  episodeId: v.string(),
  at: v.number(),
  goal: v.string(),
  outcome: v.string(),
});
export type SessionRef = v.InferOutput<typeof SessionRefSchema>;

/** 收件箱里的一条建议。 */
export const ItemViewSchema = v.object({
  id: v.string(),
  kind: SignalKindViewSchema,
  state: ItemStateSchema,
  /** 模型给出的标题；未复核时为 null，界面用 goal 代替。 */
  title: Nullable(v.string()),
  goal: v.string(),
  /** 模型给出的理由。 */
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
});
export type ItemView = v.InferOutput<typeof ItemViewSchema>;

/** 插件此刻的工作状态。 */
export const StatusViewSchema = v.object({
  discovery: v.boolean(),
  review: v.boolean(),
  notify: v.picklist(["badge", "quiet"]),
  scope: v.picklist(["project", "user"]),
  model: Nullable(
    v.object({
      provider: v.string(),
      model: v.string(),
      effort: Nullable(v.string()),
      source: v.picklist(["config", "default"]),
    }),
  ),
  /** 本进程持有工作锁，负责分析与复核。 */
  lead: v.boolean(),
  scanning: v.boolean(),
  /** 回合已结束、等静默期过去后再分析的会话数。 */
  waiting: v.number(),
  reviewing: Nullable(v.string()),
  usage: v.object({
    reviews: v.number(),
    limit: v.number(),
    inputTokens: v.number(),
    outputTokens: v.number(),
  }),
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
  /** 模型的结论引用了它。 */
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

/** 一条建议的完整信息：证据、模型结论与草稿。 */
export const DetailViewSchema = v.object({
  item: ItemViewSchema,
  episodes: v.array(EvidenceEpisodeSchema),
  review: Nullable(
    v.object({
      provider: v.string(),
      model: v.string(),
      at: v.number(),
      inputTokens: v.number(),
      outputTokens: v.number(),
    }),
  ),
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

const Id = v.pipe(v.string(), v.minLength(1), v.maxLength(200));
const Scope = v.optional(v.picklist(["project", "user"]));
const Section = v.optional(v.pipe(v.string(), v.trim(), v.minLength(1), v.maxLength(8000)));

export const ActionSchema = v.variant("action", [
  v.object({ action: v.literal("analyze"), id: Id }),
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
]);
export type ActionErrorKind = v.InferOutput<typeof ActionErrorKindSchema>;

export const ActionResultSchema = v.variant("ok", [
  v.object({ ok: v.literal(true), inbox: InboxViewSchema, preview: v.optional(PreviewViewSchema) }),
  v.object({
    ok: v.literal(false),
    error: v.object({ kind: ActionErrorKindSchema, message: v.string() }),
    inbox: InboxViewSchema,
  }),
]);
export type ActionResult = v.InferOutput<typeof ActionResultSchema>;

/** 非 2xx 且不是操作失败的响应体。 */
export const ErrorBodySchema = v.object({ error: v.string() });
