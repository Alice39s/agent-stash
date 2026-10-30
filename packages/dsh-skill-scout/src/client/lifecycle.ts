/**
 * 一条建议的生命周期：发现、摘要、草稿、保存四步（design 4.6）。当前一步是状态词所说的那一步，
 * 状态点用这条建议的状态类别；产出等你处理时这一步保持为当前一步。之前的步骤已完成，之后的步骤未开始。
 * 不值得保存与已忽略的卡片已结束，每一步都用空闲的点。
 */
import type { StateDotState } from "@deepseek-ai/dsh-client-ui-primitives";
import type { ItemView } from "../shared.ts";
import type { ScoutKey, ScoutTranslate } from "./locale.ts";

export type StepId = "found" | "summary" | "draft" | "save";

const ORDER: readonly StepId[] = ["found", "summary", "draft", "save"];

const LABELS: Readonly<Record<StepId, ScoutKey>> = {
  found: "step.found",
  summary: "step.summary",
  draft: "step.draft",
  save: "step.save",
};

const WORDS: Readonly<Record<StateDotState, ScoutKey>> = {
  done: "step.state.done",
  warning: "step.state.warning",
  ongoing: "step.state.ongoing",
  error: "step.state.error",
  idle: "step.state.idle",
};

export interface LifecycleStep {
  readonly id: StepId;
  readonly label: string;
  readonly state: StateDotState;
  readonly current: boolean;
  readonly word: string;
}

export interface Lifecycle {
  readonly steps: readonly LifecycleStep[];
  /** 卡片已结束：不值得保存或已忽略。 */
  readonly closed: boolean;
}

interface Position {
  readonly index: number;
  readonly state: StateDotState;
}

/**
 * 状态本身就决定位置的卡片：当前一步的序号与状态。还没有摘要时停在摘要、未开始；摘要待确认时停在摘要、
 * 等你处理；草稿待保存时停在草稿、等你处理；已保存时没有当前一步。
 */
const POSITIONS: Readonly<
  Record<Exclude<ItemView["state"], "failed" | "skipped" | "dismissed">, Position>
> = {
  detected: { index: 1, state: "idle" },
  summarizing: { index: 1, state: "ongoing" },
  proposed: { index: 1, state: "warning" },
  drafting: { index: 2, state: "ongoing" },
  ready: { index: 2, state: "warning" },
  written: { index: ORDER.length, state: "done" },
};

/** 失败停在出错的那一步；已结束的卡片（不值得保存、已忽略）没有位置。 */
function position(item: ItemView): Position | null {
  if (item.state === "skipped" || item.state === "dismissed") return null;
  if (item.state === "failed") {
    return { index: item.failure?.stage === "draft" ? 2 : 1, state: "error" };
  }
  return POSITIONS[item.state];
}

/** 已结束卡片的一步：空闲的点，状态词是「已结束」。 */
function quietStep(t: ScoutTranslate, id: StepId): LifecycleStep {
  return { id, label: t(LABELS[id]), state: "idle", current: false, word: t("step.state.closed") };
}

export function lifecycleOf(t: ScoutTranslate, item: ItemView): Lifecycle {
  const spot = position(item);
  if (spot === null) {
    return { closed: true, steps: ORDER.map((id) => quietStep(t, id)) };
  }
  const { index, state } = spot;
  return {
    closed: false,
    steps: ORDER.map((id, at) => {
      const current = at === index;
      const stepState: StateDotState = at < index ? "done" : current ? state : "idle";
      return {
        id,
        label: t(LABELS[id]),
        state: stepState,
        current,
        word: t(WORDS[stepState]),
      };
    }),
  };
}
