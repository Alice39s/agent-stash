import { afterEach, describe, expect, test } from "vitest";
import { SHARED_RULES } from "../../../../dsh/enhance/src/presets.ts";
import { loadReferences } from "../../../../dsh/enhance/src/references.ts";
import { runRewrite } from "../../../../dsh/enhance/src/rewrite.ts";
import type { ChatReply } from "../../shared/chat.ts";
import { startChatServer } from "../../shared/chat-server.ts";
import { chatLlm, rewritePrompt } from "./rewriter.ts";

const references = await loadReferences();
let close: (() => Promise<void>) | undefined;

afterEach(async () => {
  await close?.();
  close = undefined;
});

describe("rewrite prompt", () => {
  test("inlines the writing guides into the polish instructions", () => {
    const prompt = rewritePrompt({ preset: "polish", draft: "fix it", context: [], references });
    expect(prompt.system.startsWith(SHARED_RULES)).toBe(true);
    expect(prompt.system).not.toContain("<include");
    expect(prompt.system).toContain('<reference name="humanizer"');
  });

  test("renders the conversation the way the plugin sends it", () => {
    const prompt = rewritePrompt({
      preset: "concise",
      draft: "do that",
      context: [{ user: "plan?", assistant: "Plan A." }],
      references,
    });
    expect(prompt.input).toBe(
      "<conversation_context>\n[Turn 1]\nUser: plan?\nAssistant: Plan A.\n</conversation_context>\n\n<draft_prompt>\ndo that\n</draft_prompt>",
    );
  });
});

describe("rewriter over an OpenAI-compatible endpoint", () => {
  test("runs the plugin's rewrite and reports the usage", async () => {
    const server = await startChatServer([
      { text: "<rewritten_prompt>Fix the login page.</rewritten_prompt>" },
    ]);
    close = server.close;
    const replies: ChatReply[] = [];
    const llm = chatLlm({ baseURL: server.baseURL, apiKey: "k", model: "m", body: {} }, (reply) =>
      replies.push(reply),
    );
    const prompt = rewritePrompt({
      preset: "concise",
      draft: "fix login",
      context: [],
      references,
    });
    const outcome = await runRewrite(llm, { provider: "p", model: "m" }, prompt, "fix login", {
      signal: new AbortController().signal,
      timeoutMs: 5000,
    });
    expect(outcome).toEqual({ ok: true, text: "Fix the login page.", unchanged: false });
    expect(replies).toEqual([
      {
        text: "<rewritten_prompt>Fix the login page.</rewritten_prompt>",
        truncated: false,
        inputTokens: 120,
        outputTokens: 30,
      },
    ]);
    expect(server.received[0]?.body).toMatchObject({
      messages: [
        { role: "system", content: prompt.system },
        { role: "user", content: prompt.input },
      ],
    });
  });

  test("passes a reply cut off by the output limit to the plugin as truncated", async () => {
    const server = await startChatServer([
      { text: "<rewritten_prompt>Fix", finishReason: "length" },
    ]);
    close = server.close;
    const llm = chatLlm({ baseURL: server.baseURL, apiKey: "k", model: "m", body: {} }, () => {});
    const prompt = rewritePrompt({
      preset: "concise",
      draft: "fix login",
      context: [],
      references,
    });
    const outcome = await runRewrite(llm, { provider: "p", model: "m" }, prompt, "fix login", {
      signal: new AbortController().signal,
      timeoutMs: 5000,
    });
    expect(outcome).toMatchObject({ ok: false, reason: "truncated" });
  });
});
