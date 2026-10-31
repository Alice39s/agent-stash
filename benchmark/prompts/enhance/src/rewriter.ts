import { selectTurns } from "../../../../dsh/enhance/src/context.ts";
import { BUILTIN_INSTRUCTIONS, type BuiltinPreset } from "../../../../dsh/enhance/src/presets.ts";
import { expandIncludes, type References } from "../../../../dsh/enhance/src/references.ts";
import {
  buildPrompt,
  type LlmView,
  type RewritePrompt,
} from "../../../../dsh/enhance/src/rewrite.ts";
import { DEFAULT_SETTINGS } from "../../../../dsh/enhance/src/settings-value.ts";
import { complete, type ChatEndpoint, type ChatReply } from "../../shared/chat.ts";

/**
 * 把 OpenAI 兼容接口包成插件调用模型用的 `LlmView`，让评测走插件自己的 `runRewrite`。
 * 回复一次性给出：整段正文一个分片，再加一个结束分片；每次回复的用量交给 `onReply`。
 */
export function chatLlm(endpoint: ChatEndpoint, onReply: (reply: ChatReply) => void): LlmView {
  return {
    prepareCall: (config) =>
      Promise.resolve({
        config,
        async *stream(options) {
          const reply = await complete(endpoint, {
            system: options.system,
            user: options.messages
              .flatMap((message) => message.content.map((part) => part.text))
              .join("\n\n"),
            signal: options.signal,
          });
          onReply(reply);
          yield { type: "text-delta", text: reply.text };
          yield { type: "finish", reason: { kind: reply.truncated ? "max-tokens" : "stop" } };
        },
      }),
  };
}

/** 改写一份草稿需要的材料：预设、草稿、草稿之前的对话，以及随插件分发的写作参考。 */
export interface RewriteInput {
  readonly preset: BuiltinPreset;
  readonly draft: string;
  readonly context: readonly { readonly user: string; readonly assistant: string }[];
  readonly references: References;
}

/**
 * 按插件 Host 的做法组装请求：内置指令展开写作参考，对话按默认的轮数与字数预算挑选和压缩，
 * 再用插件的 `buildPrompt` 拼成系统提示与用户输入。
 */
export function rewritePrompt(input: RewriteInput): RewritePrompt {
  const expanded = expandIncludes(BUILTIN_INSTRUCTIONS[input.preset], input.references);
  if (!expanded.ok) {
    throw new Error(
      `preset "${input.preset}" includes missing references: ${expanded.missing.join(", ")}`,
    );
  }
  const turns = selectTurns(
    input.context.map((turn) => ({ kind: "turn", user: turn.user, assistant: turn.assistant })),
    DEFAULT_SETTINGS.contextTurns,
  );
  return buildPrompt(input.draft, expanded.text, turns);
}
