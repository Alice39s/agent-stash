/**
 * Host 与浏览器两半共享的契约：HTTP 路由、请求与响应的结构，以及持久化的版本记录。
 * 结构用 valibot 描述，类型由 schema 推导，Host 校验请求体与存储记录，浏览器校验响应。
 */
import * as v from "valibot";

/** Host 插件在 DSH Web 服务上注册的同源路由。 */
export const MESSAGE_EDIT_PATH = "/message-edit";

/** 时间线视图排在「轨迹」(10) 与 Prompt Studio (20) 之间。 */
export const MESSAGE_EDIT_VIEW_ORDER = 15;

/** 版本记录所在的 storageDomain 名称与表名。 */
export const MESSAGE_EDIT_DOMAIN = "message_edit";
export const MESSAGE_EDIT_VERSIONS_TABLE = "versions";

const NonNegativeIntegerSchema = v.pipe(v.number(), v.integer(), v.minValue(0));
const SessionIdSchema = v.pipe(v.string(), v.nonEmpty());

/** 修改历史回合后怎样处理它之后的回合：截断，或依次重放后续用户输入。 */
export const CascadePolicySchema = v.picklist(["truncate", "preserve"]);
export type CascadePolicy = v.InferOutput<typeof CascadePolicySchema>;

/** 一个子版本代表的用户操作。 */
export const VersionOperationSchema = v.picklist(["edit", "reroll", "retry"]);
export type VersionOperation = v.InferOutput<typeof VersionOperationSchema>;

/** 可编辑的消息块种类。 */
export const EditableBlockKindSchema = v.picklist([
  "user",
  "assistant.reasoning",
  "assistant.response",
]);
export type EditableBlockKind = v.InferOutput<typeof EditableBlockKindSchema>;

/** 一次版本操作的正向效果：改了哪个回合的哪个块，改前改后是什么。 */
export const MessageEditEffectSchema = v.object({
  id: v.pipe(v.string(), v.uuid()),
  operation: VersionOperationSchema,
  cascade: CascadePolicySchema,
  targetTurn: NonNegativeIntegerSchema,
  targetEventSeq: NonNegativeIntegerSchema,
  targetBlockIndex: v.optional(NonNegativeIntegerSchema),
  blockKind: v.optional(EditableBlockKindSchema),
  before: v.optional(v.string()),
  after: v.optional(v.string()),
});
export type MessageEditEffect = v.InferOutput<typeof MessageEditEffectSchema>;

/**
 * 存在 storageDomain 里的版本记录，键是子会话 id。
 * `parentSessionId` 是这次操作的来源会话，撤销即切回它；会话日志本身只含 DSH 内置事件。
 */
export const VersionRecordSchema = v.object({
  parentSessionId: SessionIdSchema,
  createdAt: NonNegativeIntegerSchema,
  effect: MessageEditEffectSchema,
});
export type VersionRecord = v.InferOutput<typeof VersionRecordSchema>;

/** 时间线编辑器可以替换的一个文本块。 */
export const EditableMessageBlockSchema = v.object({
  key: v.string(),
  turn: NonNegativeIntegerSchema,
  eventSeq: NonNegativeIntegerSchema,
  blockIndex: NonNegativeIntegerSchema,
  kind: EditableBlockKindSchema,
  text: v.string(),
  time: NonNegativeIntegerSchema,
  /** 助手块所属 `assistant/message` 的消息 id，对应聊天区消息动作行的 `messageId`。 */
  messageId: v.optional(v.string()),
});
export type EditableMessageBlock = v.InferOutput<typeof EditableMessageBlockSchema>;

/** 一个由用户消息触发、已经结束、可以重试的回合。 */
export const RetryableTurnSchema = v.object({
  turn: NonNegativeIntegerSchema,
  userEventSeq: NonNegativeIntegerSchema,
  preview: v.string(),
  time: NonNegativeIntegerSchema,
});
export type RetryableTurn = v.InferOutput<typeof RetryableTurnSchema>;

/** 已知版本树里的一个会话版本。 */
export const VersionSummarySchema = v.object({
  sessionId: SessionIdSchema,
  parentSessionId: v.optional(SessionIdSchema),
  createdAt: NonNegativeIntegerSchema,
  depth: NonNegativeIntegerSchema,
  current: v.boolean(),
  onCurrentEffectPath: v.boolean(),
  /** 本插件创建的版本才有效果；其他方式派生的分支没有。 */
  effect: v.optional(MessageEditEffectSchema),
});
export type VersionSummary = v.InferOutput<typeof VersionSummarySchema>;

/** `GET /message-edit?sessionId=` 的响应，时间线视图与标题栏控件共用。 */
export const MessageEditTimelineSchema = v.object({
  sessionId: SessionIdSchema,
  messages: v.array(EditableMessageBlockSchema),
  retryableTurns: v.array(RetryableTurnSchema),
  versions: v.array(VersionSummarySchema),
  /** 从当前版本往回、可以逐个撤销的版本，第一个是直接父版本。 */
  undoStack: v.array(SessionIdSchema),
  /** 当前版本的直接子版本，按创建时间升序，最后一个最新。 */
  redoSessionIds: v.array(SessionIdSchema),
});
export type MessageEditTimeline = v.InferOutput<typeof MessageEditTimelineSchema>;

/** 编辑一个文本块，从它所在回合之前分支并重新生成。 */
export const EditOperationSchema = v.object({
  action: v.literal("edit"),
  sessionId: SessionIdSchema,
  eventSeq: NonNegativeIntegerSchema,
  blockIndex: NonNegativeIntegerSchema,
  text: v.string(),
  cascade: CascadePolicySchema,
});
export type EditOperation = v.InferOutput<typeof EditOperationSchema>;

/** 重新生成最后一个已结束回合的助手回复。 */
export const RerollOperationSchema = v.object({
  action: v.literal("reroll"),
  sessionId: SessionIdSchema,
});
export type RerollOperation = v.InferOutput<typeof RerollOperationSchema>;

/** 重试任意一个历史回合。 */
export const RetryOperationSchema = v.object({
  action: v.literal("retry"),
  sessionId: SessionIdSchema,
  turn: NonNegativeIntegerSchema,
  cascade: CascadePolicySchema,
});
export type RetryOperation = v.InferOutput<typeof RetryOperationSchema>;

/** `POST /message-edit` 接受的操作。 */
export const MessageEditOperationSchema = v.variant("action", [
  EditOperationSchema,
  RerollOperationSchema,
  RetryOperationSchema,
]);
export type MessageEditOperation = v.InferOutput<typeof MessageEditOperationSchema>;

/** 子会话发布、后续输入排队之后 Host 的应答。 */
export const MessageEditOperationResultSchema = v.object({
  sessionId: SessionIdSchema,
  queuedTurns: NonNegativeIntegerSchema,
});
export type MessageEditOperationResult = v.InferOutput<typeof MessageEditOperationResultSchema>;

/** 路由出错时的响应体。 */
export const MessageEditErrorSchema = v.object({ error: v.string() });
