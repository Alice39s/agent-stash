import { renderTurns, type ContextTurn } from "./context.ts";
import { SHARED_RULES, UNCHANGED } from "./presets.ts";
import { maskSecrets, unmaskSecrets } from "./secrets.ts";
import type { Failure } from "./wire.ts";

/** 一次改写用的模型路由；`reasoningEffort` 省略时由模型决定。 */
export interface ModelRoute {
  readonly provider: string;
  readonly model: string;
  readonly reasoningEffort?: string;
}

/** 模型流里本插件读取的字段。 */
export interface StreamChunkView {
  readonly type: string;
  readonly text?: string;
  readonly reason?: {
    readonly kind: string;
    readonly failure?: { readonly message: string; readonly code?: string };
  };
}

/** 发给模型的用户消息，与 DSH `createUserMessage` 生成的消息字段相同。 */
export interface RewriteMessage {
  readonly id: string;
  readonly role: "user";
  readonly content: readonly { readonly type: "text"; readonly text: string }[];
  readonly source: { readonly kind: string };
}

/** `ctx.llm.prepareCall` 返回的一次性调用。 */
export interface PreparedCallView {
  readonly config: ModelRoute;
  stream(options: {
    readonly provider: string;
    readonly model: string;
    readonly reasoningEffort?: string;
    readonly system: string;
    readonly messages: readonly RewriteMessage[];
    readonly signal: AbortSignal;
  }): AsyncIterable<StreamChunkView>;
}

/** DSH LLM 服务里本插件用到的部分。 */
export interface LlmView {
  prepareCall(config: ModelRoute, signal?: AbortSignal): Promise<PreparedCallView>;
}

/** 发给模型的系统提示与用户输入；`draft` 是凭据换成占位符之后的草稿。 */
export interface RewritePrompt {
  readonly system: string;
  readonly input: string;
  readonly draft: string;
  readonly secrets: readonly string[];
}

/** 组装改写请求：共用规则加预设的模式说明作为系统提示，会话上下文与草稿分段放进用户输入。 */
export function buildPrompt(
  draft: string,
  instructions: string,
  turns: readonly ContextTurn[],
): RewritePrompt {
  const masked = maskSecrets(draft);
  const sections: string[] = [];
  if (turns.length > 0) {
    sections.push(`<conversation_context>\n${renderTurns(turns)}\n</conversation_context>`);
  }
  sections.push(`<draft_prompt>\n${masked.text}\n</draft_prompt>`);
  return {
    system: `${SHARED_RULES}\n\n${instructions}`,
    input: sections.join("\n\n"),
    draft: masked.text,
    secrets: masked.secrets,
  };
}

const TAGGED = /<rewritten_prompt>([\s\S]*?)(?:<\/rewritten_prompt>|$)/u;
const WRAPPING_FENCE = /^(`{3,})[\w-]*\n([\s\S]*?)\n\1$/u;

/**
 * 模型输出里的改写结果：取 `<rewritten_prompt>` 里的内容，拆掉包住整段结果的代码围栏。
 * 模型认为无需改动时返回 {@link UNCHANGED}。
 */
export function extractResult(raw: string, draft: string): string {
  const tagged = TAGGED.exec(raw);
  let text = (tagged?.[1] ?? raw).trim();
  if (text === UNCHANGED) return UNCHANGED;
  const fence = WRAPPING_FENCE.exec(text);
  if (fence?.[2] !== undefined && !WRAPPING_FENCE.test(draft.trim())) text = fence[2].trim();
  return text;
}

/** 回答或解释式的开头：结果这样开头而草稿不是时，说明模型在回应草稿。 */
const PREAMBLES = [
  "以下是",
  "好的",
  "当然",
  "没问题",
  "改写后",
  "here is",
  "here's",
  "sure",
  "certainly",
  "of course",
  "rewritten prompt",
];

const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu;
const LATIN = /\p{Script=Latin}/gu;

/** 草稿主要用中日韩文字（`true`）、拉丁字母（`false`），字太少时无法判断（`undefined`）。 */
function mainlyCjk(text: string): boolean | undefined {
  const prose = text.replace(/```[\s\S]*?```|`[^`\n]*`|https?:\/\/\S+/gu, "");
  const cjk = prose.match(CJK)?.length ?? 0;
  // 一个汉字大约相当于一个英文单词，按 4 个字母折算。
  const latin = (prose.match(LATIN)?.length ?? 0) / 4;
  if (cjk + latin < 6) return undefined;
  const share = cjk / (cjk + latin);
  if (share >= 0.6) return true;
  if (share <= 0.2) return false;
  return undefined;
}

/** 草稿里必须原样出现在结果中的片段：代码块、行内代码、链接与凭据占位符。 */
export function protectedTokens(draft: string): string[] {
  const tokens = new Set<string>();
  for (const match of draft.matchAll(/```[^\n]*\n([\s\S]*?)\n```/gu)) {
    const body = match[1]?.trim();
    if (body !== undefined && body !== "") tokens.add(body);
  }
  const outsideBlocks = draft.replace(/```[\s\S]*?```/gu, "");
  for (const match of outsideBlocks.matchAll(/`([^`\n]+)`/gu)) {
    if (match[1] !== undefined) tokens.add(match[1]);
  }
  for (const match of draft.matchAll(
    /https?:\/\/[^\s<>()"'`]+[^\s<>()"'`.,;:!?。，；：！？）]/gu,
  )) {
    tokens.add(match[0]);
  }
  for (const match of draft.matchAll(/⟦secret-\d+⟧/gu)) tokens.add(match[0]);
  return [...tokens];
}

/**
 * 检查改写结果能否替换草稿，不能时返回原因：像在回答草稿、换了语言，或者丢了草稿里必须原样保留的片段。
 * 两边都是凭据换成占位符之后的文本。
 */
export function checkResult(draft: string, result: string): string | undefined {
  const head = result.trimStart().toLowerCase();
  const draftHead = draft.trimStart().toLowerCase();
  const preamble = PREAMBLES.find((word) => head.startsWith(word) && !draftHead.startsWith(word));
  if (preamble !== undefined) return `the result starts like a reply ("${preamble}")`;
  const before = mainlyCjk(draft);
  const after = mainlyCjk(result);
  if (before !== undefined && after !== undefined && before !== after) {
    return "the result is not in the language of the draft";
  }
  const missing = protectedTokens(draft).find((token) => !result.includes(token));
  if (missing !== undefined) return `the result dropped or changed "${missing.slice(0, 60)}"`;
  return undefined;
}

/** 一次改写的结果。 */
export type RewriteOutcome =
  | { readonly ok: true; readonly text: string; readonly unchanged: boolean }
  | ({ readonly ok: false } & Failure);

function failed(reason: Failure["reason"], message: string): RewriteOutcome {
  return { ok: false, reason, message };
}

/** 处理模型的完整输出：识别无需改动的哨兵、检查结果，再把占位符换回原文。 */
export function settleOutput(
  raw: string,
  prompt: RewritePrompt,
  original: string,
  label: string,
): RewriteOutcome {
  const result = extractResult(raw, prompt.draft);
  if (result === UNCHANGED) return { ok: true, text: original, unchanged: true };
  if (result === "") return failed("empty", `${label} returned no text`);
  if (result === prompt.draft.trim()) return { ok: true, text: original, unchanged: true };
  const problem = checkResult(prompt.draft, result);
  if (problem !== undefined) return failed("invalid", `${label}: ${problem}`);
  return { ok: true, text: unmaskSecrets(result, prompt.secrets), unchanged: false };
}

/**
 * 调用模型改写一次。`signal` 是调用方的取消信号（浏览器断开时触发），`timeoutMs` 是本次改写的总时限；
 * 两者都会中止模型请求。调用方取消时返回 `undefined`，其余失败都以原因与细节返回。
 */
export async function runRewrite(
  llm: LlmView,
  route: ModelRoute,
  prompt: RewritePrompt,
  original: string,
  options: { readonly signal: AbortSignal; readonly timeoutMs: number },
): Promise<RewriteOutcome | undefined> {
  const timer = AbortSignal.timeout(options.timeoutMs);
  const signal = AbortSignal.any([options.signal, timer]);
  const seconds = String(Math.round(options.timeoutMs / 1000));
  const timeout = (): RewriteOutcome => failed("timeout", `no result within ${seconds} s`);
  const label = `${route.provider}/${route.model}`;
  let raw = "";
  try {
    const call = await llm.prepareCall(route, signal);
    const messages: RewriteMessage[] = [
      {
        id: crypto.randomUUID(),
        role: "user",
        content: [{ type: "text", text: prompt.input }],
        source: { kind: "dsh-enhance" },
      },
    ];
    for await (const chunk of call.stream({
      ...call.config,
      system: prompt.system,
      messages,
      signal,
    })) {
      if (chunk.type === "text-delta") raw += chunk.text ?? "";
      if (chunk.type !== "finish" || chunk.reason === undefined) continue;
      const { kind, failure } = chunk.reason;
      if (kind === "max-tokens") return failed("truncated", `${label} stopped at its output limit`);
      if (kind === "aborted" || kind === "error") {
        if (options.signal.aborted) return undefined;
        if (timer.aborted) return timeout();
        return failed("model", `${label}: ${failure?.message ?? kind}`);
      }
    }
  } catch (error) {
    if (options.signal.aborted) return undefined;
    if (timer.aborted) return timeout();
    return failed("model", `${label}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return settleOutput(raw, prompt, original, label);
}
