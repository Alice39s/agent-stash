/**
 * 插件页里经验提炼条目的配置页。改动先暂存，点保存才按读到的版本号写回 profile；
 * 写入被拒绝或传输失败时保留暂存值并提示。发现模型（写摘要）与生成模型（写 Skill 草稿）
 * 分别从 Host 的模型目录里选，留空时跟随 Agent 的默认模型。
 */
import { SegmentedControl, SettingsForm, Switch } from "@deepseek-ai/dsh-client-ui-primitives";
import { useId, useState, type ReactNode } from "react";
import * as v from "valibot";
import type { ConfigPathOp, JsonValue, ModelCatalog, Observable, RowConfigProps } from "./dsh.ts";
import { useSnapshot } from "./hooks.ts";
import type { ScoutKey, ScoutTranslate } from "./locale.ts";
import styles from "./settings.module.css";

/** 设置页的值；与 Host 的 `Config` 字段一一对应。 */
export interface SettingsValue {
  readonly discovery: boolean;
  readonly summarize: boolean;
  readonly summaryProvider: string;
  readonly summaryModel: string;
  readonly summaryEffort: string;
  readonly summaryTimeout: number;
  readonly draftProvider: string;
  readonly draftModel: string;
  readonly draftEffort: string;
  readonly draftTimeout: number;
  readonly dailySummaries: number;
  readonly summaryInterval: number;
  readonly quietPeriod: number;
  readonly historyDays: number;
  readonly maxSessions: number;
  readonly minOccurrences: number;
  readonly evidenceBudget: number;
  readonly readOutput: boolean;
  readonly redactPatterns: readonly string[];
  readonly notify: "badge" | "quiet";
  readonly scope: "project" | "user";
  readonly prompt: string;
}

/** 与 Host `Config` 相同的默认值。 */
export const DEFAULT_SETTINGS: SettingsValue = {
  discovery: true,
  summarize: false,
  summaryProvider: "",
  summaryModel: "",
  summaryEffort: "",
  summaryTimeout: 60,
  draftProvider: "",
  draftModel: "",
  draftEffort: "",
  draftTimeout: 180,
  dailySummaries: 6,
  summaryInterval: 10,
  quietPeriod: 2,
  historyDays: 30,
  maxSessions: 200,
  minOccurrences: 2,
  evidenceBudget: 24000,
  readOutput: true,
  redactPatterns: [],
  notify: "badge",
  scope: "project",
  prompt: "",
};

type NumberKey =
  | "summaryTimeout"
  | "draftTimeout"
  | "dailySummaries"
  | "summaryInterval"
  | "quietPeriod"
  | "historyDays"
  | "maxSessions"
  | "minOccurrences"
  | "evidenceBudget";

/** 数值字段的范围与单位，与 Host `Config` 一致。 */
const NUMBERS: Readonly<Record<NumberKey, { min: number; max: number; unit: ScoutKey }>> = {
  summaryTimeout: { min: 10, max: 600, unit: "unit.seconds" },
  draftTimeout: { min: 10, max: 900, unit: "unit.seconds" },
  dailySummaries: { min: 1, max: 100, unit: "unit.requests" },
  summaryInterval: { min: 1, max: 1440, unit: "unit.minutes" },
  quietPeriod: { min: 0, max: 120, unit: "unit.minutes" },
  historyDays: { min: 1, max: 365, unit: "unit.days" },
  maxSessions: { min: 1, max: 2000, unit: "unit.sessions" },
  minOccurrences: { min: 2, max: 10, unit: "unit.sessions" },
  evidenceBudget: { min: 4000, max: 200000, unit: "unit.characters" },
};

/** 设置服务快照值的结构；缺失或类型不符的字段取默认值。 */
const SettingsSchema = v.object({
  discovery: v.fallback(v.boolean(), DEFAULT_SETTINGS.discovery),
  summarize: v.fallback(v.boolean(), DEFAULT_SETTINGS.summarize),
  summaryProvider: v.fallback(v.string(), DEFAULT_SETTINGS.summaryProvider),
  summaryModel: v.fallback(v.string(), DEFAULT_SETTINGS.summaryModel),
  summaryEffort: v.fallback(v.string(), DEFAULT_SETTINGS.summaryEffort),
  summaryTimeout: v.fallback(v.number(), DEFAULT_SETTINGS.summaryTimeout),
  draftProvider: v.fallback(v.string(), DEFAULT_SETTINGS.draftProvider),
  draftModel: v.fallback(v.string(), DEFAULT_SETTINGS.draftModel),
  draftEffort: v.fallback(v.string(), DEFAULT_SETTINGS.draftEffort),
  draftTimeout: v.fallback(v.number(), DEFAULT_SETTINGS.draftTimeout),
  dailySummaries: v.fallback(v.number(), DEFAULT_SETTINGS.dailySummaries),
  summaryInterval: v.fallback(v.number(), DEFAULT_SETTINGS.summaryInterval),
  quietPeriod: v.fallback(v.number(), DEFAULT_SETTINGS.quietPeriod),
  historyDays: v.fallback(v.number(), DEFAULT_SETTINGS.historyDays),
  maxSessions: v.fallback(v.number(), DEFAULT_SETTINGS.maxSessions),
  minOccurrences: v.fallback(v.number(), DEFAULT_SETTINGS.minOccurrences),
  evidenceBudget: v.fallback(v.number(), DEFAULT_SETTINGS.evidenceBudget),
  readOutput: v.fallback(v.boolean(), DEFAULT_SETTINGS.readOutput),
  redactPatterns: v.fallback(v.array(v.string()), [...DEFAULT_SETTINGS.redactPatterns]),
  notify: v.fallback(v.picklist(["badge", "quiet"]), DEFAULT_SETTINGS.notify),
  scope: v.fallback(v.picklist(["project", "user"]), DEFAULT_SETTINGS.scope),
  prompt: v.fallback(v.string(), DEFAULT_SETTINGS.prompt),
});

/** 从设置服务的快照值读出完整设置。 */
export function parseSettings(value: unknown): SettingsValue {
  return v.parse(SettingsSchema, typeof value === "object" && value !== null ? value : {});
}

const SETTING_KEYS: readonly (keyof SettingsValue)[] = [
  "discovery",
  "summarize",
  "summaryProvider",
  "summaryModel",
  "summaryEffort",
  "summaryTimeout",
  "draftProvider",
  "draftModel",
  "draftEffort",
  "draftTimeout",
  "dailySummaries",
  "summaryInterval",
  "quietPeriod",
  "historyDays",
  "maxSessions",
  "minOccurrences",
  "evidenceBudget",
  "readOutput",
  "redactPatterns",
  "notify",
  "scope",
  "prompt",
];

const NUMBER_KEYS: readonly NumberKey[] = [
  "summaryTimeout",
  "draftTimeout",
  "dailySummaries",
  "summaryInterval",
  "quietPeriod",
  "historyDays",
  "maxSessions",
  "minOccurrences",
  "evidenceBudget",
];

/** 暂存值与已保存值的差异，转换成写操作。 */
export function diffOps(saved: SettingsValue, staged: SettingsValue): ConfigPathOp[] {
  return SETTING_KEYS.flatMap((key): ConfigPathOp[] => {
    const next: JsonValue = staged[key];
    return JSON.stringify(saved[key]) === JSON.stringify(next)
      ? []
      : [{ op: "set", path: [key], value: next }];
  });
}

/** 正则源码能否编译。 */
function compiles(source: string): boolean {
  try {
    return new RegExp(source, "u").source !== "";
  } catch (error) {
    // 校验用户输入：抛出即表示不合法。
    void error;
    return false;
  }
}

/** 每行一个正则；返回第一条不合法的行号（从 1 开始），都合法时返回 null。 */
export function invalidPattern(lines: readonly string[]): number | null {
  const index = lines.findIndex((line) => line.trim() !== "" && !compiles(line));
  return index === -1 ? null : index + 1;
}

/** 模型目录的读取状态。 */
export type CatalogState =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly catalog: ModelCatalog }
  | { readonly status: "error" };

interface FieldProps {
  readonly id?: string;
  readonly label: string;
  readonly hint: string;
  readonly children: ReactNode;
  readonly wide?: boolean;
}

function Field({ id, label, hint, children, wide = false }: FieldProps): ReactNode {
  return (
    <div className={wide ? `${styles.field} ${styles.wide}` : styles.field}>
      <div className={styles.text}>
        {id === undefined ? (
          <span className={styles.label}>{label}</span>
        ) : (
          <label className={styles.label} htmlFor={id}>
            {label}
          </label>
        )}
        <span className={styles.hint}>{hint}</span>
      </div>
      <div className={styles.control}>{children}</div>
    </div>
  );
}

/** 模型选项的值：`provider\u0000model`，空串表示默认模型。 */
const SEPARATOR = "\u0000";

function modelValue(provider: string, model: string): string {
  return provider === "" || model === "" ? "" : `${provider}${SEPARATOR}${model}`;
}

/** 一个阶段的模型设置：发现模型写摘要，生成模型写 Skill 草稿。 */
type Stage = "summary" | "draft";

/** 每个阶段的 provider、模型与推理强度对应的设置字段。 */
const MODEL_KEYS = {
  summary: { provider: "summaryProvider", model: "summaryModel", effort: "summaryEffort" },
  draft: { provider: "draftProvider", model: "draftModel", effort: "draftEffort" },
} as const satisfies Record<Stage, Record<"provider" | "model" | "effort", keyof SettingsValue>>;

interface ModelFieldsProps {
  readonly stage: Stage;
  readonly staged: SettingsValue;
  readonly catalog: CatalogState;
  readonly disabled: boolean;
  readonly onChange: (next: Partial<SettingsValue>) => void;
  readonly t: ScoutTranslate;
}

function ModelFields({
  stage,
  staged: values,
  catalog,
  disabled,
  onChange,
  t,
}: ModelFieldsProps): ReactNode {
  const id = useId();
  const keys = MODEL_KEYS[stage];
  const staged = {
    provider: values[keys.provider],
    model: values[keys.model],
    effort: values[keys.effort],
  };
  const groups = catalog.status === "ready" ? catalog.catalog.groups : [];
  const current = modelValue(staged.provider, staged.model);
  const fallback = catalog.status === "ready" ? catalog.catalog.default : null;
  const fallbackName =
    fallback === null
      ? null
      : (groups
          .find((group) => group.id === fallback.provider)
          ?.models.find((model) => model.id === fallback.model)?.name ?? fallback.model);
  const routeProvider = staged.provider === "" ? (fallback?.provider ?? "") : staged.provider;
  const routeModel = staged.model === "" ? (fallback?.model ?? "") : staged.model;
  const selected = groups
    .find((group) => group.id === routeProvider)
    ?.models.find((model) => model.id === routeModel);
  const efforts = selected?.reasoning?.efforts ?? [];
  const listed = groups.some((group) =>
    group.models.some((model) => modelValue(group.id, model.id) === current),
  );
  return (
    <>
      <Field
        id={`${id}-model`}
        label={t(stage === "summary" ? "settings.summaryModel" : "settings.draftModel")}
        hint={t(stage === "summary" ? "settings.summaryModelHint" : "settings.draftModelHint")}
      >
        <select
          id={`${id}-model`}
          className={styles.select}
          value={current}
          disabled={disabled}
          onChange={(event) => {
            const [provider = "", model = ""] = event.target.value.split(SEPARATOR);
            onChange({ [keys.provider]: provider, [keys.model]: model, [keys.effort]: "" });
          }}
        >
          <option value="">
            {fallbackName === null
              ? t("settings.modelDefaultUnknown")
              : t("settings.modelDefault", { model: fallbackName })}
          </option>
          {current !== "" && !listed && (
            <option value={current}>{t("settings.modelMissing", { model: staged.model })}</option>
          )}
          {groups.map((group) => (
            <optgroup key={group.id} label={group.name}>
              {group.models.map((model) => (
                <option key={model.id} value={modelValue(group.id, model.id)}>
                  {model.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        {catalog.status === "loading" && (
          <span className={styles.status}>{t("settings.modelLoading")}</span>
        )}
        {catalog.status === "error" && (
          <span className={styles.status} role="alert">
            {t("settings.modelError")}
          </span>
        )}
      </Field>
      {efforts.length > 0 && (
        <Field id={`${id}-effort`} label={t("settings.effort")} hint={t("settings.effortHint")}>
          <select
            id={`${id}-effort`}
            className={styles.select}
            value={staged.effort}
            disabled={disabled}
            onChange={(event) => onChange({ [keys.effort]: event.target.value })}
          >
            <option value="">{t("settings.effortDefault")}</option>
            {efforts.map((effort) => (
              <option key={effort.id} value={effort.id}>
                {effort.name}
              </option>
            ))}
          </select>
        </Field>
      )}
    </>
  );
}

/**
 * 创建配置页组件。
 * @param catalog - 模型目录的读取状态；页面打开时订阅。
 */
export function createSettingsPage(catalog: Observable<CatalogState>) {
  return function SettingsPage({ view, form, t }: RowConfigProps): ReactNode {
    const translate = t as ScoutTranslate;
    const id = useId();
    const saved = parseSettings(form?.state.value);
    const [draft, setDraft] = useState<Partial<SettingsValue>>({});
    const [patterns, setPatterns] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);
    const models = useSnapshot(catalog);

    if (view === "summary" || form === undefined) {
      return <span>{translate("settings.summary")}</span>;
    }

    const lines = patterns === null ? saved.redactPatterns : patterns.split("\n");
    const staged: SettingsValue = {
      ...saved,
      ...draft,
      redactPatterns: lines.map((line) => line.trim()).filter((line) => line !== ""),
    };
    const ops = diffOps(saved, staged);
    const badLine = invalidPattern(lines);
    const badNumber = NUMBER_KEYS.some((key) => {
      const value = staged[key];
      return !Number.isInteger(value) || value < NUMBERS[key].min || value > NUMBERS[key].max;
    });
    const writable = form.state.writable && !saving;
    const update = (next: Partial<SettingsValue>): void => {
      setDraft((current) => ({ ...current, ...next }));
      setFailed(false);
    };
    const discard = (): void => {
      setDraft({});
      setPatterns(null);
      setFailed(false);
    };
    const save = async (): Promise<void> => {
      setSaving(true);
      setFailed(false);
      try {
        const accepted = await form.mutate(ops, form.state.revision);
        if (accepted) discard();
        else setFailed(true);
      } catch (error) {
        // 传输失败与写入被拒绝一样提示，暂存值保留。
        void error;
        setFailed(true);
      } finally {
        setSaving(false);
      }
    };
    const toggle = (
      key: "discovery" | "summarize" | "readOutput",
      label: ScoutKey,
      hint: ScoutKey,
    ): ReactNode => (
      <Field label={translate(label)} hint={translate(hint)}>
        <Switch
          checked={staged[key]}
          label={translate(label)}
          disabled={!writable}
          onChange={(next) => update({ [key]: next })}
        />
      </Field>
    );
    const number = (key: NumberKey): ReactNode => {
      const range = NUMBERS[key];
      const fieldId = `${id}-${key}`;
      return (
        <Field
          id={fieldId}
          label={translate(`settings.${key}`)}
          hint={translate(`settings.${key}Hint`)}
        >
          <span className={styles.number}>
            <input
              id={fieldId}
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={range.min}
              max={range.max}
              step={1}
              value={Number.isFinite(staged[key]) ? staged[key] : ""}
              disabled={!writable}
              aria-invalid={staged[key] < range.min || staged[key] > range.max || undefined}
              onChange={(event) => update({ [key]: event.target.valueAsNumber })}
            />
            <span className={styles.unit}>{translate(range.unit)}</span>
          </span>
        </Field>
      );
    };

    return (
      <SettingsForm
        labels={{
          unavailable: translate("settings.unavailable"),
          readOnly: translate("settings.readOnly"),
          saveFailed: translate("settings.saveFailed"),
          save: translate("settings.save"),
          saving: translate("settings.saving"),
        }}
        state={{
          available: form.state.status === "ready",
          writable: form.state.writable,
          dirty: ops.length > 0,
          invalid: badLine !== null || badNumber,
          saving,
          failed,
        }}
        onSave={() => void save()}
        onDiscard={discard}
      >
        <div className={styles.page}>
          <section className={styles.section}>
            <h3 className={styles.title}>{translate("settings.section.discovery")}</h3>
            {toggle("discovery", "settings.discovery", "settings.discoveryHint")}
            {number("historyDays")}
            {number("maxSessions")}
            {number("quietPeriod")}
            {number("minOccurrences")}
          </section>
          <section className={styles.section}>
            <h3 className={styles.title}>{translate("settings.section.summary")}</h3>
            {toggle("summarize", "settings.summarize", "settings.summarizeHint")}
            <ModelFields
              stage="summary"
              staged={staged}
              catalog={models}
              disabled={!writable}
              onChange={update}
              t={translate}
            />
            {number("summaryTimeout")}
            <Field
              id={`${id}-prompt`}
              label={translate("settings.prompt")}
              hint={translate("settings.promptHint")}
              wide
            >
              <textarea
                id={`${id}-prompt`}
                className={`${styles.input} ${styles.area}`}
                rows={4}
                placeholder={translate("settings.promptPlaceholder")}
                value={staged.prompt}
                disabled={!writable}
                onChange={(event) => update({ prompt: event.target.value })}
              />
            </Field>
          </section>
          <section className={styles.section}>
            <h3 className={styles.title}>{translate("settings.section.draft")}</h3>
            <ModelFields
              stage="draft"
              staged={staged}
              catalog={models}
              disabled={!writable}
              onChange={update}
              t={translate}
            />
            {number("draftTimeout")}
          </section>
          <section className={styles.section}>
            <h3 className={styles.title}>{translate("settings.section.limits")}</h3>
            {number("dailySummaries")}
            {number("summaryInterval")}
            {number("evidenceBudget")}
          </section>
          <section className={styles.section}>
            <h3 className={styles.title}>{translate("settings.section.privacy")}</h3>
            {toggle("readOutput", "settings.readOutput", "settings.readOutputHint")}
            <Field
              id={`${id}-redact`}
              label={translate("settings.redactPatterns")}
              hint={translate("settings.redactPatternsHint")}
              wide
            >
              <textarea
                id={`${id}-redact`}
                className={`${styles.input} ${styles.area} ${styles.mono}`}
                rows={3}
                spellCheck={false}
                value={patterns ?? saved.redactPatterns.join("\n")}
                disabled={!writable}
                aria-invalid={badLine !== null || undefined}
                onChange={(event) => {
                  setPatterns(event.target.value);
                  setFailed(false);
                }}
              />
              {badLine !== null && (
                <span className={styles.status} role="alert">
                  {translate("settings.redactInvalid", { line: badLine })}
                </span>
              )}
            </Field>
          </section>
          <section className={styles.section}>
            <h3 className={styles.title}>{translate("settings.section.inbox")}</h3>
            <Field label={translate("settings.notify")} hint={translate("settings.notifyHint")}>
              <SegmentedControl
                id={`${id}-notify`}
                label={translate("settings.notify")}
                value={staged.notify}
                disabled={!writable}
                options={[
                  { value: "badge", label: translate("settings.notify.badge") },
                  { value: "quiet", label: translate("settings.notify.quiet") },
                ]}
                onChange={(notify) => update({ notify })}
              />
            </Field>
            <Field label={translate("settings.scope")} hint={translate("settings.scopeHint")}>
              <SegmentedControl
                id={`${id}-scope`}
                label={translate("settings.scope")}
                value={staged.scope}
                disabled={!writable}
                options={[
                  { value: "project", label: translate("scope.project") },
                  { value: "user", label: translate("scope.user") },
                ]}
                onChange={(scope) => update({ scope })}
              />
            </Field>
          </section>
        </div>
      </SettingsForm>
    );
  };
}
