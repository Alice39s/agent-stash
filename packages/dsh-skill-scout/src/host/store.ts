/**
 * 插件状态存在 `ctx.storageDomain` 的 `skill_scout` domain 里，每条记录一个文件：
 * - sessions：每个已分析会话的进度、Episode 与分析失败的原因；
 * - suggestions：每条线索的状态、摘要与摘要给出的各个 idea（草稿、写入记录与忽略记录）；
 * - usage：每天的模型调用次数与用量；
 * - calls：最近的模型调用记录。
 * 记录在打开 domain 时逐条用 valibot 校验，结构不符的记录由 DSH 备份后跳过。
 *
 * 版本 3 的一条线索可以给出多个 idea，会话记录带分析失败的原因与回溯标记。更早版本的记录由 DSH 丢弃，
 * 历史范围内的会话按新格式重新分析；已经写入的 Skill 文件留在原处。
 */
import * as v from "valibot";
import type { DshDomain, DshDomainSpec, DshTable, JsonValue } from "./dsh.ts";
import { CandidateSchema, EpisodeSchema } from "./model.ts";
import { DraftSchema, SummarySchema, type Proposal } from "./llm.ts";

export const DOMAIN_NAME = "skill_scout";
const DOMAIN_VERSION = 3;

/** 一个已分析（或分析失败）的会话。 */
export const SessionRecordSchema = v.object({
  sessionId: v.string(),
  cwd: v.nullable(v.string()),
  createdAt: v.number(),
  /** 分析时日志里的事件数；日志变长后才重新分析。读取日志失败时为 null，下次一定重新读取。 */
  eventCount: v.nullable(v.number()),
  scannedAt: v.number(),
  episodes: v.array(EpisodeSchema),
  /** 最近一次分析失败的原因；成功时为 null。日志的事件数不变就不再重试。 */
  error: v.nullable(v.string()),
  /** 回溯历史范围之外的会话时读入：修剪时保留，供搜索与提炼。 */
  backfilled: v.boolean(),
});
export type SessionRecord = v.InferOutput<typeof SessionRecordSchema>;

/**
 * 线索的状态：
 * - detected：还没有摘要；
 * - summarized：摘要给出了 idea，各 idea 有自己的状态；
 * - skipped：摘要认为不值得保存；
 * - failed：摘要失败，失败记录在线索上；
 * - dismissed：用户忽略了整条线索。
 */
export const LeadStateSchema = v.picklist([
  "detected",
  "summarized",
  "skipped",
  "failed",
  "dismissed",
]);
export type LeadState = v.InferOutput<typeof LeadStateSchema>;

/**
 * 一个 idea 的状态：
 * - proposed：等待用户同意生成草稿；
 * - ready：草稿已生成，等待用户审核保存；
 * - failed：草稿失败，失败记录在 idea 上；
 * - dismissed：用户忽略，或与「忽略类似」的 idea 相近；
 * - written：已写入 Skill 文件。
 */
export const IdeaStateSchema = v.picklist(["proposed", "ready", "failed", "dismissed", "written"]);
export type IdeaState = v.InferOutput<typeof IdeaStateSchema>;

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

/** 忽略记录；similar 表示同时屏蔽之后出现的相近线索或 idea。 */
export const DismissalSchema = v.object({ at: v.number(), similar: v.boolean() });

/** 摘要给出的一个 idea 的进展；与摘要里的 idea 按下标对应。 */
export const IdeaRecordSchema = v.object({
  state: IdeaStateSchema,
  updatedAt: v.number(),
  draft: v.nullable(DraftRecordSchema),
  /** 最近一次草稿失败。 */
  failure: v.nullable(FailureRecordSchema),
  write: v.nullable(WriteRecordSchema),
  dismissed: v.nullable(DismissalSchema),
});
export type IdeaRecord = v.InferOutput<typeof IdeaRecordSchema>;

/** 一条线索：规则检测出的候选，或用户要求提炼的整段会话与所选任务。 */
export const LeadSchema = v.object({
  id: v.string(),
  candidate: CandidateSchema,
  state: LeadStateSchema,
  detectedAt: v.number(),
  updatedAt: v.number(),
  /** 上一次摘要时的证据 Episode 数；摘要判为跳过后，证据翻倍才重新摘要。 */
  summarizedSize: v.number(),
  summary: v.nullable(SummaryRecordSchema),
  /** 摘要给出的 idea；摘要判为跳过或还没有摘要时为空。 */
  ideas: v.array(IdeaRecordSchema),
  /** 最近一次摘要失败。 */
  failure: v.nullable(FailureRecordSchema),
  dismissed: v.nullable(DismissalSchema),
});
export type Lead = v.InferOutput<typeof LeadSchema>;

/** 一天的模型用量；后台摘要的每日上限与间隔只看 `summaries` 与 `lastSummaryAt`。 */
export const UsageRecordSchema = v.object({
  /** 后台自动发起的摘要次数。 */
  summaries: v.number(),
  /** 用户发起的摘要与草稿次数。 */
  requested: v.number(),
  failures: v.number(),
  /** 未命中缓存的输入。 */
  inputTokens: v.number(),
  cacheReadTokens: v.number(),
  cacheWriteTokens: v.number(),
  outputTokens: v.number(),
  /** 最近一次后台摘要的时间。 */
  lastSummaryAt: v.number(),
});
export type UsageRecord = v.InferOutput<typeof UsageRecordSchema>;

/** 一次模型调用的记录。 */
export const CallRecordSchema = v.object({
  /** 调用结束的时间。 */
  at: v.number(),
  stage: StageSchema,
  leadId: v.string(),
  /** 草稿调用的 idea 下标；摘要调用为 null。 */
  ideaIndex: v.nullable(v.number()),
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
  detail: v.nullable(v.string()),
});
export type CallRecord = v.InferOutput<typeof CallRecordSchema>;

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
  readonly suggestions: Lead;
  readonly usage: UsageRecord;
  readonly calls: CallRecord;
}

export const SCOUT_DOMAIN: DshDomainSpec<ScoutTables> = {
  name: DOMAIN_NAME,
  version: DOMAIN_VERSION,
  layout: "per-record",
  invalidRecords: "backup-and-skip",
  tables: {
    sessions: { valueSchema: parser("sessions", SessionRecordSchema) },
    suggestions: { valueSchema: parser("suggestions", LeadSchema) },
    usage: { valueSchema: parser("usage", UsageRecordSchema) },
    calls: { valueSchema: parser("calls", CallRecordSchema) },
  },
};

/** 打开后的四张表。 */
export interface ScoutStore {
  readonly sessions: DshTable<SessionRecord>;
  readonly suggestions: DshTable<Lead>;
  readonly usage: DshTable<UsageRecord>;
  readonly calls: DshTable<CallRecord>;
}

/** 从打开的 domain 取出四张表。 */
export function storeOf(domain: DshDomain<ScoutTables>): ScoutStore {
  return {
    sessions: domain.table("sessions"),
    suggestions: domain.table("suggestions"),
    usage: domain.table("usage"),
    calls: domain.table("calls"),
  };
}

/** storageDomain 的记录键只允许字母、数字、`_` 与 `-`；其余字符转写成 `_` 加十六进制码点。 */
export function recordKey(id: string): string {
  return id.replace(/[^A-Za-z0-9-]/gu, (char) => `_${(char.codePointAt(0) ?? 0).toString(16)}`);
}

/** idea 的 id：`<线索 id>~<下标>`。 */
export function ideaId(leadId: string, index: number): string {
  return `${leadId}~${String(index)}`;
}

/** 拆开 idea 的 id；不是 idea 的写法时返回 null。 */
export function splitIdeaId(
  id: string,
): { readonly leadId: string; readonly index: number } | null {
  const at = id.lastIndexOf("~");
  const suffix = id.slice(at + 1);
  if (at <= 0 || !/^\d+$/u.test(suffix)) return null;
  return { leadId: id.slice(0, at), index: Number(suffix) };
}

/** 摘要给出的 idea 方案；没有摘要或摘要判为跳过时为空。 */
export function proposalsOf(lead: Lead): readonly Proposal[] {
  const summary = lead.summary?.summary;
  return summary?.decision === "suggest" ? summary.ideas : [];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

/** 本地日期，作为用量记录的键。 */
export function dayKey(time: number): string {
  const date = new Date(time);
  return `${String(date.getFullYear())}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/**
 * 截至今天的最近几天的日期键，最早的在前。按日历往前数，夏令时切换的那天不会重复或漏掉。
 * @param count - 天数，含今天。
 */
export function recentDays(now: number, count: number): string[] {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(now);
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (count - 1 - offset));
    return dayKey(date.getTime());
  });
}
