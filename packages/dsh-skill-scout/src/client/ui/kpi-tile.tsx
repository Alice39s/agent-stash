/**
 * KPI 卡片（design.md 4.10）：标签、24px 的数值、一行上下文自上而下顶部对齐，同一排卡片的标签与数值对齐；
 * 同排卡片撑满同一行高，底边对齐。迷你趋势线（80×24）放在数值一行的尾侧，标签与上下文占满卡片宽度；
 * 上下文只放整体或一个对比数，拆分数值的数字放进上下文的提示里，上下文因此可以用 Tab 聚焦；上下文下方可放占比条。
 * 数值为 null 时是加载中：数值位置画一条 24px 高的骨架条，不显示上下文、趋势线与占比条。
 */
import { Tooltip } from "@deepseek-ai/dsh-client-ui-primitives";
import { useId, type ReactNode } from "react";
import styles from "./kpi-tile.module.css";
import { Skeleton } from "./skeleton.tsx";

export interface KpiTileProps {
  readonly label: string;
  /** 已经格式化的数值；null 表示还在加载。 */
  readonly value: string | null;
  /** 数值的上下文：整体（「共 53 个」）或一个对比数。 */
  readonly context?: string;
  /** 上下文的提示：拆分数值的数字，例如「范围内 48 个 · 回溯读入 12 个」。 */
  readonly detail?: string;
  /** 数值一行尾侧的迷你趋势线。 */
  readonly trend?: ReactNode;
  /** 上下文下方的内容，例如占比条。 */
  readonly children?: ReactNode;
}

function Context({
  context,
  detail,
}: {
  readonly context: string;
  readonly detail: string | undefined;
}): ReactNode {
  if (detail === undefined) {
    return (
      <p className={styles.context} title={context} data-kpi-context="">
        {context}
      </p>
    );
  }
  return (
    <Tooltip label={detail} side="bottom">
      <p className={styles.context} tabIndex={0} data-kpi-context="">
        {context}
      </p>
    </Tooltip>
  );
}

export function KpiTile({
  label,
  value,
  context,
  detail,
  trend,
  children,
}: KpiTileProps): ReactNode {
  const labelId = useId();
  const ready = value !== null;
  return (
    <div
      className={styles.tile}
      role="group"
      aria-labelledby={labelId}
      aria-busy={ready ? undefined : true}
    >
      <p id={labelId} className={styles.label} title={label}>
        {label}
      </p>
      <div className={styles.valueLine}>
        <p className={styles.value} data-kpi-value="">
          {value ?? <Skeleton width={72} height={24} />}
        </p>
        {ready && trend !== undefined && <div className={styles.trend}>{trend}</div>}
      </div>
      {ready && context !== undefined && <Context context={context} detail={detail} />}
      {ready && children !== undefined && <div className={styles.extra}>{children}</div>}
    </div>
  );
}
