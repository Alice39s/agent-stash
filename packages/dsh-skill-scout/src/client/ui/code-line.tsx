/**
 * 列表行里的代码行（design 4.10）：命令序列只显示一行（前三步用小箭头连起来，其余写成 +N）；
 * 命中的片段至多两行，每行一条省略号，命中的词用 `<mark>` 标出。
 */
import { IconChevronRightOutlineRegular } from "@deepseek-ai/dsh-client-ui-primitives";
import { Children, Fragment, type ReactNode } from "react";
import { sequenceOf } from "../format.ts";
import styles from "./code-line.module.css";

/** 一行命令序列；`more` 是其余步数的文案（如「+2」），由调用方翻译。 */
export function CommandSequence({
  steps,
  more,
  label,
}: {
  readonly steps: readonly string[];
  readonly more: (count: number) => string;
  /** 读屏用的完整序列说明。 */
  readonly label: string;
}): ReactNode {
  const { shown, more: rest } = sequenceOf(steps);
  if (shown.length === 0) return null;
  return (
    <span className={styles.line} aria-label={label} title={steps.join(" → ")}>
      {shown.map((step, index) => (
        <Fragment key={`${String(index)}:${step}`}>
          {index > 0 && (
            <span className={styles.arrow} aria-hidden="true">
              <IconChevronRightOutlineRegular size={10} />
            </span>
          )}
          <code className={styles.step}>{step}</code>
        </Fragment>
      ))}
      {rest > 0 && <span className={styles.more}>{more(rest)}</span>}
    </span>
  );
}

/** 至多两行命中的片段。 */
export function MatchedLines({ lines }: { readonly lines: readonly ReactNode[] }): ReactNode {
  if (lines.length === 0) return null;
  return (
    <span className={styles.matches} data-matches="">
      {Children.map(lines.slice(0, 2), (line) => (
        <code className={styles.match}>{line}</code>
      ))}
    </span>
  );
}
