/**
 * 列表分组的标题行（design 3.1）：36px 高，标题、数量，可选的尾部箭头按钮收起或展开这一组。
 * 窗格里可以粘在滚动区顶部；浮层里是宿主 JobListAction 的 `.sectionHeader` 小标签，上方一条细线。
 */
import {
  IconChevronDownOutlineRegular,
  IconChevronRightOutlineRegular,
} from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactNode } from "react";
import { IconButton } from "./icon-button.tsx";
import styles from "./group-header.module.css";

export interface GroupToggle {
  readonly expanded: boolean;
  readonly onToggle: () => void;
  /** 按钮的名称，例如「展开历史」「收起历史」。 */
  readonly label: string;
}

export interface GroupHeaderProps {
  readonly title: string;
  readonly count?: number | undefined;
  readonly size: "page" | "pane" | "popover";
  /** 粘在滚动区顶部，背景用 `--scout-pane-bg`。 */
  readonly sticky?: boolean;
  readonly toggle?: GroupToggle | undefined;
}

export function GroupHeader({
  title,
  count,
  size,
  sticky = false,
  toggle,
}: GroupHeaderProps): ReactNode {
  return (
    <div className={styles.head} data-size={size} data-sticky={sticky || undefined}>
      {size === "popover" ? (
        <h3 className={styles.title}>{title}</h3>
      ) : (
        <h2 className={styles.title}>{title}</h2>
      )}
      {count !== undefined && <span className={styles.count}>{count}</span>}
      {toggle !== undefined && (
        <IconButton
          size={24}
          label={toggle.label}
          expanded={toggle.expanded}
          onClick={toggle.onToggle}
        >
          {toggle.expanded ? (
            <IconChevronDownOutlineRegular size={14} />
          ) : (
            <IconChevronRightOutlineRegular size={14} />
          )}
        </IconButton>
      )}
    </div>
  );
}

/** 一组：标题行与行列表；`aria-label` 是分组标题。 */
export function Group({
  title,
  size,
  children,
}: {
  readonly title: string;
  readonly size: "page" | "pane" | "popover";
  readonly children: ReactNode;
}): ReactNode {
  return (
    <section className={styles.group} data-size={size} aria-label={title}>
      {children}
    </section>
  );
}

/** 组内没有行时的一行说明。 */
export function GroupNote({ children }: { readonly children: ReactNode }): ReactNode {
  return <p className={styles.note}>{children}</p>;
}
