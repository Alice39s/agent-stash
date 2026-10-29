/**
 * 插件配置。所有字段都是 volatile：设置页改动后 Host 下一次读取就生效，不重新挂载插件。
 * 模型复核默认关闭，打开后才会把脱敏后的证据发给所选模型。
 */
import Schema from "@deepseek-ai/schemastery";

export const NOTIFY_MODES = ["badge", "quiet"] as const;
export const SKILL_SCOPES = ["project", "user"] as const;

export type NotifyMode = (typeof NOTIFY_MODES)[number];
export type SkillScope = (typeof SKILL_SCOPES)[number];

export const Config = Schema.object({
  discovery: Schema.boolean()
    .default(true)
    .description("Analyze finished sessions on this machine and look for reusable workflows.")
    .volatile(),
  review: Schema.boolean()
    .default(false)
    .description(
      "Send redacted evidence of promising candidates to the model in the background for review.",
    )
    .volatile(),
  provider: Schema.string()
    .default("")
    .description("Provider of the review model. Empty uses the default Agent model.")
    .volatile(),
  model: Schema.string()
    .default("")
    .description("Review model id. Empty uses the default Agent model.")
    .volatile(),
  effort: Schema.string()
    .default("")
    .description("Reasoning effort for the review model. Empty uses the model default.")
    .volatile(),
  timeout: Schema.natural()
    .min(10)
    .max(600)
    .default(90)
    .description("Seconds before a review request is abandoned.")
    .volatile(),
  dailyReviews: Schema.natural()
    .min(1)
    .max(100)
    .default(6)
    .description("Background reviews allowed per day.")
    .volatile(),
  reviewInterval: Schema.natural()
    .min(1)
    .max(1440)
    .default(10)
    .description("Minutes between two background reviews.")
    .volatile(),
  quietPeriod: Schema.natural()
    .min(0)
    .max(120)
    .default(2)
    .description("Minutes a session stays idle before it is analyzed.")
    .volatile(),
  historyDays: Schema.natural()
    .min(1)
    .max(365)
    .default(30)
    .description("Days of past sessions to analyze.")
    .volatile(),
  maxSessions: Schema.natural()
    .min(1)
    .max(2000)
    .default(200)
    .description("Past sessions read when the plugin starts.")
    .volatile(),
  minOccurrences: Schema.natural()
    .min(2)
    .max(10)
    .default(2)
    .description("Independent sessions a repeated workflow needs.")
    .volatile(),
  evidenceBudget: Schema.natural()
    .min(4000)
    .max(200000)
    .default(24000)
    .description("Characters of evidence sent with one review.")
    .volatile(),
  readOutput: Schema.boolean()
    .default(true)
    .description("Keep one redacted error line from failed commands as evidence.")
    .volatile(),
  redactPatterns: Schema.array(Schema.string())
    .default([])
    .description("Extra regular expressions to redact before anything is stored or sent.")
    .volatile(),
  notify: Schema.union([...NOTIFY_MODES])
    .default("badge")
    .description("badge shows the number of new suggestions; quiet shows only the icon.")
    .volatile(),
  scope: Schema.union([...SKILL_SCOPES])
    .default("project")
    .description("Default place for new Skills: the project's .agents/skills or ~/.agents/skills.")
    .volatile(),
  prompt: Schema.string()
    .default("")
    .description("Replaces the review guidance. The output format is always appended.")
    .volatile(),
});

/** 运行中的配置：每个字段都是可读取最新值的引用。 */
export type ConfigValue = ReturnType<typeof Config>;

/** 某一时刻的配置值。 */
export interface Settings {
  readonly discovery: boolean;
  readonly review: boolean;
  readonly provider: string;
  readonly model: string;
  readonly effort: string;
  readonly timeout: number;
  readonly dailyReviews: number;
  readonly reviewInterval: number;
  readonly quietPeriod: number;
  readonly historyDays: number;
  readonly maxSessions: number;
  readonly minOccurrences: number;
  readonly evidenceBudget: number;
  readonly readOutput: boolean;
  readonly redactPatterns: readonly string[];
  readonly notify: NotifyMode;
  readonly scope: SkillScope;
  readonly prompt: string;
}

/** 读取配置引用此刻的值。 */
export function currentSettings(config: ConfigValue): Settings {
  return {
    discovery: config.discovery.get(),
    review: config.review.get(),
    provider: config.provider.get(),
    model: config.model.get(),
    effort: config.effort.get(),
    timeout: config.timeout.get(),
    dailyReviews: config.dailyReviews.get(),
    reviewInterval: config.reviewInterval.get(),
    quietPeriod: config.quietPeriod.get(),
    historyDays: config.historyDays.get(),
    maxSessions: config.maxSessions.get(),
    minOccurrences: config.minOccurrences.get(),
    evidenceBudget: config.evidenceBudget.get(),
    readOutput: config.readOutput.get(),
    redactPatterns: config.redactPatterns.get(),
    notify: config.notify.get(),
    scope: config.scope.get(),
    prompt: config.prompt.get(),
  };
}
