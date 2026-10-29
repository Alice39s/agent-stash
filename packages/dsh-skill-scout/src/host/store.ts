/**
 * 插件状态存在 `ctx.storageDomain` 的 `skill_scout` domain 里，每条记录一个文件：
 * - sessions：每个已分析会话的进度与 Episode；
 * - suggestions：每个候选的状态、摘要、草稿、写入记录与忽略记录；
 * - usage：每天的模型调用次数与用量。
 * 记录在打开 domain 时逐条用 valibot 校验，结构不符的记录由 DSH 备份后跳过。
 *
 * 版本 2 的 Episode 按命令动作记录操作，建议分摘要与草稿两段保存。版本 1 的记录由 DSH 丢弃，
 * 历史范围内的会话按新格式重新分析；已经写入的 Skill 文件留在原处。
 */
import * as v from "valibot";
import type { DshDomain, DshDomainSpec, DshTable, JsonValue } from "./dsh.ts";
import { CandidateSchema, EpisodeSchema } from "./model.ts";
import { DraftSchema, SummarySchema } from "./llm.ts";

export const DOMAIN_NAME = "skill_scout";
const DOMAIN_VERSION = 2;

/** 一个已分析的会话。 */
export const SessionRecordSchema = v.object({
  sessionId: v.string(),
  cwd: v.nullable(v.string()),
  createdAt: v.number(),
  /** 分析时日志里的事件数；日志变长后才重新分析。 */
  eventCount: v.number(),
  scannedAt: v.number(),
  episodes: v.array(EpisodeSchema),
});
export type SessionRecord = v.InferOutput<typeof SessionRecordSchema>;

/**
 * 建议的状态：
 * - detected：规则检测到，还没有摘要；
 * - proposed：摘要认为值得保存，等待用户同意生成草稿；
 * - skipped：摘要认为不值得保存；
 * - ready：草稿已生成，等待用户审核保存；
 * - failed：最近一次模型调用失败，失败记录里的 stage 说明是摘要还是草稿；
 * - dismissed：用户忽略；
 * - written：已写入 Skill 文件。
 */
export const SuggestionStateSchema = v.picklist([
  "detected",
  "proposed",
  "skipped",
  "ready",
  "failed",
  "dismissed",
  "written",
]);
export type SuggestionState = v.InferOutput<typeof SuggestionStateSchema>;

export const FailureKindSchema = v.picklist(["timeout", "model", "format", "evidence", "unsafe"]);

/** 模型调用的两个阶段。 */
export const StageSchema = v.picklist(["summary", "draft"]);
export type Stage = v.InferOutput<typeof StageSchema>;

/** 一次模型调用的来源与用量。 */
const CallEntries = {
  at: v.number(),
  provider: v.string(),
  model: v.string(),
  inputTokens: v.number(),
  outputTokens: v.number(),
};

export const SummaryRecordSchema = v.object({ ...CallEntries, summary: SummarySchema });
export type SummaryRecord = v.InferOutput<typeof SummaryRecordSchema>;

export const DraftRecordSchema = v.object({
  ...CallEntries,
  /** 草稿里需要提醒用户留意的命令类别。 */
  cautions: v.array(v.string()),
  draft: DraftSchema,
});
export type DraftRecord = v.InferOutput<typeof DraftRecordSchema>;

export const FailureRecordSchema = v.object({
  stage: StageSchema,
  kind: FailureKindSchema,
  message: v.string(),
  at: v.number(),
  /** 同一阶段的连续失败次数，决定下一次自动重试摘要的等待时间。 */
  attempts: v.number(),
});
export type FailureRecord = v.InferOutput<typeof FailureRecordSchema>;

/** 写入位置：新建在项目或用户目录，或改进已有 Skill。 */
export const WriteScopeSchema = v.picklist(["project", "user", "existing"]);
export type WriteScope = v.InferOutput<typeof WriteScopeSchema>;

export const WriteRecordSchema = v.object({
  at: v.number(),
  scope: WriteScopeSchema,
  skill: v.string(),
  path: v.string(),
  /** 写入前的文件内容；新建时为 null。 */
  previous: v.nullable(v.string()),
  /** 写入内容的 sha256，撤销前用来确认文件没有被改过。 */
  hash: v.string(),
  /** 新建了 Skill 目录；撤销时目录为空就一并删除。 */
  createdDir: v.boolean(),
  /** 写入后 DSH 的 Skill 列表里能找到它。 */
  discovered: v.boolean(),
});
export type WriteRecord = v.InferOutput<typeof WriteRecordSchema>;

export const SuggestionSchema = v.object({
  id: v.string(),
  candidate: CandidateSchema,
  state: SuggestionStateSchema,
  detectedAt: v.number(),
  updatedAt: v.number(),
  /** 上一次摘要时的证据 Episode 数；摘要判为跳过后，证据翻倍才重新摘要。 */
  summarizedSize: v.number(),
  summary: v.nullable(SummaryRecordSchema),
  draft: v.nullable(DraftRecordSchema),
  failure: v.nullable(FailureRecordSchema),
  write: v.nullable(WriteRecordSchema),
  dismissed: v.nullable(v.object({ at: v.number(), similar: v.boolean() })),
});
export type Suggestion = v.InferOutput<typeof SuggestionSchema>;

/** 一天的模型用量；后台摘要的每日上限与间隔只看 `summaries` 与 `lastSummaryAt`。 */
export const UsageRecordSchema = v.object({
  /** 后台自动发起的摘要次数。 */
  summaries: v.number(),
  /** 用户发起的摘要与草稿次数。 */
  requested: v.number(),
  failures: v.number(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  /** 最近一次后台摘要的时间。 */
  lastSummaryAt: v.number(),
});
export type UsageRecord = v.InferOutput<typeof UsageRecordSchema>;

function parser<TSchema extends v.GenericSchema>(name: string, schema: TSchema) {
  return {
    parse(raw: JsonValue): v.InferOutput<TSchema> {
      const result = v.safeParse(schema, raw);
      if (!result.success) throw new Error(`${name} 记录结构不符：${v.summarize(result.issues)}`);
      return result.output;
    },
  };
}

/** 表名到记录类型。 */
export interface ScoutTables {
  readonly sessions: SessionRecord;
  readonly suggestions: Suggestion;
  readonly usage: UsageRecord;
}

export const SCOUT_DOMAIN: DshDomainSpec<ScoutTables> = {
  name: DOMAIN_NAME,
  version: DOMAIN_VERSION,
  layout: "per-record",
  invalidRecords: "backup-and-skip",
  tables: {
    sessions: { valueSchema: parser("sessions", SessionRecordSchema) },
    suggestions: { valueSchema: parser("suggestions", SuggestionSchema) },
    usage: { valueSchema: parser("usage", UsageRecordSchema) },
  },
};

/** 打开后的三张表。 */
export interface ScoutStore {
  readonly sessions: DshTable<SessionRecord>;
  readonly suggestions: DshTable<Suggestion>;
  readonly usage: DshTable<UsageRecord>;
}

/** 从打开的 domain 取出三张表。 */
export function storeOf(domain: DshDomain<ScoutTables>): ScoutStore {
  return {
    sessions: domain.table("sessions"),
    suggestions: domain.table("suggestions"),
    usage: domain.table("usage"),
  };
}

/** storageDomain 的记录键只允许字母、数字、`_` 与 `-`；其余字符转写成 `_` 加十六进制码点。 */
export function recordKey(id: string): string {
  return id.replace(/[^A-Za-z0-9-]/gu, (char) => `_${(char.codePointAt(0) ?? 0).toString(16)}`);
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** 本地日期，作为用量记录的键。 */
export function dayKey(time: number): string {
  const date = new Date(time);
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
