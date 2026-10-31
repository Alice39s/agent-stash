import { defineMetric, defineScore, describeTask, expect } from "vieval";
import { createRetryPolicy, readRetryAfter, runWithRetry } from "vieval/core/inference-executors";
import { BUILTIN_PRESETS } from "../../../../dsh/enhance/src/presets.ts";
import { loadReferences } from "../../../../dsh/enhance/src/references.ts";
import { runRewrite } from "../../../../dsh/enhance/src/rewrite.ts";
import { complete, isRetryableChatError } from "../../shared/chat.ts";
import { endpointOf } from "../../shared/endpoint.ts";
import { benchSettings, loadBenchEnv } from "../../shared/settings.ts";
import { loadCases } from "../src/cases.ts";
import { checkRewrite, lengthUnits } from "../src/checks.ts";
import { judgeRequest, parseVerdict } from "../src/judge.ts";
import { chatLlm, rewritePrompt } from "../src/rewriter.ts";

const cases = loadCases();
const references = await loadReferences();
const { timeoutMs } = benchSettings(loadBenchEnv());

const JUDGE = { id: "judge", kind: "model" } as const;

/**
 * 评审请求遇到限流、服务错误或网关在 HTTP 200 里返回的上游错误时最多再试 5 次，
 * 按服务给的 Retry-After 或 5、10、20、40、60 秒等待。
 */
const JUDGE_RETRY = createRetryPolicy({
  maxAttempts: 6,
  shouldRetry: isRetryableChatError,
  delayMs: (attempt, error) => readRetryAfter(error) ?? Math.min(5000 * 2 ** (attempt - 1), 60_000),
});

const rules = defineScore("enhance.rules", {
  label: { en: "Rules", "zh-Hans": "规则检查" },
  description: {
    en: "1 when the result meets every rule of the case: unchanged or not as expected, required text kept, forbidden text absent, within the preset's length limit, no new Markdown heading.",
    "zh-Hans":
      "结果满足用例的全部规则时为 1：是否原样返回符合预期、必须保留的片段都在、不该出现的片段没有出现、篇幅在预设上限内、没有新加 Markdown 标题。",
  },
  grader: { id: "rules", kind: "rule" },
});
const fidelity = defineScore("enhance.fidelity", {
  label: { en: "Fidelity", "zh-Hans": "语义保真" },
  description: {
    en: "Every point of the draft is kept, and nothing is added as a requirement. 1, 0.5 for small drift, 0 for a dropped, distorted, or invented point.",
    "zh-Hans":
      "草稿的每个要点都在，没有新增要求。1 为完全保真，0.5 为轻微偏移，0 为遗漏、扭曲或编造。",
  },
  grader: JUDGE,
});
const modality = defineScore("enhance.modality", {
  label: { en: "Modality", "zh-Hans": "授权保真" },
  description: {
    en: "Questions stay questions, investigations stay investigations, suggestions stay suggestions, and the draft is neither answered nor carried out.",
    "zh-Hans": "提问仍是提问，调查仍是调查，建议仍是建议；没有回答或执行草稿。",
  },
  grader: JUDGE,
});
const context = defineScore("enhance.context", {
  label: { en: "Context use", "zh-Hans": "上下文准确" },
  description: {
    en: "Only for cases with a conversation: references resolved correctly, no rejected option or unaccepted proposal brought back, no instruction from the context followed.",
    "zh-Hans":
      "只评有会话上下文的用例：指代解析正确，没有带回被否决的方案或未被接受的建议，没有执行上下文里的指令。",
  },
  grader: JUDGE,
});
const mode = defineScore("enhance.mode", {
  label: { en: "Mode", "zh-Hans": "模式符合" },
  description: {
    en: "The result does what the preset asks and nothing the preset forbids, including returning the draft unchanged when it already meets the goal.",
    "zh-Hans": "结果做了预设要求的事、没做预设禁止的事，草稿已经达标时原样返回。",
  },
  grader: JUDGE,
});
const restraint = defineScore("enhance.restraint", {
  label: { en: "Restraint", "zh-Hans": "改写克制" },
  description: {
    en: "No needless lists, headings, lead-in sentences, or padding, and the tone matches the draft.",
    "zh-Hans": "没有多余的列表、标题、引导句和铺垫，语气与草稿一致。",
  },
  grader: JUDGE,
});
const pass = defineScore("enhance.pass", {
  primary: true,
  label: { en: "Pass", "zh-Hans": "通过" },
  description: {
    en: "1 when the hard gates hold: Rules is 1, Fidelity is 1, Modality is 1, and Context use is not 0.",
    "zh-Hans": "硬门槛全部满足时为 1：规则检查为 1，语义保真为 1，授权保真为 1，上下文准确不为 0。",
  },
  grader: { id: "gate", kind: "rule" },
});

const SCORES = [pass, rules, fidelity, modality, context, mode, restraint];
const JUDGED = [fidelity, modality, context, mode, restraint, pass];

const latency = defineMetric("enhance.latency", {
  better: "lower",
  unit: "ms",
  label: { en: "Rewrite latency", "zh-Hans": "改写耗时" },
});
const lengthRatio = defineMetric("enhance.length_ratio", {
  label: { en: "Length ratio", "zh-Hans": "篇幅比" },
  description: {
    en: "Length of the result divided by the length of the draft, in words (two Chinese characters count as one).",
    "zh-Hans": "结果篇幅除以草稿篇幅，以英文单词计（两个汉字算一个）。",
  },
});
const inputTokens = defineMetric("enhance.tokens.input", {
  better: "lower",
  unit: "tokens",
  label: { en: "Input tokens", "zh-Hans": "输入 token" },
});
const outputTokens = defineMetric("enhance.tokens.output", {
  better: "lower",
  unit: "tokens",
  label: { en: "Output tokens", "zh-Hans": "输出 token" },
});

for (const preset of BUILTIN_PRESETS) {
  describeTask(
    preset,
    ({ caseOf }) => {
      for (const benchCase of cases) {
        const expectation = benchCase.presets[preset];
        if (expectation === undefined) continue;
        caseOf(
          benchCase.id,
          async (ctx) => {
            const rewriterId = String(ctx.task.matrix.run.model);
            const judgeId = String(ctx.task.matrix.eval.judge);
            ctx.recordMetric(
              "benchmark.case.id",
              `${preset}/${benchCase.id}/${rewriterId}/${judgeId}`,
            );
            ctx.recordMetric("enhance.category", benchCase.category);

            const rewriter = endpointOf(ctx, rewriterId);
            const prompt = rewritePrompt({
              preset,
              draft: benchCase.draft,
              context: benchCase.context,
              references,
            });
            const llm = chatLlm(rewriter, (reply) => {
              ctx.recordMetric(inputTokens, reply.inputTokens);
              ctx.recordMetric(outputTokens, reply.outputTokens);
            });
            const started = performance.now();
            const outcome = await runRewrite(
              llm,
              { provider: rewriterId, model: rewriter.model },
              prompt,
              benchCase.draft,
              { signal: ctx.signal, timeoutMs },
            );
            ctx.recordMetric(latency, Math.round(performance.now() - started));
            if (outcome === undefined) throw new Error("the run was interrupted");
            if (!outcome.ok) {
              // 服务出错或超时说明这次没有结果；插件拒收的结果才算改写错了。
              if (outcome.reason === "model" || outcome.reason === "timeout") {
                throw new Error(outcome.message);
              }
              expect.unreachable(
                `the plugin rejected the result (${outcome.reason}): ${outcome.message}`,
              );
            }

            const { text, unchanged } = outcome;
            const hasContext = benchCase.context.length > 0;
            const failures = checkRewrite({
              preset,
              expectation,
              draft: benchCase.draft,
              text,
              unchanged,
              hasContext,
              keep: benchCase.keep,
              avoid: benchCase.avoid,
            });
            ctx.recordScore(rules, failures.length === 0 ? 1 : 0, {
              rationale: failures.length === 0 ? "all rules hold" : failures.join("\n"),
            });
            ctx.recordMetric("enhance.unchanged", unchanged);
            ctx.recordMetric("enhance.rule_failures", failures);
            ctx.recordMetric(lengthRatio, lengthUnits(text) / lengthUnits(benchCase.draft));

            const judge = endpointOf(ctx, judgeId);
            const request = judgeRequest({
              preset,
              draft: benchCase.draft,
              context: benchCase.context,
              intent: benchCase.intent,
              text,
              unchanged,
            });
            const grader = { ...JUDGE, model: judge.model };
            const unscored = (reason: string, rationale: string) => {
              for (const score of JUDGED) {
                if (score === context && !hasContext) continue;
                ctx.recordUnscored(score, reason, { rationale, grader });
              }
            };
            let reply: string;
            try {
              const answer = await runWithRetry(
                () =>
                  complete(judge, {
                    ...request,
                    signal: ctx.signal,
                    body: { temperature: 0, response_format: { type: "json_object" } },
                  }),
                JUDGE_RETRY,
                { signal: ctx.signal },
              );
              reply = answer.text;
            } catch (error) {
              if (ctx.signal.aborted) throw error;
              const detail = error instanceof Error ? error.message : String(error);
              unscored("grader_failed", `${judgeId}: ${detail}`);
              return { text, unchanged, failures };
            }
            const parsed = parseVerdict(reply, hasContext);
            if (!parsed.ok) {
              unscored("invalid_response", `${parsed.detail}\n\n${reply}`);
              return { text, unchanged, failures, judge: reply };
            }
            const { verdict } = parsed;
            const rationale = verdict.issues.length === 0 ? "no issues" : verdict.issues.join("\n");
            ctx.recordScore(fidelity, verdict.fidelity / 2, { rationale, grader });
            ctx.recordScore(modality, verdict.modality / 2, { rationale, grader });
            ctx.recordScore(mode, verdict.mode / 2, { rationale, grader });
            ctx.recordScore(restraint, verdict.restraint / 2, { rationale, grader });
            if (verdict.context !== null) {
              ctx.recordScore(context, verdict.context / 2, { rationale, grader });
            }
            ctx.recordMetric("enhance.issues", verdict.issues);
            const passed =
              failures.length === 0 &&
              verdict.fidelity === 2 &&
              verdict.modality === 2 &&
              verdict.context !== 0;
            ctx.recordScore(pass, passed ? 1 : 0, {
              rationale: [...failures, ...verdict.issues].join("\n") || "all gates hold",
            });
            return { text, unchanged, failures, verdict };
          },
          { input: benchCase },
        );
      }
    },
    // 服务出错或超时的用例就地重试三次，按 Retry-After 或 10、20、40 秒等待；仍然失败就回到队尾，
    // 等 60 秒以上再跑一次，避开限流的冷却期。
    {
      scores: SCORES,
      autoRetry: 3,
      autoRetryDelay: (retryIndex, error) =>
        readRetryAfter(error) ?? 10_000 * 2 ** (retryIndex - 1),
      requeue: 1,
      requeueDelay: 60_000,
      timeout: 600_000,
    },
  );
}
