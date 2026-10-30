/**
 * 带目标选择的主按钮（design 4.4）：照宿主插件页的 `.addGroup`、`.addPrimary`、`.addMore`，
 * 32px 的主按钮写明当前目标，右侧 32px 的箭头按钮打开靠右对齐的 `Menu`，当前目标打勾。
 */
import {
  Button,
  IconChevronDownOutlineRegular,
  Menu,
  StateDot,
  Tooltip,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useState, type ReactNode } from "react";
import styles from "./split-button.module.css";

export interface SplitChoice<Id extends string> {
  readonly id: Id;
  readonly label: string;
}

export interface SplitButtonProps<Id extends string> {
  /** 主按钮的文字，写明当前目标。 */
  readonly label: string;
  readonly busyLabel: string;
  readonly busy: boolean;
  readonly disabled: boolean;
  /** 读者能解决的不可用原因。 */
  readonly unavailable?: string | null | undefined;
  readonly onClick: () => void;
  readonly choices: readonly SplitChoice<Id>[];
  readonly selected: Id;
  readonly onChoose: (id: Id) => void;
  readonly labels: { readonly group: string; readonly choose: string };
}

export function SplitButton<Id extends string>({
  label,
  busyLabel,
  busy,
  disabled,
  unavailable,
  onClick,
  choices,
  selected,
  onChoose,
  labels,
}: SplitButtonProps<Id>): ReactNode {
  const [open, setOpen] = useState(false);
  const blocked = unavailable !== null && unavailable !== undefined;
  const primary = (
    <Button
      variant="primary"
      size="sm"
      className={styles.primary}
      disabled={disabled || busy}
      aria-disabled={blocked || undefined}
      onClick={() => {
        if (!blocked) onClick();
      }}
    >
      {busy && <StateDot state="ongoing" size={12} />}
      {busy ? busyLabel : label}
    </Button>
  );
  return (
    <span className={styles.split} role="group" aria-label={labels.group}>
      {blocked ? (
        <Tooltip label={unavailable} side="bottom">
          {primary}
        </Tooltip>
      ) : (
        primary
      )}
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        align="end"
        portal
        autoFocus
        selection="check"
        selectedId={selected}
        items={choices.map((choice) => ({ id: choice.id, label: choice.label }))}
        onSelect={(id) => {
          setOpen(false);
          const choice = choices.find((entry) => entry.id === id);
          if (choice !== undefined) onChoose(choice.id);
        }}
        anchor={
          <Button
            variant="primary"
            size="sm"
            className={styles.more}
            disabled={disabled || busy}
            aria-label={labels.choose}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <IconChevronDownOutlineRegular size={12} />
          </Button>
        }
      />
    </span>
  );
}
