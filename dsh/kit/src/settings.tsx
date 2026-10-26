import {
  SegmentedControl,
  SettingsForm,
  Switch,
  Button,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useId, useState, type ComponentType, type ReactNode } from "react";
import {
  changedFields,
  ghostEffectOf,
  parseAppearance,
  sameAppearance,
  type Appearance,
} from "./appearance.ts";
import type { RowConfigProps } from "./dsh.ts";
import type { KitKey } from "./locales.ts";
import type { PanelProps } from "./service.ts";
import { EASE_OUT } from "./styles.ts";

type Choice = "motion" | "ghost" | "highlight" | "density";
type Toggle = "glass" | "hints";

/** 每个选择项的可选值与文案键，按显示顺序。 */
const CHOICES: { readonly [Key in Choice]: readonly (readonly [string, KitKey])[] } = {
  motion: [
    ["lively", "motion.lively"],
    ["subtle", "motion.subtle"],
    ["off", "motion.off"],
  ],
  ghost: [
    ["wave", "ghost.wave"],
    ["fade", "ghost.fade"],
    ["none", "ghost.none"],
  ],
  highlight: [
    ["glide", "highlight.glide"],
    ["instant", "highlight.instant"],
  ],
  density: [
    ["comfortable", "density.comfortable"],
    ["compact", "density.compact"],
  ],
};

interface FieldProps {
  readonly k: string;
  readonly label: string;
  readonly hint: string;
  readonly children: ReactNode;
}

function Field({ k, label, hint, children }: FieldProps): ReactNode {
  return (
    <div className={`${k}-field`}>
      <div className={`${k}-field-text`}>
        <span className={`${k}-field-label`}>{label}</span>
        <span className={`${k}-field-hint`}>{hint}</span>
      </div>
      {children}
    </div>
  );
}

interface PreviewProps {
  readonly k: string;
  readonly appearance: Appearance;
  readonly Panel: ComponentType<PanelProps>;
  readonly t: (key: KitKey) => string;
}

/** 配置页里的实时预览：按暂存的外观渲染一个面板和一行带补全灰字的草稿，可以重播动画。 */
function Preview({ k, appearance, Panel, t }: PreviewProps): ReactNode {
  const [round, setRound] = useState(0);
  const [active, setActive] = useState(2);
  const effect = ghostEffectOf(appearance);
  return (
    <section className={`${k}-preview`} aria-label={t("preview")}>
      <div className={`${k}-preview-head`}>
        <span className={`${k}-field-label`}>{t("preview")}</span>
        <Button size="sm" onClick={() => setRound(round + 1)}>
          {t("replay")}
        </Button>
      </div>
      <div className={`${k}-preview-stage`}>
        <Panel
          key={`panel-${String(round)}`}
          owner={`${k}-preview`}
          open
          title={t("previewTitle")}
          counter={`0${String(active + 1)} / 03`}
          rows={[
            { key: "1", text: t("previewRow1"), meta: "09:12" },
            { key: "2", text: t("previewRow2"), meta: "11:40" },
            { key: "3", text: t("previewRow3"), meta: "16:33" },
          ]}
          active={active}
          hints={[{ keys: ["↑", "↓"], label: t("previewHintBrowse") }]}
          trailingHints={[{ keys: ["Tab", "→"], label: t("previewHintFill") }]}
          onPick={setActive}
          onHover={setActive}
          preview={appearance}
        />
        <p className={`${k}-preview-draft`}>
          {t("previewDraft")}
          <span
            key={`ghost-${String(round)}`}
            className={`${k}-preview-ghost`}
            data-effect={effect}
          >
            {t("previewGhost")}
          </span>
        </p>
      </div>
    </section>
  );
}

/**
 * 插件页里框架条目的配置页：实时预览加各项外观设置。改动先暂存，点保存才写回 profile；
 * 写入携带读到的版本号，被拒绝或传输失败时保留暂存值并提示。离开页面即放弃暂存的改动。
 */
export function createSettingsPage(
  k: string,
  Panel: ComponentType<PanelProps>,
): (props: RowConfigProps<KitKey>) => ReactNode {
  return function SettingsPage({ view, form, t }: RowConfigProps<KitKey>): ReactNode {
    const id = useId();
    const [draft, setDraft] = useState<Appearance>();
    const [saving, setSaving] = useState(false);
    const [failed, setFailed] = useState(false);
    if (view === "summary") return t("summary");

    const current = parseAppearance(form?.state.value);
    const shown = draft ?? current;
    const dirty = draft !== undefined && !sameAppearance(draft, current);
    const available = form !== undefined && form.state.status !== "unavailable";
    const writable = available && form.state.status === "ready" && form.state.writable;
    const locked = !writable || saving;

    const stage = (next: Appearance): void => {
      setDraft(next);
      setFailed(false);
    };
    const save = async (): Promise<void> => {
      if (form === undefined || draft === undefined) return;
      setSaving(true);
      setFailed(false);
      try {
        const ops = changedFields(current, draft).map((field) => ({
          op: "set" as const,
          path: [field],
          value: draft[field],
        }));
        const accepted = await form.mutate(ops, form.state.revision);
        if (accepted) setDraft(undefined);
        else setFailed(true);
      } catch (error) {
        console.error(`[${k}] saving the appearance settings failed:`, error);
        setFailed(true);
      } finally {
        setSaving(false);
      }
    };

    const toggle = (field: Toggle): ReactNode => (
      <Field k={k} label={t(field)} hint={t(`${field}Hint`)}>
        <Switch
          checked={shown[field]}
          label={t(field)}
          disabled={locked}
          onChange={(next) => stage({ ...shown, [field]: next })}
        />
      </Field>
    );
    const choice = (field: Choice): ReactNode => (
      <Field k={k} label={t(field)} hint={t(`${field}Hint`)}>
        <SegmentedControl
          id={`${id}-${field}`}
          label={t(field)}
          value={shown[field]}
          disabled={locked}
          options={CHOICES[field].map(([value, label]) => ({ value, label: t(label) }))}
          // 经同一份校验把选中的值并回外观。
          onChange={(next) => stage(parseAppearance({ ...shown, [field]: next }))}
        />
      </Field>
    );

    return (
      <div className={`${k}-settings`}>
        <SettingsForm
          labels={{
            unavailable: t("unavailable"),
            readOnly: t("readOnly"),
            saveFailed: t("saveFailed"),
            save: t("save"),
            saving: t("saving"),
          }}
          state={{ available, writable, dirty, invalid: false, saving, failed }}
          onSave={() => void save()}
          onDiscard={() => setDraft(undefined)}
        >
          <Preview k={k} appearance={shown} Panel={Panel} t={t} />
          {toggle("glass")}
          {choice("motion")}
          {choice("ghost")}
          {choice("highlight")}
          {choice("density")}
          {toggle("hints")}
        </SettingsForm>
      </div>
    );
  };
}

/** 配置页与预览的样式。 */
export function settingsCss(k: string): string {
  const p = `.${k}`;
  return `
${p}-settings {
  padding: 4px 0 8px;
}
${p}-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px 16px;
  padding: 12px 0;
  border-top: 0.5px solid var(--dsw-alias-border-l2);
}
${p}-field-text {
  display: flex;
  flex: 1 1 220px;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}
${p}-field-label {
  font-size: 13px;
  font-weight: 500;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}
${p}-field-hint {
  font-size: 12px;
  line-height: 18px;
  color: var(--dsw-alias-label-tertiary);
}
${p}-preview {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px 0 16px;
}
${p}-preview-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
${p}-preview-stage {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px;
  border-radius: var(--dsw-radius-lg);
  background: var(--dsw-alias-bg-layer-2, var(--dsw-alias-interactive-bg-hover));
}
${p}-preview-draft {
  margin: 0;
  padding: 10px 14px;
  border-radius: var(--dsw-radius-panel);
  background: var(--dsw-alias-bg-layer-1, var(--dsw-alias-bg-base));
  box-shadow: var(--dsw-elevation-soft);
  font-size: 14px;
  line-height: 22px;
  color: var(--dsw-alias-label-primary);
}
${p}-preview-ghost {
  color: var(--dsw-alias-label-caption);
}
${p}-preview-ghost[data-effect="wave"] {
  mask-image: linear-gradient(90deg, black 0 40%, transparent 60% 100%);
  mask-size: 250% 100%;
  mask-position: 0 0;
  animation: ${k}-ghost-wave-a 280ms ${EASE_OUT} 240ms both;
}
${p}-preview-ghost[data-effect="fade"] {
  animation: ${k}-ghost-fade-a 180ms ${EASE_OUT} 240ms both;
}
@media (prefers-reduced-motion: reduce) {
  ${p}-preview-ghost[data-effect] {
    mask-image: none;
    animation-duration: 1ms;
  }
}
`;
}
