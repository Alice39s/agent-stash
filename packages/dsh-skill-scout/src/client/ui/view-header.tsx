/**
 * 会话视图的第一行（design 3.2）：48px，前面是视图自身状态的状态点、状态标题与元信息，后面是动作。
 * 窄时动作换到第二行并保留文字，元信息先隐藏。
 */
import { StateDot, type StateDotState } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactNode } from "react";
import styles from "./view-header.module.css";

export interface ViewHeaderProps {
  readonly dot: StateDotState;
  readonly title: string;
  readonly meta?: ReactNode;
  readonly actions?: ReactNode;
}

export function ViewHeader({ dot, title, meta, actions }: ViewHeaderProps): ReactNode {
  return (
    <header className={styles.header}>
      <p className={styles.status} role="status">
        <span className={styles.dot}>
          <StateDot state={dot} />
        </span>
        <span className={styles.title}>{title}</span>
        {meta !== undefined && meta !== null && <span className={styles.meta}>{meta}</span>}
      </p>
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
