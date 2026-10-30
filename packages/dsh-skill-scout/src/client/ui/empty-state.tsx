/**
 * 居中的空状态（design 4.9）：照宿主 TaskManagerPage 的 `.empty`，一行说明内容的事实，可选的图标与下方的动作。
 */
import type { ReactNode } from "react";
import styles from "./empty-state.module.css";

export function EmptyState({
  glyph,
  text,
  detail,
  action,
}: {
  readonly glyph?: ReactNode;
  readonly text: string;
  /** 第二行补充的事实，例如已分析的会话数。 */
  readonly detail?: string | undefined;
  readonly action?: ReactNode;
}): ReactNode {
  return (
    <div className={styles.empty} data-empty="">
      {glyph !== undefined && <span className={styles.glyph}>{glyph}</span>}
      <p className={styles.text}>{text}</p>
      {detail !== undefined && <p className={styles.detail}>{detail}</p>}
      {action !== undefined && <div className={styles.action}>{action}</div>}
    </div>
  );
}
