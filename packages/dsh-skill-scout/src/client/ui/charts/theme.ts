/**
 * 图表配色（design.md 4.8）：只取 DSH 主题变量，宿主切换明暗主题时跟着变。
 * 每个颜色是一段 `var(--…)` 或 `color-mix(…)` 字符串，组件用 SVG 的 style 填色，图例与提示里的色块用同一个值。
 * 结果量表（任务结果）按正面到取消取六档状态色；条目状态（线索、idea、会话的分析）按 4.3 的状态类别取色，
 * 与列表行的状态点一致，同一类别里较早的阶段取该色的 50%；中性的量依次取着重色、第三级文字色、着重色 50%、
 * 三级分隔线色，对卡片底色的反差逐级降低，第一个序列在明暗两种主题里都最醒目。
 */
import type { StatsView, TaskView } from "../../../shared.ts";

/** 着重色：中性图表的第一个系列，也是单系列图表的默认颜色。 */
export const ACCENT_COLOR = "var(--dsw-alias-state-business-primary)";

/** 叠加在柱子上的面积。 */
export const OVERLAY_COLOR = "var(--dsw-alias-label-secondary)";

/** 同一类别里较早阶段的颜色：原色的 50%。 */
function half<C extends string>(color: C): `color-mix(in srgb, ${C} 50%, transparent)` {
  return `color-mix(in srgb, ${color} 50%, transparent)`;
}

/** 4.3 的状态类别（统计里没有进行中的类别：进行中的线索与 idea 按请求前的状态计数）。 */
const STATUS = {
  decision: "var(--dsw-alias-state-warn-primary)",
  failed: "var(--dsw-alias-state-error-primary)",
  done: "var(--dsw-alias-state-success-primary)",
  notStarted: "var(--dsw-alias-state-idle-primary)",
  closed: "var(--dsw-alias-border-l3)",
} as const;

/** 结果类别的六档颜色。 */
const RESULT = {
  strongest: "var(--dsw-alias-state-success-primary)",
  positive: "color-mix(in srgb, var(--dsw-alias-state-success-primary) 50%, transparent)",
  unknown: "var(--dsw-alias-state-idle-primary)",
  contested: "var(--dsw-alias-state-warn-primary)",
  negative: "var(--dsw-alias-state-error-primary)",
  cancelled: "var(--dsw-alias-border-l3)",
} as const;

/** 会话的分析状态：已分析、分析失败、还没分析。 */
export type CoverageState = "analyzed" | "failed" | "pending";

/** 会话的分析状态：已分析是完成，分析失败是失败，还没分析是未开始。 */
export const COVERAGE_COLORS = {
  analyzed: STATUS.done,
  failed: STATUS.failed,
  pending: STATUS.notStarted,
} as const satisfies Readonly<Record<CoverageState, string>>;

/** 任务结果：与任务视图里的结果字段同一组。 */
export type Outcome = TaskView["outcome"];

/** 任务结果的堆叠顺序，从下往上：通过检查的在底部，取消的在顶部。 */
export const OUTCOME_ORDER = [
  "verified",
  "succeeded",
  "unverified",
  "disputed",
  "failed",
  "aborted",
] as const satisfies readonly Outcome[];

/** 任务结果：检查通过最强，成功次之，无法核实未知，用户否定有争议，失败负面，中断取消。 */
export const OUTCOME_COLORS = {
  verified: RESULT.strongest,
  succeeded: RESULT.positive,
  unverified: RESULT.unknown,
  disputed: RESULT.contested,
  failed: RESULT.negative,
  aborted: RESULT.cancelled,
} as const satisfies Readonly<Record<Outcome, string>>;

/** 线索的状态。 */
export type LeadState = keyof StatsView["funnel"]["leads"];

/** 线索状态在占比条里的顺序：完成、未开始、失败、结束（较晚的在前）。 */
export const LEAD_ORDER = [
  "summarized",
  "detected",
  "failed",
  "skipped",
  "dismissed",
] as const satisfies readonly LeadState[];

/**
 * 线索的状态：已摘要是完成，等待摘要是未开始，摘要失败是失败；不值得保存与用户忽略都是结束，
 * 用户在摘要前忽略的那一类阶段较早，取 50%。
 */
export const LEAD_COLORS = {
  summarized: STATUS.done,
  detected: STATUS.notStarted,
  failed: STATUS.failed,
  skipped: STATUS.closed,
  dismissed: half(STATUS.closed),
} as const satisfies Readonly<Record<LeadState, string>>;

/** idea 的状态。 */
export type IdeaState = keyof StatsView["funnel"]["ideas"];

/** idea 状态在占比条里的顺序：完成、待决定（较晚的在前）、失败、结束。 */
export const IDEA_ORDER = [
  "written",
  "ready",
  "proposed",
  "failed",
  "dismissed",
] as const satisfies readonly IdeaState[];

/** idea 的状态：已保存是完成；草稿可保存与等你决定都待决定，阶段较早的后者取 50%；草稿失败是失败，忽略是结束。 */
export const IDEA_COLORS = {
  written: STATUS.done,
  ready: STATUS.decision,
  proposed: half(STATUS.decision),
  failed: STATUS.failed,
  dismissed: STATUS.closed,
} as const satisfies Readonly<Record<IdeaState, string>>;

/** 模型用量的四种 token：未命中缓存的输入、缓存读、缓存写、输出。 */
export type UsageKind = Extract<keyof StatsView["usage"][number], `${string}Tokens`>;

/** 用量的堆叠顺序，从下往上。 */
export const USAGE_ORDER = [
  "inputTokens",
  "cacheReadTokens",
  "cacheWriteTokens",
  "outputTokens",
] as const satisfies readonly UsageKind[];

/** 用量是中性的量：按堆叠顺序取着重色、第三级文字色、着重色 50% 与三级分隔线色。 */
export const USAGE_COLORS = {
  inputTokens: ACCENT_COLOR,
  cacheReadTokens: "var(--dsw-alias-label-tertiary)",
  cacheWriteTokens: half(ACCENT_COLOR),
  outputTokens: "var(--dsw-alias-border-l3)",
} as const satisfies Readonly<Record<UsageKind, string>>;
