import { describe, expect, test } from "vitest";
import { BUILTIN_INSTRUCTIONS, SHARED_RULES, UNCHANGED } from "./presets.ts";
import {
  buildPrompt,
  checkResult,
  extractResult,
  protectedTokens,
  runRewrite,
  settleOutput,
  type LlmView,
  type ModelRoute,
  type StreamChunkView,
} from "./rewrite.ts";
import { placeholder } from "./secrets.ts";

const ROUTE: ModelRoute = { provider: "stub", model: "flash" };
const KEY = "sk-abc123def456ghi789jkl012mno";

/** 按给定的分片回放模型流，并记下收到的请求。 */
function scriptedLlm(
  chunks: readonly StreamChunkView[] | ((signal: AbortSignal) => AsyncIterable<StreamChunkView>),
) {
  const calls: { config: ModelRoute; system: string; input: string }[] = [];
  const llm: LlmView = {
    prepareCall: async (config) => ({
      config,
      async *stream(options) {
        const input = options.messages[0]?.content[0]?.text ?? "";
        calls.push({ config, system: options.system, input });
        if (typeof chunks === "function") yield* chunks(options.signal);
        else yield* chunks;
      },
    }),
  };
  return { llm, calls };
}

/** 一直不结束的流：只在请求被中止时以 aborted 收尾。 */
async function* hanging(signal: AbortSignal): AsyncIterable<StreamChunkView> {
  if (!signal.aborted) {
    await new Promise((resolve) => signal.addEventListener("abort", resolve, { once: true }));
  }
  yield { type: "finish", reason: { kind: "aborted" } };
}

function reply(text: string): StreamChunkView[] {
  return [
    { type: "text-delta", text: text.slice(0, 5) },
    { type: "text-delta", text: text.slice(5) },
    { type: "finish", reason: { kind: "stop" } },
  ];
}

const OPTIONS = { signal: new AbortController().signal, timeoutMs: 5000 };

describe("rewrite prompt", () => {
  test("puts the shared rules and the preset instructions in the system prompt", () => {
    const prompt = buildPrompt("fix it", BUILTIN_INSTRUCTIONS.concise, []);
    expect(prompt.system).toBe(`${SHARED_RULES}\n\n${BUILTIN_INSTRUCTIONS.concise}`);
    expect(prompt.input).toBe("<draft_prompt>\nfix it\n</draft_prompt>");
  });

  test("puts the conversation before the draft", () => {
    const prompt = buildPrompt("do that", "Condense.", [
      { kind: "turn", user: "plan?", assistant: "Plan A." },
    ]);
    expect(prompt.input).toBe(
      "<conversation_context>\n[Turn 1]\nUser: plan?\nAssistant: Plan A.\n</conversation_context>\n\n<draft_prompt>\ndo that\n</draft_prompt>",
    );
  });

  test("never sends a credential from the draft to the model", () => {
    const prompt = buildPrompt(`call it with ${KEY}`, "Polish.", []);
    expect(prompt.input).not.toContain(KEY);
    expect(prompt.draft).toBe(`call it with ${placeholder(1)}`);
    expect(prompt.secrets).toEqual([KEY]);
  });
});

describe("rewrite output", () => {
  test("takes the text inside the result tags", () => {
    expect(extractResult("Sure.\n<rewritten_prompt>\nDo X.\n</rewritten_prompt>", "x")).toBe(
      "Do X.",
    );
  });

  test("accepts a result whose closing tag was cut off", () => {
    expect(extractResult("<rewritten_prompt>Do X.", "x")).toBe("Do X.");
  });

  test("recognizes the unchanged sentinel", () => {
    expect(extractResult(" UNCHANGED\n", "x")).toBe(UNCHANGED);
  });

  test("unwraps a code fence around the whole result unless the draft is one", () => {
    expect(extractResult("```markdown\nDo X.\n```", "do x")).toBe("Do X.");
    const block = "```sh\npnpm test\n```";
    expect(extractResult(block, block)).toBe(block);
  });

  test("lists code, links, and placeholders of the draft as protected", () => {
    const draft = `see \`config.ts\` and https://example.com/a?b=1, key ${placeholder(1)}\n\`\`\`sh\npnpm test\n\`\`\``;
    expect(protectedTokens(draft).toSorted()).toEqual(
      ["config.ts", "https://example.com/a?b=1", placeholder(1), "pnpm test"].toSorted(),
    );
  });

  test("rejects a result that answers the draft", () => {
    expect(checkResult("why does CI fail?", "Sure, CI fails because of a race.")).toMatch(/reply/u);
    expect(checkResult("帮我看看为什么挂了", "好的，原因是端口冲突。")).toMatch(/reply/u);
  });

  test("accepts a preamble word the draft itself starts with", () => {
    expect(
      checkResult("sure, go ahead and deploy", "Sure, go ahead and deploy the build."),
    ).toBeUndefined();
  });

  test("rejects a result in another language", () => {
    expect(
      checkResult(
        "把登录页的加载速度优化一下",
        "Please optimize the loading speed of the login page.",
      ),
    ).toMatch(/language/u);
  });

  test("keeps mixed Chinese and English drafts in their language", () => {
    expect(
      checkResult("把 `fetchUser` 的 retry 改成 3 次", "将 `fetchUser` 的 retry 次数改为 3 次。"),
    ).toBeUndefined();
  });

  test("rejects a result that changed protected text", () => {
    expect(
      checkResult("rename `getUser` to `fetchUser`", "Rename `get_user` to `fetchUser`."),
    ).toMatch(/getUser/u);
  });

  test("restores credentials in an accepted result", () => {
    const prompt = buildPrompt(`use ${KEY}`, "Polish.", []);
    const outcome = settleOutput(
      `<rewritten_prompt>Call the API with ${placeholder(1)}.</rewritten_prompt>`,
      prompt,
      `use ${KEY}`,
      "stub/flash",
    );
    expect(outcome).toEqual({ ok: true, text: `Call the API with ${KEY}.`, unchanged: false });
  });

  test("reports the draft as unchanged for the sentinel or an identical result", () => {
    const prompt = buildPrompt("Run the tests.", "Condense.", []);
    const unchanged = { ok: true, text: "Run the tests.", unchanged: true };
    expect(settleOutput("UNCHANGED", prompt, "Run the tests.", "stub/flash")).toEqual(unchanged);
    expect(
      settleOutput(
        "<rewritten_prompt>Run the tests.</rewritten_prompt>",
        prompt,
        "Run the tests.",
        "stub/flash",
      ),
    ).toEqual(unchanged);
  });

  test("reports an empty result", () => {
    const prompt = buildPrompt("x", "Polish.", []);
    expect(
      settleOutput("<rewritten_prompt> </rewritten_prompt>", prompt, "x", "stub/flash"),
    ).toMatchObject({
      ok: false,
      reason: "empty",
    });
  });
});

describe("rewrite run", () => {
  test("streams the model reply into the rewritten draft", async () => {
    const { llm, calls } = scriptedLlm(
      reply("<rewritten_prompt>Fix the login page.</rewritten_prompt>"),
    );
    const prompt = buildPrompt("fix login", "Polish.", []);
    expect(await runRewrite(llm, ROUTE, prompt, "fix login", OPTIONS)).toEqual({
      ok: true,
      text: "Fix the login page.",
      unchanged: false,
    });
    expect(calls).toEqual([{ config: ROUTE, system: prompt.system, input: prompt.input }]);
  });

  test("reports a reply cut off by the output limit", async () => {
    const { llm } = scriptedLlm([
      { type: "text-delta", text: "<rewritten_prompt>Fix" },
      { type: "finish", reason: { kind: "max-tokens" } },
    ]);
    const outcome = await runRewrite(llm, ROUTE, buildPrompt("x", "P.", []), "x", OPTIONS);
    expect(outcome).toMatchObject({ ok: false, reason: "truncated" });
  });

  test("reports the provider failure message", async () => {
    const { llm } = scriptedLlm([
      { type: "finish", reason: { kind: "error", failure: { message: "401 invalid api key" } } },
    ]);
    const outcome = await runRewrite(llm, ROUTE, buildPrompt("x", "P.", []), "x", OPTIONS);
    expect(outcome).toEqual({
      ok: false,
      reason: "model",
      message: "stub/flash: 401 invalid api key",
    });
  });

  test("reports a model that cannot be prepared", async () => {
    const llm: LlmView = {
      prepareCall: () => Promise.reject(new Error("UNSUPPORTED_REASONING_EFFORT: max")),
    };
    const outcome = await runRewrite(llm, ROUTE, buildPrompt("x", "P.", []), "x", OPTIONS);
    expect(outcome).toEqual({
      ok: false,
      reason: "model",
      message: "stub/flash: UNSUPPORTED_REASONING_EFFORT: max",
    });
  });

  test("gives up after the timeout", async () => {
    const { llm } = scriptedLlm(hanging);
    const outcome = await runRewrite(llm, ROUTE, buildPrompt("x", "P.", []), "x", {
      signal: new AbortController().signal,
      timeoutMs: 20,
    });
    expect(outcome).toEqual({ ok: false, reason: "timeout", message: "no result within 0 s" });
  });

  test("returns nothing when the caller cancels", async () => {
    const { llm } = scriptedLlm(hanging);
    const controller = new AbortController();
    const pending = runRewrite(llm, ROUTE, buildPrompt("x", "P.", []), "x", {
      signal: controller.signal,
      timeoutMs: 5000,
    });
    controller.abort();
    expect(await pending).toBeUndefined();
  });
});
