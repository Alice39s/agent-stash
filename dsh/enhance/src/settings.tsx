import {
  Button,
  IconChevronDownOutlineRegular,
  IconChevronUpOutlineRegular,
  IconPlusOutlineRegular,
  IconTrashOutlineRegular,
  Input,
  SegmentedControl,
  SettingsForm,
  Switch,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useEffect, useId, useState, type ReactNode } from "react";
import { presetLabel } from "./button.tsx";
import type { CatalogGroup, CatalogModel, ConfigPathOp, JsonValue, RowConfigProps } from "./dsh.ts";
import { format, type EnhanceKey } from "./locales.ts";
import { editablePrompt, isBuiltin, storedPrompt, type Preset } from "./presets.ts";
import {
  MAX_CONTEXT_TURNS,
  MAX_TIMEOUT,
  MIN_TIMEOUT,
  parseSettings,
  type EnhanceSettings,
} from "./settings-value.ts";
import { keysText } from "./shortcut.ts";
import { useValue, type ValueStore } from "./store.ts";
import { K } from "./styles.ts";

/** 配置页从插件级共享的部分。 */
export interface SettingsShared {
  /** 读取 DSH 的模型目录；远程服务不在时为 `undefined`。 */
  readonly catalog: ValueStore<(() => Promise<readonly CatalogGroup[]>) | undefined>;
  /** 增强命令当前生效的按键。 */
  readonly keys: ValueStore<readonly string[]>;
  /** 本机的默认按键。 */
  readonly defaultKeys: readonly string[];
}

type Catalog =
  | { readonly status: "loading" }
  | { readonly status: "ready"; readonly groups: readonly CatalogGroup[] }
  | { readonly status: "error" };

/** 读取模型目录；`round` 变化时重新读取。 */
function useCatalog(
  load: (() => Promise<readonly CatalogGroup[]>) | undefined,
  round: number,
): Catalog {
  const [catalog, setCatalog] = useState<{ readonly round: number; readonly value: Catalog }>();
  useEffect(() => {
    if (load === undefined) return undefined;
    let live = true;
    load().then(
      (groups) => {
        if (live) setCatalog({ round, value: { status: "ready", groups } });
      },
      (error: unknown) => {
        console.error(`[${K}] loading the model catalog failed:`, error);
        if (live) setCatalog({ round, value: { status: "error" } });
      },
    );
    return () => {
      live = false;
    };
  }, [load, round]);
  if (load === undefined) return { status: "error" };
  return catalog?.round === round ? catalog.value : { status: "loading" };
}

const FIELDS = [
  "provider",
  "model",
  "effort",
  "timeout",
  "context",
  "contextTurns",
  "shortcut",
] as const;

function samePresets(left: readonly Preset[], right: readonly Preset[]): boolean {
  return (
    left.length === right.length &&
    left.every((preset, index) => {
      const other = right[index];
      return (
        other !== undefined &&
        preset.id === other.id &&
        preset.title === other.title &&
        preset.description === other.description &&
        preset.prompt === other.prompt
      );
    })
  );
}

/** `next` 相对 `base` 的写操作：改动的字段各写一次，预设列表整体写入。 */
export function settingsOps(base: EnhanceSettings, next: EnhanceSettings): ConfigPathOp[] {
  const ops: ConfigPathOp[] = FIELDS.filter((field) => base[field] !== next[field]).map(
    (field) => ({ op: "set", path: [field], value: next[field] }),
  );
  if (!samePresets(base.presets, next.presets)) {
    const presets: JsonValue = next.presets.map((preset) => ({ ...preset }));
    ops.push({ op: "set", path: ["presets"], value: presets });
  }
  return ops;
}

/** 暂存的预设能否保存：至少一个预设，自定义预设都写了改写指令。 */
export function invalidPresets(presets: readonly Preset[]): boolean {
  return (
    presets.length === 0 ||
    presets.some((preset) => !isBuiltin(preset.id) && preset.prompt.trim() === "")
  );
}

interface FieldProps {
  readonly label: string;
  readonly hint?: string;
  readonly htmlFor?: string;
  readonly stack?: boolean;
  readonly children: ReactNode;
}

function Field({ label, hint, htmlFor, stack = false, children }: FieldProps): ReactNode {
  return (
    <div className={stack ? `${K}-field ${K}-field-stack` : `${K}-field`}>
      <div className={`${K}-field-text`}>
        <label className={`${K}-field-label`} htmlFor={htmlFor}>
          {label}
        </label>
        {hint !== undefined && <span className={`${K}-field-hint`}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** 输入框里的整数：超出范围时取边界，无法解析时保持原值。 */
export function clampInteger(text: string, min: number, max: number, fallback: number): number {
  const value = Number.parseInt(text, 10);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

interface ModelFieldsProps {
  readonly id: string;
  readonly shown: EnhanceSettings;
  readonly locked: boolean;
  readonly catalog: Catalog;
  readonly retry: () => void;
  readonly stage: (next: EnhanceSettings) => void;
  readonly t: (key: EnhanceKey) => string;
}

interface ModelRowProps {
  readonly name: string;
  readonly checked: boolean;
  readonly locked: boolean;
  readonly title: string;
  readonly route: string | undefined;
  readonly onPick: () => void;
}

function ModelRow({ name, checked, locked, title, route, onPick }: ModelRowProps): ReactNode {
  return (
    <label className={`${K}-model`}>
      <input type="radio" name={name} checked={checked} disabled={locked} onChange={onPick} />
      <span>
        <span className={`${K}-model-name`}>{title}</span>
        {route !== undefined && <span className={`${K}-model-route`}>{route}</span>}
      </span>
    </label>
  );
}

/** 改写模型：跟随会话，或从 DSH 的模型目录里选一个模型，再选它支持的推理强度。 */
function ModelFields({ id, shown, locked, catalog, retry, stage, t }: ModelFieldsProps): ReactNode {
  const follow = shown.provider === "" || shown.model === "";
  const groups = catalog.status === "ready" ? catalog.groups : [];
  const find = (provider: string, model: string): CatalogModel | undefined =>
    groups.find((group) => group.id === provider)?.models.find((entry) => entry.id === model);
  const chosen = follow ? undefined : find(shown.provider, shown.model);
  const efforts = chosen?.reasoning?.efforts ?? [];
  const name = `${id}-model`;
  const pick = (provider: string, model: string): void =>
    stage({ ...shown, provider, model, effort: "" });
  return (
    <>
      <Field label={t("model")} hint={t("modelHint")} stack>
        <div className={`${K}-models`} role="radiogroup" aria-label={t("model")}>
          <div className={`${K}-model-group`}>
            <ModelRow
              name={name}
              checked={follow}
              locked={locked}
              title={t("modelFollow")}
              route={undefined}
              onPick={() => pick("", "")}
            />
          </div>
          {groups.map((group) => (
            <div key={group.id} className={`${K}-model-group`}>
              <div className={`${K}-provider`}>{group.name}</div>
              {group.models.map((model) => (
                <ModelRow
                  key={model.id}
                  name={name}
                  checked={!follow && shown.provider === group.id && shown.model === model.id}
                  locked={locked}
                  title={model.name}
                  route={`${group.id}/${model.id}`}
                  onPick={() => pick(group.id, model.id)}
                />
              ))}
            </div>
          ))}
          {!follow && catalog.status === "ready" && chosen === undefined && (
            <div className={`${K}-model-group`}>
              <ModelRow
                name={name}
                checked
                locked={locked}
                title={format(t("modelMissing"), { name: shown.model })}
                route={`${shown.provider}/${shown.model}`}
                onPick={() => {}}
              />
            </div>
          )}
        </div>
        {catalog.status === "loading" && (
          <p className={`${K}-notice`} role="status">
            {t("modelLoading")}
          </p>
        )}
        {catalog.status === "error" && (
          <div className={`${K}-catalog-error`} role="alert">
            <span>{t("modelFailed")}</span>
            <Button size="sm" onClick={retry}>
              {t("modelRetry")}
            </Button>
          </div>
        )}
      </Field>
      {efforts.length > 0 && (
        <Field label={t("effort")}>
          <SegmentedControl
            id={`${id}-effort`}
            label={t("effort")}
            value={efforts.some((effort) => effort.id === shown.effort) ? shown.effort : ""}
            disabled={locked}
            options={[
              { value: "", label: t("effortDefault") },
              ...efforts.map((effort) => ({ value: effort.id, label: effort.name })),
            ]}
            onChange={(effort) => stage({ ...shown, effort })}
          />
        </Field>
      )}
    </>
  );
}

interface PresetEditorProps {
  readonly presets: readonly Preset[];
  readonly locked: boolean;
  readonly stage: (next: readonly Preset[]) => void;
  readonly t: (key: EnhanceKey) => string;
}

/** 预设列表：排序、删除、编辑名称说明与指令，或添加自定义预设。 */
function PresetEditor({ presets, locked, stage, t }: PresetEditorProps): ReactNode {
  const id = useId();
  const [editing, setEditing] = useState<string>();
  const replace = (index: number, preset: Preset): void =>
    stage(presets.map((candidate, at) => (at === index ? preset : candidate)));
  const move = (index: number, step: -1 | 1): void => {
    const next = [...presets];
    const [moved] = next.splice(index, 1);
    if (moved === undefined) return;
    next.splice(index + step, 0, moved);
    stage(next);
  };
  const add = (): void => {
    const preset: Preset = {
      id: `custom-${crypto.randomUUID().slice(0, 8)}`,
      title: "",
      description: "",
      prompt: "",
    };
    stage([...presets, preset]);
    setEditing(preset.id);
  };
  return (
    <section className={`${K}-presets`} aria-labelledby={`${id}-presets`}>
      <span id={`${id}-presets`} className={`${K}-field-label`}>
        {t("presets")}
      </span>
      <ol className={`${K}-preset-list`}>
        {presets.map((preset, index) => {
          const { title, hint } = presetLabel(preset, t);
          const builtin = isBuiltin(preset.id);
          const open = editing === preset.id;
          const missing = !builtin && preset.prompt.trim() === "";
          const edited =
            builtin && (preset.title !== "" || preset.description !== "" || preset.prompt !== "");
          const field = (name: string): string => `${id}-${preset.id}-${name}`;
          return (
            <li key={preset.id} className={`${K}-preset`}>
              <div className={`${K}-preset-head`}>
                <span className={`${K}-preset-index`}>{index + 1}</span>
                <span className={`${K}-preset-text`}>
                  <span className={`${K}-preset-title`}>
                    <span className={`${K}-preset-title-text`}>{title}</span>
                    {builtin && (
                      <span className={`${K}-preset-tag`}>
                        {edited ? t("presetBuiltinEdited") : t("presetBuiltin")}
                      </span>
                    )}
                  </span>
                  {hint !== "" && <span className={`${K}-preset-hint`}>{hint}</span>}
                  {missing && !open && (
                    <span className={`${K}-invalid`}>{t("presetNeedsPrompt")}</span>
                  )}
                </span>
                <span className={`${K}-preset-actions`}>
                  <button
                    type="button"
                    className={`${K}-icon-button`}
                    aria-label={t("presetUp")}
                    disabled={locked || index === 0}
                    onClick={() => move(index, -1)}
                  >
                    <IconChevronUpOutlineRegular size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${K}-icon-button`}
                    aria-label={t("presetDown")}
                    disabled={locked || index === presets.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    <IconChevronDownOutlineRegular size={14} />
                  </button>
                  <button
                    type="button"
                    className={`${K}-icon-button`}
                    aria-label={t("presetRemove")}
                    disabled={locked || presets.length === 1}
                    onClick={() => stage(presets.filter((_, at) => at !== index))}
                  >
                    <IconTrashOutlineRegular size={14} />
                  </button>
                  <Button
                    size="sm"
                    disabled={locked}
                    aria-expanded={open}
                    onClick={() => setEditing(open ? undefined : preset.id)}
                  >
                    {open ? t("presetDone") : t("presetEdit")}
                  </Button>
                </span>
              </div>
              {open && (
                <div className={`${K}-preset-form`}>
                  <label className={`${K}-preset-label`} htmlFor={field("title")}>
                    {t("presetTitle")}
                  </label>
                  <Input
                    id={field("title")}
                    value={preset.title}
                    placeholder={title}
                    disabled={locked}
                    onChange={(event) => replace(index, { ...preset, title: event.target.value })}
                  />
                  <label className={`${K}-preset-label`} htmlFor={field("description")}>
                    {t("presetDescription")}
                  </label>
                  <Input
                    id={field("description")}
                    value={preset.description}
                    placeholder={hint}
                    disabled={locked}
                    onChange={(event) =>
                      replace(index, { ...preset, description: event.target.value })
                    }
                  />
                  <label className={`${K}-preset-label`} htmlFor={field("prompt")}>
                    {t("presetPrompt")}
                  </label>
                  <textarea
                    id={field("prompt")}
                    className={`${K}-textarea`}
                    value={editablePrompt(preset)}
                    rows={6}
                    spellCheck={false}
                    placeholder={t("presetPromptCustom")}
                    aria-invalid={missing}
                    disabled={locked}
                    onChange={(event) =>
                      replace(index, {
                        ...preset,
                        prompt: storedPrompt(preset.id, event.target.value),
                      })
                    }
                  />
                  {missing && <p className={`${K}-invalid`}>{t("presetNeedsPrompt")}</p>}
                  {edited && (
                    <div className={`${K}-preset-footer`}>
                      <Button
                        size="sm"
                        disabled={locked}
                        onClick={() =>
                          replace(index, {
                            id: preset.id,
                            title: "",
                            description: "",
                            prompt: "",
                          })
                        }
                      >
                        {t("presetReset")}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <Button size="sm" className={`${K}-add`} disabled={locked} onClick={add}>
        <IconPlusOutlineRegular size={14} />
        {t("presetAdd")}
      </Button>
    </section>
  );
}

/**
 * 插件页里本插件的配置页。改动先暂存，点保存才写回 profile；写入携带读到的版本号，
 * 被拒绝或传输失败时保留暂存值并提示。离开页面即放弃暂存的改动。
 */
export function createSettingsPage(
  shared: SettingsShared,
): (props: RowConfigProps<EnhanceKey>) => ReactNode {
  return function SettingsPage({ view, form, t }) {
    const id = useId();
    const [draft, setDraft] = useState<EnhanceSettings>();
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);
    const [round, setRound] = useState(0);
    const load = useValue(shared.catalog);
    const keys = useValue(shared.keys);
    const catalog = useCatalog(view === "page" ? load : undefined, round);
    if (view === "summary") return t("summary");

    const current = parseSettings(form?.state.value);
    const shown = draft ?? current;
    const ops = settingsOps(current, shown);
    const dirty = ops.length > 0;
    const invalid = invalidPresets(shown.presets);
    const available = form !== undefined && form.state.status !== "unavailable";
    const writable = available && form.state.status === "ready" && form.state.writable;
    const locked = !writable || saving;

    const stage = (next: EnhanceSettings): void => {
      setDraft(next);
      setFailed(false);
    };
    const save = async (): Promise<void> => {
      if (form === undefined || !dirty) return;
      setSaving(true);
      setFailed(false);
      try {
        const accepted = await form.mutate(ops, form.state.revision);
        if (accepted) setDraft(undefined);
        else setFailed(true);
      } catch (error) {
        console.error(`[${K}] saving the settings failed:`, error);
        setFailed(true);
      } finally {
        setSaving(false);
      }
    };

    const bound = keys.length > 0 ? keys : shared.defaultKeys;
    const shortcutHint =
      shown.shortcut && current.shortcut && keys.length === 0
        ? t("shortcutNone")
        : format(t("shortcutHint"), { keys: keysText(bound) });

    return (
      <div className={`${K}-settings`}>
        <SettingsForm
          labels={{
            unavailable: t("unavailable"),
            readOnly: t("readOnly"),
            saveFailed: t("saveFailed"),
            save: t("save"),
            saving: t("saving"),
          }}
          state={{ available, writable, dirty, invalid, saving, failed }}
          onSave={() => void save()}
          onDiscard={() => setDraft(undefined)}
        >
          <ModelFields
            id={id}
            shown={shown}
            locked={locked}
            catalog={catalog}
            retry={() => setRound(round + 1)}
            stage={stage}
            t={t}
          />
          <Field label={t("timeout")} htmlFor={`${id}-timeout`}>
            <Input
              id={`${id}-timeout`}
              className={`${K}-number`}
              type="number"
              inputMode="numeric"
              min={MIN_TIMEOUT}
              max={MAX_TIMEOUT}
              value={shown.timeout}
              disabled={locked}
              onChange={(event) =>
                stage({
                  ...shown,
                  timeout: clampInteger(
                    event.target.value,
                    MIN_TIMEOUT,
                    MAX_TIMEOUT,
                    shown.timeout,
                  ),
                })
              }
            />
          </Field>
          <Field label={t("contextToggle")} hint={t("contextHint")}>
            <Switch
              checked={shown.context}
              label={t("contextToggle")}
              disabled={locked}
              onChange={(next) => stage({ ...shown, context: next })}
            />
          </Field>
          {shown.context && (
            <Field label={t("contextTurns")} htmlFor={`${id}-turns`}>
              <Input
                id={`${id}-turns`}
                className={`${K}-number`}
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_CONTEXT_TURNS}
                value={shown.contextTurns}
                disabled={locked}
                onChange={(event) =>
                  stage({
                    ...shown,
                    contextTurns: clampInteger(
                      event.target.value,
                      1,
                      MAX_CONTEXT_TURNS,
                      shown.contextTurns,
                    ),
                  })
                }
              />
            </Field>
          )}
          <Field label={t("shortcut")} hint={shortcutHint}>
            <Switch
              checked={shown.shortcut}
              label={t("shortcut")}
              disabled={locked}
              onChange={(next) => stage({ ...shown, shortcut: next })}
            />
          </Field>
          <PresetEditor
            presets={shown.presets}
            locked={locked}
            stage={(presets) => stage({ ...shown, presets })}
            t={t}
          />
        </SettingsForm>
      </div>
    );
  };
}
