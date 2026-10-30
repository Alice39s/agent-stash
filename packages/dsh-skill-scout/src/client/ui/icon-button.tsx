/**
 * 只有图标的按钮：24px 用在行尾与分页器，28px 用在 Tab 条尾部、详情底栏与视图头部。
 * 悬停或聚焦时用宿主 `Tooltip` 在下方显示名称，名称同时是 `aria-label`。
 * `unavailable` 给出读者能解决的原因时，按钮仍可聚焦，带 `aria-disabled` 与禁用外观，提示改为原因。
 */
import { Tooltip } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactNode, Ref } from "react";
import styles from "./icon-button.module.css";

export interface IconButtonProps {
  readonly label: string;
  readonly size?: 24 | 28;
  readonly onClick: () => void;
  /** 开关类按钮（编辑）的状态。 */
  readonly pressed?: boolean | undefined;
  readonly disabled?: boolean | undefined;
  /** 读者能解决的不可用原因。 */
  readonly unavailable?: string | null | undefined;
  readonly expanded?: boolean | undefined;
  readonly haspopup?: "menu" | undefined;
  readonly buttonRef?: Ref<HTMLButtonElement> | undefined;
  readonly children: ReactNode;
}

export function IconButton({
  label,
  size = 28,
  onClick,
  pressed,
  disabled,
  unavailable,
  expanded,
  haspopup,
  buttonRef,
  children,
}: IconButtonProps): ReactNode {
  const blocked = unavailable !== null && unavailable !== undefined;
  return (
    <Tooltip label={blocked ? unavailable : label} side="bottom">
      <button
        ref={buttonRef}
        type="button"
        className={styles.button}
        data-size={size}
        aria-label={label}
        aria-pressed={pressed}
        aria-expanded={expanded}
        aria-haspopup={haspopup}
        aria-disabled={blocked || undefined}
        disabled={disabled}
        onClick={() => {
          if (!blocked) onClick();
        }}
      >
        {children}
      </button>
    </Tooltip>
  );
}
