import * as v from "valibot";

/** 改写路由：`POST`，请求体为 {@link RewriteRequestSchema}，成功时回 {@link RewriteResultSchema}。 */
export const REWRITE_PATH = "/dsh-enhance/rewrite";
/** 上下文路由：`GET ?session=<id>`，回 {@link ContextResultSchema}：下一次改写关联的轮数与预计用量。 */
export const CONTEXT_PATH = "/dsh-enhance/context";

/** 草稿的最大长度，超出时 Host 拒绝请求。 */
export const MAX_DRAFT_CHARS = 20_000;

const NonEmptySchema = v.pipe(v.string(), v.minLength(1));

/** 会话当前选中的模型：配置没有指定改写模型时，Host 用它改写。 */
export const SessionModelSchema = v.object({
  provider: NonEmptySchema,
  model: NonEmptySchema,
  reasoningEffort: v.optional(NonEmptySchema),
});

export type SessionModel = v.InferOutput<typeof SessionModelSchema>;

export const RewriteRequestSchema = v.object({
  session: NonEmptySchema,
  preset: NonEmptySchema,
  draft: v.pipe(v.string(), v.minLength(1), v.maxLength(MAX_DRAFT_CHARS)),
  /** 会话还没有选过模型时省略，Host 改用 DSH 的默认模型。 */
  model: v.optional(SessionModelSchema),
});

export type RewriteRequest = v.InferOutput<typeof RewriteRequestSchema>;

export const RewriteResultSchema = v.object({
  text: v.string(),
  /** 模型认为草稿已经符合预设的目标；此时 `text` 就是原草稿。 */
  unchanged: v.boolean(),
  /** 实际关联的对话轮数。 */
  turns: v.number(),
});

export type RewriteResult = v.InferOutput<typeof RewriteResultSchema>;

export const ContextResultSchema = v.object({
  /** 下一次改写会关联的对话轮数。 */
  turns: v.number(),
  /**
   * 预设 id 到草稿为空时这次请求的预计输入 token 数：系统提示、会话上下文与分段标签。
   * 浏览器半部加上草稿本身的估算即是整次请求；指令无法展开的预设不在其中。
   */
  tokens: v.record(v.string(), v.number()),
});

export type ContextResult = v.InferOutput<typeof ContextResultSchema>;

/**
 * 改写失败的原因，浏览器半部据此显示本地化文案；`message` 保留原始细节。
 * - `timeout`：超过配置的超时。
 * - `model`：模型路由无效、推理强度不受支持，或模型服务返回错误。
 * - `truncated`：输出被最大输出长度截断。
 * - `empty`：模型没有返回文字。
 * - `invalid`：结果没有通过检查（像在回答草稿、换了语言，或丢了草稿里的代码与链接）。
 * - `no-model`：没有配置模型，会话与 DSH 也都没有选定模型。
 * - `preset`：预设不存在或没有改写指令。
 * - `context`：读取会话上下文失败。
 */
export const FAILURE_REASONS = [
  "timeout",
  "model",
  "truncated",
  "empty",
  "invalid",
  "no-model",
  "preset",
  "context",
] as const;

export type FailureReason = (typeof FAILURE_REASONS)[number];

export const FailureSchema = v.object({
  reason: v.picklist(FAILURE_REASONS),
  message: v.string(),
});

export type Failure = v.InferOutput<typeof FailureSchema>;
