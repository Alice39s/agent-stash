import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "pathe";
import * as v from "valibot";
import { parse } from "yaml";

/** 黄金集按类别分文件，每个类别针对改写器容易出错的一类草稿。 */
export const CATEGORIES = [
  "unchanged",
  "speech",
  "negation",
  "modality",
  "context",
  "literals",
  "markup",
  "injection",
  "expansion",
  "structure",
] as const;

/**
 * 某个预设下对结果的预期：`changed` 必须改写，`unchanged` 必须原样返回，`either` 两者都可以。
 * 只对写出来的预设运行这个用例。
 */
const ExpectationSchema = v.picklist(["changed", "unchanged", "either"]);

const Text = v.pipe(v.string(), v.nonEmpty());

/** 一轮对话，按插件发送上下文的格式渲染。 */
const TurnSchema = v.strictObject({
  user: Text,
  assistant: v.optional(v.string(), ""),
});

const CaseSchema = v.strictObject({
  /** 跨报告比较时的稳定标识，小写字母、数字和连字符。 */
  id: v.pipe(v.string(), v.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)),
  category: v.picklist(CATEGORIES),
  draft: Text,
  /** 草稿之前的对话，最早的在前。 */
  context: v.optional(v.array(TurnSchema), []),
  /** 用户真正的意思与这条草稿考的点，评审模型以它为准。 */
  intent: Text,
  presets: v.pipe(
    v.strictObject({
      polish: v.optional(ExpectationSchema),
      structure: v.optional(ExpectationSchema),
      concise: v.optional(ExpectationSchema),
    }),
    v.check(
      (presets) => Object.values(presets).some((expectation) => expectation !== undefined),
      "a case runs under at least one preset",
    ),
  ),
  /** 结果里必须逐字出现的片段，只能取自草稿或上下文。 */
  keep: v.optional(v.array(Text), []),
  /**
   * 结果里不能出现的片段，例如答案、被否决的方案或改口前的说法。
   * 草稿里就有的片段只能用在每个预设都要求改写的用例上，否则原样返回也会违反它。
   */
  avoid: v.optional(v.array(Text), []),
});

export type BenchCase = v.InferOutput<typeof CaseSchema>;
export type Expectation = v.InferOutput<typeof ExpectationSchema>;

const CaseFileSchema = v.array(CaseSchema);

export const CASES_DIR = fileURLToPath(new URL("../cases/", import.meta.url));

/**
 * 一个用例自身的矛盾：`keep` 的片段在草稿与上下文里都找不到，
 * 或者 `avoid` 的片段写在草稿里，却有预设允许原样返回。
 */
function caseProblems(benchCase: BenchCase): string[] {
  const source = [
    benchCase.draft,
    ...benchCase.context.flatMap((turn) => [turn.user, turn.assistant]),
  ];
  const problems: string[] = [];
  for (const text of benchCase.keep) {
    if (!source.some((part) => part.includes(text))) {
      problems.push(`keeps "${text}", which neither the draft nor the context contains`);
    }
  }
  const keepsDraft = Object.values(benchCase.presets).some(
    (expectation) => expectation !== undefined && expectation !== "changed",
  );
  for (const text of benchCase.avoid) {
    if (keepsDraft && benchCase.draft.includes(text)) {
      problems.push(
        `avoids "${text}", which the draft contains, yet a preset may return the draft`,
      );
    }
  }
  return problems;
}

/** 读取 `dir` 下全部 `*.yaml` 用例，按文件名排序；格式不对、自相矛盾或 id 重复时报错。 */
export function loadCases(dir: string = CASES_DIR): BenchCase[] {
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".yaml"))
    .toSorted();
  const cases = files.flatMap((file) => {
    const data: unknown = parse(readFileSync(join(dir, file), "utf8"));
    const parsed = v.safeParse(CaseFileSchema, data);
    if (!parsed.success) throw new Error(`${file}: ${v.summarize(parsed.issues)}`);
    for (const benchCase of parsed.output) {
      const problems = caseProblems(benchCase);
      if (problems.length > 0)
        throw new Error(`${file}: case "${benchCase.id}" ${problems.join("; ")}`);
    }
    return parsed.output;
  });
  const seen = new Set<string>();
  for (const benchCase of cases) {
    if (seen.has(benchCase.id)) throw new Error(`case id "${benchCase.id}" appears twice`);
    seen.add(benchCase.id);
  }
  return cases;
}
