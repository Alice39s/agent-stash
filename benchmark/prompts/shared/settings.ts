import { fileURLToPath } from "node:url";
import { loadEnv } from "vieval";
import { DEFAULT_SETTINGS } from "../../../dsh/enhance/src/settings-value.ts";
import { selectModels, type BenchModel } from "./models.ts";

/** 评测目录 `benchmark/prompts/`，`.env*` 文件放在这里。 */
const BENCH_DIR = fileURLToPath(new URL("../", import.meta.url));

/** 一次评测的设置，全部来自环境变量与本目录的 `.env`、`.env.local`、`.env.test`、`.env.test.local`。 */
export interface BenchSettings {
  /** 被测的改写模型：`PROMPT_BENCH_MODELS`，默认 `deepseek-v4.1-flash`，即 DSH 的默认模型。 */
  readonly rewriters: readonly BenchModel[];
  /** 评审模型：`PROMPT_BENCH_JUDGE`，默认 `deepseek-v4.1-flash`。 */
  readonly judges: readonly BenchModel[];
  /** 同时进行的用例数：`PROMPT_BENCH_CONCURRENCY`，默认 4。 */
  readonly concurrency: number;
  /** 一次改写的超时：`PROMPT_BENCH_TIMEOUT`，单位秒，默认与插件的默认超时相同。 */
  readonly timeoutMs: number;
}

function positiveInteger(
  env: Readonly<Record<string, string | undefined>>,
  name: string,
  fallback: number,
) {
  const raw = env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1) {
    throw new Error(`${name} must be a positive integer, got "${raw}"`);
  }
  return value;
}

/** 从环境变量读出评测设置，取值不对时报错并写明变量名。 */
export function benchSettings(env: Readonly<Record<string, string | undefined>>): BenchSettings {
  return {
    rewriters: selectModels(env.PROMPT_BENCH_MODELS ?? "deepseek-v4.1-flash"),
    judges: selectModels(env.PROMPT_BENCH_JUDGE ?? "deepseek-v4.1-flash"),
    concurrency: positiveInteger(env, "PROMPT_BENCH_CONCURRENCY", 4),
    timeoutMs: positiveInteger(env, "PROMPT_BENCH_TIMEOUT", DEFAULT_SETTINGS.timeout) * 1000,
  };
}

/** 进程环境变量加上评测目录下 `.env*` 文件里的变量。 */
export function loadBenchEnv(): ReturnType<typeof loadEnv> {
  return loadEnv("test", BENCH_DIR, "");
}
