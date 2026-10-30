/**
 * 生命周期步骤条（design 4.6）：每一步是 16px 的步骤状态点加名称，步骤之间是一段 12px 的细线；
 * 下方一行说明下一步。窄于 360px 时只显示当前一步的名称，每一步的名称与状态写在 `aria-label` 里。
 */
import { StateDot, type StateDotState } from "@deepseek-ai/dsh-client-ui-primitives";
import { Fragment, type ReactNode } from "react";
import styles from "./steps.module.css";

export interface Step {
  readonly id: string;
  readonly label: string;
  readonly state: StateDotState;
  /** 当前一步。 */
  readonly current: boolean;
  /** 读屏用的状态词，例如「已完成」「等你确认」。 */
  readonly word: string;
}

export interface StepsProps {
  readonly steps: readonly Step[];
  readonly label: string;
  /** 条目已结束：每一步都用淡墨与空闲的点。 */
  readonly closed?: boolean;
  /** 下一步的说明。 */
  readonly next?: ReactNode;
  /** 下一步说明是失败原因，用错误色。 */
  readonly failed?: boolean;
}

export function Steps({
  steps,
  label,
  closed = false,
  next,
  failed = false,
}: StepsProps): ReactNode {
  return (
    <div className={styles.root}>
      <ol className={styles.steps} aria-label={label} data-closed={closed || undefined}>
        {steps.map((step, index) => (
          <Fragment key={step.id}>
            {index > 0 && <li className={styles.line} aria-hidden="true" />}
            <li
              className={styles.step}
              data-state={closed ? "closed" : step.state}
              data-current={step.current || undefined}
              aria-label={`${step.label}: ${step.word}`}
              aria-current={step.current ? "step" : undefined}
            >
              <StateDot state={closed ? "idle" : step.state} appearance="step" size={16} />
              <span className={styles.label} aria-hidden="true">
                {step.label}
              </span>
            </li>
          </Fragment>
        ))}
      </ol>
      {next !== undefined && next !== null && (
        <p
          className={styles.next}
          data-failed={failed || undefined}
          role={failed ? "alert" : undefined}
        >
          {next}
        </p>
      )}
    </div>
  );
}
