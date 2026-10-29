/**
 * 从步骤序列里切出 Episode：一条人类消息开启一段工作，到下一条人类消息之前结束。
 * 这里只依据工具证据判定结果；Agent 的自述只保留为背景，不参与判定。
 */
import { relative } from "pathe";
import {
  isOpaque,
  isVerification,
  optionsOf,
  parseCommand,
  type CommandSegment,
} from "./commands.ts";
import type {
  CommandFamily,
  Episode,
  FixKind,
  Op,
  OpKind,
  Outcome,
  Part,
  Recovery,
} from "./model.ts";
import { clip, oneLine } from "./redact.ts";
import type { DshSessionLog, JsonObject } from "./dsh.ts";
import { stepsOf, type Step } from "./trajectory.ts";

/** 构建 Episode 需要的会话信息与处理选项。 */
export interface EpisodeInput {
  readonly sessionId: string;
  readonly cwd: string | null;
  /** 本会话自有部分的步骤。 */
  readonly steps: readonly Step[];
  /** 继承前缀里出现过的人类消息（规范化后），用于识别 fork 重放。 */
  readonly inheritedGoals: ReadonlySet<string>;
  /** 本地脱敏函数。 */
  readonly redact: (text: string) => string;
  /** 为 false 时不保留任何工具输出片段，只保留退出码与命令。 */
  readonly keepOutput: boolean;
}

/*
 * 工具按名称归类。DSH 自带的工具名固定，MCP 与其它 Agent 的同类工具名各不相同（`Edit`、`MultiEdit`、
 * `mcp__fs__edit_file`、`run_terminal_cmd`），所以先去掉 MCP 前缀、转成小写，再按动词与对象匹配。
 * 只认动词与文件类对象的组合：`create_file` 是改动，`create_issue` 不是。
 */
const SHELL_TOOL =
  /^(?:bash|pwsh|powershell|shell|sh|zsh|(?:run|exec|execute)_(?:shell_)?(?:command|cmd|terminal_cmd|in_terminal)|shell_(?:command|exec))$/u;
const EDIT_TOOL =
  /^(?:(?:multi_?)?edit|write|apply_?patch|str_replace\w*|notebook_?edit|edit_notebook|(?:create|write|edit|replace|patch|insert|update|append|delete|remove|rename|move)_(?:in_)?files?|search_?replace|replace_in_file|insert_(?:code|text|lines?))$/u;
const READ_TOOL =
  /^(?:(?:read|view|cat|glob|grep|lsp|skill|fetch|search|ls|tree|find)(?:_(?:file|files|text_file|multiple_files|dir|directory|image|mcp_resource|search|code|symbols?|definition|references|url|page|tree))?|list_(?:dir|directory|files|allowed_directories)|open_file|file_search|grep_search|codebase_search|search_(?:files|code|codebase)|find_(?:files|by_name)|web_(?:fetch|search)|get_file_contents|directory_tree)$/u;
const DELEGATE_TOOL =
  /^(?:ralph|spawn_teammate|subagent\w*|workflow|task|agent|spawn_agent|dispatch_agent)$/u;
/** 规划、提问、任务板这类 DSH 工具不改变工作区，也不是执行证据。 */
const META_TOOL =
  /^(ask_user_question|create_goal|exit_plan_mode|get_goal|interrupt_agent|job_|list_|load_workspace_dependencies|plugin_|present|propose_action|schedule_|send_message|session_|team_task_|terminal_|todo_write|update_goal|wait_agent|working_directory|cordis_inspect_)/u;

/** 工具名去掉 MCP 前缀并转小写：`mcp__fs__edit_file`、`fs.edit_file` 都是 `edit_file`。 */
export function bareTool(tool: string): string {
  const lower = tool.toLowerCase();
  return lower.split(/__|[.:/]/u).at(-1) ?? lower;
}

/** 一次工具调用的类别；不改变工作区也不是执行证据的工具为 null。 */
export function toolKind(tool: string): "shell" | "edit" | "read" | "delegate" | null | "other" {
  const name = bareTool(tool);
  if (SHELL_TOOL.test(name)) return "shell";
  if (EDIT_TOOL.test(name)) return "edit";
  if (READ_TOOL.test(name)) return "read";
  if (DELEGATE_TOOL.test(name)) return "delegate";
  return META_TOOL.test(name) ? null : "other";
}

/** apply_patch 一类工具把路径写在补丁文本里。 */
const PATCH_PATH = /^(?:\*\*\* (?:Add|Update|Delete) File: |\+\+\+ (?:b\/)?)(\S.*)$/mu;

/** 有固定角色的文件：改动它们是流程里的一步，例如发布前改 CHANGELOG.md。 */
const NOTABLE_FILE =
  /(?:^|\/)(package\.json|CHANGELOG\.md|README\.md|Cargo\.toml|pyproject\.toml|go\.mod|Dockerfile|(?:docker-)?compose\.ya?ml|Makefile|tsconfig\.json|\.npmrc|\.env(?:\.[\w-]+)?|[\w-]+\.config\.[cm]?[jt]s)$/u;

/** 改动的动作：有固定角色的文件带上文件名，工作流文件归为一类，其余只是 `edit`。 */
export function editKey(target: string): string {
  if (/(?:^|\/)\.github\/workflows\/[^/]+\.ya?ml$/u.test(target)) return "edit .github/workflows";
  const notable = NOTABLE_FILE.exec(target)?.[1];
  return notable === undefined ? "edit" : `edit ${notable}`;
}

/** 配置类文件：改动它们而让命令恢复，算作可复用的操作经验。 */
const CONFIG_FILE =
  /(^|\/)(package\.json|pnpm-workspace\.yaml|tsconfig[^/]*\.json|[^/]*\.config\.([cm]?[jt]s|json)|\.[^/]*rc(\.[a-z]+)?|[^/]*\.toml|[^/]*\.ya?ml|Dockerfile|Makefile|[^/]*\.lock|\.env[^/]*|requirements[^/]*\.txt|go\.mod|\.npmrc|\.nvmrc|\.tool-versions)$/u;

/** 文档类文件：在验证之后改它们不影响验证结论。 */
const DOC_FILE = /\.(md|mdx|txt|rst)$/iu;

/** 用户随后表示结果不对的说法；只用于把成功降级，不用于判定成功。 */
const DISSENT =
  /(不对|不行|没用|错了|还是(报错|不行|失败|有问题)|失败了|回滚|撤销|\bdoesn'?t work\b|\bdidn'?t work\b|\bnot working\b|\bstill (fails?|failing|broken|errors?)\b|\bwrong\b|\brevert\b|\bbroke\b)/iu;

/** 一行输出里出现这些词时，它比其它行更能说明失败原因。 */
const ERROR_LINE =
  /(error|fail|fatal|panic|exception|cannot|can't|unable|not found|no such|denied|refused|invalid|missing|mismatch|unsupported|conflict|ERR!|E[A-Z]{3,}|TS\d{4})/iu;

const EXIT_MARKER = /\n?\[exit code: (\d+)\]\s*$/u;
const SIGNAL_MARKER = /\n?\[killed by signal: [^\]\n]+\]\s*$/u;

const MAX_OPS = 160;
const GOAL_CHARS = 600;
const FOLLOWUP_CHARS = 300;
/** 回合进行中的用户消息最多保留几条。 */
const MAX_STEERING = 3;
const REPLY_CHARS = 400;
const COMMAND_CHARS = 240;
const ERROR_CHARS = 200;
const MAX_FILES = 20;

/** 规范化一条人类消息，用于比较是否是同一请求。 */
export function goalKey(text: string): string {
  return clip(oneLine(text).toLowerCase(), 400);
}

function stringArg(args: JsonObject, ...keys: readonly string[]): string | null {
  for (const key of keys) {
    const value = args[key];
    if (typeof value === "string" && value.trim() !== "") return value;
  }
  return null;
}

/** 从失败输出里挑出最能说明原因的一行。 */
function errorLine(output: string): string | null {
  const lines = output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !EXIT_MARKER.test(line));
  const hit = lines.find((line) => ERROR_LINE.test(line)) ?? lines.at(-1);
  return hit === undefined ? null : hit;
}

/** 解析 shell 工具的退出状态：DSH 只在非零退出时追加 `[exit code: N]`。 */
function exitStatus(output: string, ok: boolean): number | null {
  if (SIGNAL_MARKER.test(output)) return null;
  const marker = EXIT_MARKER.exec(output);
  if (marker?.[1] !== undefined) return Number(marker[1]);
  return ok ? 0 : null;
}

function relativeTarget(path: string, cwd: string | null): string {
  if (cwd !== null && path.startsWith(`${cwd}/`)) return relative(cwd, path);
  return path;
}

/** 链里的测试与检查优先，其余取主签名的命令族。 */
function strongestFamily(families: readonly CommandFamily[], main: CommandFamily): CommandFamily {
  if (families.includes("test")) return "test";
  if (families.includes("check")) return "check";
  return main;
}

/** 按动作去重的非查看类命令段。 */
function partsOf(segments: readonly CommandSegment[]): Part[] {
  const byKey = new Map<string, Part>();
  for (const { sig, key, family } of segments) {
    if (family !== "inspect" && !byKey.has(key)) byKey.set(key, { sig, key, family });
  }
  return [...byKey.values()];
}

/** 改动工具的目标路径：参数里的路径，或补丁文本里的第一个文件。 */
function editTarget(args: JsonObject): string | null {
  const path = stringArg(args, "file_path", "path", "filePath", "target_file", "filename", "file");
  if (path !== null) return path;
  const patch = stringArg(args, "patch", "input", "diff");
  return patch === null ? null : (PATCH_PATH.exec(patch)?.[1]?.trim() ?? null);
}

function opOf(step: Extract<Step, { kind: "tool" }>, input: EpisodeInput): Op | OpKind | null {
  const { tool, args } = step;
  const base = { seq: step.seq, tool, command: null, target: null, exit: null, error: null };
  const kind = toolKind(tool);
  if (kind === "shell") {
    const raw = stringArg(args, "command", "cmd", "script", "commandLine");
    if (raw === null) return null;
    // 签名也从脱敏后的命令解析：凭据不会因为落在子命令的位置而进入签名。
    const command = input.redact(raw);
    const parsed = parseCommand(command);
    if (parsed.main === undefined) return null;
    const exit = exitStatus(step.output, step.ok);
    const ok = step.ok && exit === 0;
    const failure =
      ok || !input.keepOutput ? null : errorLine(step.output.replace(EXIT_MARKER, ""));
    return {
      ...base,
      kind: "exec",
      sig: parsed.main.sig,
      key: parsed.main.key,
      parts: partsOf(parsed.segments),
      family: strongestFamily(
        parsed.segments.map((segment) => segment.family),
        parsed.main.family,
      ),
      command: clip(oneLine(command), COMMAND_CHARS),
      ok,
      exit,
      error: ok
        ? null
        : failure === null
          ? step.errorCode
          : clip(input.redact(failure), ERROR_CHARS),
    };
  }
  if (kind === "edit") {
    const path = editTarget(args);
    if (path === null) return null;
    const target = clip(input.redact(relativeTarget(path, input.cwd)), 200);
    const key = editKey(target);
    return {
      ...base,
      kind: "edit",
      sig: target,
      key,
      parts: [],
      family: null,
      target,
      ok: step.ok,
    };
  }
  if (kind === "read") return "read";
  if (kind === null) return null;
  if (kind === "delegate") {
    const name = bareTool(tool);
    return {
      ...base,
      kind: "delegate",
      sig: tool,
      key: name,
      parts: [],
      family: null,
      ok: step.ok,
    };
  }
  // MCP 等其它工具按一次动作记录，签名带上前缀以免和 shell 命令混淆；动作不带 MCP 服务名。
  const sig = `tool:${tool}`;
  const key = `tool:${bareTool(tool)}`;
  return {
    ...base,
    kind: "exec",
    sig,
    key,
    parts: [{ sig, key, family: "run" }],
    family: "run",
    ok: step.ok,
    error: step.ok ? null : step.errorCode,
  };
}

/**
 * 规范化一行错误：抽掉会随环境变化的部分（URL、路径、版本号、哈希、行列号、数字、引号内容），
 * 留下错误的类别与措辞，跨会话比较同一类错误。
 */
export function normalizeError(text: string): string {
  return (
    text
      .replace(/\bhttps?:\/\/\S+/gu, "<url>")
      // 平台与架构：同一个缺失的原生模块在不同机器上名字不同（`rollup-darwin-arm64`、`rollup-linux-x64-gnu`）。
      .replace(
        /\b(?:darwin|linux|win32|windows|freebsd|android)[-_](?:arm64|aarch64|x64|x86_64|ia32|arm|riscv64|ppc64|s390x|loong64)(?:[-_](?:gnu|musl|msvc|gnueabihf))?\b/giu,
        "<platform>",
      )
      .replace(/(["'`]).*?\1/gu, "<str>")
      .replace(
        /(?<=^|[\s"'(=:])(?:[A-Za-z]:)?(?:~|\.{1,2})?[\\/][\w.@~-]+(?:[\\/][\w.@~-]+)*/gu,
        "<path>",
      )
      .replace(/\bv?\d+\.\d+(?:\.\d+)?(?:[-+][\w.-]+)?\b/gu, "<ver>")
      .replace(/\b[0-9a-f]{7,}\b/giu, "<hex>")
      .replace(/(?:<path>|\w)(?::\d+){1,2}\b/gu, (match) =>
        match.replace(/(?::\d+){1,2}$/u, ":<pos>"),
      )
      .replace(/\b\d+\b/gu, "<n>")
      .replace(/\s+/gu, " ")
      .trim()
  );
}

/** 错误签名：命令动作加规范化的错误行，同一类错误在不同会话里得到相同的签名。 */
export function errorSignature(op: Op): string {
  if (op.error === null) return `${op.key} exit ${String(op.exit ?? "?")}`;
  return clip(`${op.key}: ${normalizeError(op.error)}`, 200);
}

/**
 * 一次成功的操作算哪一类修复；失败的编辑与命令没有改变任何东西，不算修复。
 * 内联代码、HTTP 请求这类说明不了做了什么的命令多半是在查看，也不算修复。
 */
function fixKindOf(op: Op): FixKind | null {
  if (!op.ok) return null;
  if (op.kind === "edit")
    return op.target !== null && CONFIG_FILE.test(op.target) ? "config" : "source";
  if (op.kind !== "exec") return null;
  if (op.family === "install") return "install";
  if (op.family === "run" && !isOpaque(op.key)) return "command";
  return null;
}

/** 失败与通过的两次运行换了选项或环境变量：`pnpm test` 改成 `pnpm test --runInBand`。只换文件或参数值不算。 */
function rewritten(failed: Op, passed: Op): boolean {
  if (failed.command === null || passed.command === null || isOpaque(passed.key)) return false;
  const before = optionsOf(failed.command);
  const after = optionsOf(passed.command);
  return before.length !== after.length || before.some((option) => !after.includes(option));
}

/**
 * 找出「失败 → 修复 → 同一动作成功」的因果链。动作相同即可，写法可以不同（`npm test` 失败、
 * `pnpm test` 通过）。没有任何修复动作的重试不算恢复。
 * @param ops - 一个 Episode 的操作，按 seq 排列。
 * @returns 每个最终成功的失败链一条记录。
 */
export function findRecoveries(ops: readonly Op[]): Recovery[] {
  const recoveries: Recovery[] = [];
  const open = new Map<string, number>();
  ops.forEach((op, index) => {
    if (op.kind !== "exec" || op.family === "inspect") return;
    if (!op.ok) {
      if (!open.has(op.key)) open.set(op.key, index);
      return;
    }
    const start = open.get(op.key);
    if (start === undefined) return;
    open.delete(op.key);
    const failed = ops[start];
    if (failed === undefined) return;
    const between = ops.slice(start + 1, index);
    const fixes = between.filter((candidate) => fixKindOf(candidate) !== null);
    const kinds = new Set(fixes.map((candidate) => fixKindOf(candidate)).filter((k) => k !== null));
    if (rewritten(failed, op)) kinds.add("command");
    if (kinds.size === 0) return;
    const fixKinds = [...kinds].toSorted();
    recoveries.push({
      failSeq: failed.seq,
      okSeq: op.seq,
      fixSeqs: fixes.map((candidate) => candidate.seq),
      sig: op.sig,
      key: op.key,
      errorSig: errorSignature(failed),
      fixKinds,
      procedural: fixKinds.some((kind) => kind !== "source"),
    });
  });
  return recoveries;
}

/** 每个动作只看最后一次结果：`npm test` 失败后 `pnpm test` 通过，这个动作算通过。 */
function lastPerKey(ops: readonly Op[]): Op[] {
  const last = new Map<string, Op>();
  for (const op of ops) last.set(op.key, op);
  return [...last.values()];
}

/**
 * 依据工具证据判定结果。
 * @param ops - Episode 的操作。
 * @param reason - 最后一个回合的结束原因。
 * @param followup - 下一条人类消息。
 * @returns 结果与支持它的操作 seq。
 */
export function judgeOutcome(
  ops: readonly Op[],
  reason: string,
  followup: string | null,
): { readonly outcome: Outcome; readonly evidence: readonly number[] } {
  if (reason === "aborted") return { outcome: "aborted", evidence: [] };
  const lastEdit = ops.findLastIndex(
    (op) => op.kind === "edit" && op.ok && !(op.target !== null && DOC_FILE.test(op.target)),
  );
  const after = ops.slice(lastEdit + 1).filter((op) => op.kind === "exec");
  const verifications = lastPerKey(
    after.filter((op) => op.family !== null && isVerification(op.family)),
  );
  // 最后一次编辑之后的每条命令（只读查看除外）以最后一次结果为准；任何一条停在失败上，任务就没有完成。
  const actions = lastPerKey(after.filter((op) => op.family !== "inspect"));
  const failures = actions.filter((op) => !op.ok);
  let outcome: Outcome;
  if (reason !== "completed" || failures.length > 0) outcome = "failed";
  else if (verifications.length > 0) outcome = "verified";
  else if (actions.length > 0) outcome = "succeeded";
  else outcome = "unverified";
  if (
    (outcome === "verified" || outcome === "succeeded") &&
    followup !== null &&
    DISSENT.test(followup)
  ) {
    outcome = "disputed";
  }
  const evidence =
    outcome === "failed"
      ? failures
      : outcome === "unverified"
        ? []
        : verifications.length > 0
          ? verifications
          : actions;
  return { outcome, evidence: evidence.map((op) => op.seq) };
}

/** 超出上限时保留被引用的操作，其余从最早的开始丢弃。 */
function retain(ops: readonly Op[], keep: ReadonlySet<number>): Op[] {
  if (ops.length <= MAX_OPS) return [...ops];
  const budget = Math.max(0, MAX_OPS - keep.size);
  const others = ops.filter((op) => !keep.has(op.seq)).slice(-budget);
  const kept = new Set([...keep, ...others.map((op) => op.seq)]);
  return ops.filter((op) => kept.has(op.seq));
}

function episodeOf(
  input: EpisodeInput,
  human: Extract<Step, { kind: "human" }>,
  body: readonly Step[],
  followup: string | null,
): Episode | null {
  const turnEnds = body.filter((step) => step.kind === "turn-end");
  const lastTurnEnd = turnEnds.at(-1);
  const lastStep = body.at(-1);
  // 回合还在进行（最后一步不是回合结束）时 Episode 尚未完成。
  if (lastTurnEnd === undefined || lastStep?.kind !== "turn-end") return null;
  const counts: Record<OpKind, number> = { read: 0, edit: 0, exec: 0, delegate: 0 };
  const ops: Op[] = [];
  const steering: string[] = [];
  let reply: string | null = null;
  for (const step of body) {
    if (step.kind === "reply") reply = step.text;
    if (step.kind === "human") steering.push(clip(input.redact(step.text), FOLLOWUP_CHARS));
    if (step.kind !== "tool") continue;
    const op = opOf(step, input);
    if (op === null) continue;
    if (typeof op === "string") {
      counts[op] += 1;
      continue;
    }
    counts[op.kind] += 1;
    ops.push(op);
  }
  if (ops.length === 0) return null;
  const safeFollowup = followup === null ? null : clip(input.redact(followup), FOLLOWUP_CHARS);
  const { outcome, evidence } = judgeOutcome(ops, lastTurnEnd.reason, followup);
  const recoveries = findRecoveries(ops);
  const referenced = new Set([
    ...evidence,
    ...recoveries.flatMap((recovery) => [recovery.failSeq, recovery.okSeq, ...recovery.fixSeqs]),
  ]);
  const files = [...new Set(ops.flatMap((op) => (op.target === null ? [] : [op.target])))];
  return {
    id: `${input.sessionId}:${String(human.seq)}`,
    sessionId: input.sessionId,
    cwd: input.cwd,
    startSeq: human.seq,
    endSeq: lastTurnEnd.seq,
    startedAt: human.time,
    endedAt: lastTurnEnd.time,
    goal: clip(input.redact(human.text), GOAL_CHARS),
    followup: safeFollowup,
    steering: steering.slice(-MAX_STEERING),
    replay: input.inheritedGoals.has(goalKey(human.text)),
    outcome,
    evidence: [...evidence],
    ops: retain(ops, referenced),
    recoveries,
    files: files.slice(0, MAX_FILES),
    counts,
    reply: reply === null ? null : clip(input.redact(reply), REPLY_CHARS),
  };
}

/**
 * 把一个会话的自有步骤切成 Episode。尚未结束的最后一段不产出。
 * @param input - 会话信息、步骤与处理选项。
 * @returns 已完成且至少有一次有效操作的 Episode。
 */
export function buildEpisodes(input: EpisodeInput): Episode[] {
  // 回合进行中插入的人类消息是对当前任务的补充，不开启新的 Episode。
  const starts: { readonly step: Extract<Step, { kind: "human" }>; readonly index: number }[] = [];
  let idle = true;
  input.steps.forEach((step, index) => {
    if (step.kind === "human") {
      if (idle) starts.push({ step, index });
      idle = false;
    } else if (step.kind === "turn-end") idle = true;
  });
  const episodes: Episode[] = [];
  starts.forEach(({ step, index }, position) => {
    const next = starts[position + 1];
    const body = input.steps.slice(index + 1, next?.index ?? input.steps.length);
    const episode = episodeOf(input, step, body, next?.step.text ?? null);
    if (episode !== null) episodes.push(episode);
  });
  return episodes;
}

/** 处理一个会话日志时的本地选项。 */
export interface LogOptions {
  readonly redact: (text: string) => string;
  readonly keepOutput: boolean;
}

/**
 * 从一份完整会话日志里提取自有部分的 Episode；继承前缀只用来识别重放。
 * @param log - `sessionQuery.readSession` 的结果。
 * @param options - 脱敏与输出保留选项。
 * @returns 已完成的 Episode。
 */
export function episodesOfLog(log: DshSessionLog, options: LogOptions): Episode[] {
  const { session, inheritedEventCount, events } = log;
  const inherited = stepsOf(session.id, events.slice(0, inheritedEventCount), 0);
  const inheritedGoals = new Set(
    inherited.flatMap((step) => (step.kind === "human" ? [goalKey(step.text)] : [])),
  );
  return buildEpisodes({
    sessionId: session.id,
    cwd: session.cwd ?? null,
    steps: stepsOf(session.id, events, inheritedEventCount),
    inheritedGoals,
    ...options,
  });
}
