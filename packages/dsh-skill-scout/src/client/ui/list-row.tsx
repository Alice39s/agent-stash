/**
 * 列表的一行（design 3.1）：16px 标记列（状态点或勾选框）、内容列（标题行、至多两行摘要或一行代码、
 * 以状态词开头的元信息行，行间 2px）、尾部动作列（悬停或焦点在行内时出现）。
 * 能打开的行把整行做成标题按钮的点击区，尾部动作浮在它上面，照宿主 ScheduleCatalogAction 的 `.openButton::after`。
 * - `item`：待决定的建议；`record`：建议引用的任务记录，带一行代码、没有摘要；
 * - `select`：可勾选的搜索结果，标题前是结果状态点；`popover`：收件箱浮层里的行。
 * 元信息只占一行：各项保持完整宽度，最后的 `metaFill`（工作目录）占满剩下的宽度，放不下时由它自己收窄。
 */
import { TextShimmer } from "@deepseek-ai/dsh-client-ui-primitives";
import { Children, useEffect, useRef, type ReactNode } from "react";
import type { StatusInk, TitleInk } from "../format.ts";
import styles from "./list-row.module.css";

export interface RowStatusWord {
  readonly word: string;
  readonly ink: StatusInk;
  readonly shimmer: boolean;
}

export interface ListRowProps {
  readonly variant: "item" | "record" | "select" | "popover";
  /** `page`：主区域列表的字号；`pane`：窗格与浮层的字号。 */
  readonly size: "page" | "pane";
  readonly marker: ReactNode;
  readonly title: ReactNode;
  readonly titleInk?: TitleInk;
  /** 标题前的结果状态点（`select`）。 */
  readonly titleDot?: ReactNode;
  /** 至多两行的摘要。 */
  readonly summary?: ReactNode;
  /** 代码行：命令序列或命中的片段。 */
  readonly code?: ReactNode;
  readonly status: RowStatusWord;
  readonly metadata: readonly ReactNode[];
  /** 元信息行最后一项，占满剩下的宽度、放不下时收窄（`PathLabel`）。 */
  readonly metaFill?: ReactNode;
  readonly actions?: ReactNode;
  readonly selected?: boolean;
  /** 从别处选中后的一次高亮。 */
  readonly highlight?: boolean;
  /** 打开这一行；没有时标题只是文字。 */
  readonly onOpen?: (() => void) | undefined;
  /** 打开按钮上的 `data-item`。 */
  readonly itemId?: string | undefined;
  readonly rowData?: Readonly<Record<`data-${string}`, string | undefined>>;
}

export function ListRow({
  variant,
  size,
  marker,
  title,
  titleInk = "primary",
  titleDot,
  summary,
  code,
  status,
  metadata,
  metaFill,
  actions,
  selected = false,
  highlight = false,
  onOpen,
  itemId,
  rowData,
}: ListRowProps): ReactNode {
  const ref = useRef<HTMLLIElement>(null);
  // 从别处选中的行滚到可见处。
  useEffect(() => {
    if (highlight) ref.current?.scrollIntoView({ block: "nearest" });
  }, [highlight]);
  return (
    <li
      {...rowData}
      ref={ref}
      className={styles.row}
      data-variant={variant}
      data-size={size}
      data-selected={selected || undefined}
      data-highlight={highlight || undefined}
      data-openable={onOpen === undefined ? undefined : ""}
    >
      <span className={styles.marker}>{marker}</span>
      <span className={styles.content}>
        <span className={styles.titleLine} data-ink={titleInk}>
          {titleDot !== undefined && <span className={styles.titleDot}>{titleDot}</span>}
          {onOpen === undefined ? (
            <span className={styles.title}>{title}</span>
          ) : (
            <button
              type="button"
              className={`${styles.title} ${styles.open}`}
              data-item={itemId}
              aria-current={selected || undefined}
              onClick={onOpen}
            >
              {title}
            </button>
          )}
        </span>
        {summary !== undefined && summary !== null && (
          <span className={styles.summary}>{summary}</span>
        )}
        {code}
        <span className={styles.meta}>
          <span className={styles.metaItem} data-ink={status.ink} data-status="">
            {status.shimmer ? <TextShimmer active>{status.word}</TextShimmer> : status.word}
          </span>
          {Children.map(metadata, (entry) => (
            <span className={styles.metaItem}>{entry}</span>
          ))}
          {metaFill !== undefined && (
            <span className={styles.metaItem} data-fill="">
              {metaFill}
            </span>
          )}
        </span>
      </span>
      {actions !== undefined && <span className={styles.actions}>{actions}</span>}
    </li>
  );
}

/** 一组行；行间 2px。 */
export function RowList({ children }: { readonly children: ReactNode }): ReactNode {
  return <ul className={styles.list}>{children}</ul>;
}
