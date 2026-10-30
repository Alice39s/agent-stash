/**
 * 带文字的操作按钮（design 4.4）：进行中时按钮里显示转圈的状态点并换成进行时的文字；
 * 因读者能解决的原因不可用时仍可聚焦，带 `aria-disabled` 与禁用外观，悬停提示说明原因。
 */
import { Button, StateDot, Tooltip } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactNode } from "react";
import styles from "./action-button.module.css";

export interface ActionButtonProps {
  readonly variant: "primary" | "ghost" | "outline";
  readonly label: string;
  /** 进行中的文字，例如「正在保存」。 */
  readonly busyLabel?: string | undefined;
  /** 这个按钮发起的操作正在进行。 */
  readonly busy?: boolean;
  /** 别的操作正在进行，或这一步不能做。 */
  readonly disabled?: boolean;
  /** 读者能解决的不可用原因。 */
  readonly unavailable?: string | null | undefined;
  readonly onClick: () => void;
  readonly className?: string | undefined;
}

export function ActionButton({
  variant,
  label,
  busyLabel,
  busy = false,
  disabled = false,
  unavailable,
  onClick,
  className,
}: ActionButtonProps): ReactNode {
  const blocked = unavailable !== null && unavailable !== undefined;
  const button = (
    <Button
      variant={variant}
      size="sm"
      className={className === undefined ? styles.button : `${styles.button} ${className}`}
      disabled={disabled || busy}
      aria-disabled={blocked || undefined}
      onClick={() => {
        if (!blocked) onClick();
      }}
    >
      {busy && <StateDot state="ongoing" size={12} />}
      {busy && busyLabel !== undefined ? busyLabel : label}
    </Button>
  );
  return blocked ? (
    <Tooltip label={unavailable} side="bottom">
      {button}
    </Tooltip>
  ) : (
    button
  );
}
