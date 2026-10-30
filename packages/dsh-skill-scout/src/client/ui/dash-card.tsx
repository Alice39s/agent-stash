/**
 * 统计页的卡片（design.md 4.11）：设置卡片的材质，标题行起始侧是标题（h2），尾侧是一个汇总数或一个安静的控件。
 */
import { useId, type ReactNode } from "react";
import styles from "./dash-card.module.css";

export interface DashCardProps {
  readonly title: string;
  /** 尾侧的汇总数，例如「43 个任务」。 */
  readonly summary?: string;
  /** 内容还在加载。 */
  readonly busy?: boolean;
  readonly children: ReactNode;
}

export function DashCard({ title, summary, busy = false, children }: DashCardProps): ReactNode {
  const titleId = useId();
  return (
    <section className={styles.card} aria-labelledby={titleId} aria-busy={busy || undefined}>
      <header className={styles.head}>
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {summary !== undefined && <span className={styles.summary}>{summary}</span>}
      </header>
      {children}
    </section>
  );
}
