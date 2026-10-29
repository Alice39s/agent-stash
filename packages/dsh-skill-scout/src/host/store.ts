/**
 * 插件状态存在 `ctx.storageDomain` 的 `skill_scout` domain 里，每条记录一个文件：
 * - sessions：每个已分析会话的进度与 Episode；
 * - suggestions：每个候选的状态、模型结论、写入记录与忽略记录；
 * - usage：每天的复核次数与用量。
 * 记录在打开 domain 时逐条用 valibot 校验，结构不符的记录由 DSH 备份后跳过。
 */
import * as v from "valibot";
import type { DshDomain, DshDomainSpec, DshTable, JsonValue } from "./dsh.ts";
import { CandidateSchema, EpisodeSchema } from "./model.ts";
import { ReviewSchema } from "./review.ts";

export const DOMAIN_NAME = "skill_scout";
const DOMAIN_VERSION = 1;

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
 * - detected：规则检测到，等待模型复核；
 * - ready：模型给出了建议，等待用户处理；
 * - skipped：模型认为不值得保存；
 * - failed：复核失败，记录失败原因；
 * - dismissed：用户忽略；
 * - written：已写入 Skill 文件。
 */
export const SuggestionStateSchema = v.picklist([
  "detected",
  "ready",
  "skipped",
  "failed",
  "dismissed",
  "written",
]);
export type SuggestionState = v.InferOutput<typeof SuggestionStateSchema>;

export const FailureKindSchema = v.picklist(["timeout", "model", "format", "evidence", "unsafe"]);

export const ReviewRecordSchema = v.object({
  at: v.number(),
  provider: v.string(),
  model: v.string(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  /** 结论里需要提醒用户留意的命令类别。 */
  cautions: v.array(v.string()),
  verdict: ReviewSchema,
});
export type ReviewRecord = v.InferOutput<typeof ReviewRecordSchema>;

export const FailureRecordSchema = v.object({
  kind: FailureKindSchema,
  message: v.string(),
  at: v.number(),
  /** 连续失败次数，决定下一次自动重试的等待时间。 */
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
  /** 上一次复核时的证据 Episode 数；模型跳过后证据翻倍才重新复核。 */
  reviewedSize: v.number(),
  review: v.nullable(ReviewRecordSchema),
  failure: v.nullable(FailureRecordSchema),
  write: v.nullable(WriteRecordSchema),
  dismissed: v.nullable(v.object({ at: v.number(), similar: v.boolean() })),
});
export type Suggestion = v.InferOutput<typeof SuggestionSchema>;

export const UsageRecordSchema = v.object({
  reviews: v.number(),
  failures: v.number(),
  inputTokens: v.number(),
  outputTokens: v.number(),
  lastAt: v.number(),
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
