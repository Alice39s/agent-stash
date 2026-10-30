/**
 * 模型请求进行中的占位：一行阶段与已用时间，下面是按最终排版画出的占位条。
 * 正文开始到达后，占位条按「已收到字数 / 预计字数」从上往下逐条点亮，点亮的条不再起伏；
 * 减少动态效果时所有条都静止，只有文字在变。
 */
import { TextShimmer } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ReactNode } from "react";
import type { ProgressView, StageView } from "../shared.ts";
import { duration, phaseLabel } from "./format.ts";
import { useNow, useReducedMotion } from "./hooks.ts";
import type { ScoutTranslate } from "./locale.ts";
import styles from "./detail.module.css";

/** 摘要占位条的宽度：几行短文本。 */
const SUMMARY_BARS = ["88%", "72%", "94%", "64%", "46%"] as const;
/** 草稿占位条的宽度，按 SKILL.md 的排版：标题、描述，空一行，一节标题与几行步骤；空串是段间空行。 */
const DRAFT_BARS = ["36%", "94%", "82%", "", "22%", "90%", "74%", "84%", "58%"] as const;
/** 相邻占位条的起伏错开的时间，连起来是一道自上而下的波。 */
const BAR_STAGGER = 70;

/**
 * 点亮的占位条数：正文按收到的比例点亮，核对阶段全亮，之前的阶段都不亮。
 * @internal 导出供测试使用。
 */
export function litBars(progress: ProgressView | null, count: number): number {
  if (progress === null) return 0;
  if (progress.phase === "checking") return count;
  if (progress.phase !== "writing" || progress.expected <= 0) return 0;
  return Math.min(count, Math.floor((progress.chars / progress.expected) * count));
}

export interface WorkingProps {
  readonly stage: StageView;
  readonly progress: ProgressView | null;
  /** 这一阶段的模型名称。 */
  readonly model: string | null;
  readonly t: ScoutTranslate;
}

/** 模型正在处理时的状态行与占位条。 */
export function Working({ stage, progress, model, t }: WorkingProps): ReactNode {
  const now = useNow(1_000);
  const reduced = useReducedMotion();
  const widths = stage === "summary" ? SUMMARY_BARS : DRAFT_BARS;
  const lit = litBars(progress, widths.filter((width) => width !== "").length);
  const label =
    progress === null
      ? t(stage === "summary" ? "detail.summarizing" : "detail.drafting", { model: model ?? "" })
      : phaseLabel(t, progress);
  /** 每条占位条在非空行里的序号，从 1 开始；空行为 0。 */
  const ordinals = widths.map((width, index) =>
    width === "" ? 0 : widths.slice(0, index + 1).filter((entry) => entry !== "").length,
  );
  return (
    <div className={styles.working} data-motion={reduced ? "reduce" : "full"}>
      <p className={styles.workingLabel}>
        {progress !== null && model !== null && <span className={styles.model}>{model}</span>}
        <span role="status">
          <TextShimmer active={!reduced}>{label}</TextShimmer>
        </span>
        {progress !== null && (
          <span className={styles.elapsed}>
            {t("progress.elapsed", { time: duration(t, now - progress.startedAt) })}
          </span>
        )}
      </p>
      <div className={styles.skeleton} aria-hidden="true">
        {widths.map((width, index) => {
          if (width === "")
            return <span key={`gap-${String(index)}`} className={styles.skeletonGap} />;
          const on = (ordinals[index] ?? 0) <= lit;
          return (
            <span
              key={`bar-${String(index)}`}
              className={styles.skeletonBar}
              data-bar=""
              data-lit={on || undefined}
              style={{
                width,
                ...(on || reduced ? {} : { animationDelay: `${String(index * BAR_STAGGER)}ms` }),
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
