import {
  IconAgentPresetOutlineRegular,
  IconApiOutlineRegular,
  IconBranchOutlineRegular,
  IconChecklistOutlineRegular,
  IconClockOutlineRegular,
  IconCodeOutlineRegular,
  IconCompactOutlineRegular,
  IconCompareSplitOutlineRegular,
  IconDatabaseOutlineRegular,
  IconDeliverDocRegular,
  IconEditOutlineRegular,
  IconEnhanceOutlineRegular,
  IconFlatListOutlineRegular,
  IconFolderOpenOutlineRegular,
  IconGaugeOutlineRegular,
  IconGlobeOutlineRegular,
  IconGoalOutlineRegular,
  IconInfoOutlineRegular,
  IconInspectOutlineRegular,
  IconLightOutlineRegular,
  IconLinkOutlineRegular,
  IconListPenOutlineRegular,
  IconMicrophoneOutlineRegular,
  IconPaperPlaneOutlineRegular,
  IconPersonalizationOutlineRegular,
  IconPlanOutlineRegular,
  IconQuestionOutlineRegular,
  IconSearchOutlineRegular,
  IconShieldOutlineRegular,
  IconSkillOutlineRegular,
  IconSparkleRegular,
  IconThinkOutlineRegular,
  IconUserOutlineRegular,
  IconUsersOutlineRegular,
  IconWarningTriangleOutlineRegular,
  IconWrapLinesOutlineRegular,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { PRESET_ICON_NAMES, type PresetIconName } from "./preset-icons.ts";
import { K } from "./styles.ts";

type Glyph = (props: { size?: number }) => ReactNode;

/** 图标名到 DSH 图标库里的组件。 */
const GLYPHS: Readonly<Record<PresetIconName, Glyph>> = {
  sparkle: IconSparkleRegular,
  "enhance-outline": IconEnhanceOutlineRegular,
  "flat-list-outline": IconFlatListOutlineRegular,
  "list-pen-outline": IconListPenOutlineRegular,
  "checklist-outline": IconChecklistOutlineRegular,
  "compact-outline": IconCompactOutlineRegular,
  "wrap-lines-outline": IconWrapLinesOutlineRegular,
  "edit-outline": IconEditOutlineRegular,
  "microphone-outline": IconMicrophoneOutlineRegular,
  "think-outline": IconThinkOutlineRegular,
  "light-outline": IconLightOutlineRegular,
  "goal-outline": IconGoalOutlineRegular,
  "plan-outline": IconPlanOutlineRegular,
  "question-outline": IconQuestionOutlineRegular,
  "info-outline": IconInfoOutlineRegular,
  "search-outline": IconSearchOutlineRegular,
  "inspect-outline": IconInspectOutlineRegular,
  "compare-split-outline": IconCompareSplitOutlineRegular,
  "code-outline": IconCodeOutlineRegular,
  "api-outline": IconApiOutlineRegular,
  "database-outline": IconDatabaseOutlineRegular,
  "branch-outline": IconBranchOutlineRegular,
  "warning-triangle-outline": IconWarningTriangleOutlineRegular,
  "shield-outline": IconShieldOutlineRegular,
  "gauge-outline": IconGaugeOutlineRegular,
  "clock-outline": IconClockOutlineRegular,
  "link-outline": IconLinkOutlineRegular,
  "globe-outline": IconGlobeOutlineRegular,
  "user-outline": IconUserOutlineRegular,
  "users-outline": IconUsersOutlineRegular,
  "skill-outline": IconSkillOutlineRegular,
  "agent-preset-outline": IconAgentPresetOutlineRegular,
  "personalization-outline": IconPersonalizationOutlineRegular,
  "deliver-doc": IconDeliverDocRegular,
  "folder-open-outline": IconFolderOpenOutlineRegular,
  "paper-plane-outline": IconPaperPlaneOutlineRegular,
};

/** 一个预设图标。 */
export function PresetGlyph({
  name,
  size,
}: {
  readonly name: PresetIconName;
  readonly size: number;
}): ReactNode {
  const Glyph = GLYPHS[name];
  return <Glyph size={size} />;
}

/** 选择器每行的图标数，与 {@link PRESET_ICON_NAMES} 的分组一致。 */
export const PICKER_COLUMNS = 9;

/** 图标名读成文字，作为单选按钮的无障碍名称，例如 `flat list`。 */
function spoken(name: PresetIconName): string {
  return name.replace(/-outline$/u, "").replaceAll("-", " ");
}

/** 方向键与 Home、End 在网格里移动后的位置。 */
function step(key: string, index: number): number | undefined {
  const last = PRESET_ICON_NAMES.length - 1;
  switch (key) {
    case "ArrowLeft":
      return Math.max(0, index - 1);
    case "ArrowRight":
      return Math.min(last, index + 1);
    case "ArrowUp":
      return index - PICKER_COLUMNS >= 0 ? index - PICKER_COLUMNS : index;
    case "ArrowDown":
      return index + PICKER_COLUMNS <= last ? index + PICKER_COLUMNS : index;
    case "Home":
      return 0;
    case "End":
      return last;
    default:
      return undefined;
  }
}

export interface IconPickerProps {
  readonly value: PresetIconName;
  /** 网格的名称所在元素的 id。 */
  readonly labelledBy: string;
  readonly disabled: boolean;
  readonly onChange: (name: PresetIconName) => void;
}

/**
 * DSH 图标库里预设可用的图标，排成单选网格。Tab 进出整组，方向键与 Home、End 移动并选中，
 * 点击直接选中。
 */
export function IconPicker({ value, labelledBy, disabled, onChange }: IconPickerProps): ReactNode {
  const grid = useRef<HTMLDivElement>(null);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const next = step(event.key, PRESET_ICON_NAMES.indexOf(value));
    const name = next === undefined ? undefined : PRESET_ICON_NAMES[next];
    if (next === undefined || name === undefined) return;
    event.preventDefault();
    onChange(name);
    grid.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };
  return (
    <div
      ref={grid}
      role="radiogroup"
      aria-labelledby={labelledBy}
      className={`${K}-icon-grid`}
      onKeyDown={onKeyDown}
    >
      {PRESET_ICON_NAMES.map((name) => {
        const checked = name === value;
        return (
          <button
            key={name}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={spoken(name)}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            className={`${K}-icon-option`}
            onClick={() => onChange(name)}
          >
            <PresetGlyph name={name} size={16} />
          </button>
        );
      })}
    </div>
  );
}
