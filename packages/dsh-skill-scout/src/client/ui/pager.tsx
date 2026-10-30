/**
 * 同一来源的一组条目之间的分页器（design 4.5）：照宿主 QuestionComposer 的 `.pager`，两个 24px 圆形按钮夹着
 * 「n / m」；点位置标签打开 `Menu`，每一行以状态点为图标，当前条目打勾。只有两个及以上条目时显示。
 */
import {
  IconChevronLeftOutlineRegular,
  IconChevronRightOutlineRegular,
  Menu,
  StateDot,
  type StateDotState,
} from "@deepseek-ai/dsh-client-ui-primitives";
import { useState, type ReactNode } from "react";
import { IconButton } from "./icon-button.tsx";
import styles from "./pager.module.css";

export interface PagerEntry {
  readonly id: string;
  readonly title: string;
  readonly dot: StateDotState;
  readonly word: string;
}

export interface PagerLabels {
  readonly group: string;
  readonly previous: string;
  readonly next: string;
  /** 位置标签的名称，例如「第 2 个，共 3 个」。 */
  readonly position: (index: number, total: number) => string;
}

export function Pager({
  entries,
  current,
  onSelect,
  labels,
}: {
  readonly entries: readonly PagerEntry[];
  readonly current: string;
  readonly onSelect: (id: string) => void;
  readonly labels: PagerLabels;
}): ReactNode {
  const [open, setOpen] = useState(false);
  if (entries.length < 2) return null;
  const index = Math.max(
    0,
    entries.findIndex((entry) => entry.id === current),
  );
  const go = (target: number): void => {
    const entry = entries[target];
    if (entry !== undefined) onSelect(entry.id);
  };
  return (
    <div className={styles.pager} role="group" aria-label={labels.group}>
      <IconButton
        size={24}
        label={labels.previous}
        disabled={index === 0}
        onClick={() => go(index - 1)}
      >
        <IconChevronLeftOutlineRegular size={14} />
      </IconButton>
      <Menu
        open={open}
        onClose={() => setOpen(false)}
        align="end"
        portal
        autoFocus
        selection="check"
        selectedId={current}
        items={entries.map((entry) => ({
          id: entry.id,
          icon: <StateDot state={entry.dot} />,
          label: (
            <span className={styles.entry}>
              <span className={styles.entryTitle}>{entry.title}</span>
              <span className={styles.entryWord}>{entry.word}</span>
            </span>
          ),
        }))}
        onSelect={(id) => {
          setOpen(false);
          onSelect(id);
        }}
        anchor={
          <button
            type="button"
            className={styles.position}
            aria-label={labels.position(index + 1, entries.length)}
            aria-haspopup="menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {index + 1} / {entries.length}
          </button>
        }
      />
      <IconButton
        size={24}
        label={labels.next}
        disabled={index === entries.length - 1}
        onClick={() => go(index + 1)}
      >
        <IconChevronRightOutlineRegular size={14} />
      </IconButton>
    </div>
  );
}
