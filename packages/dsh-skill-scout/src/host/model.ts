/**
 * Skill Scout 的领域数据：会话里提取出的操作、Episode，以及规则检测出的候选。
 * 这些值都已脱敏、裁剪，可以直接存进 storageDomain、放进提示词或发给浏览器。
 * 类型由 valibot schema 推导，存储层读取每条记录时用同一份 schema 校验。
 */
import * as v from "valibot";

/** 命令族：决定一条命令在成功判定与信号检测里的角色。 */
export const CommandFamilySchema = v.picklist([
  "test",
  "check",
  "build",
  "install",
  "publish",
  "vcs",
  "inspect",
  "run",
]);
export type CommandFamily = v.InferOutput<typeof CommandFamilySchema>;

/** 一次工具调用在 Episode 里的角色。 */
export const OpKindSchema = v.picklist(["read", "edit", "exec", "delegate"]);
export type OpKind = v.InferOutput<typeof OpKindSchema>;

/** 一次工具调用（含 run_code 里的子调用）的精简记录。 */
export const OpSchema = v.object({
  /** 结果事件的 seq，作为证据引用。 */
  seq: v.number(),
  kind: OpKindSchema,
  /** 工具名，例如 `bash`、`edit`。 */
  tool: v.string(),
  /** 命令签名（exec）、文件路径（edit）或工具名。 */
  sig: v.string(),
  /** exec 命令链里各段非查看类命令的签名，去重；其他操作为空。 */
  parts: v.array(v.string()),
  /** exec 的命令族；命令链里只要有一段是测试或检查，就取那一族。 */
  family: v.nullable(CommandFamilySchema),
  /** exec 的命令文本，已脱敏、裁剪。 */
  command: v.nullable(v.string()),
  /** edit 的目标文件，相对会话工作目录。 */
  target: v.nullable(v.string()),
  ok: v.boolean(),
  /** shell 命令的退出码；不是 shell 命令或被信号终止时为 null。 */
  exit: v.nullable(v.number()),
  /** 失败时最能说明问题的一行输出（已脱敏、裁剪）或错误码。 */
  error: v.nullable(v.string()),
});
export type Op = v.InferOutput<typeof OpSchema>;

/** 修复动作的类型，决定一次恢复是否算可复用的操作经验。 */
export const FixKindSchema = v.picklist(["install", "config", "command", "source"]);
export type FixKind = v.InferOutput<typeof FixKindSchema>;

/** 一次失败经修复后在同一命令上成功。 */
export const RecoverySchema = v.object({
  failSeq: v.number(),
  okSeq: v.number(),
  fixSeqs: v.array(v.number()),
  /** 恢复成功的命令签名。 */
  sig: v.string(),
  /** 规范化的错误签名，跨会话比较用。 */
  errorSig: v.string(),
  fixKinds: v.array(FixKindSchema),
  /** 修复里有安装、配置改动或命令改写，而不只是改源码。 */
  procedural: v.boolean(),
});
export type Recovery = v.InferOutput<typeof RecoverySchema>;

/**
 * 任务结果，只依据工具证据：
 * - verified：最后一次改动之后，测试、检查或构建通过；
 * - succeeded：没有验证命令，但最后的有效命令成功且之后没有失败；
 * - unverified：回合正常结束，没有可核查的执行证据；
 * - disputed：工具证据显示成功，但用户随后的消息表示不对；
 * - failed：最后的验证或命令失败，或回合出错；
 * - aborted：回合被取消。
 */
export const OutcomeSchema = v.picklist([
  "verified",
  "succeeded",
  "unverified",
  "disputed",
  "failed",
  "aborted",
]);
export type Outcome = v.InferOutput<typeof OutcomeSchema>;

const CountsSchema = v.object({
  read: v.number(),
  edit: v.number(),
  exec: v.number(),
  delegate: v.number(),
});

/** 从一条人类消息开始、到下一条人类消息之前的一段工作。 */
export const EpisodeSchema = v.object({
  /** `<会话 id>:<起始 seq>`。 */
  id: v.string(),
  sessionId: v.string(),
  cwd: v.nullable(v.string()),
  startSeq: v.number(),
  endSeq: v.number(),
  startedAt: v.number(),
  endedAt: v.number(),
  /** 用户的原始请求，已脱敏、裁剪。 */
  goal: v.string(),
  /** 下一条人类消息，用于识别用户否定；已脱敏、裁剪。 */
  followup: v.nullable(v.string()),
  /** fork 出的会话重放了继承前缀里的同一请求，不算独立的一次。 */
  replay: v.boolean(),
  outcome: OutcomeSchema,
  /** 支持结果判定的操作 seq。 */
  evidence: v.array(v.number()),
  ops: v.array(OpSchema),
  recoveries: v.array(RecoverySchema),
  /** 改动过的文件，相对工作目录。 */
  files: v.array(v.string()),
  /** 各类操作数量，包含没有保留在 `ops` 里的读取。 */
  counts: CountsSchema,
  /** Agent 最后的回复。只作背景，不作成功证据。 */
  reply: v.nullable(v.string()),
});
export type Episode = v.InferOutput<typeof EpisodeSchema>;

/** 候选的信号类型。 */
export const SignalKindSchema = v.picklist(["repeated", "recovery", "complex"]);
export type SignalKind = v.InferOutput<typeof SignalKindSchema>;

/** 规则检测出的一条候选。 */
export const CandidateSchema = v.object({
  /** 指纹，同一模式在多次检测间保持不变。 */
  id: v.string(),
  kind: SignalKindSchema,
  /** 用来比较相似候选的特征：命令签名或错误签名的集合。 */
  features: v.array(v.string()),
  /** 证据 Episode，最新的在前。 */
  episodeIds: v.array(v.string()),
  /** 独立会话数。 */
  occurrences: v.number(),
  score: v.number(),
  /** 代表性 Episode 的用户请求，已脱敏、裁剪。 */
  goal: v.string(),
  /** 候选涉及的工作目录；多个时取出现最多的。 */
  cwd: v.nullable(v.string()),
});
export type Candidate = v.InferOutput<typeof CandidateSchema>;
