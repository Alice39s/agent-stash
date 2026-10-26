/**
 * 插件自带的基础控件。外观与行为复制自 DSH 宿主组件（对应关系见 controls.module.css 开头），
 * 不在运行时引用任何宿主包。
 */
import { useId, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from "react";
import type { CascadePolicy } from "../shared.ts";
import { cx } from "./class-names.ts";
import styles from "./controls.module.css";
import type { Icon } from "./icons.tsx";
import type { MessageEditTranslate } from "./locale.ts";
import surface from "./surface.module.css";
import { Tooltip } from "./tooltip.tsx";
import { CASCADE_POLICIES, cascadeCopy, nextRadioIndex, type VersionTone } from "./view-model.ts";

type NativeButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "className" | "type" | "children"
>;

/** 图形尺寸：标题栏、工具栏与对话框关闭按钮 14px，消息动作行 15px。 */
export const GLYPH_SIZE = 14;
const ROW_GLYPH_SIZE = 15;

/** 让页面上所有转圈的动画都从文档时间零点开始，彼此同相。 */
function pinSpinner(element: SVGSVGElement): void {
  for (const animation of element.getAnimations({ subtree: true })) animation.startTime = 0;
}

function syncSpinner(element: SVGSVGElement | null): void {
  if (element === null) return;
  pinSpinner(element);
  element.addEventListener("animationstart", () => {
    pinSpinner(element);
  });
}

export type StateDotProps =
  | { readonly state: "ongoing"; readonly size: number }
  | { readonly state: VersionTone };

/** 进行中的转圈，或版本树的圆点标记。只做装饰，旁边总有文字或无障碍名称。 */
export function StateDot(props: StateDotProps): ReactNode {
  if (props.state !== "ongoing") {
    return <span className={styles.dot} data-tone={props.state} aria-hidden="true" />;
  }
  return (
    <svg
      ref={syncSpinner}
      className={styles.spinner}
      width={props.size}
      height={props.size}
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <g className={styles.spinnerMotion}>
        <circle className={styles.spinnerTrack} cx="12" cy="12" r="9.5" />
        <circle className={styles.spinnerArc} cx="12" cy="12" r="9.5" />
      </g>
    </svg>
  );
}

/** 控件的图形：操作进行中时换成同尺寸的转圈。 */
export function Glyph({
  icon: IconComponent,
  size,
  busy,
}: {
  readonly icon: Icon;
  readonly size: number;
  readonly busy: boolean;
}): ReactNode {
  return busy ? <StateDot state="ongoing" size={size} /> : <IconComponent size={size} />;
}

export interface IconButtonProps {
  /** `header`：标题栏 28px 圆形按钮；`row`：消息动作行 28px 方形按钮。 */
  readonly variant: "header" | "row";
  /** 无障碍名称，同时是 tooltip 文案。 */
  readonly label: string;
  readonly icon: Icon;
  /** 这个控件发起的操作正在进行：转圈替换图标，设置 `aria-busy`，点击不再生效。 */
  readonly busy?: boolean;
  readonly disabled?: boolean;
  readonly onClick: () => void;
}

export function IconButton({
  variant,
  label,
  icon,
  busy = false,
  disabled = false,
  onClick,
}: IconButtonProps): ReactNode {
  return (
    <Tooltip label={label}>
      <button
        type="button"
        className={cx(
          surface.root,
          styles.iconButton,
          variant === "header" ? styles.iconHeader : styles.iconRow,
        )}
        aria-label={label}
        aria-busy={busy || undefined}
        disabled={disabled}
        onClick={busy ? undefined : onClick}
      >
        <Glyph icon={icon} size={variant === "header" ? GLYPH_SIZE : ROW_GLYPH_SIZE} busy={busy} />
      </button>
    </Tooltip>
  );
}

export interface QuietActionProps extends NativeButtonProps {
  /** `header`：标题栏文字动作；`toolbar`：视图工具栏的紧凑控件与选项开关。 */
  readonly variant: "header" | "toolbar";
  readonly tooltip?: string | undefined;
  /** 失败提示期间改用错误色。 */
  readonly failed?: boolean;
  readonly children: ReactNode;
}

/** 透明的文字动作，悬停时才提亮。 */
export function QuietAction({
  variant,
  tooltip,
  failed = false,
  children,
  ...native
}: QuietActionProps): ReactNode {
  const button = (
    <button
      type="button"
      {...native}
      className={cx(
        styles.quiet,
        variant === "header" ? styles.quietHeader : styles.quietToolbar,
        failed && styles.failed,
      )}
    >
      {children}
    </button>
  );
  return tooltip === undefined ? button : <Tooltip label={tooltip}>{button}</Tooltip>;
}

export interface ButtonProps extends NativeButtonProps {
  readonly variant: "primary" | "outline";
  readonly size: "md" | "sm";
  readonly children: ReactNode;
}

/** `md`：对话框按钮；`sm` 描边：窗格里的重试。 */
export function Button({ variant, size, children, ...native }: ButtonProps): ReactNode {
  return (
    <button type="button" {...native} className={cx(styles.button, styles[variant], styles[size])}>
      {children}
    </button>
  );
}

export interface ListRowProps {
  /** `option`：选择对话框的选项行；`tree`：版本树的一行。 */
  readonly variant: "option" | "tree";
  /** 版本树的缩进层数。 */
  readonly indent?: number;
  /** 当前项渲染成不可点击的行，带 `aria-current`。 */
  readonly current?: boolean;
  /** 对话框打开或换步骤时得到初始焦点。 */
  readonly autofocus?: boolean;
  readonly onClick?: () => void;
  readonly children: ReactNode;
}

export function ListRow({
  variant,
  indent,
  current = false,
  autofocus = false,
  onClick,
  children,
}: ListRowProps): ReactNode {
  const className = cx(styles.listRow, styles[variant]);
  if (current) {
    return (
      <div className={className} data-indent={indent} aria-current="true">
        {children}
      </div>
    );
  }
  return (
    <button
      type="button"
      className={className}
      data-indent={indent}
      data-modal-autofocus={autofocus || undefined}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export interface TextFieldProps {
  readonly label: string;
  readonly value: string;
  readonly readOnly: boolean;
  readonly onChange: (value: string) => void;
}

/** 多行文本框；对话框打开时得到初始焦点，光标放在末尾。 */
export function TextField({ label, value, readOnly, onChange }: TextFieldProps): ReactNode {
  return (
    <textarea
      className={styles.field}
      aria-label={label}
      value={value}
      readOnly={readOnly}
      data-modal-autofocus=""
      onChange={(event) => {
        onChange(event.currentTarget.value);
      }}
    />
  );
}

export interface CascadeToggleProps {
  readonly t: MessageEditTranslate;
  readonly value: CascadePolicy;
  readonly disabled: boolean;
  readonly onChange: (value: CascadePolicy) => void;
}

/** 后续回合策略的 radiogroup：方向键在选项间移动并选中，只有选中项在 Tab 序列里。 */
export function CascadeToggle({ t, value, disabled, onChange }: CascadeToggleProps): ReactNode {
  const labelId = useId();
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const index = nextRadioIndex(
      CASCADE_POLICIES.indexOf(value),
      event.key,
      CASCADE_POLICIES.length,
    );
    if (index === undefined || disabled) return;
    const policy = CASCADE_POLICIES[index];
    if (policy === undefined) throw new Error(`no cascade policy at index ${String(index)}`);
    event.preventDefault();
    onChange(policy);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]').item(index).focus();
  };
  return (
    <div
      role="radiogroup"
      aria-labelledby={labelId}
      className={styles.radioGroup}
      onKeyDown={onKeyDown}
    >
      <span id={labelId} className={styles.radioLabel}>
        {t("cascade.label")}
      </span>
      {CASCADE_POLICIES.map((policy) => {
        const copy = cascadeCopy(t, policy);
        const checked = policy === value;
        return (
          <QuietAction
            key={policy}
            variant="toolbar"
            role="radio"
            aria-checked={checked}
            tabIndex={checked ? 0 : -1}
            disabled={disabled}
            tooltip={copy.hint}
            onClick={() => {
              onChange(policy);
            }}
          >
            {copy.label}
          </QuietAction>
        );
      })}
    </div>
  );
}
