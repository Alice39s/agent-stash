import type { FailureReason } from "./wire.ts";

/** 失败提示的原因：Host 给出的原因，或请求没有到达 Host。 */
export type NoteReason = FailureReason | "network";

/**
 * 增强按钮的状态。
 * - `idle`：等待操作。
 * - `running`：正在改写 `source`，草稿被锁住。
 * - `done`：结果已写入草稿，可以撤销回 `original`（连续增强时是最早那份亲手写的草稿）。
 *   `before` 是写入前的草稿，`applied` 是写入后输入框发布的草稿；草稿再变化就不能撤销了。
 * - `note`：一条提示（失败原因，或无需改动），草稿离开 `draft` 时消失。
 */
export type EnhanceState =
  | { readonly kind: "idle" }
  | {
      readonly kind: "running";
      readonly source: string;
      readonly original: string;
      readonly controller: AbortController;
    }
  | {
      readonly kind: "done";
      readonly original: string;
      readonly before: string;
      readonly applied: string | undefined;
    }
  | {
      readonly kind: "note";
      readonly draft: string;
      readonly note:
        | { readonly tone: "error"; readonly reason: NoteReason; readonly detail: string }
        | { readonly tone: "info"; readonly reason: "unchanged" };
    };

export const IDLE: EnhanceState = { kind: "idle" };

/**
 * 草稿变化后状态应当怎样跟随，返回 `undefined` 表示不变。
 * - 改写中草稿被别处改动（例如消息已发送）：放弃这次改写。
 * - 结果写入后输入框第一次发布新草稿：记下它；之后再变化，撤销失效。
 * - 提示所针对的草稿变了：提示消失。
 */
export function followDraft(state: EnhanceState, draft: string): EnhanceState | undefined {
  if (state.kind === "running") return draft === state.source ? undefined : IDLE;
  if (state.kind === "note") return draft === state.draft ? undefined : IDLE;
  if (state.kind !== "done") return undefined;
  if (state.applied === undefined) {
    return draft === state.before ? undefined : { ...state, applied: draft };
  }
  return draft === state.applied ? undefined : IDLE;
}
